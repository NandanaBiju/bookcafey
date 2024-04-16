const User=require("../models/userModel");
const bcrypt=require("bcryptjs");
const {use}=require("../routes/userRoute");
const{sendForgotPasswordOTP}=require("../utils/forgotOtp");
const{sendInsertOtp}=require("../utils/insertOtp");
const{generateOtp}=require("../utils/otphandle");
const flash=require("connect-flash");
const {generateOrder} = require("../utils/otphandle")
const referralCode = require("../utils/referalCode")


const Product=require("../models/productModel");
const Category=require("../models/categoryModel");
const Address=require("../models/addressModel");
const Order=require("../models/orderModel");
const Cart=require("../models/cartModel");
const Coupon = require('../models/couponModel');
const Wallet = require("../models/walletModel");



const otpExpirationTime = 60000;

//load login page
const loadLogin=async(req,res)=>{
    try{
        res.render("login")
    }catch(error){
        console.log(error.message);
    }
}

//load register page
const loadRegister = async (req, res) => {
    try {
       
        res.render('register', { error:null });

    }
    catch (error){
        console.log(error.message);
    }
}



//verify login user details
const verifyLogin = async (req, res) => {
    try {
        const { email, userpassword } = req.body;

        if (!email || !userpassword) {
            req.flash('error', 'Email and password are required');
            return res.redirect('/login');
        }

        const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
        if (!emailRegex.test(email)) {
            req.flash('error', 'Please enter a valid email address');
            return res.redirect('/login');
        }


        const userData = await User.findOne({ email });

        console.log(userData);

        if (!userData) {
            req.flash('error', 'User not found');
            return res.redirect('/login');
        }

        if (userData.is_blocked) {
            req.flash('error', 'Your account has been blocked. Please contact the admin.');
            return res.redirect('/login');
        }

        const hashedPassword = await bcrypt.compare(userpassword, userData.password);

        if (!hashedPassword) {
            req.flash('error', 'Invalid password');
            return res.redirect('/login');
        }

        console.log(hashedPassword, 'password');
        

        if (hashedPassword) {
            if (userData.is_blocked) {
                return res.render('login', { message: "User has been blocked" });
            }
            req.session.user = userData;
            console.log(req.session.user);
            res.redirect('/home');
        }
        else {
            console.log("home rendering");
            res.render('login', { message: 'Invalid Password' })
        }
    }
    catch (error) {
        console.log(error.message);
        res.status(500).json({ message: "Internal server error" });

    }
}

//loading homepage
const loadHome=async(req,res)=>{
    try{
        if(req.session.user){
        // res.render("home");
        const user=await User.findById(req.session.user._id);
        if(user&&user.is_blocked){
            req.flash("error","your account has been blocked by the admin");
            return res.redirect("/login");
        }
        res.render("home")
        }else{
            res.redirect("/login")
        }
    }catch(error){
        console.log(error.message);
    }
}



//logout page
const logout=async(req,res)=>{
    try{
        req.session.destroy();
        res.redirect("/");
    }catch(err){
        console.log(err);
        res.status(500).json({message:"Error while logging out!"})
    }
}


//loading Guest user Page
const loadGuestUser=async(req,res)=>{
    try{
        const productall=await Product.find({})
        const categoryall=await Category.find()
        res.render("guestUser",{product:productall,category:categoryall})
    }catch(error){
        console.log(error.message)
    }
}

//load product page
const loadProducts=async(req,res)=>{
    try{
        const allproducts=await Product.find({});
        const allcategory=await Category.find({});
        res.render("products",{product:allproducts,category:allcategory})
    }catch(error){
        console.log(error.message);
    }
}



