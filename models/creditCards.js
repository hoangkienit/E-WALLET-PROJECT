let mongoose = require("mongoose")
const creditCard = new mongoose.Schema({
    card_id: {
        type: String
    },
    expireDate: {
        type: String
    },
    cvv_code: {
        type: String
    },
    status: {
        type: String
    }
});
const creditCards = mongoose.model('creditCards', creditCard)
module.exports = {creditCards};