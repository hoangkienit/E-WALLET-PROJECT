var express = require('express');
var router = express.Router();
var {User} = require('../models/users')
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
const { response } = require('express');

//Admin dashboard
router.get('/dashboard',middlewareController.verifyToken,middlewareController.verifyAdminToken,(req,res,next) => {

    return res.render('admin_dashboard',{layout: 'main', title: 'ADMIN DASHBOARD', msg: 'WELCOME TO ADMIN PAGE'})
})


//Unactived user ~ New account not verify by admin
router.get('/unactived_account',middlewareController.verifyToken,middlewareController.verifyAdminToken,async (req,res,next) => {
    try {
        var unactivedList = await User.find({status: "pending-verification"}, {}).lean()
            .exec((err,data) => {
                if(err){throw Error}
                if(data){
                    res.render('unactived', {user: data,layout: 'main', title: 'UNACTIVED USER'})
                    }else {res.status(403).json("Database Error : Failed to load resource from database")}
            })
        
    } catch (error) {
        res.status(403).json("Error from catch")
    }
})


module.exports = router;