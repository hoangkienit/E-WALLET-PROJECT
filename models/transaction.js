let mongoose = require("mongoose")
const transactionChema = new mongoose.Schema({
    trading_code: {
        type: String,
    },
    performer: {
        type: String
    },
    transaction_type: {
        type: String
    },
    transaction_money: {
        type: Number,
    },
    status: {
        type: String
    },
    transaction_fee: {
        type: Number
    },
    content: {
        type: String
    },
    createAt: {
        type: Date
    }
});
const transactionHistory = mongoose.model('transactions', transactionChema)
module.exports = {transactionHistory};