//registration validation
const insertUser = async (req, res) => {
    try {
        const { name, email, mobileno, userpassword, confirmpassword, gender ,  referral} = req.body;
        console.log(referral,"reefer in insertuser");
        const existingUser = await User.findOne({ email: email });
        if (existingUser) {
            return res.redirect('/register?error=Email already exists. Please use a different email.');
        }

        
        if (userpassword === confirmpassword) {
            
            const otp = generateOtp();
            const otpTimestamp = Date.now();
            console.log(otp,"genearted otp");

            if(referral != ""){
                console.log("inside referr if");
                const searchReffer = await User.findOne({referralCode: referral})
                console.log(searchReffer);
                if(searchReffer){
                    console.log("inside reffer");
                    
                    req.session.Data = { name, email, mobileno, userpassword, confirmpassword, otp, gender, otpTimestamp,referral };
                    console.log(req.session.Data);
                    req.session.save();
                    // return res.redirect('/verifyOTP');
                }
               
    
    
            } else{
                console.log("inside else in insertuser");
                 req.session.Data = { name, email, mobileno, userpassword, confirmpassword, otp, gender, otpTimestamp };
                 req.session.save();
                 console.log(req.session.Data,"after");

             }



            // req.session.Data = { name, email, mobileno, userpassword, confirmpassword, otp, gender, otpTimestamp,referral };
            // req.session.save();

            const sentEmailUser = await sendInsertOtp(email, otp);
            if (sentEmailUser) {
                return res.redirect('/verifyOTP');
            }
        } else {
            return res.render('register', { error: 'Passwords do not match.' });
        }



    } catch (error) {
        console.log(error.message);
        return res.render('register', { error: 'An error occurred. Please try again later.' });
    }
}

//loading OTP page from register page
const loadOtp=async(req,res)=>{
    try{
        res.render("verifyOTP",{message:null});
    }catch(error){
        console.log(error.message);
    }
}


const getOtp = async (req, res) => {
    try {
        const otpInBody = req.body.otp;
        const otp = req.session.Data;

        if (!otp) {
            // showPopup("Session data not found. Please try again.");
            return res.status(400).json({ error: "Session data not found. Please try again." });
        }

        if (otpInBody !== otp.otp || (Date.now() - otp.timestamp) > otpExpirationTime) {
            // showPopup("OTP is invalid or has expired!");
            return res.status(400).json({ error: "OTP is invalid or has expired!" });
        }
        const refferal=referralCode(8);
        const { name, email, mobileno, userpassword,gender,referral } = req.session.Data;

        const passwordHash = await bcrypt.hash(userpassword, 10);

        const existingUser = await User.findOne({ email: email });

        if (!existingUser) {
            const user = new User({
                name: name,
                email: email,
                gender: gender,
                mobile: mobileno,
                password: passwordHash,
                is_admin: 0,
                is_verified: 1,
                is_blocked: false,
                referralCode:refferal
            });
            await user.save()
        }
        if(req.session.Data.referral){
            console.log(req.session.Data.referral, "inside session reffer");
            const findUser = await User.findOne({ referralCode: req.session.Data.referral });
            console.log("user inside refeer to find refeeral", findUser);
            
            if (findUser) {
                console.log("inside finduser finded");
                const userWallet = await Wallet.findOne({ userId: findUser._id });
                console.log(userWallet,"userwallet");
                if (userWallet) {
                    const updateWallet = await Wallet.findOneAndUpdate(
                        { userId: findUser._id },
                        {
                            $inc: { balance: 100 },
                            $push: {
                                transactions: {
                                    id: Tid,
                                    date: date,
                                    amount: 100,
                                    orderType: 'Referral Bonus',
                                    type: 'Credit'
                                }
                            }
                        }
                    );
                } else {
                    console.log("else in wallet case");
                    const createWallet = new Wallet({
                        userId: findUser._id,
                        balance: 100,
                        transactions: [{
                            id: Tid,
                            date: date,
                            amount: 100,
                            orderType: 'Referral Bonus',
                            type: 'Credit'
                        }]
                    });
                    await createWallet.save();
                }

                // Create wallet for the new user
                const newUser = await User.findOne({ email: req.session.Data.email });
                const newWallet = new Wallet({
                    userId: newUser._id,
                    balance: 100,
                    transactions: [{
                        id: Tid,
                        date: date,
                        amount: 100,
                        orderType: 'Referral Bonus',
                        type: 'Credit'
                    }]
                });
                await newWallet.save();
            }


        }
       


        console.log("Registration successful!");
        // showPopup("Registration successful!");
        return res.redirect("/login?registration=complete");
    } catch (error) {
        console.error("Error in OTP verification:", error);
        // showPopup("An error occurred during OTP verification");
        return res.status(500).json({ error: "An error occurred during OTP verification" });
    }
}


