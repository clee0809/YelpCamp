const Campground = require('../models/campground');
const ExpressError = require('../utils/ExpressError')
const { cloudinary } = require('../cloudinary');
//To prevent Cast to ObjectId failed error
const ObjectID = require('mongoose').Types.ObjectId;
const mbxGeocoding = require('@mapbox/mapbox-sdk/services/geocoding');

const mapBoxToken = process.env.MAPBOX_TOKEN;
const geoCoder = mbxGeocoding({accessToken: mapBoxToken});

module.exports.index = async (req, res, next) => {
    const campgrounds = await Campground.find({});
    res.render('campgrounds/index', { campgrounds })
}

module.exports.renderNewForm = (req, res) => {
    res.render('campgrounds/new');
}

module.exports.createCampground = async (req, res, next) => {
    const geoData = await geoCoder.forwardGeocode({
        query: req.body.campground.location,
        limit: 1
    }).send()
    //console.log(geoData.body.features[0].geometry);
    //if (!req.body.Campground) throw new ExpressError("Invalid Campgournd Data", 400);
    const campground = new Campground(req.body.campground);
    campground.geometry = geoData.body.features[0].geometry;
    campground.images = req.files.map(f=>({url:f.path, filename:f.filename}));
    campground.author = req.user._id; //for authorization
    await campground.save();
    //console.log(campground.geometry.coordinates);
    req.flash('success', 'Successfully made a new campground'); //confirmation msg
    res.redirect(`/campgrounds/${campground._id}`)
}

module.exports.showCampground = async (req, res, next) => {
    const { id } = req.params;
    if (!ObjectID.isValid(id)) {
        return next(new ExpressError('Invalid Id', 400));
    }
    //const campground = await Campground.findById(id).populate('reviews').populate('author');
    const campground = await Campground.findById(id).populate({
        path:'reviews',  //nested populating; populate reviews for campground
        populate:{
            path: 'author' //populate author for each review
        }
    }).populate('author'); //populate author for campground


    //if no geometry, set it
    //console.log(campground.geometry.coordinates)
    if (campground.geometry.coordinates.length < 2) {
        const geoData = await geoCoder.forwardGeocode({
            query: campground.location,
            limit: 1
        }).send()
        campground.geometry = geoData.body.features[0].geometry;
    }

    if (!campground) {
        req.flash('error', 'Cannot find that campground');
        res.redirect('/campgrounds')
    }
    res.render('campgrounds/show', { campground });
}

module.exports.renderEditForm = async (req, res, next) => {
    const { id } = req.params;
    const campground = await Campground.findById(id);
    
    if (!campground) { //if there's no campground at all
        req.flash('error', 'Cannot find that campground');
        return res.redirect('/campgrounds')
    }
    res.render('campgrounds/edit', { campground });
}

module.exports.updateCampground = async (req, res) => {
    const { id } = req.params;   
    //console.log(req.body) 
    const campground= await Campground.findByIdAndUpdate(id, { ...req.body.campground });
    const imgs = req.files.map(f=>({url:f.path, filename:f.filename}));
    campground.images.push(...imgs);

    //console.log(campground.geometry.coordinates)
    if (campground.geometry.coordinates.length < 2) {
        const geoData = await geoCoder.forwardGeocode({
            query: campground.location,
            limit: 1
        }).send()
        campground.geometry = geoData.body.features[0].geometry;
    }


    await campground.save();
    if (req.body.deleteImages) {
        for (let filename of req.body.deleteImages) {
            await cloudinary.uploader.destroy(filename); //delete image from cloudinary
        }
        await campground.updateOne({$pull:{images:{filename:{$in: req.body.deleteImages}}}});
    }

    


    req.flash('success', 'Successfully updated campground!')
    res.redirect(`/campgrounds/${campground._id}`)
}

module.exports.deleteCampground = async (req, res, next) => {
    const { id } = req.params;
    await Campground.findByIdAndDelete(id); //This function triggers middleware FindOneAndDelete()
    req.flash('success', 'Successfully deleted')
    res.redirect('/campgrounds');
}