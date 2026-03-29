# Review & Rating Service
Product reviews and ratings.

## Endpoints
- `POST /reviews` — Submit review
- `GET /reviews/:productId` — Get product reviews
- `GET /reviews/average/:productId` — Average rating & distribution
- `PUT /reviews/:reviewId/helpful` — Mark helpful
- `DELETE /reviews/:reviewId` — Delete review
- `GET /health` — Health check
