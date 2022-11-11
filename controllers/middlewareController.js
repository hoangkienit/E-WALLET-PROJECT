const jwt = require('jsonwebtoken')
var session = require('express-session')
var {User} = require('../models/users')

const middlewareController = {
    //verify token
    verifyToken: (req,res,next) => {
        const token = req.session.token;
        if (token) {
            const accessToken = token.split(" ")[1];
            jwt.verify(accessToken, process.env.ACCESS_TOKEN_PASS, (err, user) => {
                if(err){res.status(403).json("Invalid token" + err + token)}
                req.user = user;
                next();
            })
        }else {res.redirect('/user/login')}
    },
    //Check admin
    verifyAdminToken: (req,res,next) => {
        middlewareController.verifyToken(req,res, () => {
            const user = User.findOne({username: req.session.username}, (err,user) => {
                if (err){res.status(403).json('Database Error: cannot query data from database')}
                if(user.role == true){
                    next()}
                else {res.status(403).json("You are not allowed to enter admin page")}
            });
        })
    },
    //Check first time login
    checkUserFirstTimeLogin: (req,res,next) => {
        middlewareController.verifyToken(req,res, () => {
            const user = User.findOne({username: req.session.username}, (err,user) => {
                if (err){res.status(403).json('Database Error: cannot query data from database')}
                if(user.firstTimeLogin == true){
                    req.session.changeForce = 'You must change your password before using our service because of security'
                    res.redirect('/home/edit')}
                else {next();}
            });
        })
    },
    //Check if user is not verify by admin
    checkUserNotVerify: (req,res,next) => {
        middlewareController.verifyToken(req,res, () => {
            const user = User.findOne({username: req.session.username}, (err,user) => {
                if (err){res.status(403).json('Database Error: cannot query data from database')}
                if(user.status == 'pending-verification'){
                    res.render('home',{msg: "This feature is only available for verified accounts"})
                }
                else {next();}
            });
        })
    },
    //Check user login failed
    checkUserLoginFailed: (req,res,next) => {
        middlewareController.verifyToken(req,res, async () => {
            const user =  User.findOne({username: req.body.username},async (err,status) => {
                if(status){
                    const failed = user.unusual_login
                if (failed == 2) {
                //Temporary lock set count = 10
                await User.updateOne({ username: req.body.username }, {$set: {unusual_login: 10} })

                //Unlocked user after 1 minutes then return count = 3;
                var blockUserOneMinutes = setTimeout(async function () {
                await User.updateOne({ username: req.body.username }, { $set: { unusual_login: 3 } });
                console.log(`Unlocked ${req.body.username}.`);
            }, 60000)};
                }
                if(err){res.status(403).json("Error" + err)}
            })
            });
        
    },
    
}
module.exports = middlewareController;