const mongoose = require('mongoose');
const review = require('./review');
const Schema = mongoose.Schema;

//cloudinary thumbnail url pattern
//https://res.cloudinary.com/dd0rqmxve/image/upload/c_scale,w_150/YelpCamp/dm5wjp54xourd3kbmo4y.jpg
const ImageSchema = new Schema({
    url: String,
    filename: String
});

const opts = { toJSON: { virtuals: true } };

ImageSchema.virtual('thumbnail').get(function () {
    return this.url.replace('/upload', '/upload/c_scale,h_100,w_150');
});

const CampgroundSchema = new Schema({
    title: String,
    images: [ImageSchema],
    geometry: {
        type: {
            type: String, // Don't do `{ location: { type: String } }`
            enum: ['Point'], // 'location.type' must be 'Point'
            required: true
        },
        coordinates: {
            type: [Number],
            required: true
        }
    },
    price: Number,
    description: String,
    location: String,
    author: {
        type: Schema.Types.ObjectId,
        ref: 'User' //user model
    },
    reviews: [
        {
            type: Schema.Types.ObjectId,
            ref: 'Review' //Review model
        }
    ]
}, opts);

CampgroundSchema.virtual('properties.popUpMarkup').get(function () {
    return `<strong><a href="/campgrounds/${this._id}">${this.title}</a><strong>
    <p>${this.description.substring(0,20)}...</p>`;
});

// function findByIdAndDelete triggers middleware FindOneAndDelete()
CampgroundSchema.post('findOneAndDelete', async function (doc) {
    if (doc) {
        await review.deleteMany({ _id: { $in: doc.reviews } }) //Removes all documents that match conditions from the collection
    }
})

module.exports = mongoose.model('Campground', CampgroundSchema);