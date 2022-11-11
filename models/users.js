let mongoose = require("mongoose")
const userChema = new mongoose.Schema({
    fullname: {
        type: String,
        require: true
    },
    email: {
        type: String,
        require: true,
        trim: true
    },
    phone: {
        type: String,
        require: true,
        unique: true,
        maxlength:10,
        minlength: 10,
        trim: true
    },
    address: {
        type: String,
        require: true,
    },
    date_of_birth: {
        type: Date,
        require: true
    },
    username: {
        type: String,
        require: true,
        trim: true
    },
    password: {
        type: String,
        require: true,
        minlength: 10
    },
    role: {
        type: Boolean,
        default: false
    },
    status: {
        type: String,
    },
    firstTimeLogin: {
        type: Boolean,
        default: true
    },
    account_money: {
        type: Number,
        default: 0
    },
    unusual_login: {
        type: Number,
        default: 0
    },
    createAt: {
        type: Date,
        default: Date.now
    }
})
const User = mongoose.model('users', userChema)
module.exports = {User};