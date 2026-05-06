const express = require("express");
const router = express.Router();
const multer = require("multer");
const crypto = require("crypto");
const Razorpay = require("razorpay");
const Request = require("../models/Request");
const verifyToken = require("../middleware/authMiddleware");

const razorpay = new Razorpay({
  key_id: process.env.RAZORPAY_KEY_ID,
  key_secret: process.env.RAZORPAY_KEY_SECRET
});

// Multer setup
const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    cb(null, "uploads/");
  },
  filename: (req, file, cb) => {
    cb(null, Date.now() + "-" + file.originalname);
  }
});

const upload = multer({ storage });

function isValidUPI(upiId) {
  return /^[a-zA-Z0-9._-]{2,}@[a-zA-Z]{2,}$/.test(upiId);
}

function getCardNetwork(cardNumber) {
  const sanitized = cardNumber.replace(/\D/g, '');
  if (sanitized.startsWith('4')) return 'Visa';
  if (/^5[1-5]/.test(sanitized)) return 'Mastercard';
  if (/^6(?:011|5)/.test(sanitized)) return 'Discover';
  if (/^3[47]/.test(sanitized)) return 'American Express';
  if (/^35/.test(sanitized)) return 'JCB';
  return 'Unknown';
}

function createTransactionId() {
  return `TXN-${Date.now()}-${Math.random().toString(36).substr(2, 8).toUpperCase()}`;
}

// CREATE REQUEST
router.post("/create", verifyToken, upload.single("image"), async (req, res) => {
  try {
    if (req.user.role !== "customer") {
      return res.status(403).json({ message: "Only customers can post requests" });
    }

    const { style, budget, size, category } = req.body;

    const newRequest = new Request({
      customerId: req.user.id,
      customerName: req.user.name,
      style,
      budget,
      size,
      category,
      image: req.file ? req.file.filename : ""
    });

    await newRequest.save();
    res.status(201).json({ message: "Request posted successfully" });
  } catch (err) {
    console.error("Create Request Error:", err);
    res.status(500).json({ message: "Server error while creating request" });
  }
});

// MY REQUESTS
router.get("/my", verifyToken, async (req, res) => {
  try {
    const requests = await Request.find({ customerId: req.user.id }).sort({ createdAt: -1 });
    res.json(requests);
  } catch (err) {
    console.error("My Requests Error:", err);
    res.status(500).json({ message: "Error fetching your requests" });
  }
});

// ALL REQUESTS
router.get("/all", verifyToken, async (req, res) => {
  try {
    const requests = await Request.find().sort({ createdAt: -1 });
    res.json(requests);
  } catch (err) {
    console.error("All Requests Error:", err);
    res.status(500).json({ message: "Error fetching requests" });
  }
});

// REQUEST BY ID
router.get("/:id", verifyToken, async (req, res) => {
  try {
    const request = await Request.findById(req.params.id);
    if (!request) return res.status(404).json({ message: "Request not found" });

    if (req.user.role === "customer" && request.customerId.toString() !== req.user.id) {
      return res.status(403).json({ message: "Access denied" });
    }

    res.json(request);
  } catch (err) {
    console.error("Get Request Error:", err);
    res.status(500).json({ message: "Error fetching request" });
  }
});

// ACCEPT
router.put("/accept/:id", verifyToken, async (req, res) => {
  try {
    if (req.user.role !== "store") {
      return res.status(403).json({ message: "Only stores can accept requests" });
    }

    const request = await Request.findById(req.params.id);
    if (!request) return res.status(404).json({ message: "Request not found" });

    if (request.status !== "Pending") {
      return res.status(400).json({ message: "Only pending requests can be accepted" });
    }

    request.status = "Accepted";
    request.acceptedBy = req.user.name;
    request.storeId = req.user.id;

    await request.save();
    res.json({ message: "Request accepted successfully" });
  } catch (err) {
    console.error("Accept Request Error:", err);
    res.status(500).json({ message: "Error accepting request" });
  }
});

// REJECT
router.put("/reject/:id", verifyToken, async (req, res) => {
  try {
    if (req.user.role !== "store") {
      return res.status(403).json({ message: "Only stores can reject requests" });
    }

    const request = await Request.findById(req.params.id);
    if (!request) return res.status(404).json({ message: "Request not found" });

    if (request.status !== "Pending") {
      return res.status(400).json({ message: "Only pending requests can be rejected" });
    }

    request.status = "Rejected";
    await request.save();

    res.json({ message: "Request rejected" });
  } catch (err) {
    console.error("Reject Error:", err);
    res.status(500).json({ message: "Error rejecting request" });
  }
});

