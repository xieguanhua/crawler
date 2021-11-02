const express = require('express');
const bodyParser = require('body-parser');
const app = express();
//引入periodical.js
const periodical = require('./api/periodical')
//设置跨域访问
app.all('*', (req, res, next) => {
    res.header("Access-Control-Allow-Origin", "*");
    res.header("Access-Control-Allow-Headers", "X-Requested-With");
    res.header("Access-Control-Allow-Methods","PUT,POST,GET,DELETE,OPTIONS");
    res.header("X-Powered-By",' 3.2.1')
    res.header("Content-Type", "application/json;charset=utf-8");
    next();
});
//使用body-parser
app.use(bodyParser.json());
app.use(bodyParser.urlencoded({extended:false}));


//periodical路由  访问periodical中的路由时，全部为/api/periodical/路由
/* 
    例如：
        periodical中有个hi路由，访问时/api/periodical/hi
*/
app.use('/api',periodical)

//测试路由
app.get("/",(req,res)=>{
    res.send("hello world");
});

const port = process.env.port || 3000;

app.listen(port,()=>{
    console.log(`${port}`)
})