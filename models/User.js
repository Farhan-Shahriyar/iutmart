const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');

const UserSchema = new mongoose.Schema({
    name: {
        type: String,
        required: [true, 'Please add a name']
    },
    email: {
        type: String,
        required: [true, 'Please add an email'],
        unique: true,
        match: [
            /^[a-zA-Z0-9._%+-]+@iut-dhaka\.edu$/,
            'Please use a valid @iut-dhaka.edu email address'
        ]
    },
    studentId: {
        type: String,
        unique: true,
        sparse: true
    },
    contactNumber: {
        type: String
    },
    password: {
        type: String,
        select: false // Do not return password by default
    },
    googleId: String,
    githubId: String,
    isAdmin: {
        type: Boolean,
        default: false
    },
    avatar: {
        type: String,
        default: 'default-avatar.png'
    },
    isVerified: {
        type: Boolean,
        default: false
    },
    otp: String,
    otpExpires: Date,
    createdAt: {
        type: Date,
        default: Date.now
    },
    lastLogout: {
        type: Date,
        default: null
    }
});

// Encrypt password using bcrypt
// Encrypt password using bcrypt
UserSchema.pre('save', async function () {
    // If password is not modified OR if it doesn't exist (e.g. OAuth), skip hashing
    if (!this.isModified('password') || !this.password) {
        return;
    }
    const salt = await bcrypt.genSalt(10);
    this.password = await bcrypt.hash(this.password, salt);
});

// Match user entered password to hashed password in database
UserSchema.methods.matchPassword = async function (enteredPassword) {
    return await bcrypt.compare(enteredPassword, this.password);
};

module.exports = mongoose.model('User', UserSchema);
