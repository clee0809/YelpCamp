if(process.env.NODE_ENV !== 'production') { //if it's development mode
    require('dotenv').config()
}

require('dotenv').config();
const express = require('express');
const path = require('path');
const mongoose = require('mongoose');
const ejsMate = require('ejs-mate');
const session = require('express-session');
const flash = require('connect-flash');
const methodOverride = require('method-override');
const ExpressError = require('./utils/ExpressError')
const passport = require('passport');
const LocalStrategy = require('passport-local');
const User = require('./models/user');
// const dbUrl = 'mongodb://localhost:27017/yelp-camp'; //development
const dbUrl = process.env.DB_URL || 'mongodb://localhost:27017/yelp-camp';  //production mongo Atlas

const MongoDBStore = require("connect-mongo");

const helmet = require("helmet");
const mongoSanitize = require('express-mongo-sanitize');

//require routers
const userRoutes = require('./routes/user');
const campgroundRoutes = require('./routes/campgrounds');
const reviewRoutes = require('./routes/reviews');

mongoose.connect(dbUrl, { 
    useNewUrlParser: true,
    useCreateIndex: true,
    useUnifiedTopology: true,
    useFindAndModify: false //(node:25788) DeprecationWarning
});

const db = mongoose.connection;
db.on("error", console.error.bind(console, "connection error:"));
db.once("open", () => {
    console.log("Database connected");
});

const app = express();

app.engine('ejs', ejsMate)
app.set('view engine', 'ejs');
app.set('views', path.join(__dirname, 'views'))
   
app.use(mongoSanitize({replaceWith: '_',}));

app.use(express.urlencoded({ extended: true }));
app.use(methodOverride('_method'));
app.use(express.static(path.join(__dirname, 'public'))) //to access the public folder. hello.js

const secret = process.env.SECRET || 'thisshouldbeabettersecret!'; // production
const store = MongoDBStore.create({ 
    mongoUrl: dbUrl,
    touchAfter: 24 * 60 * 60,   // lazy session update
    crypto: {
        secret
    },    
    touchAfter: 24*60*60
});

store.on("error", function(e) {
    console.log("SESSION STORE ERROR", e);
} )

//getting connect.sid
const sessionConfig = {
    store,
    name: 'session',
    secret, // production
    resave: false,
    saveUninitialized: true,
    cookie: {
        httpOnly: true, //accessible by http only
        //secure: true, //for production use; only accessed by https
        expires: Date.now() + 1000 * 60 * 60 * 24 * 7,
        maxAge: 1000 * 60 * 60 * 24 * 7 //ms * sec * min * day * week
    }
};
app.use(session(sessionConfig));
app.use(flash());

const scriptSrcUrls = [
    "https://stackpath.bootstrapcdn.com/",
    "https://api.tiles.mapbox.com/",
    "https://api.mapbox.com/",
    "https://kit.fontawesome.com/",
    "https://cdnjs.cloudflare.com/",
    "https://cdn.jsdelivr.net/",
    "https://api.mapbox.com/mapbox-gl-js/",
];
const styleSrcUrls = [
    "https://kit-free.fontawesome.com/",
    "https://stackpath.bootstrapcdn.com/",
    "https://api.mapbox.com/",
    "https://api.tiles.mapbox.com/",
    "https://fonts.googleapis.com/",
    "https://use.fontawesome.com/",
];
const connectSrcUrls = [
    "https://api.mapbox.com/",
    "https://a.tiles.mapbox.com/",
    "https://b.tiles.mapbox.com/",
    "https://events.mapbox.com/",
];
const fontSrcUrls = [];
app.use(
    helmet.contentSecurityPolicy({
        directives: {
            defaultSrc: [],
            connectSrc: ["'self'", ...connectSrcUrls],
            scriptSrc: ["'unsafe-inline'", "'self'", ...scriptSrcUrls],
            styleSrc: ["'self'", "'unsafe-inline'", ...styleSrcUrls],
            workerSrc: ["'self'", "blob:"],
            objectSrc: [],
            imgSrc: [
                "'self'",
                "blob:",
                "data:",
                "https://res.cloudinary.com/dd0rqmxve/", //SHOULD MATCH YOUR CLOUDINARY ACCOUNT! 
                "https://images.unsplash.com/",
            ],
            fontSrc: ["'self'", ...fontSrcUrls],
        },
    })
);

//these should be after session configuration
app.use(passport.initialize());
app.use(passport.session());
passport.use(new LocalStrategy(User.authenticate())); // use static authenticate method of model in LocalStrategy
passport.serializeUser(User.serializeUser()) //tell how to put user in session
passport.deserializeUser(User.deserializeUser()); //how to get user out of the session

app.use((req, res, next) => {
    //console.log(req.query);
    //console.log(req.session)
    res.locals.currentUser = req.user; //to check if logged in or not
    res.locals.success = req.flash('success');
    res.locals.error = req.flash('error');
    next();
})

app.get('/fakeUser', async (req, res) => {
    const user = new User({ email: 'colt@gmail.com', username: 'colttt' });
    const newUser = await User.register(user, '123456'); //passport-local-mongoose
    res.send(newUser);
})

/* /register - FORMER
POST / register - create a user */

app.use("/campgrounds", campgroundRoutes) //using campgrounds router, setting prefix /campgrounds
app.use('/campgrounds/:id/reviews', reviewRoutes)
app.use('/', userRoutes);

app.get('/', (req, res) => {
    res.render('home')
});

//this will only run if nothing else has matched first and we didn't
//respond for many of them
app.all('*', (req, res, next) => {
    next(new ExpressError('Page Not Found', 404))
})

//Basic Error handling
app.use((err, req, res, next) => {
    const { statusCode = 500 } = err; //set default value for status and msg
    if (!err.message) err.message = "Something went wrong";
    res.status(statusCode).render('error', { err });
})

const port = process.env.PORT || 3000;
app.listen(port, () => {
    console.log(`Serving on port ${port}`)
})