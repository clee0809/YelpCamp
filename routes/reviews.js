const express = require('express')
//mergeParams: true //to access campground id in prefix
const router = express.Router({ mergeParams: true });
const catchAsync = require('../utils/catchAsync')
const reviews = require('../controllers/reviews');

const { validateReview, isLoggedIn, isReviewAuthor } = require('../middleware');

//creating review
router.post('/', isLoggedIn, validateReview, catchAsync(reviews.createReview));

//delete review
router.delete('/:reviewId', isLoggedIn, isReviewAuthor, catchAsync(reviews.deleteReview));

module.exports = router;