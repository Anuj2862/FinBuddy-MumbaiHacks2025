const mongoose = require('mongoose');
require('dotenv').config();

mongoose.connect(process.env.MONGODB_URI || 'mongodb://localhost:27017/finbuddy')
    .then(async () => {
        console.log('Connected. Dropping users collection to clear old indexes...');
        try {
            await mongoose.connection.db.dropCollection('users');
            console.log('Users collection dropped.');
        } catch (e) {
            console.log('Collection might not exist or error:', e.message);
        }
        process.exit(0);
    })
    .catch(err => {
        console.error(err);
        process.exit(1);
    });
