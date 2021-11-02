const MongoClient = require('mongodb').MongoClient;
//连接数据库
const url = 'mongodb://localhost:27017/book';

//封装连接数据库方法
//sql,传入的数据库名称 callback回调函数
function query(sql,callback){
    MongoClient.connect(url,{useNewUrlParser:true},(err,db)=>{
        let dbDate =  db.db(sql);
        //返回回调函数
        callback(err,dbDate);
        //关闭数据库
        db.close();
    })
}
exports.query = query;