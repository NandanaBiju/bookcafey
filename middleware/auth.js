const User=require("../models/userModel");

// const isLogin=async(req,res,next)=>{
//     try{
//         if(req.session.user_id){

//         }else{
//             res.redirect("/")
//         }
//         next();
//     }catch(error){
//         console.log(error.message);
//     }
// }

// const isLogout=async(req,res,next)=>{
//     try{
//         if(req.session.user_id){
//             res.redirect("/home")
//         }
//         next();
//     }catch(error){
//         console.log(error.message)
//     }
// }



// const usernotblocked=async(req,res,next)=>{
//     try{
//         const userData=req.session.user
//         if(userData && userData.is_blocked){
//         //    return res.redirect("/login")
//         return res.status(403).send("Your account has been blocked. Please contact support for assistance.");
//         }
//           next();
//     }catch(error){
//         console.log(error.message);
//         console.log("hhuiugtdrfvghj")
//         res.status(500).json({ message: "Internal server error" });
//     }

// }

const checkAuth=(req,res,next)=>{
    if(req.session.user){
        next()
    }else{
        res.redirect('/login');
    }
}

const isBlocked=async(req,res,next)=>{
    try{
        if(req.session.user){
            const user=await User.findById(req.session.user);
            if(user&&user.is_blocked){
                req.session.destroy();
                return res.redirect("/login");
            }
        }
        next();

    }catch(error){
        console.log(error.message);
        res.status(500).json({message:"Internal Server Error"})
    }
}
// const isAdmin = (req, res, next) => {
//     User.findOne({ isAdmin: "1" })
//         .then((data) => {
//             if (data) {
//                 next();
//             } else {
//                 res.redirect("/admin/login");
//             }
//         })
//         .catch((error) => {
//             console.error("Error in isAdmin middleware:", error);
//             res.status(500).send("Internal Server Error");
//         });

// };

module.exports={
    // isLogin,
    // isLogout, 
    // usernotblocked
    checkAuth,
    isBlocked,
  
}
