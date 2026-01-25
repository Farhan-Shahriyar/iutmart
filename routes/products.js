const express = require('express');
const router = express.Router();
const {
    getProducts,
    getProduct,
    createProductForm,
    createProduct,
    deleteProduct
} = require('../controllers/productController');
const { protect } = require('../middleware/auth');
const upload = require('../middleware/upload');

// Public routes
router.get('/', getProducts);

// Protected routes
router.get('/create', protect, createProductForm);
router.post('/', protect, upload.array('images', 5), createProduct); // Allow up to 5 images
router.get('/:id', getProduct);

// Delete handled via POST for simplicity in HTML forms (method override or JS fetch needed for DELETE)
// OR use a specific delete route like /:id/delete
router.post('/:id/delete', protect, deleteProduct);

module.exports = router;
