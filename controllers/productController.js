const Product = require('../models/Product');
const path = require('path');
const fs = require('fs');

// @desc    Get all products
// @route   GET /products
// @access  Public (or Private depending on req) - keeping Public for now
exports.getProducts = async (req, res) => {
    try {
        const products = await Product.find({ status: 'Available' }).populate('user', 'name avatar');
        res.render('products/index', {
            title: 'Marketplace',
            products,
            user: req.user
        });
    } catch (err) {
        console.error(err);
        res.render('error', { error: 'Server Error' });
    }
};

// @desc    Get single product
// @route   GET /products/:id
// @access  Public
exports.getProduct = async (req, res) => {
    try {
        const product = await Product.findById(req.params.id).populate('user', 'name email avatar');

        if (!product) {
            return res.render('error', { error: 'Product not found' });
        }

        res.render('products/details', {
            title: product.title,
            product,
            user: req.user
        });
    } catch (err) {
        console.error(err);
        res.status(404).render('error', { error: 'Product not found' });
    }
};

// @desc    Show Create Product Form
// @route   GET /products/create
// @access  Private
exports.createProductForm = (req, res) => {
    res.render('products/create', { title: 'Sell Item', user: req.user });
};

// @desc    Create new product
// @route   POST /products
// @access  Private
exports.createProduct = async (req, res) => {
    try {
        const { title, description, price, category, isAnonymous } = req.body;

        // Handle images
        let images = [];
        if (req.files) {
            req.files.forEach(file => {
                images.push('/uploads/' + file.filename);
            });
        }

        await Product.create({
            title,
            description,
            price,
            category,
            images,
            isAnonymous: isAnonymous === 'on', // Checkbox sends 'on' if checked
            user: req.user.id
        });

        res.redirect('/dashboard');
    } catch (err) {
        console.error(err);
        res.render('products/create', {
            title: 'Sell Item',
            user: req.user,
            error: 'Error creating product. Please try again.',
            formData: req.body // to repopulate form
        });
    }
};

// @desc    Delete product
// @route   DELETE /products/:id
// @access  Private
exports.deleteProduct = async (req, res) => {
    try {
        const product = await Product.findById(req.params.id);

        if (!product) {
            return res.status(404).json({ success: false, error: 'Product not found' });
        }

        // Make sure user is product owner
        if (product.user.toString() !== req.user.id) {
            return res.status(401).json({ success: false, error: 'Not authorized' });
        }

        // Delete images from fs (optional but good practice)
        // product.images.forEach(img => { ...delete logic... });

        await product.deleteOne();

        res.redirect('/dashboard');
    } catch (err) {
        console.error(err);
        res.redirect('/dashboard');
    }
};
