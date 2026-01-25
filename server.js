const express = require('express');
const mongoose = require('mongoose');
const dotenv = require('dotenv');
const path = require('path');
const cookieParser = require('cookie-parser');
const session = require('express-session');
const passport = require('passport');
const http = require('http');
const socketIo = require('socket.io');

// Load env vars
dotenv.config();

// Connect to DB
const connectDB = require('./config/db');
connectDB();

// Passport Config
require('./config/passport')(passport);

const app = express();
const server = http.createServer(app);
const io = socketIo(server);

// Middleware
app.use(express.json());
app.use(express.urlencoded({ extended: true }));
const flash = require('connect-flash');

app.use(cookieParser());
app.use(session({
    secret: process.env.SESSION_SECRET || 'secret',
    resave: false,
    saveUninitialized: false
}));
app.use(flash());
app.use(passport.initialize());
app.use(passport.session());

// Static Files
app.use(express.static(path.join(__dirname, 'public')));

// View Engine
app.set('view engine', 'ejs');
app.set('views', path.join(__dirname, 'views'));

// Global variables for views
app.use((req, res, next) => {
    res.locals.user = req.user || null;
    res.locals.error = req.flash('error');
    res.locals.success = req.flash('success');
    next();
});

// Check user for all routes
const { checkUser } = require('./middleware/checkUser');
app.use(checkUser);

// Notification Middleware
const notification = require('./middleware/notification');
app.use(notification);

// Routes
app.use('/auth', require('./routes/auth'));
app.use('/products', require('./routes/products'));
app.use('/chat', require('./routes/chat'));

// Home Route
app.get('/', (req, res) => {
    // If token exists, redirect to dashboard
    if (req.cookies.token) {
        return res.redirect('/dashboard');
    }
    res.render('index', { title: 'IUT Marketplace', user: req.user });
});

const { protect } = require('./middleware/auth');
const preventCache = require('./middleware/preventCache');
app.get('/dashboard', protect, preventCache, async (req, res) => {
    const Product = require('./models/Product');
    const myProducts = await Product.find({ user: req.user.id });
    res.render('dashboard', { title: 'Dashboard', user: req.user, myProducts });
});

// Socket.io
const Message = require('./models/Message');

io.on('connection', (socket) => {
    console.log('New client connected');

    socket.on('join', (userId) => {
        socket.join(userId);
        console.log(`User ${userId} joined their room`);
    });

    socket.on('chatMessage', async (msg) => {
        const { sender, receiver, content, productId } = msg;

        try {
            // Save to DB
            const newMessage = await Message.create({
                sender,
                receiver,
                content,
                product: (productId && productId.length > 0) ? productId : null // Save product context if valid
            });

            // Emit to receiver's room
            io.to(receiver).emit('message', newMessage);

            // Emit to sender's room as well (to update their view and other tabs)
            if (sender.toString() !== receiver.toString()) {
                io.to(sender).emit('message', newMessage);
            }
            // Emit back to sender (optional if not handling in frontend optimistically)
            // socket.emit('message', newMessage); 
        } catch (err) {
            console.error(err);
        }
    });

    socket.on('disconnect', () => {
        console.log('Client disconnected');
    });
});

const PORT = process.env.PORT || 5000;

server.listen(PORT, () => {
    console.log(`Server running on port ${PORT}`);
});
