const mongoose = require('mongoose');
const { User } = require('./src/models/Schemas');
require('dotenv').config();

mongoose.connect(process.env.MONGODB_URI || 'mongodb://localhost:27017/finbuddy')
    .then(async () => {
        console.log('Connected. Dropping users...');
        await User.deleteMany({});
        console.log('Users collection reset.');
        process.exit(0);
    })
    .catch(err => {
        console.error(err);
        process.exit(1);
    });
