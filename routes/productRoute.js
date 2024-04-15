const express=require("express");
const product_route=express();

const session=require("express-session");
const multer=require("multer");
// const config=require("../config/config");
require('dotenv').config();
const path=require("path");

admin_route.use(session({secret:process.env.SESSION_SECRET ,resave:false,saveUninitialized:false}));

const bodyParser=require("body-parser");
admin_route.use(bodyParser.json());
admin_route.use(bodyParser.urlencoded({extended:true}));

const productController=require("../controllers/productController");

product_route.get("/products",productController.loadProducts);
product_route.get("/products/add-product",productController.addProduct);

const storage=multer.diskStorage({
    destination:(req,file,cb)=>{
        cb(null,"./public/productAssets");
    },
    filename:(req,file,cb)=>{
        cb(null,file.fieldname + "_"+Date.now()+path.extname(file.originalname))
    }
})
const upload=multer({storage:storage})

product_route.post("/add-product",upload.array("ProductImage",5),productController.add_Products);

product_route.get("*",function(req,res){
    res.redirect("/admin")
})

product_route.use((err, req, res, next) => {
    console.error(err.stack);
    res.status(500).redirect("/error4040"); // Redirect to the error page
});

module.exports=product_route;
