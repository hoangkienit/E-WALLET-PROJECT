var express = require('express');
var router = express.Router();
var {User} = require('../models/users')
var {creditCards, creditCards} = require('../models/creditCards')
var {transactionHistory} = require('../models/transaction')
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



// User dashboard
router.get('/dashboard',middlewareController.verifyToken,middlewareController.checkUserFirstTimeLogin,(req,res) => {
    return res.render('home',{title: 'Dashboard', user_name: req.session.FULLNAME})
})

//User fisrt time password change
.get('/edit',middlewareController.verifyToken, (req,res) => {
    if(req.session.changeForce){msg = req.session.changeForce}
    else{msg = ''}
    return res.render('edit', {layout: 'main', title: 'PASSWORD CHANGE',msg: msg})
})

.post('/edit',async (req,res) => {
    try {
        var newPassword = req.body.new_password
        var newPasswordConfirm = req.body.new_password_confirm

        if(newPassword != newPasswordConfirm || newPassword && newPasswordConfirm == null){return res.render('edit',{title: 'PASSWORD CHANGE',layout: 'main',msg: "Confirm password does not match! Please try again."})}

            var hashed = await bcrypt.hash(newPassword, saltRounds)
            await User.updateOne({ username: req.session.username }, 
                {$set: {password: hashed, 
                    firstTimeLogin: false, 
                    status: "pending-verification"} 
                });
            // User.close();
            return res.redirect('/home/dashboard');
            
    } catch (error) {
        res.status(401).json(error)
    }
})

//User information
.get('/information', middlewareController.verifyToken, async(req,res) => {
    const user = User.findOne({username: req.session.username}, (err,user) => {
        if (err){res.status(403).json('Database Error: cannot query data from database')}
        if(user){
            return res.render('user_information', {
                layout: 'main', 
                title: 'USER INFORMATION',
                fullname: user.fullname,
                email: user.email,
                address: user.address,
                phone: user.phone,
                amount: user.account_money,
                createAt: user.createAt,
                status: user.status
            })}
        else {res.status(403).json("Connection Error: Failed to load your information")}
    });
})

//User password change function
.get('/change_password',middlewareController.verifyToken, (req,res) => {
    return res.render('user_password_change', {layout: 'main', title: 'PASSWORD CHANGE'})
})
.post('/change_password', async(req,res,next) => {
    try {
        var oldPassword = req.body.old_password
        var newPassword = req.body.new_password
        var newPasswordConfirm = req.body.new_password_confirm
        const user = await User.findOne({username: req.session.username});
        const validPassword = await bcrypt.compare(oldPassword, user.password)
        if(validPassword == false){return res.render('user_password_change',{
            title: 'PASSWORD CHANGE',
            layout: 'main',
            msg: "Your current password does not match"
        })}
        if(newPassword != newPasswordConfirm || newPassword && newPasswordConfirm == null){return res.render('user_password_change',{title: 'PASSWORD CHANGE',layout: 'main',msg: "Confirm password does not match! Please try again."})}
        var hashed = await bcrypt.hash(newPassword, saltRounds)
        await User.updateOne({ username: req.session.username }, {$set: {password: hashed} });
        return res.redirect('/home/dashboard');
            
    } catch (error) {
        res.status(401).json(error)
    }
})

//User recharge money
.get('/recharge', middlewareController.verifyToken, middlewareController.checkUserNotVerify, (req,res,next) => {
    return res.render('recharge',{layout: 'main',title: "RECHARGE MONEY",msg: "Congratulations, your account has been verified by the admin. Now you can use other features!"})
})
.post('/recharge', async(req,res,next) => {
    try {
        const {card_number, cvv_code, expire_date, money_amount} = req.body
        const user = await User.findOne({username: req.session.username});
        if(card_number.length > 6 || card_number.length < 6){
            return res.render('recharge',{
                layout: 'main',
                title: "RECHARGE MONEY",
                err_msg: "This card is not supported."})
        }
        var creditCard = await creditCards.findOne({card_id: card_number})
        if(!creditCard){return res.render('recharge',{
            layout: 'main',
            title: "RECHARGE MONEY",
            err_msg: "Cannot find your credit card."})}
        if(cvv_code !== creditCard.cvv_code){
            return res.render('recharge',{
                layout: 'main',
                title: "RECHARGE MONEY",
                err_msg: "Wrong CVV code. Please check again"})
        }
        if(expire_date !== creditCard.expireDate){
            return res.render('recharge',{
                layout: 'main',
                title: "RECHARGE MONEY",
                err_msg: "Wrong expire date. Please try again"})
        }
        //Check what functions the card has
        const card_limit = creditCard.status;

    switch(card_limit){
        case 'unlimited':
            var amount = user.account_money + Number(money_amount);
            await User.updateOne({ username: req.session.username }, {$set: {account_money:amount} });
            const newTransaction = new transactionHistory({
                trading_code: Math.floor(1000000000 + Math.random() * 9000000000).toString(),
                performer: user.fullname,
                transaction_type: 'recharge-money',
                transaction_money: Number(money_amount),
                status: 'none',
                transaction_fee: 0,
                content: 'none',
                createAt: Date.now()
            });
            await newTransaction.save();
            return res.render('recharge',{
                layout: 'main',
                title: "RECHARGE MONEY",
                msg: `Successfully recharged ${money_amount}$ into your account. Thanks for using our service.`})
        case 'limited':
            if(money_amount > 1000){
                return res.render('recharge',{
                    layout: 'main',
                    title: "RECHARGE MONEY",
                    err_msg: `Deposit failed. You are only allowed to deposit up to 1000 on a single deposit.`})
            }else {
                var amount = user.account_money + Number(money_amount);
                await User.updateOne({ username: req.session.username }, {$set: {account_money: amount} });
                const newTransaction = new transactionHistory({
                    trading_code: Math.floor(1000000000 + Math.random() * 9000000000).toString(),
                    performer: user.fullname,
                    transaction_type: 'recharge-money',
                    transaction_money: Number(money_amount),
                    status: 'none',
                    transaction_fee: 0,
                    content: 'none',
                    createAt: Date.now()
                });
                await newTransaction.save();
                return res.render('recharge',{
                    layout: 'main',
                    title: "RECHARGE MONEY",
                    msg: `Successfully recharged ${money_amount}$ into your account. Thanks for using our service.`})
            }
        case 'outofmoney':
            return res.render('recharge',{
                layout: 'main',
                title: "RECHARGE MONEY",
                err_msg: `This card is out of money, please top up the card to continue.`})
        default: 
                res.status(403).json("Cannot recharge money at the moment. Please try again in a few minutes.")
    }
    } catch (error) {
        return res.status(403).json("Error from server. Please try again later: " + error)
    }
})

//Transaction history
.get('/transaction',middlewareController.verifyToken, middlewareController.checkUserNotVerify, async(req,res) => {
    try {
        var transactionList = await transactionHistory.find({status: "none"}).lean()
            .exec((err,data) => {
                if(err){throw Error('Error' + err)}
                if(data){
                    res.render('transaction', {transaction: data,layout: 'main', title: 'TRANSACTION HISTORY'})
                    }else {res.status(403).json("Database Error : Failed to load resource from database")}
            })
        
    } catch (error) {
        res.status(403).json("Error from catch")
    }
})




//User logout
.get('/logout', function (req, res) {
    req.session = null; 
    res.redirect('/user/login'); //Need to remake
});
module.exports = router;