const mongoose=require("mongoose");
const walletSchema=new mongoose.Schema({
    userId:{
        type:mongoose.Schema.Types.ObjectId,
        ref:"User",
        require:true,
    },
    balance:{
        type:Number,
    },
    transactions:[
        {
            id:{
                type:Number,
            },
            date:{
                type:String,
            },
            amount:{
                type:Number,
            },
            orderType:{
                type:String,
            },
            type: { 
                type: String,
                enum: ['Credit', 'Debit'] 
            }
        },
    ],
    
},{versionKey:false})
module.exports=mongoose.model("wallet",walletSchema)