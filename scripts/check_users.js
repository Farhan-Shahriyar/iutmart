const mongoose = require('mongoose');
const dotenv = require('dotenv');
const path = require('path');
const User = require('../models/User');

// Load environment variables
dotenv.config({ path: path.join(__dirname, '../.env') });

// Connect to Database
const connectDB = async () => {
    try {
        const conn = await mongoose.connect(process.env.MONGO_URI || 'mongodb://localhost:27017/iut-marketplace');
        console.log(`MongoDB Connected: ${conn.connection.host}`);
    } catch (err) {
        console.error(`Error: ${err.message}`);
        process.exit(1);
    }
};

const checkUsers = async () => {
    await connectDB();

    try {
        const users = await User.find({});
        console.log('\n--- REGISTERED USERS ---');
        if (users.length === 0) {
            console.log('No users found.');
        } else {
            console.table(users.map(u => ({
                ID: u._id.toString(),
                Name: u.name,
                Email: u.email,
                Provider: u.googleId ? 'Google' : (u.githubId ? 'GitHub' : 'Local'),
                Created: u.createdAt.toLocaleString()
            })));
        }
        console.log('------------------------\n');
    } catch (err) {
        console.error(err);
    } finally {
        mongoose.connection.close();
        process.exit();
    }
};

checkUsers();
