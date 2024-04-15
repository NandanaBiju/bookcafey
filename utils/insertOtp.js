const nodemailer=require("nodemailer");
// require("dotenv").config();
require('dotenv').config();


const transporter=nodemailer.createTransport({
    host:"smtp.gmail.com",
    port:587,
    secure:false,
    requireTLS:true,
    auth:{
        user: process.env.EMAIL_USER,
        pass: process.env.EMAIL_PASSWORD
    }
});

async function sendInsertOtp(email,otp){
    if (!email) {
        throw new Error("Recipient email address is empty.");
    }
    const mailOptions={
        from:'"Book Cafe" <bcafe6313@gmail.com>',
        to:email,
        subject:"Your one time password, bookcafe registration",
        text:`Hi,
               Your E-mail OTP to Register to BookCafe is : ${otp}`
                
    };
    try{
        console.log("Sending email with options:", mailOptions);
    const info=await transporter.sendMail(mailOptions);
    console.log("Email sent successfully :" ,info.response);
    console.log(otp);
    return otp
    }catch(error){
        console.error("Error occured while sending email",error);
        throw new Error("failed to send otp through email")
    }
}

module.exports={sendInsertOtp}