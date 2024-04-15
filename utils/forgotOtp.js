const nodemailer=require("nodemailer");
// require("dotenv").config();
require('dotenv').config();

const transporter=nodemailer.createTransport({
    host:"smtp.gmail.com",
    port:587,
    secure:false,
    requireTLS:true,
    auth:{
        user:process.env.EMAIL_USER,
        pass:process.env.EMAIL_PASSWORD
    }
    
})

async function sendForgotPasswordOTP(email,otp){
        const mailOptions={
            from:'"Book Cafe" <bcafe6313@gmail.com>',
            to:email,
            subject:'your one time passord , bookcafe forgot password',
            text:`Hi, your one time password for resetting your password is:${otp}`
        };
        try{
            const info=await transporter.sendMail(mailOptions);
            console.log("Email sent successfully!:",info.response)
            console.log("Your ForgotPassword OTP is :",otp);
            return otp;
        }catch(error){
            console.error("Error occured while sending email",error);
            throw new Error("Failed to send OTP through email")
        }
}

module.exports={sendForgotPasswordOTP};