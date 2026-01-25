const User = require('../models/User');
const jwt = require('jsonwebtoken');

// Generate JWT Token
const generateToken = (id) => {
    return jwt.sign({ id }, process.env.JWT_SECRET, {
        expiresIn: '30d'
    });
};

// @desc    Register User
// @route   POST /auth/register
// @access  Public
exports.register = async (req, res) => {
    try {
        const { name, email, password, studentId, contactNumber } = req.body;

        let avatar = 'default-avatar.png';
        if (req.file) {
            avatar = req.file.filename;
        }

        // Check if email domain is valid
        if (!email.endsWith('@iut-dhaka.edu')) {
            return res.status(400).render('register', { error: 'Registration restricted to @iut-dhaka.edu emails only' });
        }

        // Validate Student ID (9 digits)
        if (!/^\d{9}$/.test(studentId)) {
            return res.status(400).render('register', { error: 'Student ID must be exactly 9 digits' });
        }

        // Validate Contact Number (BD format)
        // Matches: +8801..., 8801..., 01...
        if (!/^(?:\+88|88)?(01[3-9]\d{8})$/.test(contactNumber)) {
            return res.status(400).render('register', { error: 'Invalid Bangladesh contact number' });
        }

        // Check if user exists (email or student ID)
        const userExists = await User.findOne({
            $or: [{ email }, { studentId }]
        });

        if (userExists) {
            let msg = 'User already exists';
            if (userExists.email === email) msg = 'Email already registered';
            if (userExists.studentId === studentId) msg = 'Student ID already registered';
            return res.status(400).render('register', { error: msg });
        }

        // Create user
        const otp = Math.floor(100000 + Math.random() * 900000).toString();
        const otpExpires = Date.now() + 5 * 60 * 1000; // 5 mins

        const user = await User.create({
            name,
            email,
            password,
            studentId,
            contactNumber,
            avatar,
            otp,
            otpExpires,
            isVerified: false
        });

        // Send OTP Email
        const sendEmail = require('../utils/sendEmail');
        const emailTemplate = `
            <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; border: 1px solid #ddd; border-radius: 10px; overflow: hidden;">
                <div style="background-color: #CC2936; padding: 20px; text-align: center; color: white;">
                    <h1 style="margin: 0;">IUT Marketplace</h1>
                </div>
                <div style="padding: 20px; background-color: #f9f9f9;">
                    <h2 style="color: #333; text-align: center;">Verify Your Email</h2>
                    <p style="color: #666; text-align: center; font-size: 16px;">Thank you for joining IUT Marketplace. Please use the verification code below to complete your registration.</p>
                    <div style="text-align: center; margin: 30px 0;">
                        <span style="background-color: #fff; padding: 15px 30px; font-size: 24px; font-weight: bold; border: 2px solid #CC2936; border-radius: 5px; color: #CC2936; letter-spacing: 5px;">${otp}</span>
                    </div>
                    <p style="color: #666; text-align: center;">This code will expire in <strong>5 minutes</strong>.</p>
                    <hr style="border: 0; border-top: 1px solid #ddd; margin: 20px 0;">
                    <p style="color: #999; font-size: 12px; text-align: center;">If you didn't request this, please ignore this email.</p>
                </div>
            </div>
        `;

        try {
            await sendEmail({
                email: user.email,
                subject: 'Verify your ID - IUT Marketplace',
                message: emailTemplate
            });

            res.redirect(`/auth/verify?email=${email}`);
        } catch (err) {
            console.error(err);
            // DEV MODE: Log OTP if email fails so user can still test
            console.log('------------------------------------------------');
            console.log('[DEV MODE] Email failed. Here is the OTP:', otp);
            console.log('------------------------------------------------');

            return res.redirect(`/auth/verify?email=${email}&error=CheckConsoleForOTP`);
        }

    } catch (err) {
        console.error(err);
        res.status(500).render('register', { error: err.message });
    }
};

// @desc    Verify OTP
// @route   POST /auth/verify
// @access  Public
exports.verifyOtp = async (req, res) => {
    try {
        const { email, otp } = req.body;
        const user = await User.findOne({ email });

        if (!user) {
            return res.render('verify', { error: 'User not found', email });
        }

        if (user.isVerified) {
            return res.redirect('/auth/login');
        }

        if (user.otp !== otp) {
            return res.render('verify', { error: 'Invalid Code', email });
        }

        if (user.otpExpires < Date.now()) {
            return res.render('verify', { error: 'Code expired. Please request a new one.', email });
        }

        // Verify user
        user.isVerified = true;
        user.otp = undefined;
        user.otpExpires = undefined;
        await user.save();

        // Log them in
        const token = generateToken(user._id);
        res.cookie('token', token, {
            httpOnly: true,
            secure: process.env.NODE_ENV === 'production',
            maxAge: 30 * 24 * 60 * 60 * 1000
        });

        // Use req.login to ensure passport session is active too (essential for social/complete-profile flow)
        req.login(user, function (err) {
            if (err) { return next(err); }
            if (!user.studentId || !user.contactNumber) {
                return res.redirect('/auth/complete-profile');
            }
            return res.redirect('/dashboard');
        });

    } catch (err) {
        console.error(err);
        res.render('verify', { error: 'Server Error' });
    }
};

// @desc    Show Verify Form
// @route   GET /auth/verify
// @access  Public
exports.verifyForm = (req, res) => {
    res.render('verify', { email: req.query.email });
};