// CURATE
router.put("/curate/:id", verifyToken, upload.single("curatedImage"), async (req, res) => {
  try {
    if (req.user.role !== "store") {
      return res.status(403).json({ message: "Only stores can curate requests" });
    }

    const { storeMessage, curatedPrice } = req.body;

    const request = await Request.findById(req.params.id);
    if (!request) return res.status(404).json({ message: "Request not found" });

    if (request.acceptedBy !== req.user.name) {
      return res.status(403).json({ message: "Only accepted store can curate this request" });
    }

    const finalPrice = Number(curatedPrice) || 0;
    const adminCommission = Math.round(finalPrice * 0.1);
    const storeEarning = finalPrice - adminCommission;

    request.storeMessage = storeMessage || "";
    request.curatedPrice = finalPrice;
    request.adminCommission = adminCommission;
    request.storeEarning = storeEarning;
    request.curatedImage = req.file ? req.file.filename : request.curatedImage;
    request.status = "Curated";

    await request.save();

    res.json({ message: "Curated item uploaded successfully" });
  } catch (err) {
    console.error("Curate Error:", err);
    res.status(500).json({ message: "Error curating request" });
  }
});

// RAZORPAY ORDER CREATION
router.post("/checkout/order/:id", verifyToken, async (req, res) => {
  try {
    const request = await Request.findById(req.params.id);
    if (!request) return res.status(404).json({ message: "Request not found" });

    if (request.customerId.toString() !== req.user.id) {
      return res.status(403).json({ message: "Access denied" });
    }

    if (request.status !== "Curated" || request.paymentStatus !== "Unpaid") {
      return res.status(400).json({ message: "Request is not ready for payment" });
    }

    const amount = Math.max(request.curatedPrice || request.budget || 0, 1);
    const receipt = `req_${request._id}`;

    const order = await razorpay.orders.create({
      amount: amount * 100,
      currency: "INR",
      receipt,
      payment_capture: 1
    });

    request.paymentOrderId = order.id;
    request.paymentGateway = "Razorpay";
    await request.save();

    res.json({
      key: process.env.RAZORPAY_KEY_ID,
      orderId: order.id,
      amount: order.amount,
      currency: order.currency,
      name: "HANG UP",
      description: `Payment for request ${request._id}`,
      email: req.user.email || "",
      contact: req.user.phone || ""
    });
  } catch (err) {
    console.error("Order Creation Error:", err);
    res.status(500).json({ message: "Unable to create payment order" });
  }
});

router.post("/checkout/verify/:id", verifyToken, async (req, res) => {
  try {
    const request = await Request.findById(req.params.id);
    if (!request) return res.status(404).json({ message: "Request not found" });

    if (request.customerId.toString() !== req.user.id) {
      return res.status(403).json({ message: "Access denied" });
    }

    const { razorpay_payment_id, razorpay_order_id, razorpay_signature, paymentMethod, upiId, cardLast4, deliveryMode } = req.body;
    if (!razorpay_payment_id || !razorpay_order_id || !razorpay_signature) {
      return res.status(400).json({ message: "Missing payment parameters." });
    }

    const generatedSignature = crypto
      .createHmac("sha256", process.env.RAZORPAY_KEY_SECRET)
      .update(`${razorpay_order_id}|${razorpay_payment_id}`)
      .digest("hex");

    if (generatedSignature !== razorpay_signature) {
      return res.status(400).json({ message: "Payment verification failed." });
    }

    request.paymentMethod = paymentMethod || request.paymentMethod;
    request.paymentGateway = "Razorpay";
    request.transactionId = razorpay_payment_id;
    request.paymentStatus = "Paid";
    request.status = "Paid";
    request.upiId = upiId || request.upiId;
    request.cardLast4 = cardLast4 || request.cardLast4;
    request.deliveryMode = deliveryMode || request.deliveryMode || "Standard";

    await request.save();

    res.json({ message: "Payment verified successfully", transactionId: request.transactionId });
  } catch (err) {
    console.error("Payment Verification Error:", err);
    res.status(500).json({ message: "Unable to verify payment." });
  }
});

