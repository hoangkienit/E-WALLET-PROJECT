const mongoose = require('mongoose');
const dbName = process.env.dbName;

const connectString = 'mongodb://localhost:27017/' + dbName;
mongoose.connect(connectString,{useNewUrlParser: true})
console.log('Database connected')
const mongoDB = mongoose.connection;
mongoDB.on('error', console.error.bind(console,'MongoDB connection error:'))
module.exports = mongoDB;