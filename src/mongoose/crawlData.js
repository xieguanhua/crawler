const mongoose = require('mongoose');

const schema = new mongoose.Schema({
    hash:  String,
    body: String,
})
// 这种写法是创建一个test的model，并且接下来的操作是执行到test表里
const blogModel = mongoose.model('crawlData', schema);

class crawlData {
    save(obj){
        return new Promise((resolve, reject)=>{
            const instance=new blogModel(obj);
            instance.save((err)=>{
                err?  reject(err): resolve()
            })
        })
    }
    //精确查找
    findOne(obj){
        return new Promise((resolve, reject)=>{
            blogModel.findOne(obj,(err,obj)=>{
                err? reject(err): resolve(obj)
            });
        })
    }
}
module.exports = new crawlData();