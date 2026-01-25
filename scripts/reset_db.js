const mongoose = require('mongoose');
const dotenv = require('dotenv');
const path = require('path');
const User = require('../models/User');
const Product = require('../models/Product');
const Message = require('../models/Message');

dotenv.config({ path: path.join(__dirname, '../.env') });

const resetDb = async () => {
    try {
        const conn = await mongoose.connect(process.env.MONGO_URI || 'mongodb://localhost:27017/iut-marketplace');
        console.log(`MongoDB Connected: ${conn.connection.host}`);

        // Delete all data
        const users = await User.deleteMany({});
        const products = await Product.deleteMany({});
        const messages = await Message.deleteMany({});

        console.log(`\nDeleted ${users.deletedCount} users.`);
        console.log(`Deleted ${products.deletedCount} products.`);
        console.log(`Deleted ${messages.deletedCount} messages.`);

        console.log('Database reset complete.');
    } catch (err) {
        console.error(`Error: ${err.message}`);
    } finally {
        mongoose.connection.close();
        process.exit();
    }
};

const confirm = () => {
    console.log('WARNING: This will delete ALL registered users.');
    console.log('To proceed, run this script, it will execute immediately.');
    // In a real CLI we'd ask for input, but for this quick script we'll just run it.
    resetDb();
}

confirm();
