const express = require("express");
const router = express.Router();
const multer = require("multer");
const Request = require("../models/Request");
const verifyToken = require("../middleware/authMiddleware");

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

// CHECKOUT
router.put("/checkout/:id", verifyToken, async (req, res) => {
  try {
    const { paymentMethod, upiId, cardLast4, deliveryMode } = req.body;

    const request = await Request.findById(req.params.id);
    if (!request) return res.status(404).json({ message: "Request not found" });

    request.paymentMethod = paymentMethod || "";
    request.upiId = upiId || "";
    request.cardLast4 = cardLast4 || "";
    request.deliveryMode = deliveryMode || "Standard";
    request.paymentStatus = paymentMethod === "Cash on Delivery" ? "COD" : "Paid";
    request.status = "Paid";

    await request.save();

    res.json({ message: "Payment completed successfully" });
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

module.exports = router;