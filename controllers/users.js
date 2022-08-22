const User = require('../models/user');

module.exports.renderRegister = (req, res) => {
    res.render('users/register');
}
module.exports.register = async (req, res) => {
    try {
        const { email, username, password } = req.body;
        //console.log(req.body)
        const user = new User({ email, username });
        //register: passportLocalMongoose method
        //register a new user instance with a given passwor
        const registeredUser = await User.register(user, password);

        //Passport exposes a login() function on req (also aliased as logIn()) that can be used to establish a login session
        req.login(registeredUser, err => {
            if(err) return next(err);
            //console.log(registeredUser);
            req.flash('success', 'Welcome to Yelp Camp!')
            res.redirect('/campgrounds')
        })
        
    } catch (e) {
        req.flash('error', e.message);
        res.redirect('register')
    }
}

module.exports.renderLogin = (req, res) => {
    res.render('users/login');
}

module.exports.login = (req, res) => {
    req.flash('success', 'Welcome back!');
    const redirectUrl = req.session.returnTo || '/campgrounds';
    delete req.session.returnTo; //don't want to this info hang around in the seesion. so delete after
    res.redirect(redirectUrl);
    //res.redirect('/campgrounds');
}

module.exports.logout = (req, res) => {
    req.logout();
    req.flash('success', 'Goodbye!')
    res.redirect('/campgrounds');
}