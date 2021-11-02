const express = require('express')
//路由
const router = express.Router()


router.get('/crawler',(req,res)=>{
    console.log(req.query)
    //从req.body中获取传递的参数
  /*  let data = {
        title:req.body.title,
        type:req.body.type,
        sentene:req.body.sentene,
        imgUrl:req.body.imgUrl,
        like:req.body.like,
        num:req.body.num,
        timeYear:req.body.timeYear,
        timeMonth:req.body.timeMonth
    }
    //修改数据
    db.query('book',(err,dbDate)=>{
        dbDate.collection('periodical').updateOne({"_id":objectID(req.params.id)},
            {$set:data},(dberr,msg)=>{
                if(!msg){
                    res.status(404).json({msg:"修改失败"})
                }else{
                    res.status(200).json({msg:"修改成功"})
                }
            })
    })*/
})

//导入封装连接数据库方法
// const db = require('./client.config')
//mongodb文档必须有一个_id键，这个键的值可以是任意类型的，默认是一个ObjectId对象
// const objectID = require('mongodb').ObjectID;

/*//查询全部
router.get('/findAll',(req,res)=>{
    db.query('book',(err,dbDate)=>{
        dbDate.collection('periodical').find().toArray((dberr,msg)=>{
            if(!msg){
                res.status(404).json({msg:"暂无数据"})
            }else{
                res.status(200).json({data:msg})
            }
        })
    })
 })

 //查询单个
 router.get('/findOne/:id',(req,res)=>{
    db.query('book',(err,dbDate)=>{
        dbDate.collection('periodical').findOne({"_id":objectID(req.params.id)},
        (dberr,msg)=>{
            if(!msg){
                res.status(404).json({msg:"暂无数据"})
            }else{
                res.status(200).json({data:msg})
            }
        })
    })
 })

//添加
router.post('/add',(req,res)=>{
    //从req.body中获取传递的参数
    let data = {
            title:req.body.title,
            type:req.body.type,
            sentene:req.body.sentene,
            imgUrl:req.body.imgUrl,
            like:req.body.like,
            num:req.body.num,
            timeYear:req.body.timeYear,
            timeMonth:req.body.timeMonth
    }
    db.query('book',(err,dbDate)=>{
        //数据库插入数据
        dbDate.collection('periodical').insertOne(data,(dberr,msg)=>{
            if(!msg){
                res.status(404).json({msg:"添加失败"})
            }else{
                res.status(200).json({msg:"添加成功"})
            }
        })
    })
 })

//修改
router.post('/updata/:id',(req,res)=>{
    //从req.body中获取传递的参数
    let data = {
        title:req.body.title,
        type:req.body.type,
        sentene:req.body.sentene,
        imgUrl:req.body.imgUrl,
        like:req.body.like,
        num:req.body.num,
        timeYear:req.body.timeYear,
        timeMonth:req.body.timeMonth
    }   
    //修改数据
    db.query('book',(err,dbDate)=>{
        dbDate.collection('periodical').updateOne({"_id":objectID(req.params.id)},
        {$set:data},(dberr,msg)=>{
            if(!msg){
                res.status(404).json({msg:"修改失败"})
            }else{
                res.status(200).json({msg:"修改成功"})
            }
        })
    })
})

//删除数据
router.get('/delOne/:id',(req,res)=>{
    db.query('book',(err,dbDate)=>{
        dbDate.collection('periodical').deleteOne({"_id":objectID(req.params.id)},
        (dberr,msg)=>{
            if(!msg){
                res.status(404).json({msg:"删除失败"})
            }else{
                res.status(200).json({msg:"删除成功"})
            }
        })
    })
})*/

module.exports = router