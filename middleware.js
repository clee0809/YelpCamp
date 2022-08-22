const { campgroundSchema, reviewSchema } = require("./schemas");
const ExpressError = require('./utils/ExpressError');
const Campground = require('./models/campground');
const Review = require('./models/review')
module.exports.isLoggedIn = (req, res, next) => {
    //console.log("REQ.USER", req.user); 

    //store the url user are requesting to go back after logging in
    req.session.returnTo = req.originalUrl;
    if (!req.isAuthenticated()) { //from passport
        req.flash('error', 'You must be signed in first.');
        return res.redirect('/login');
    }
    next();
}

//not signed in: undefined
//logged in user
/*  REQ.USER {
    _id: 62180b5a9bc3117768cf8d2a,
    email: 'user01@email.com',
    username: 'user01',
    __v: 0
} */

//middleware to validate new campground
module.exports.validateCampground = (req, res, next) => {
    const { error } = campgroundSchema.validate(req.body)
    //console.log(error);
    if (error) {
        const msg = error.details.map(el => el.message).join(',');
        throw new ExpressError(msg, '400');
    } else {
        next();
    }
}

//middleware to check for authorization
module.exports.isAuthor = async (req, res, next) => {
    const {id} = req.params;
    const campground = await Campground.findById(id); //before update find it first
    if (!campground.author.equals(req.user._id)) { //and check authorization
        req.flash('error', ' You do not have permission to do that');
        return res.redirect(`/campgrounds/${id}`);
    }
    next();
}

//middleware to check for authorization for review
module.exports.isReviewAuthor = async (req, res, next) => {
    const {id, reviewId} = req.params;
    const review = await Review.findById(reviewId); //before update find it first
    if (!review.author.equals(req.user._id)) { //and check authorization
        req.flash('error', ' You do not have permission to do that');
        return res.redirect(`/campgrounds/${id}`);
    }
    next();
}

//middleware to validate new review
module.exports.validateReview = (req, res, next) => {
    const { error } = reviewSchema.validate(req.body);
    //console.log(error);
    if (error) {
        const msg = error.details.map(el => el.message).join(',');
        throw new ExpressError(msg, '400');
    } else {
        next();
    }
}