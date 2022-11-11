let mongoose = require("mongoose")
const otpChema = new mongoose.Schema({
    otp_req_email: {
        type: String,
        require: true,
        trim: true
    },
    otp: {
        type: String
    },
    createAt: {
        type: Date
    },
    expireAt: {
        type: Date
    }
});
const OTP = mongoose.model('otps', otpChema)
module.exports = {OTP};