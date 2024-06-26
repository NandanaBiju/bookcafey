const express=require("express");
const user_route=express();

require('dotenv').config();
// const config=require("../config/config");
// const {usernotblocked}=require("../middleware/auth");

const auth=require("../middleware/auth")

//

require("../passport")



user_route.set('view engine','ejs');
user_route.set('views','./views/users')
// app.set('views', path.join(__dirname, 'views'));
const couponController=require("../controllers/couponController")
const userController=require("../controllers/userController");
const cartController=require("../controllers/cartController");
const productController=require("../controllers/productController");
const orderController=require("../controllers/orderController");
const checkoutController = require("../controllers/checkoutController")
const passport = require("passport");

user_route.use(passport.initialize());
user_route.use(passport.session());

// user_route.use(usernotblocked);


user_route.get("/",(req,res)=>{
    // req.session.hi="hello";
    // req.session.save()

    // console.log(req.session);
    res.render("landingpage")
});
user_route.get("/login",(req,res)=>{
    res.render("login",{messages:req.flash("error")})
})


user_route.get("/login",userController.loadLogin);
user_route.post("/login",userController.verifyLogin);

user_route.get("/register",userController.loadRegister);
user_route.post("/register",userController.insertUser);

user_route.get("/verifyOTP",userController.loadOtp);
user_route.post("/verifyOTP",userController.getOtp);

user_route.get("/resend-otp",userController.resendotp);
user_route.get("/resend-forgototp",userController.resendfpotp);
user_route.get("/",userController.loadHome);
// user_route.get("/",(req,res)=>{
//     if(req.user){
//         res.status(200).json({
//             error:false,
//             message:"successfully loged in",
//             user:req.user,
//         })
//     }else{
//         res.status(403).json({error:true,message:"not authorized"})
//     }
// })
user_route.get("/landingpage",userController.logout);

user_route.get("/guestUser",userController.loadGuestUser);
user_route.get("/products",userController.loadProducts)

//google profile loading
user_route.get("/auth/google",
passport.authenticate("google",
{scope:["email","profile"]}));

//after login redirects
user_route.get("/auth/google/callback",
passport.authenticate("google",
{successRedirect:"/home",
failureRedirect:"/login"}))

user_route.get("/forgotPassword",userController.loadForgotPassword);
user_route.post("/forgotPassword",userController.forgotPassword);
// user_route.post('/checkEmailExists',userController.checkEmailExists);

user_route.get("/resetPassword",userController.loadPasswordReset);
user_route.post("/resetPassword",userController.passwordReset);
user_route.get("/resend-forgototp",userController.resendfpotp);

user_route.get('/userProfile', auth.checkAuth, userController.userProfile)
user_route.post('/userProfile', auth.checkAuth, userController.addAddress);
user_route.get('/edit-address', auth.checkAuth, userController.renderEditAddress);
user_route.post('/edit-address/:addressId', auth.checkAuth, userController.editAddress);
user_route.post('/delete-address/:addressId', userController.deleteAddress);
user_route.get('/orders',auth.checkAuth,userController.orders);


user_route.get("/home",auth.isBlocked,productController.loadProduct);
user_route.get("/productDetails",auth.isBlocked,productController.loadIndivitualProduct);

user_route.get('/showproduct', productController.loadProduct);
user_route.get('/shop', auth.checkAuth, auth.isBlocked,productController.loadShop);


user_route.get("/cart", auth.checkAuth, auth.isBlocked,cartController.loadCartpage);
user_route.post("/addCartLoad",auth.checkAuth, auth.isBlocked, cartController.loadCart)
user_route.post('/cartadd', auth.checkAuth, auth.isBlocked, cartController.increment);
user_route.post('/decrement', auth.checkAuth, auth.isBlocked, cartController.decrement);
user_route.post('/pro-del', auth.checkAuth, auth.isBlocked, cartController.removeCart);

user_route.get('/checkout', auth.checkAuth, auth.isBlocked, checkoutController.loadCheckOut);
user_route.get('/checkOutPage', auth.checkAuth, auth.isBlocked, checkoutController.loadCheckOutPage);
user_route.post('/checkOutData', auth.checkAuth, auth.isBlocked, cartController.addOrder);
user_route.get('/orderPlaced',auth.checkAuth,auth.isBlocked,cartController.loadorderPlaced)
user_route.post("/verify-payment",auth.checkAuth,auth.isBlocked,checkoutController.rezopayment)
user_route.post('/paymentfailed',auth.checkAuth,auth.isBlocked,checkoutController.paymentFailed);
user_route.post('/continuePayment',auth.checkAuth,auth.isBlocked,checkoutController.continuePayment);
user_route.post('/payment-success',auth.checkAuth,auth.isBlocked,checkoutController.successPayment);

user_route.get('/orderView',auth.checkAuth,auth.isBlocked,orderController.loadViewOrder);
user_route.post("/cancelOrder",auth.checkAuth,auth.isBlocked,orderController.cancelOrder)
user_route.post("/cancelReturn",auth.checkAuth,auth.isBlocked,orderController.cancelReturn);
user_route.post("/return",auth.checkAuth,auth.isBlocked,orderController.returnRequest);


user_route.get('/wishlist',auth.checkAuth,auth.isBlocked,productController.loadWishList);
user_route.post('/addToWishlist',auth.checkAuth,auth.isBlocked,productController.addToWishlist);
user_route.post('/removefromWishlist',auth.checkAuth,auth.isBlocked,productController.removeWish)
user_route.post("/removeWish",auth.checkAuth,auth.isBlocked,productController.removeFromWishlist);
user_route.post('/search',productController.searchProducts)


user_route.get("/wallet",auth.checkAuth,auth.isBlocked,checkoutController.loadWallet)
// user_route.post("/verifyReferalCode", auth.isBlocked, userController.verifyReferalCode)

user_route.post("/addCash",auth.checkAuth,auth.isBlocked,checkoutController.addWalletCash)

user_route.post("/addAmount",auth.checkAuth,auth.isBlocked,checkoutController.addCash)
// user_route.post("/applyCoupon",auth.checkAuth,auth.isBlocked, userController.applyCoupon)
// user_route.post('/checkEmailExists',userController.checkEmailExists);
user_route.get("/coupon", auth.checkAuth,auth.isBlocked, couponController.loadCoupon);
user_route.post("/applyCoupon",  auth.checkAuth,auth.isBlocked, couponController.applyCoupon);
user_route.get('/pdf',checkoutController.invoice)
//  user_route.post("/walletPayment",cartController.walletPayment)

user_route.use((err, req, res, next) => {
    console.error(err.stack);
    res.status(500).redirect("/error404"); // Redirect to the error page
});
// user_route.get("/cart",userController.loadCart);

// user_route.get("/userProfile",)

module.exports=user_route;