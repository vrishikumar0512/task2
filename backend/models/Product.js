const mongoose = require('mongoose');

const productSchema = new mongoose.Schema(
  {
    id: {
      type: Number,
      required: true,
      unique: true
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
    image: {
      type: String,
      required: true
    },
    category: {
      type: String,
      required: true,
      trim: true
    },
    shortDescription: {
      type: String,
      default: ''
    },
    description: {
      type: String,
      default: ''
    },
    stock: {
      type: Number,
      default: 25
    },
    rating: {
      type: Number,
      default: 4.5
    }
  },
  {
    id: false,
    timestamps: true
  }
);

module.exports = mongoose.model('Product', productSchema);
