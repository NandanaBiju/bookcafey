const mongoose=require("mongoose");
const categorySchema=new mongoose.Schema({
    name:{
        type:String,
        required:true,
    },
    description:{
        type:String,
        required:true,
    },
    createdAt:{
        type:Date,
        default:Date.now
    },
    is_blocked:{
        type:Boolean,
        default:false
    },
    is_listed:{
        type:Boolean,
        required:true
    },
    categoryOffer : {
        type : Number,
        default : 0
    }
})
module.exports=mongoose.model("Category",categorySchema);