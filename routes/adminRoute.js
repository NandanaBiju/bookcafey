const express=require("express");
const admin_route=express();


const session=require("express-session");
// const config=require("../config/config");
require('dotenv').config();
const multer=require("multer");
const path=require("path");

// const {isAdmin}=require("../middleware/auth")



admin_route.use(session({secret:process.env.SESSION_SECRET,resave:false,saveUninitialized:false}));

const bodyParser=require("body-parser");
admin_route.use(bodyParser.json());
admin_route.use(bodyParser.urlencoded({extended:true}));

admin_route.set("view engine","ejs");
admin_route.set("views","./views/admin");

const adminController=require("../controllers/adminController");
const orderController = require('../controllers/orderController');
const couponController = require('../controllers/couponController');

admin_route.get("/",adminController.loadLogin);

admin_route.get("/adminLogin",adminController.adminLogout);
admin_route.post("/",adminController.verifyAdmin);

admin_route.get("/home",adminController.loadDashboard);
admin_route.get("/users",adminController.loadUsers)
admin_route.get("/users/edit",adminController.editUser);
admin_route.post("/users/edit",adminController.edit_User);
admin_route.get("/users/delete",adminController.delete_User);
admin_route.get("/products",adminController.loadProducts)
admin_route.get("/products/add-product",adminController.addProduct);
admin_route.get("/products/edit-product",adminController.editProduct);
admin_route.get("/delete-product/:productId",adminController.deleteProduct);
admin_route.get("/category",adminController.loadCategory)

admin_route.get('/order',orderController.loadOrder);
admin_route.get('/orderDetails',orderController.loadOrderDetail);
admin_route.post("/orderSave",orderController.saveOrder)

// admin_route.get("/coupon",adminController.getCouponPageAdmin)
// admin_route.post("/coupon/createCoupon",  adminController.createCoupon)
// admin_route.get("/coupon/editCoupon",adminController.editCoupon)
// admin_route.get("/coupon/deleteCoupon",adminController.deletecoupon)
// admin_route.post("/coupon/updatecoupon",adminController.updatecoupon)


// admin_route.get("/monthly-report",adminController.monthlyreport)
// admin_route.get("/salesReport",  adminController.getSalesReportPage)
// admin_route.get("/salesToday",  adminController.salesToday)
// admin_route.get("/salesWeekly", adminController.salesWeekly)
// admin_route.get("/salesMonthly",  adminController.salesMonthly)
// admin_route.get("/salesYearly",  adminController.salesYearly)
// admin_route.post("/generatePdf",  adminController.generatePdf)
// admin_route.post("/downloadExcel", adminController.downloadExcel)
// admin_route.get("/monthly-report",adminController.monthlyreport)
// admin_route.get("/dateWiseFilter",  adminController.dateWiseFilter)

// admin_route.post("/addProductOffer",  adminController.addProductOffer)
// admin_route.post("/removeProductOffer",  adminController.removeProductOffer)
admin_route.get("/coupon",couponController.loadCouponPage);
admin_route.get("/addCoupon",couponController.loadAddCoupon);
admin_route.post("/addCoupon",couponController.addCoupon);
admin_route.post("/coupon-block",couponController.blockCoupon);
admin_route.get("/coupon-edit",couponController.loadEditCoupon);
admin_route.post("/editCoupon",couponController.editCoupon);

admin_route.post("/addCategoryOffer", adminController.addCategoryOffer)
admin_route.post("/removeCategoryOffer",  adminController.removerCategoryOffer)
admin_route.post("/addProductOffer",  adminController.addProductOffer)
admin_route.post("/removeProductOffer",  adminController.removeProductOffer)


admin_route.get("/sales",adminController.loadSales)
admin_route.get("/salesDate",adminController.dateFilter)
admin_route.get("/date",adminController.sortDate)

const storage=multer.diskStorage({
    destination:(req,file,cb)=>{
        cb(null,"./public/productAssets");
    },
    
    filename:(req,file,cb)=>{
        cb(
            null,
            file.fieldname + "_" + Date.now() + path.extname(file.originalname))
    },
})

const upload=multer({storage:storage});
admin_route.post(
    "/add-product",
    upload.array("ProductImage",4),
    adminController.add_Product);

admin_route.post("/category",adminController.createCategory);
admin_route.get("/category/edit/:id",adminController.editCategory);
admin_route.post("/Category/edit/:id",adminController.edit_Category);
admin_route.get("/category/delete",adminController.deleteCategory);

admin_route.post(
    "/products/edit-product",
    upload.array("ProductImage",4),
    adminController.edit_Product);


admin_route.use((err, req, res, next) => {
    console.error(err.stack);
    res.status(500).redirect("/error4040"); // Redirect to the error page
});


module.exports=admin_route;
