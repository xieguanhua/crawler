const mongoose = require('mongoose');

mongoose.connect('mongodb://localhost/app',{useNewUrlParser:true,useUnifiedTopology: true},function(err){
    if(err){
        console.log('Connection Error:' + err)
    }else{
        console.log('mongoose Connection success!')
    }
});

module.exports = mongoose;