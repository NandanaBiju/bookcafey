const mongoose=require("mongoose");
const express=require("express");
const app=express();
// require("dotenv").config();
require('dotenv').config();
// const cors=require("cors");
const passport=require("passport");
const passportStratergy=require("./passport")
const path=require("path");
const bodyparser=require("body-parser");
const session=require("express-session");
const flash=require("connect-flash");
// const userRoute=require("./routes/userRoute")
const auth=require("./middleware/auth");

app.set("view engine","ejs");
app.set("views","./views/users")

let mongourl="mongodb+srv://nandanabiju00:9tsVMReem8zfoOSN@cluster0.9oewiel.mongodb.net/bookcafe?retryWrites=true&w=majority&appName=Cluster0"
mongoose.connect(mongourl);

mongoose.connection.on("connected",()=>{
    console.log("DataBase Connected Successfully");
})

mongoose.connection.on("disconnected",()=>{
    console.log("DataBase Disconnected!");
})

mongoose.connection.on("error",()=>{
    console.log("DataBase cause error!");
})

app.use(bodyparser.json());
app.use(bodyparser.urlencoded({extended:true}));

//serving staticfiles
app.use(express.static(path.join(__dirname,"public")))
app.use("/products",express.static(path.join(__dirname,"public")));
app.use("/admin/users",express.static(path.join(__dirname,"public")));
app.use("/admin/products",express.static(path.join(__dirname,"public")));


app.use(session({
    secret:process.env.SESSION_SECRET,
    resave:true,
    saveUninitialized:true,
}));
app.use(flash());


//user route
const userRoute=require("./routes/userRoute");
app.use("/",userRoute)

//adminroute
const adminRoute=require("./routes/adminRoute");
app.use("/admin",adminRoute);

//404 error page
app.use("*",(req,res,next)=>{
    res.render("error404")
})
const PORT = process.env.PORT || 3000;
app.listen(PORT,function check(error){
    if(error){
        console.log("Error caused while running server");
    }
    else{
        console.log(`Server is running on....http://localhost:${PORT}`)
    }
})