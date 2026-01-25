const mongoose = require('mongoose');
const dotenv = require('dotenv');
const path = require('path');
const User = require('../models/User');
const Product = require('../models/Product');
const Message = require('../models/Message');

dotenv.config({ path: path.join(__dirname, '../.env') });

const users = [
    {
        name: 'Test User 1',
        email: 'user1@iut-dhaka.edu',
        password: 'password123',
        studentId: '190041001',
        contactNumber: '01700000001',
        isVerified: true
    },
    {
        name: 'Test User 2',
        email: 'user2@iut-dhaka.edu',
        password: 'password123',
        studentId: '190041002',
        contactNumber: '01700000002',
        isVerified: true
    },
    {
        name: 'Test User 3',
        email: 'user3@iut-dhaka.edu',
        password: 'password123',
        studentId: '190041003',
        contactNumber: '01700000003',
        isVerified: true
    }
];

const seedDb = async () => {
    try {
        const conn = await mongoose.connect(process.env.MONGO_URI || 'mongodb://localhost:27017/iut-marketplace');
        console.log(`MongoDB Connected: ${conn.connection.host}`);

        // Clear existing data to avoid orphans and duplicates
        await User.deleteMany({});
        // require models at top if not present, but for now assuming we should just be careful.
        // Actually, we need to clear products because they reference users.
        // Since we didn't import Product/Message, we should probably do that or just tell user to run reset_db first.
        // Let's add the imports.

        const Product = require('../models/Product');
        const Message = require('../models/Message');

        await Product.deleteMany({});
        await Message.deleteMany({});

        console.log('Existing users, products, and messages cleared.');

        // Insert new users
        await User.create(users);
        console.log('Users created successfully.');

        console.log('\n--- CREDENTIALS ---');
        users.forEach(user => {
            console.log(`Email: ${user.email} | Password: ${user.password}`);
        });
        console.log('-------------------\n');

    } catch (err) {
        console.error(`Error: ${err.message}`);
    } finally {
        mongoose.connection.close();
        process.exit();
    }
};

seedDb();
