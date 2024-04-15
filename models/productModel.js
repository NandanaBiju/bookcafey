const mongoose=require("mongoose");
const productSchema=new mongoose.Schema({
    pname:{
        type:String,
        required:true
    },
    price:{
        type:Number,
        required:true
    },
    offprice:{
        type:Number,
        required:true,
    },
    // productOffer: {
    //     type: Number,
    //     default: 0,
    // },
    discountPercentage:{
        type:Number,
        default:0,
    },
    description:{
        type:String,
        required:true
    },
    images:[
        {
            type:String,
        },
    ],
    category:{
        type: mongoose.Schema.Types.ObjectId,
        ref: "Category",
        required: true,
    },
    language:{
        type:String,
        required:true,
    },
    color:{
        type:String,
        required:true
    },
    is_listed:{
        type:Boolean,
        required:true
    },
    countInStock:{
        type:Number,
        required:true,
        min:0,
        max:300
    },
    productOffer: {
        type: Number,
        default: 0,
    },
})
module.exports=mongoose.model("Product",productSchema);