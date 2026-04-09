const mongoose = require("mongoose");

const requestSchema = new mongoose.Schema(
  {
    customerId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true
    },
    customerName: {
      type: String,
      required: true
    },
    style: {
      type: String,
      required: true
    },
    budget: {
      type: Number,
      required: true
    },
    size: {
      type: String,
      required: true
    },
    category: {
      type: String,
      required: true
    },
    image: {
      type: String,
      default: ""
    },

    storeId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      default: null
    },
    acceptedBy: {
      type: String,
      default: ""
    },
    storeMessage: {
      type: String,
      default: ""
    },
    curatedImage: {
      type: String,
      default: ""
    },
    curatedPrice: {
      type: Number,
      default: 0
    },

    adminCommission: {
      type: Number,
      default: 0
    },
    storeEarning: {
      type: Number,
      default: 0
    },

    paymentMethod: {
      type: String,
      default: ""
    },
    paymentStatus: {
      type: String,
      default: "Unpaid"
    },
    upiId: {
      type: String,
      default: ""
    },
    cardLast4: {
      type: String,
      default: ""
    },
    deliveryMode: {
      type: String,
      default: ""
    },

    status: {
      type: String,
      enum: ["Pending", "Accepted", "Curated", "Paid", "Shipped", "Rejected"],
      default: "Pending"
    }
  },
  { timestamps: true }
);

module.exports = mongoose.models.Request || mongoose.model("Request", requestSchema);