const mongoose = require('mongoose');

const orderItemSchema = new mongoose.Schema(
  {
    productId: {
      type: Number,
      required: true
    },
    name: {
      type: String,
      required: true,
      trim: true
    },
    price: {
      type: Number,
      required: true
    },
    quantity: {
      type: Number,
      required: true,
      min: 1
    },
    subtotal: {
      type: Number,
      required: true
    }
  },
  { _id: false }
);

const deliveryAddressSchema = new mongoose.Schema(
  {
    address: {
      type: String,
      required: true,
      trim: true
    },
    city: {
      type: String,
      required: true,
      trim: true
    },
    state: {
      type: String,
      required: true,
      trim: true
    },
    pincode: {
      type: String,
      required: true,
      trim: true
    }
  },
  { _id: false }
);

const orderSchema = new mongoose.Schema(
  {
    user: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true
    },
    userId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User'
    },
    items: {
      type: [orderItemSchema],
      required: true,
      validate: {
        validator: function (v) {
          return Array.isArray(v) && v.length > 0;
        },
        message: 'Order must contain at least one item'
      }
    },
    totalAmount: {
      type: Number,
      required: true,
      min: 0
    },
    deliveryAddress: {
      type: deliveryAddressSchema,
      required: true
    },
    phone: {
      type: String,
      required: true,
      trim: true
    },
    status: {
      type: String,
      default: 'Placed',
      enum: ['Placed', 'Processing', 'Shipped', 'Delivered', 'Cancelled']
    },
    orderDate: {
      type: Date,
      default: Date.now
    },
    createdAt: {
      type: Date,
      default: Date.now
    }
  }
);

module.exports = mongoose.model('Order', orderSchema);
