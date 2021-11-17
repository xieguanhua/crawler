const express = require('express')
//路由
const router = express.Router()
const puppeteer = require("puppeteer");
const crypto = require('crypto');
const matchUrlReg = /^((http|https):\/\/)?(([A-Za-z0-9]+-[A-Za-z0-9]+|[A-Za-z0-9]+)\.)+([A-Za-z]+)[/\?\:]?.*$/;
let browser;
//缓存数据
const redis = require('redis')
const request = require("request");
let client = redis.createClient(6379, '127.0.0.1')
client.on('error', function (err) {
    console.log('Error ' + err);
    client = null
});
const isKeyExists = (hash) => {
    return new Promise(resolve => {
        client.exists(hash, (err, reply) => {
            resolve(reply)
        })
    })
}
(async () => {
    //创建一个Browser（浏览器）实例
    browser = await puppeteer.launch({
        //设置有头模式（默认为true，无头模式）
        //  headless: false,
        //  devtools: true,
        headless: true,
        args: [
            '--disable-gpu',
            '--disable-dev-shm-usage',
            '--disable-setuid-sandbox',
            '--no-first-run',
            '--no-sandbox',
            '--no-zygote',
            '--single-process'
        ]
    });
})()

//数据递归格式化
function serialize(params) {
    Object.keys(params).forEach(v => {
        try {
            if (typeof params[v] === 'string') {
                params[v] = JSON.parse(params[v])
                serialize(params[v])
            }
        } catch (e) {

        }
    })
}

//对象递归查找
const find = (object = '', path = '') => {
    var props = path.split(".");
    for (let i = 0; i < props.length; i++) {
        const p = props[i];
        object = object[p] || ''
    }
    return object;
}

function success(res, data) {
    res.status(200).json(data)
}

function error(res, message) {
    res.status(400).json({message})
}