//resend otp
const resendotp=async(req,res)=>{
    try{
        // if(req.body.userpassword===req.body.confirmpassword){
        //     return res.redirect("/verifyOTP");
        // }
        const enteremail=req.session.Data.email;
        if(!enteremail){
            console.log("error occured")
           return res.status(400).send("Email address is not found")
           
        }
        const otp=generateOtp();
        // if (otpExpired(otp)) {
        //     console.log("OTP has expired. Please request a new OTP.");
        // }
        // const otp = generateOtp();
        const timestamp = Date.now();
        req.session.Data.otp = otp;
        req.session.Data.timestamp = timestamp;

        // Save session
        req.session.save();
        // const{name,email,mobileno,userpassword,confirmpassword}=req.body;
        // req.session.Data={name,email,mobileno,userpassword,confirmpassword,otp}
        // req.session.save();
        const sentEmailUser=await sendInsertOtp(enteremail,otp);
        if(sentEmailUser){
           return res.redirect("/verifyOTP")
        }
    }catch(error){
        console.log(error.message);
        return res.status(500).json({ error: "An error occurred while resending OTP" });
    }
}    

//loading forgot password page
const loadForgotPassword=async(req,res)=>{
    try{
        res.render("forgotPassword");        
    }catch(error){
        console.log(error.message);
    }
}

//sending otp for forgot password
const forgotPassword=async(req,res)=>{
    try{
        const email=req.body.email;
        const user=await User.findOne({email:email})
        if(!user){
            return res.status(404).json({message:"email not found!"});
        }
        const otp=generateOtp();
        const timestamp=Date.now();
        req.session.forgotPassword={email:req.body.email,otp:otp,timestamp:timestamp}
        req.session.save()
        //sendinf otp through email
        const sentEmail=await sendForgotPasswordOTP(req.body.email,otp)
        if(sentEmail){
            res.redirect("/resetPassword")
        }
        console.log("sentedotp:",otp);
    }catch(error){
        console.log(error.message)
        return res.status(500).json({message:"Internal server error!"})
    }
}

const resendfpotp=async(req,res)=>{
    try{
        const email=req.session.forgotPassword.email;
        const user=await User.findOne({email:email})
        if(!user){
            return res.status(404).json({message:"email not found!",email:email});
        }
        // res.redirect("/resetPassword")
        const otp=generateOtp();
        const timestamp=Date.now();
        req.session.forgotPassword.otp = otp;
        req.session.forgotPassword.timestamp = timestamp;
        // req.session.forgotPassword={email:req.session.forgotPassword.email,otp:otp,timestamp:timestamp}
        req.session.save()

        //sendinf otp through email
        const sentEmail=await sendForgotPasswordOTP(req.session.forgotPassword.email,otp)
        if (!sentEmail) {
            return res.status(500).json({ message: "Failed to send OTP through email" });
        }
        console.log("sentedotp:",otp);
        return res.redirect("/resetPassword")
    }catch(error){
        console.log(error.message)
        return res.status(500).json({message:"Internal server error!"})
    }
}

//loading reset password page
const loadPasswordReset=async(req,res)=>{
    try{
        res.render("resetPassword")
    }catch(error){
        console.log(error.message)
    }
}

//updating reseted password on  database
const passwordReset=async(req,res)=>{
    try{
        const otpEntered=req.body.otp;
        const otpStored=req.session.forgotPassword;
        console.log("entered otp id:",otpEntered)
        console.log("real otp is:",otpStored)

        const newPassword=req.body.newPassword
        const hashedPassword=await bcrypt.hash(newPassword,10)
        const confirmNewPassword=req.body.confirmNewPassword

        if(newPassword!==confirmNewPassword){
            return res.status(400).json({message:"Passwords are not matching"})

        }
        if(otpEntered===otpStored.otp&&(Date.now()-otpStored.timestamp)<=otpExpirationTime){
            const user=await User.findOneAndUpdate({email:req.session.forgotPassword.email},{password:hashedPassword},{new:true});
            if(!user){
                return res.status(404).json({message:"User not found"})
            }
            console.log("email where password updated:",req.session.forgotPassword.email)
            console.log("hashed new password is:",hashedPassword)
            res.redirect("/login")
        }else{
            return res.status(500).json({message:"Invalid otp may be your otp expired!"})
        }
    }catch(error){
        console.log("error sending password reset email:",error)
        res.status(500).send({error:"an error occured while processing your request"})

    }
}