// LEGACY / FALLBACK CHECKOUT
router.put("/checkout/:id", verifyToken, async (req, res) => {
  try {
    const { paymentMethod, upiId, cardLast4, cardNetwork, deliveryMode } = req.body;
    const request = await Request.findById(req.params.id);
    if (!request) return res.status(404).json({ message: "Request not found" });

    if (!paymentMethod) {
      return res.status(400).json({ message: "Payment method is required" });
    }

    const upiMethods = ["PhonePe", "Google Pay", "Paytm"];
    const isUPIPayment = upiMethods.includes(paymentMethod);
    const validUPI = upiId && isValidUPI(upiId);
    const validLast4 = cardLast4 && /^[0-9]{4}$/.test(cardLast4);

    if (isUPIPayment) {
      if (!validUPI) {
        return res.status(400).json({ message: "A valid UPI ID is required for UPI payment." });
      }
      request.paymentMethod = paymentMethod;
      request.paymentGateway = paymentMethod;
      request.upiId = upiId;
      request.cardLast4 = "";
      request.transactionId = createTransactionId();
      request.paymentStatus = "Paid";
      request.status = "Paid";
    } else if (paymentMethod === "Card") {
      if (!validLast4) {
        return res.status(400).json({ message: "Please provide the last 4 digits of your card." });
      }
      request.paymentMethod = paymentMethod;
      request.paymentGateway = cardNetwork || getCardNetwork(cardLast4);
      request.cardLast4 = cardLast4;
      request.upiId = "";
      request.transactionId = createTransactionId();
      request.paymentStatus = "Paid";
      request.status = "Paid";
    } else if (paymentMethod === "Net Banking") {
      request.paymentMethod = paymentMethod;
      request.paymentGateway = "Net Banking";
      request.upiId = upiId || "";
      request.cardLast4 = cardLast4 || "";
      request.transactionId = createTransactionId();
      request.paymentStatus = "Paid";
      request.status = "Paid";
    } else if (paymentMethod === "Cash on Delivery") {
      request.paymentMethod = paymentMethod;
      request.paymentGateway = "COD";
      request.upiId = "";
      request.cardLast4 = "";
      request.transactionId = createTransactionId();
      request.paymentStatus = "COD";
      request.status = "Paid";
    } else {
      return res.status(400).json({ message: "Unsupported payment method." });
    }

    request.deliveryMode = deliveryMode || "Standard";
    await request.save();

    res.json({ message: "Payment completed successfully", transactionId: request.transactionId });
  } catch (err) {
    console.error("Checkout Error:", err);
    res.status(500).json({ message: "Payment failed" });
  }
});

// SHIP
router.put("/ship/:id", verifyToken, async (req, res) => {
  try {
    if (req.user.role !== "store") {
      return res.status(403).json({ message: "Only stores can mark shipped" });
    }

    const request = await Request.findById(req.params.id);
    if (!request) return res.status(404).json({ message: "Request not found" });

    if (request.acceptedBy !== req.user.name) {
      return res.status(403).json({ message: "Only accepted store can ship this request" });
    }

    request.status = "Shipped";
    await request.save();

    res.json({ message: "Marked as shipped successfully" });
  } catch (err) {
    console.error("Ship Error:", err);
    res.status(500).json({ message: "Error updating shipment" });
  }
});

// DELIVER
router.put("/deliver/:id", verifyToken, async (req, res) => {
  try {
    if (req.user.role !== "store") {
      return res.status(403).json({ message: "Only stores can mark delivered" });
    }

    const request = await Request.findById(req.params.id);
    if (!request) return res.status(404).json({ message: "Request not found" });

    if (request.acceptedBy !== req.user.name) {
      return res.status(403).json({ message: "Only accepted store can deliver this request" });
    }

    request.status = "Delivered";
    await request.save();

    res.json({ message: "Marked as delivered successfully" });
  } catch (err) {
    console.error("Deliver Error:", err);
    res.status(500).json({ message: "Error updating delivery" });
  }
});

// DELETE DELIVERED ORDER
router.delete("/:id", verifyToken, async (req, res) => {
  try {
    const request = await Request.findById(req.params.id);
    if (!request) return res.status(404).json({ message: "Request not found" });

    // Only allow deletion if status is "Delivered"
    if (request.status !== "Delivered") {
      return res.status(400).json({ message: "Only delivered orders can be deleted" });
    }

    // Check if user is the customer who made the request or admin
    if (request.customerName !== req.user.name && req.user.role !== "admin") {
      return res.status(403).json({ message: "You can only delete your own delivered orders" });
    }

    await Request.findByIdAndDelete(req.params.id);
    res.json({ message: "Order deleted successfully" });
  } catch (err) {
    console.error("Delete Error:", err);
    res.status(500).json({ message: "Error deleting order" });
  }
});

module.exports = router;