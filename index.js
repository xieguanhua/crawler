var http = require('http');
var url = require('url');
var path = require('path');
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
        headless: true,
        devtools: true,
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
    if (match.test(params.url)) {
        //在浏览器中创建一个新的页面
        const page = await browser.newPage();
        try {
            await page.setRequestInterception(true);
            page.on('request', async req => {
                if (/.(jpg|png|jpeg)$/.test(req.url())) {
                    await req.respond({
                        status: 200,
                        headers: {'Access-Control-Allow-Origin': '*',},
                        contentType: 'application/json; charset=utf-8',
                        body: '',
                    });
                } else {
                    await req.continue();
                }
            });
            //打开指定页面
            const pageUrl = params.url.replace('pageNumberReg', params.pageNumber || 1)
            delete params.pageNumber
            await page.setBypassCSP(true)
            await page.goto(pageUrl);

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

               async function formatSelector(str, reg) {
                    reg = new RegExp(reg)
                    const attrList = (str.match(reg)[1] || '').split('|')
                    const cls = str.replace(reg, '')
                    return {cls, attrList}
                }

               async function formatData(dom, attrList = []) {
                    let data = {}
                    const d = $(dom)
                    if (attrList.length === 1) {
                        data =await executeMethods(attrList[0])
                    } else {
                        await Promise.all(attrList.map(async v=>{
                            data[v] =await executeMethods(v)
                        }))
                    }
                  async function executeMethods(key) {
                        const reg = 'javascript:'
                        const jqueryReg = '@$@'
                        if (key.indexOf(reg) >= 0) {
                            return (new Function('data', key.replace(reg, '')))({d})
                        } else if (key.indexOf(jqueryReg) >= 0) {
                            const [fun, value] = key.split(jqueryReg)
                            if (fun && value && d[fun]) {
                                return d[fun](value)
                            }
                        }else {
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

                async function getParamsDom(obj={},parentCls) {
                    const data = {}
                    if (parentCls) {
                        return  await Promise.all($(parentCls).map(async(i,v)=>{
                            const info = {}
                            await Promise.all(Object.keys(obj).map(async k=>{
                                if(k==='parentCls')return
                                if(typeof obj[k] === 'string'){
                                    const {cls,attrList}=await formatSelector(obj[k],obj.reg|| params.reg)
                                    info[k]=await formatData($(v).find(cls)[0],attrList)
                                }else{
                                    let parent = v
                                    if(obj[k].parentCls){
                                        parent  =$(v).find(obj[k].parentCls)
                                    }
                                    if(!parent)return;
                                    info[k]=await getParamsDom(obj[k],parent)
                                }
                            }))
                            return info
                        }))
                    } else {
                       await Promise.all(Object.keys(obj).map(async v => {
                           let info = obj[v] || {}
                           if (typeof info === 'string') {
                               const ignoreKeys = ['url', 'reg']
                               if (ignoreKeys.indexOf(v) >= 0) {
                                   return
                               }
                               const {cls, attrList} =await formatSelector(info, obj.reg || params.reg)
                               data[v] = (await Promise.all($(cls).map((i) => formatData($(cls)[i], attrList))))
                           } else {
                               data[v] =await getParamsDom(info,info.parentCls)
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