const userProfile=async(req,res)=>{
    try{
        const userData=await User.findById(req.session.user._id);
        const address=await Address.findOne({userId:req.session.user._id});
        const orders=await Order.find({userId:req.session.user._id}).sort({_id:-1});
        const findUser = await User.findOne(req.session.user);
  
      
  
        const CouponDataArray = await Coupon.find({
          users: { $nin: [findUser._id] },
          isActive: true
        });
    
        const redeemCoupon = await Coupon.find({
          users: { $in: [findUser._id] },
        });
        res.render("userProfile",{userData,address,orders,redeemCoupon,CouponDataArray});

    }catch(error){
        console.log(error.message);
        res.status(500).send("Internal Serveer Error")
    }
}
const orders = async (req, res) => {
    try {
        const userData = await User.findById(req.session.user._id);
        const address = await Address.findOne({ userId: req.session.user._id });

        const perPage = 5; 
        let page = parseInt(req.query.page) || 1;

        const totalOrders = await Order.countDocuments({ userId: req.session.user._id });
        const totalPage = Math.ceil(totalOrders / perPage);

        if (page < 1) {
            page = 1;
        } else if (page >  totalPage && totalPage > 0) {
            page = totalPage;
        }

        const orders = await Order.find({ userId: req.session.user._id })
            .sort({ _id: -1 })
            .skip(perPage * (page - 1))
            .limit(perPage);

        const pdtDataArray = await Promise.all(orders.map(async (order) => {
            const pdtId = order.items.map(item => item.productId);
            const pdtData = await Product.find({ _id: { $in: pdtId } });
            return pdtData;
        }));

        res.render('orders', { userData, address, orders, pdtDataArray, page, totalPage,perPage  });
    } catch (error) {
        console.log(error.message);
        res.status(500).send("Internal Server Error");
    }
}

const addAddress=async(req,res)=>{
    try{
        const{addressType,name,city,homeAddress,landMark,state,pincode,phone,altPhone}=req.body;

        const existingAddresses=await Address.findOne({userId:req.session.user._id});
        if(existingAddresses&&existingAddresses.address.length>=3){
            req.flash("error","You can only have upto 3 addresses");
            return res.redirect("/userProfile");
        }

        if(phone===altPhone){
            req.flash("error","Phone and Alternate phone number must be different");
            return res.redirect("/userProfile");
        }

        const pincodeRegex=/^\d{6}$/;
        if(!pincodeRegex.test(pincode)){
            req.flash("error","Pincode must be 6 digit number");
            return res.redirect("/userProfile");
        }
        const newAddress={
            addressType,
            name,
            city,
            homeAddress,
            landMark,
            state,
            pincode,
            phone,
            altPhone
        };

        if(existingAddresses){
            existingAddresses.address.push(newAddress);
            await existingAddresses.save();
        }else{
            const address=new Address({
                userId:req.session.user._id,
                address:[newAddress]
            });
            await address.save();
        }
        res.redirect("/userProfile");
    }catch(error){
        console.log(error.message);
        res.status(500).send("internal server error")
    }
}

const renderEditAddress=async(req,res)=>{
    try{
        const addressId=req.query.addressId;
        const user=req.session.user;

        const address=await Address.findOne({userId:user._id,"address._id":addressId});

        if(!address){
            return res.status(404).send("address not found!");
        }

        const addressData=address.address.find(addr=>addr._id.toString()===addressId)

        res.render("editAddress",{address:addressData,addressId:addressId})
    }catch(error){
        console.log(error.message);
        res.status(500).send("Internal server error")
    }
}


