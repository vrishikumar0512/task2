const express = require('express');
const Product = require('../models/Product');
const { ensureDbConnected } = require('../db');

const router = express.Router();

// GET /api/products - Retrieve all products, optionally filtered by search query
router.get('/', async (req, res) => {
  try {
    const isConnected = await ensureDbConnected();
    if (!isConnected) {
      return res.status(503).json({ message: 'Database connection unavailable. Unable to fetch products.' });
    }

    const searchQuery = String(req.query.search || req.query.q || '').trim();
    let filter = {};

    if (searchQuery) {
      // Escape regex special characters to prevent invalid regex errors
      const escapedQuery = searchQuery.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
      // Case-insensitive, partial-name or category matching across the complete product collection
      filter.$or = [
        { name: { $regex: escapedQuery, $options: 'i' } },
        { category: { $regex: escapedQuery, $options: 'i' } }
      ];
    }

    // Retrieve ALL matching products across the collection without limiting to one match
    const products = await Product.find(filter).sort({ id: 1 });
    return res.json(products);
  } catch (error) {
    console.error('Error fetching products from MongoDB:', error.message);
    return res.status(500).json({ message: 'Unable to fetch products' });
  }
});

// GET /api/products/:id - Retrieve product by ID
router.get('/:id', async (req, res) => {
  try {
    const isConnected = await ensureDbConnected();
    if (!isConnected) {
      return res.status(503).json({ message: 'Database connection unavailable. Unable to fetch product.' });
    }

    const productId = parseInt(req.params.id, 10);

    if (isNaN(productId)) {
      return res.status(400).json({ message: 'Invalid product ID' });
    }

    const product = await Product.findOne({ id: productId });

    if (!product) {
      return res.status(404).json({ message: 'Product not found' });
    }

    return res.json(product);
  } catch (error) {
    console.error('Error fetching product by ID from MongoDB:', error.message);
    return res.status(500).json({ message: 'Unable to fetch product' });
  }
});

module.exports = router;

