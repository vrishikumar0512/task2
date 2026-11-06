const express = require('express');
const Order = require('../models/Order');
const Product = require('../models/Product');
const authMiddleware = require('../middleware/authMiddleware');
const { ensureDbConnected } = require('../db');

const router = express.Router();

// Helper: Indian Pincode validation (6 digits, doesn't start with 0)
function isValidPincode(pincode) {
  const pincodeRegex = /^[1-9][0-9]{5}$/;
  return pincodeRegex.test(String(pincode).trim());
}

// Helper: Indian Mobile Number validation (10 digits, starts with 6-9)
function isValidPhone(phone) {
  const phoneClean = String(phone).replace(/[\s-]/g, '');
  const phoneRegex = /^[6-9]\d{9}$/;
  return phoneRegex.test(phoneClean);
}

// POST /api/orders - Place a new order (Protected)
router.post('/', authMiddleware, async (req, res) => {
  try {
    const isConnected = await ensureDbConnected();
    if (!isConnected) {
      return res.status(503).json({ message: 'Database connection unavailable. Please try again shortly.' });
    }

    const { items, deliveryAddress, phone } = req.body;
    const userId = req.user.userId;

    if (!userId) {
      return res.status(401).json({ message: 'Authentication required' });
    }

    // 1. Validate items array
    if (!Array.isArray(items) || items.length === 0) {
      return res.status(400).json({ message: 'Order must contain at least one product' });
    }

    // 2. Validate delivery address
    if (!deliveryAddress || typeof deliveryAddress !== 'object') {
      return res.status(400).json({ message: 'Please provide delivery address details' });
    }

    const { address, city, state, pincode } = deliveryAddress;

    if (!address || typeof address !== 'string' || !address.trim()) {
      return res.status(400).json({ message: 'Delivery address is required' });
    }

    if (!city || typeof city !== 'string' || !city.trim()) {
      return res.status(400).json({ message: 'City is required' });
    }

    if (!state || typeof state !== 'string' || !state.trim()) {
      return res.status(400).json({ message: 'State is required' });
    }

    if (!pincode || !isValidPincode(pincode)) {
      return res.status(400).json({ message: 'Please enter a valid 6-digit postal pincode' });
    }

    // 3. Validate phone number
    if (!phone || !isValidPhone(phone)) {
      return res.status(400).json({ message: 'Please enter a valid 10-digit mobile number' });
    }

    // 4. Secure backend price & total calculation
    // Look up products in MongoDB to prevent client-side price tampering
    const verifiedItems = [];
    let calculatedTotal = 0;

    for (const item of items) {
      const productId = parseInt(item.productId, 10);
      const quantity = parseInt(item.quantity, 10);

      if (isNaN(productId) || isNaN(quantity) || quantity <= 0) {
        return res.status(400).json({ message: 'Invalid product or quantity in order items' });
      }

      const dbProduct = await Product.findOne({ id: productId });
      if (!dbProduct) {
        return res.status(400).json({ message: `Product with ID ${productId} was not found` });
      }

      const itemPrice = dbProduct.price;
      const itemSubtotal = itemPrice * quantity;
      calculatedTotal += itemSubtotal;

      verifiedItems.push({
        productId: dbProduct.id,
        name: dbProduct.name,
        price: itemPrice,
        quantity: quantity,
        subtotal: itemSubtotal
      });
    }

    // 5. Create and save order in MongoDB
    const order = new Order({
      user: userId,
      userId: userId,
      items: verifiedItems,
      totalAmount: calculatedTotal,
      deliveryAddress: {
        address: address.trim(),
        city: city.trim(),
        state: state.trim(),
        pincode: String(pincode).trim()
      },
      phone: String(phone).replace(/[\s-]/g, '').trim(),
      status: 'Placed',
      orderDate: new Date(),
      createdAt: new Date()
    });

    await order.save();

    return res.status(201).json({
      message: 'Order placed successfully',
      order: {
        id: order._id,
        status: order.status,
        totalAmount: order.totalAmount
      }
    });
  } catch (error) {
    console.error('Error creating order:', error);
    return res.status(500).json({ message: 'Internal server error while placing order' });
  }
});

// GET /api/orders - Retrieve only the logged-in user's orders (Protected)
router.get('/', authMiddleware, async (req, res) => {
  try {
    const isConnected = await ensureDbConnected();
    if (!isConnected) {
      return res.status(503).json({ message: 'Database connection unavailable. Please try again shortly.' });
    }

    const userId = req.user.userId;
    if (!userId) {
      return res.status(401).json({ message: 'Authentication required' });
    }

    // Find only orders belonging to this user, newest first
    const orders = await Order.find({
      $or: [{ user: userId }, { userId: userId }]
    }).sort({ createdAt: -1, orderDate: -1 });

    const formattedOrders = orders.map((order) => ({
      id: order._id,
      orderDate: order.orderDate || order.createdAt,
      createdAt: order.createdAt || order.orderDate,
      items: order.items,
      totalAmount: order.totalAmount,
      deliveryAddress: order.deliveryAddress,
      phone: order.phone,
      status: order.status
    }));

    return res.json(formattedOrders);
  } catch (error) {
    console.error('Error fetching user orders:', error);
    return res.status(500).json({ message: 'Internal server error while fetching orders' });
  }
});

// GET /api/orders/:id - Retrieve order details by ID (Protected)
router.get('/:id', authMiddleware, async (req, res) => {
  try {
    const isConnected = await ensureDbConnected();
    if (!isConnected) {
      return res.status(503).json({ message: 'Database connection unavailable. Please try again shortly.' });
    }

    const orderId = req.params.id;

    // Validate ObjectId format
    if (!orderId || !orderId.match(/^[0-9a-fA-F]{24}$/)) {
      return res.status(400).json({ message: 'Invalid order ID format' });
    }

    const order = await Order.findById(orderId);

    if (!order) {
      return res.status(404).json({ message: 'Order not found' });
    }

    // Ensure the requesting user owns the order
    const orderOwner = (order.user?._id || order.user || order.userId?._id || order.userId || '').toString();
    if (orderOwner !== req.user.userId) {
      return res.status(403).json({ message: 'Access denied: You do not have permission to view this order' });
    }

    return res.json({
      order: {
        id: order._id,
        orderDate: order.orderDate || order.createdAt,
        createdAt: order.createdAt || order.orderDate,
        items: order.items,
        totalAmount: order.totalAmount,
        deliveryAddress: order.deliveryAddress,
        phone: order.phone,
        status: order.status
      }
    });
  } catch (error) {
    console.error('Error retrieving order:', error);
    return res.status(500).json({ message: 'Internal server error while retrieving order' });
  }
});

module.exports = router;
