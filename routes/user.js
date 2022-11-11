var express = require('express');
var router = express.Router();
var {User} = require('../models/users')
var {OTP} = require('../models/OTPs')
const bcrypt = require('bcrypt');
const jwt = require('jsonwebtoken')
const saltRounds = 10;
require('../databases/mongodb');
var cookies = require('cookie')
const nodemailer = require("nodemailer");
process.env['NODE_TLS_REJECT_UNAUTHORIZED'] = 0;
const mailer = require('../utils/mailer')
var session = require('express-session')
const alert = require('alert')
const middlewareController = require('../controllers/middlewareController');
const otpGenerator = require('otp-generator');



//Login
router.get('/login', (req,res,next) => {
    if (req.session.login){
        return res.redirect('/home/dashboard')
    }
    return res.render('login',{title: 'LOGIN', layout: 'main'})
})

router.post('/login', async (req,res,next) => {
try {
    
    const user = await User.findOne({username: req.body.username});

    if (!user){return res.render('login', {err: true,msg: 'Invalid username', title: 'LOGIN'})}

    const validPassword = await bcrypt.compare(req.body.password, user.password)
    if(validPassword) {
        req.session.login = true;
        req.session.FULLNAME = user.fullname
        req.session.username = req.body.username;
        const accessToken = jwt.sign({
            username: user.username,
            role: user.role

        },
        process.env.ACCESS_TOKEN_PASS,{
            expiresIn: process.env.tokenLife
        });
        // req.session.accessToken = accessToken;
        user.token = accessToken;
        req.session.token = "Bearer" +" "+ accessToken;
        await User.updateOne({ username: req.body.username }, {$set: {unusual_login: 0} })
        if(req.body.username === 'admin'){return res.redirect('/admin/dashboard')}
        else {return res.redirect('/home/dashboard')}

    }else {
        //Check if user login failed 3 times then blocked user
        // 10 is an intermediate variable
        if (user.unusual_login == 10) {
        return res.render('login',{err: true,msg: 'Account is currently locked, please try again in 1 minute.', title: 'LOGIN'})
        }
        //Check user if login failed 6 times then blocked user permantly
        if (user.unusual_login >= 6) {
            //NEED UPDATE USER STATUS TO permanently disabled AND DATE.now()
        return res.render('login',
        {   err: true,
            msg: 'Account has been locked due to incorrect input password multiple times, please contact your administrator for assistance.', 
            title: 'LOGIN'})
        }
        await User.updateOne({ username: req.body.username }, 
            {$set: {
                unusual_login: user.unusual_login +1
            } });
        //Block process
        middlewareController.checkUserLoginFailed;

            
        //User login failed records
        return res.render('login',{err: true,msg: 'Password does not match', title: 'LOGIN'})}
} 
catch(error) {
        console.log(res.status(500).json(error))
    }
})

//Register
router.get('/register',(req,res,next) => {
    if (req.session.login) {
        return res.redirect('/')
    }
    return res.render('register',{title: "SIGN UP"})
})

var alertFunction = (message) => {
    alert(message)
}