const editAddress=async(req,res)=>{
    try{
        const addressId=req.params.addressId;
        const{name,addressType,city,homeAddress,landMark,state,pincode,phone,altPhone}=req.body;

        const updatedAddress={
            name,
            addressType,
            city,
            homeAddress,
            landMark,
            state,
            pincode,
            phone,
            altPhone,
        };

        const result=await Address.findOneAndUpdate(
            {"address._id":addressId},
            {$set:{'address.$':updatedAddress}},
            {new:true}
        );

        if(!result){
            return res.status(404).send("address not found");
        }
        res.redirect("/userProfile");



    }catch(error){
        console.error(error);
        res.status(500).send("internal server error")
    }
};

const deleteAddress=async(req,res)=>{
    try{
        const addressId=req.params.addressId;
        const address= await Address.findOne({userId:req.session.user._id});

        if(!address){
            return res.status(404).send("address not found")
        }

        address.address=address.address.filter(addr=>addr._id.toString() !==addressId);

        await address.save();

        res.redirect("/userProfile")
    }catch(error){
        console.log(error.message);
        res.status(500).send("Internal Server Error");
    }
}

const verifyReferalCode = async (req, res) => {
    try {
        const referalCode = req.body.referalCode
        if (!req.session.user) {
            throw new Error("Session user not found");
        }
        const currentUser = await User.findOne({ _id: req.session.user })
        // console.log("currentUser=>>>", currentUser hain);
        const codeOwner = await User.findOne({ referralCode: referalCode })
        // console.log("codeOwner=>>>", codeOwner hain);
        if (!currentUser || !codeOwner) {
            throw new Error("Current user or code owner not found");
        }

        if (currentUser.redeemed === true) {
            console.log("You have already redeemed a referral code before!");
            res.json({ message: "You have already redeemed a referral code before!" })
            return
        }

        if (!codeOwner || codeOwner._id.equals(currentUser._id)) {
            console.log("Invalid referral code!");
            res.json({ message: "Invalid referral code!" })
            return
        }

        const alreadyRedeemed = codeOwner.redeemedUsers.includes(currentUser._id)

        if (alreadyRedeemed) {
            console.log("You have already used this referral code!");
            res.json({ message: "You have already used this referral code!" })
            return
        } else {

            await User.updateOne(
                { _id: req.session.user },
                {
                    $inc: { wallet: 100 },
                    $push: {
                        history: {
                            amount: 100,
                            status: "credit",
                            date: Date.now()
                        }
                    }
                }
            )
                .then(data => console.log("currentUser Wallet = > ", data))



            await User.updateOne(
                { _id: codeOwner._id },
                {
                    $inc: { wallet: 200 },
                    $push: {
                        history: {
                            amount: 200,
                            status: "credit",
                            date: Date.now()
                        }
                    }
                }
            )
                .then(data => console.log("codeOwner Wallet = > ", data))

            await User.updateOne(
                { _id: codeOwner._id },
                { $set: { referalCode: referalCode } }
            )

            await User.updateOne(
                { _id: req.session.user },
                { $set: { redeemed: true } }
            )

            await User.updateOne(
                { _id: codeOwner._id },
                { $push: { redeemedUsers: currentUser._id } }
            )

            console.log("Referral code redeemed successfully!");

            res.json({ message: "Referral code verified successfully!" })
            return

        }

    } catch (error) {
        console.error("Error in verifyReferalCode:", error);
         res.redirect("/pageNotFound");
    }
}












module.exports={
    loadLogin,
    loadRegister,
    verifyLogin,
    loadHome,
    logout, 
    insertUser,
    loadOtp,
    getOtp,
    loadForgotPassword,
    forgotPassword,
    loadPasswordReset,
    passwordReset,
    // checkEmailExists,
    

    resendotp,
    loadGuestUser,
    loadProducts,
    resendfpotp,
   

    userProfile,
    addAddress,
    renderEditAddress,
    editAddress,
    deleteAddress,

    orders,
    verifyReferalCode,
   // "hghgh"

    
}