//参数过滤爬取需要爬取的数据
function queryFilter(query){
    const obj = {}
    const ignoreKeys = ['url','clearCache']
    Object.keys(query).forEach(v=>{
        if(ignoreKeys.indexOf(v) < 0){
            obj[v]=  query[v]
        }
    })
    return obj
}
router.get('/puppeteer', async (req, res) => {
    serialize(req.query)
    const {query} = req
    const hash = crypto.createHash('sha256').update(JSON.stringify(query)).digest('hex')
    const {url, pageNumber} = query
    const time = Date.now();
    if (client && await isKeyExists(hash) && !query.clearCache) {
        client.get(hash, (err, data) => {
            if (err) {
                error(res, "数据读取失败，请重试")
            } else {
                success(res, JSON.parse(data))
            }
        })
    } else if (matchUrlReg.test(url)) {
        const pageUrl = url.replace('pageNumberReg', pageNumber || 1)
        //在浏览器中创建一个新的页面
        const page = await browser.newPage();
        try {
            await page.setRequestInterception(true);
            page.on('request', async req => {
                if (['image', 'media', 'eventsource', 'css', 'websocket'].includes(req.resourceType())) {
                    await req.abort()
                } else {
                    await req.continue()
                }
            });
            await page.setBypassCSP(true)
            await page.goto(pageUrl, {
                waitUntil: "networkidle2",
            });
            await page.mainFrame().addScriptTag({url: 'https://cdn.bootcss.com/jquery/3.2.0/jquery.min.js'})
            const result = await page.evaluate(async (params) => {
                const {$} = window
                const jqueryReg = '@$@'
                const resultReg = '@=@'
                const parenthesisReg = /\((.+?)\)/g;
                const runScriptReg = 'script:'
                //取字段
                function formatSelector(str) {
                    const reg = new RegExp( "【@(.*)@】")
                    const attrList = (str.match(reg)[1] || '').split('|')
                    const cls = str.replace(reg, '')
                    return {cls, attrList}
                }
                //数据格式化
                function formatData(dom, attrList = []){
                    function executeMethods(key) {
                        if (key.indexOf(jqueryReg) >= 0) {
                                const d = $(dom)
                                const [fun, value] = key.split(jqueryReg)
                                if (fun && value && d[fun]) {
                                    return d[fun](value)
                                }
                       } else {
                            return (dom||{})[key]
                        }
                    }
                    attrList = Array.isArray(attrList)?attrList:[attrList]
                    let data = {}
                    if(attrList.length === 1){
                        data =  executeMethods(attrList[0])
                    }else{
                        attrList.forEach(v => {
                            data[v] = executeMethods(v)
                        })
                    }
                    return Promise.resolve(data)
                }
                async function getParamsDom(obj = {}, parentCls) {
                    const data = {}
                    if (parentCls) {
                        return (await Promise.all($(parentCls).map(async (i, v) => {
                            const info = {}
                            let filter = false
                            await Promise.all(Object.keys(obj).map(async k => {
                                const ignoreKeys = ['filter']
                                if (k === 'parentCls' || ignoreKeys.includes(k)) return
                                if (typeof obj[k] === 'string') {

                                    if(!obj[k].indexOf(runScriptReg)){
                                        info[k] = await (new Function('data', obj[k].replace(runScriptReg, '')))($(v))
                                    }else{
                                        const {cls, attrList} = formatSelector(obj[k])
                                        const isFilter = () => {
                                            const [funStr = '', result] = obj.filter.split(resultReg)
                                            let dom = $(v).find(cls)
                                            funStr.split(jqueryReg).forEach(v => {
                                                const fun = v.replace(parenthesisReg, '')
                                                let value = v.match(parenthesisReg)[0]
                                                value = value.substring(1, value.length - 1)
                                                dom = dom[fun](value)
                                            })
                                            return String(dom).indexOf(result) >= 0
                                        }
                                        filter = !(obj.filter && isFilter())
                                        info[k] = await formatData($(v).find(cls)[0], attrList)
                                    }
                                } else {
                                    let parent = v
                                    if (obj[k].parentCls) {
                                        parent = $(v).find(obj[k].parentCls)
                                    }
                                    if (!parent) return;
                                    info[k] = await getParamsDom(obj[k], parent)
                                }
                            }))
                            return filter ? info : null
                        }))).filter(v => v)
                    } else {
                         await Promise.all(Object.keys(obj).map(async v => {
                          let info = obj[v] || {}
                          if (typeof info === 'string') {

                              if(!info.indexOf(runScriptReg)){
                                  data[v] = await (new Function('data', info.replace(runScriptReg, '')))()
                              }else{
                                  const {cls, attrList} =  formatSelector(info)
                                  const list = (await Promise.all($(cls).map((i) => formatData($(cls)[i], attrList))))
                                  data[v] = list.length <= 1 ? list[0] : list
                              }
                          } else {
                              data[v] = await getParamsDom(info, info.parentCls)
                          }
                      }))
                    }
                    return data
                }

                return await getParamsDom(params);
            },queryFilter(query));
            const ex = Date.now() - time
            console.log(ex)
            client.set(hash, JSON.stringify(result), "EX",ex<3600?3600:ex);//过期时间最小1小时
            success(res, result)
        } catch (e) {
            error(res, e.message)
        } finally {
            page.close()
        }
    } else {
        error(res, "请填写正确的url")
    }
})
router.get('/json', async (req, res) => {
    try {
        serialize(req.query)
        const obj = {}
        const {query} = req
        const {url, pageNumber} = query
        const pageUrl = url.replace('pageNumberReg', pageNumber || 1)
       const params = queryFilter(query)
        request({url: encodeURI(pageUrl), json: true}, (err, response, body) => {

            //jsonp请求或者字符串变量转化
            if(params.jsonpName && typeof body === 'string'){
                body = (new Function('',`let data; function ${params.jsonpName}(val){
                   data=val
                };` + body+`;return data ?data:${body}`))()||{}
            }
            if (err) {
                error(res, err.message||'未知错误')
            } else if(!Object.keys(params).length){
                success(res, body)
            }else{
                Object.keys(params).forEach(k => {
                    const ignoreKeys = ['url', 'reg', 'filter', 'dataType','jsonpName']
                    if (ignoreKeys.indexOf(k) >= 0) {
                        return
                    }
                    const val = params[k]||''
                    const data = val.parentCls ? find(body, val.parentCls) : body
                    if (Array.isArray(data)) {
                        obj[k] = data.map(v => {
                            const data = {}
                            Object.keys(val).forEach(j => {
                                if (j === 'parentCls' || ignoreKeys.includes(k)) return
                                data[j] = find(v, val[j])
                            })
                            return data
                        })
                    } else if (typeof val === 'string') {
                        obj[k] = find(data, val)
                    } else {
                        obj[k] = data
                    }
                })
                success(res, obj)
            }
        })
    } catch (e) {
        error(res, e.message)
    }
})
module.exports = router