router.post('/register', async (req,res) => {
    try {
        // USER INFORMATION HADNLE
        var email = await User.findOne({email: req.body.email});
        if(email) {res.status(403).json({err: true, msg: 'Email already taken by other user'})}
        else {email = req.body.email}
        var fullName = req.body.fullname
        var phone = await User.findOne({phone: req.body.phone});
        if(phone) {res.status(403).json({err: true, msg: 'Phone already taken by other user'})}
        else {phone = req.body.phone}
        var address = req.body.address;
        var date_of_birth = req.body.date_of_birth

        //HANDLE PASSWORD PROCESS
        var newCharPhone = phone.slice(6,10);
        var newPassword = process.env.PASSWORD_CHARACTER + newCharPhone;
        console.log(newPassword)
        console.log(req.body);
        var hashed = await bcrypt.hash(newPassword,saltRounds)

        //CREATE USER
        const newUser = new User({
            fullname: fullName,
            email: email,
            phone: phone,
            address: address,
            date_of_birth: date_of_birth,
            username: phone,
            password: hashed,
            status: 'pending-approval'
        });
        const insertedUser = await newUser.save();;
        const icon_path = 'https://encrypted-tbn0.gstatic.com/images?q=tbn:ANd9GcQRg7up85E2xLgOqQOjS336RvSVnmSMfaI9VQ&usqp=CAU';

        //SEND MAIL TO USER
            mailer.sendMail(req.body.email,"ACCOUNT INFORMATION FROM E-WALLET",
            `<h2 style="color: darkblue; background-color: pink; width: 700px; padding: 5px; border-radius: 3px;  ">WELCOME <p style="color: red; font-family: recursive">${fullName}<p></h2>
            <h3>Your account has been created from our website so here is your account information.</h3>
            <span><b>USERNAME: </b>${req.body.phone}</span>
            <br>
            <span><b>PASSWORD: </b> ${newPassword} </span>
            <br>
            <br>
            <img src="${icon_path}">
            <b>Thanks for using our service.</b>
            
            `)
            alertFunction("Sign up process successfully")
        
          
          //RETURN LAYOUT 
        return res.render('register', {success: true , msg: 'Sign up process successfully', title: 'SIGN UP'})
    } catch(error) {
        return res.render('register', {err: true ,msg: error, title: 'SIGN UP'})
    }
    })

    // User recovery password
    .get('/recovery', (req,res) => {
        return res.render('recovery', {title: 'RECOVERY', layout: 'main', msg: 'Welcome to recovery password page'})
    })
    .post('/recovery', async(req,res) => {
        try {
            req.session.otp_email = req.body.email
            const user = await User.findOne({email: req.body.email});
            if(!user){return res.render('recovery', { title: 'RECOVERY', layout: 'main', msg: 'Invalid email or account has been deleted.'})}
            req.session.otp_fullname = user.fullname
            const otp = otpGenerator.generate(5, {digits: true,  upperCaseAlphabets: false, specialChars: false, lowerCaseAlphabets: false });
            const newOTP = new OTP({
                otp_req_email: req.body.email,
                otp: otp,
                createAt: Date.now(),
                expireAt: Date.now() + 60000
            })
            newOTP.save()

            //SEND MAIL TO USER
            await mailer.sendMail(req.body.email," RECEIVED: OTP CODE TO RECOVERY PASSWORD",
            `<div style="font-family: Helvetica,Arial,sans-serif;min-width:1000px;overflow:auto;line-height:2">
            <div style="margin:50px auto;width:70%;padding:20px 0">
              <div style="border-bottom:1px solid #eee">
                <a href="" style="font-size:1.4em;color: #00466a;text-decoration:none;font-weight:600">MENYOO E-WALLET</a>
              </div>
              <p style="font-size:1.1em">Hi <b style="color: red">${user.fullname}</b></p>
              <p>Use the following OTP to complete your PASSWORD RECOVERY process. OTP is valid for 1 minutes</p>
              <h2 style="background: #00466a;margin: 0 auto;width: max-content;padding: 0 10px;color: #fff;border-radius: 4px;">${otp}</h2>
              <p style="font-size:0.9em;">Regards,<br />Menyoo</p>
              <hr style="border:none;border-top:1px solid #eee" />
              <div style="float:right;padding:8px 0;color:#aaa;font-size:0.8em;line-height:1;font-weight:300">
                <p>MENYOO Inc</p>
                <p>19 Nguyen Huu Tho</p>
                <p>P.Tan Phong Q7</p>
              </div>
            </div>
          </div>
            `)
            return res.redirect('/user/otp_verify')
        }
        catch (error) {
            res.status(403).json("Error from catch")
        }
    })

    //OTP verify
    .get('/otp_verify', (req,res) => {
        return res.render('otp_verify', {email: req.session.otp_email, title: 'OTP VERIFY', layout: 'main', msg: 'Check your inbox to fill otp code.'})
    })
    //Post otp code to server and compare in database
    .post('/otp_verify', async(req,res) => {
        try {
            const digit_1 = req.body.digit_1
            const digit_2 = req.body.digit_2
            const digit_3 = req.body.digit_3
            const digit_4 = req.body.digit_4
            const digit_5 = req.body.digit_5

            if(digit_1 == null || digit_2 == null || digit_3 == null || digit_4 == null || digit_5 == null){
                return res.render('otp_verify', {title: 'OTP VERIFY', layout: 'main', err_msg: 'Please fill the OTP code.'})
            }
            const otp_digit = digit_1+ digit_2+ digit_3+ digit_4+ digit_5 +''

            const otp_in_db = await OTP.find({email: req.session.otp_email});
            
            console.log('Latest otp in db: ' + otp_in_db[otp_in_db.length - 1].otp)
            //Take latest information of user otp
            const  {expireAt} = otp_in_db[otp_in_db.length - 1];
            const otp = otp_in_db[otp_in_db.length - 1].otp;
            if (expireAt < Date.now()){
                await otp_in_db.deleteMany({email: req.session.otp_email})
                console.log("Hello")
                return res.render('otp_verify', {title: 'OTP VERIFY', layout: 'main', err_msg: 'OTP code has expired. Please request again.'})
            }else {
                if(otp_digit === otp){
                    return res.redirect('/user/otp_verified')
                }
                if(otp_digit != otp){return res.render('otp_verify', {title: 'OTP VERIFY', layout: 'main', err_msg: 'Incorrect OTP code.'})}
            }

        } catch (error) {
            res.status(403).json(error)
        }
    })

    //Change password by otp
    .get('/otp_verified', (req,res) => {
        return res.render('otp_verified', {email: req.session.otp_email, title: 'CHANGE PASSWORD', layout: 'main'})
    })

    .post('/otp_verified', async (req,res) => {
        try {
            var newPassWord = req.body.newPassWord
            var newPassWordConfirm = req.body.newPassWordConfirm
            if(newPassWord !== newPassWordConfirm){return res.render('otp_verified',{title: 'PASSWORD CHANGE',layout: 'main',err_msg: "Confirm password does not match! Please try again."})}
            var hashed = await bcrypt.hash(newPassWord, saltRounds)
            await User.updateOne({ email: req.session.otp_email }, {$set: {password: hashed} });
            return res.redirect('/user/login');
                
        } catch (error) {
            res.status(401).json("Error from catch")
        }
    })
module.exports = router;