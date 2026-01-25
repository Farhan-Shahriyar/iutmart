const mongoose = require('mongoose');
const dotenv = require('dotenv');
const path = require('path');
const User = require('../models/User');

dotenv.config({ path: path.join(__dirname, '../.env') });

const fixIndexes = async () => {
    try {
        const conn = await mongoose.connect(process.env.MONGO_URI || 'mongodb://localhost:27017/iut-marketplace');
        console.log(`MongoDB Connected: ${conn.connection.host}`);

        // Drop the studentId index if it exists so it can be recreated with sparse: true
        try {
            await User.collection.dropIndex('studentId_1');
            console.log('Dropped studentId index.');
        } catch (e) {
            console.log('studentId index might not exist or already dropped:', e.message);
        }

        // Sync indexes
        await User.syncIndexes();
        console.log('Indexes synced successfully (sparse: true applied).');

    } catch (err) {
        console.error(`Error: ${err.message}`);
    } finally {
        mongoose.connection.close();
        process.exit();
    }
};

fixIndexes();
