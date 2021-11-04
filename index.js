/*
var http = require('http');
var url = require('url');
var path = require('path');
var request = require('request');
// 5. 导入querystring模块（用来解析post请求参数）
var querystring = require('querystring');
const puppeteer = require("puppeteer");
const guid = () => {
    function S4() {
        return (((1 + Math.random()) * 0x10000) | 0).toString(16).substring(1)
    }

    return (S4() + S4() + '-' + S4() + '-' + S4() + '-' + S4() + '-' + S4() + S4() + S4())
}
let browser;
(async () => {
    //创建一个Browser（浏览器）实例
    browser = await puppeteer.launch({
        //设置有头模式（默认为true，无头模式）
       /!* headless: false,
        devtools: true,*!/
        headless:true,
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

http.createServer(onRequest).listen(3000);
let match = /^((http|https):\/\/)?(([A-Za-z0-9]+-[A-Za-z0-9]+|[A-Za-z0-9]+)\.)+([A-Za-z]+)[/\?\:]?.*$/;

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

async function onRequest(req, res) {
    res.setHeader("Access-Control-Allow-Origin", "*");
    res.setHeader("Access-Control-Allow-Headers", "Content-Type, Content-Length, Authorization, Accept, X-Requested-With , yourHeaderFeild");
    res.setHeader("Access-Control-Allow-Methods", "PUT,POST,GET,DELETE,OPTIONS");
    res.setHeader("X-Powered-By", "3.2.1");
    res.setHeader("Content-Type", "application/json;charset=utf-8");
    //获取返回的url对象的query属性值
    const arg = url.parse(req.url).query;
    //将arg参数字符串反序列化为一个对象
    const params = querystring.parse(arg) || {};
    serialize(params)
    const pageUrl = params.url.replace('pageNumberReg', params.pageNumber || 1)
    if (match.test(params.url) && !params.dataType) {
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
            //打开指定页面

            delete params.pageNumber
            await page.setBypassCSP(true)
            await page.goto(pageUrl,{
                waitUntil: "networkidle0",
            });
            //等待页面加载
            await page.exposeFunction('guid', () => guid());

            // await page.exposeFunction('getClickHref', async guid => {
            //
            //     await page.click( `*[guid=${guid}]`)
            //     // browser.once('targetcreated',async target => {
            //     //     console.log(await target.page())
            //     // })
            //     return Promise.resolve('111');
            // });

            // console.log(pageUrl)
            //插入jqery
            await page.mainFrame().addScriptTag({url: 'https://cdn.bootcss.com/jquery/3.2.0/jquery.min.js'})

            const result = await page.evaluate(async (params) => {
                const {$} = window
                const jqueryReg = '@$@'
                const resultReg = '@=@'
                const runSrciptReg = 'javascript:'
                const parenthesisReg = /\((.+?)\)/g;
                async function formatSelector(str, reg) {
                    reg = new RegExp(reg || "【@(.*)@】")
                    const attrList = (str.match(reg)[1] || '').split('|')
                    const cls = str.replace(reg, '')
                    return {cls, attrList}
                }

                async function formatData(dom, attrList = []) {
                    let data = {}
                    const d = $(dom)
                    if (attrList.length === 1) {
                        data = await executeMethods(attrList[0])
                    } else {
                        await Promise.all(attrList.map(async v => {
                            data[v] = await executeMethods(v)
                        }))
                    }

                    async function executeMethods(key) {
                        if (key.indexOf(runSrciptReg) >= 0) {
                            return (new Function('data', key.replace(runSrciptReg, '')))({d})
                        } else if (key.indexOf(jqueryReg) >= 0) {
                            const [fun, value] = key.split(jqueryReg)
                            if (fun && value && d[fun]) {
                                return d[fun](value)
                            }
                        } else {
                            return dom[key]
                        }
                        // else if(key==='clickGetHref'){
                        //         // dom.click()
                        //         const guid = await window.guid()
                        //         dom.setAttribute('guid',guid)
                        //         await window.getClickHref(guid)
                        //     }
                    }

                    return data
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
                                    const {cls, attrList} = await formatSelector(obj[k], obj.reg || params.reg)
                                    const isFilter = () => {
                                        const [funStr = '', result] = obj.filter.split(resultReg)
                                        let dom = $(v).find(cls)
                                        funStr.split(jqueryReg).forEach(v => {
                                            const fun = v.replace(parenthesisReg,'')
                                            let value = v.match(parenthesisReg)[0]
                                            value =value.substring(1, value.length - 1)
                                            dom = dom[fun](value)
                                        })
                                        return String(dom).indexOf(result) >= 0
                                    }
                                    filter = !(obj.filter && isFilter())
                                    info[k] = await formatData($(v).find(cls)[0], attrList)
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
                                const ignoreKeys = ['url', 'reg', 'filter','dataType','pageNumber']
                                if (ignoreKeys.indexOf(v) >= 0) {
                                    return
                                }
                                const {cls, attrList} = await formatSelector(info, obj.reg || params.reg)
                                const list = (await Promise.all($(cls).map((i) => formatData($(cls)[i], attrList))))
                                data[v] = list.length === 1 ? list[0] : list
                            } else {
                                data[v] = await getParamsDom(info, info.parentCls)
                            }
                        }))
                    }
                    return data
                }

                return await getParamsDom(params);
            }, params);

            res.end(JSON.stringify(result))

        } catch (e) {
            console.log(e)
            error(res, e.message)
        } finally {
            page.close()
        }
    }else if(params.dataType === 'json'){
        const find=(object='', path='')=> {
            var props = path.split(".");
            for(let i=0;i<props.length;i++){
                const p = props[i];
                object = object[p]||''
            }
            return object;
        }
        let obj = {}
        request({url:pageUrl,json:true},  (error, response, body)=> {
            Object.keys(params).forEach(k=>{
                const ignoreKeys = ['url', 'reg', 'filter','dataType']
                if (ignoreKeys.indexOf(k) >= 0) {return}
                const val =  params[k]
                const data = val.parentCls ? find(body,val.parentCls):params[k]
                if(Array.isArray(data)){
                    obj[k]=  data.map(v=>{
                        const data = {}
                        Object.keys(val).forEach(j=>{
                            if (j === 'parentCls' || ignoreKeys.includes(k)) return
                            data[j] = find(v,val[j])
                        })
                        return data
                    })
                }else if(typeof val === 'string'){
                    obj[k]= find(data,val)
                }else{
                    obj[k]= data
                }
            })

            res.end(JSON.stringify(obj))
        })

    } else {
        error(res, "no url found")
    }
}

function error(res, message) {
    res.statusCode = 404;
    let person = {
        message
    }
    res.end(JSON.stringify(person))
}
*/