// @desc    Login User
// @route   POST /auth/login
// @access  Public
exports.login = async (req, res) => {
    try {
        const { email, password } = req.body;

        // Validate email & password
        if (!email || !password) {
            return res.status(400).render('login', { error: 'Please provide an email and password' });
        }

        // Check for user
        const user = await User.findOne({ email }).select('+password');

        if (!user) {
            return res.status(401).render('login', { error: 'Invalid credentials' });
        }

        // Check if user has a password (social login users might not)
        if (!user.password) {
            return res.status(400).render('login', { error: 'Please login using your social account (Google/GitHub)' });
        }

        // Check password
        const isMatch = await user.matchPassword(password);

        if (!isMatch) {
            return res.status(401).render('login', { error: 'Invalid credentials' });
        }

        if (!user.isVerified) {
            // Check if they are OAuth user (who are verified by default logic usually, but here we enforce OTP for everyone? 
            // OR we assume OAuth is verified. Let's assume OAuth is verified implicitly or we can force them too. 
            // For now, if they have a password (local auth), they MUST be verified.
            if (user.password) {
                return res.redirect(`/auth/verify?email=${user.email}`);
            }
        }

        // Send token in cookie
        const token = generateToken(user._id);
        res.cookie('token', token, {
            httpOnly: true,
            secure: process.env.NODE_ENV === 'production',
            maxAge: 30 * 24 * 60 * 60 * 1000 // 30 days
        });

        res.redirect('/dashboard');
    } catch (err) {
        console.error(err);
        res.status(500).render('login', { error: 'Server Error' });
    }
};

// @desc    Logout User
// @route   GET /auth/logout
// @access  Public
exports.logout = async (req, res) => {
    try {
        // 1. Invalidate JWT Server-side
        if (req.cookies.token) {
            const decoded = jwt.decode(req.cookies.token);
            if (decoded) {
                const user = await User.findById(decoded.id);
                if (user) {
                    user.lastLogout = Date.now();
                    await user.save();
                }
            }
        }
    } catch (err) {
        console.error("Logout Error:", err);
    }

    // 2. Clear JWT Cookie
    res.clearCookie('token', {
        httpOnly: true,
        secure: process.env.NODE_ENV === 'production',
        path: '/'
    });

    // 3. Destroy Passport/Express Session (Important for Google/GitHub Auth)
    req.logout((err) => {
        if (err) { console.error("Passport Logout Error:", err); }

        req.session.destroy((err) => {
            if (err) { console.error("Session Destroy Error:", err); } // Helper to clear cookie not always needed if destroy is used but good to be safe

            // 4. Clear Session Cookie
            res.clearCookie('connect.sid', { path: '/' });

            // 5. Redirect home
            res.redirect('/');
        });
    });
};

// @desc    Show Complete Profile Form
// @route   GET /auth/complete-profile
// @access  Public (Session based)
exports.completeProfileForm = (req, res) => {
    if (!req.isAuthenticated()) {
        return res.redirect('/auth/login');
    }
    res.render('complete-profile', { user: req.user });
};

// @desc    Process Complete Profile
// @route   POST /auth/complete-profile
// @access  Public (Session based)
exports.completeProfile = async (req, res) => {
    try {
        if (!req.isAuthenticated()) {
            return res.redirect('/auth/login');
        }

        const { studentId, contactNumber } = req.body;
        const user = await User.findById(req.user.id);

        if (!user) {
            return res.redirect('/auth/logout');
        }

        // Validate Student ID
        if (!/^\d{9}$/.test(studentId)) {
            return res.render('complete-profile', { error: 'Student ID must be exactly 9 digits', user });
        }

        // Validate Contact
        if (!/^(?:\+88|88)?(01[3-9]\d{8})$/.test(contactNumber)) {
            return res.render('complete-profile', { error: 'Invalid Bangladesh number', user });
        }

        // Check uniqueness
        const existing = await User.findOne({
            $or: [{ studentId }, { contactNumber }],
            _id: { $ne: user._id } // Exclude current user
        });

        if (existing) {
            return res.render('complete-profile', { error: 'Student ID or Contact Number already in use', user });
        }

        user.studentId = studentId;
        user.contactNumber = contactNumber;
        user.isVerified = true;

        if (req.file) {
            user.avatar = req.file.filename;
        }

        await user.save();

        // Regenerate JWT token
        const token = generateToken(user._id);
        res.cookie('token', token, {
            httpOnly: true,
            secure: process.env.NODE_ENV === 'production',
            maxAge: 30 * 24 * 60 * 60 * 1000
        });

        res.redirect('/dashboard');

    } catch (err) {
        res.render('complete-profile', { error: 'Server Error', user: req.user });
    }
};

// @desc    Update User Avatar
// @route   POST /auth/update-avatar
// @access  Private
exports.updateAvatar = async (req, res) => {
    try {
        if (!req.file) {
            req.flash('error', 'Please upload a file.');
            return res.redirect('back');
        }

        const user = await User.findById(req.user.id);
        user.avatar = req.file.filename;
        await user.save();

        req.flash('success', 'Profile picture updated!');
        res.redirect(req.header('Referer') || '/');
    } catch (err) {
        console.error(err);
        req.flash('error', 'Server Error');
        res.redirect(req.header('Referer') || '/');
    }
};

// @desc    Remove User Avatar
// @route   POST /auth/remove-avatar
// @access  Private
exports.removeAvatar = async (req, res) => {
    try {
        const user = await User.findById(req.user.id);
        user.avatar = undefined; // Reset to default (or handle default schema logic)
        await user.save();
        req.flash('success', 'Profile picture removed.');
        res.redirect(req.header('Referer') || '/');
    } catch (err) {
        console.error(err);
        req.flash('error', 'Server Error');
        res.redirect(req.header('Referer') || '/');
    }
};
