const express = require('express');
const mongoose = require('mongoose');
const cors = require('cors');
const axios = require('axios');
require('dotenv').config();

const app = express();
app.use(cors());
app.use(express.json());

const MONGO_URI = process.env.MONGO_URI || 'mongodb://mongodb:27017/reviewdb';
mongoose.connect(MONGO_URI).then(() => console.log('Review Service: MongoDB connected')).catch(err => console.error(err));

const PRODUCT_SERVICE = process.env.PRODUCT_SERVICE_URL || 'http://product-service:3003';

const reviewSchema = new mongoose.Schema({
  productId: { type: String, required: true },
  userId: { type: String, required: true },
  userName: String,
  rating: { type: Number, required: true, min: 1, max: 5 },
  title: String,
  review: String,
  images: [String],
  helpful: { type: Number, default: 0 },
  verified: { type: Boolean, default: false },
  createdAt: { type: Date, default: Date.now }
});
reviewSchema.index({ productId: 1, userId: 1 }, { unique: true });
const Review = mongoose.model('Review', reviewSchema);

app.get('/health', (req, res) => res.json({ status: 'ok', service: 'review-rating-service' }));

// Create review
app.post('/reviews', async (req, res) => {
  try {
    const { productId, userId, userName, rating, title, review, images } = req.body;
    const existing = await Review.findOne({ productId, userId });
    if (existing) return res.status(400).json({ error: 'You already reviewed this product' });

    const rev = await Review.create({ productId, userId, userName, rating, title, review, images });

    // Update product average rating
    try {
      const reviews = await Review.find({ productId });
      const avgRating = reviews.reduce((s, r) => s + r.rating, 0) / reviews.length;
      await axios.put(`${PRODUCT_SERVICE}/products/${productId}/rating`, {
        rating: Math.round(avgRating * 10) / 10, reviewCount: reviews.length
      });
    } catch (e) { console.error('Failed to update product rating:', e.message); }

    res.status(201).json({ message: 'Review submitted', review: rev });
  } catch (err) { res.status(500).json({ error: err.message }); }
});

// Get reviews for product
app.get('/reviews/:productId', async (req, res) => {
  try {
    const reviews = await Review.find({ productId: req.params.productId }).sort({ createdAt: -1 });
    res.json(reviews);
  } catch (err) { res.status(500).json({ error: err.message }); }
});

// Get average rating
app.get('/reviews/average/:productId', async (req, res) => {
  try {
    const reviews = await Review.find({ productId: req.params.productId });
    if (reviews.length === 0) return res.json({ average: 0, count: 0, distribution: {} });
    const average = reviews.reduce((s, r) => s + r.rating, 0) / reviews.length;
    const distribution = { 1: 0, 2: 0, 3: 0, 4: 0, 5: 0 };
    reviews.forEach(r => distribution[r.rating]++);
    res.json({ average: Math.round(average * 10) / 10, count: reviews.length, distribution });
  } catch (err) { res.status(500).json({ error: err.message }); }
});

// Mark review helpful
app.put('/reviews/:reviewId/helpful', async (req, res) => {
  try {
    const rev = await Review.findByIdAndUpdate(req.params.reviewId, { $inc: { helpful: 1 } }, { new: true });
    res.json(rev);
  } catch (err) { res.status(500).json({ error: err.message }); }
});

// Delete review
app.delete('/reviews/:reviewId', async (req, res) => {
  try {
    await Review.findByIdAndDelete(req.params.reviewId);
    res.json({ message: 'Review deleted' });
  } catch (err) { res.status(500).json({ error: err.message }); }
});

const PORT = process.env.PORT || 3012;
app.listen(PORT, () => console.log(`Review Rating Service running on port ${PORT}`));
