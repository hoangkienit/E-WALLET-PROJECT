const express = require('express')
const hbs = require('express-handlebars')
const mongoose = require('mongoose');
const app = express()
var path = require('path')
const dotenv = require('dotenv')
dotenv.config({path: './.env'})
require('./databases/mongodb');
var session = require('express-session')

console.log(process.env.environment)
app.engine('handlebars', hbs.engine({
    defaultLayout: 'main'
}))

app.use(express.static(__dirname))
var homeRouter = require('./routes/home')
var userRouter = require('./routes/user')
var adminRouter = require('./routes/admin')

app.set('view engine','handlebars')
app.use(session({secret:'gdrgerted'}))
app.use(express.urlencoded())
app.set('views', path.join(__dirname, '/views'))
app.use('/home',homeRouter)
app.use('/user', userRouter)
app.use('/admin', adminRouter)

app.listen(process.env.APP_PORT , () => console.log('Web started at port ' + process.env.APP_PORT))