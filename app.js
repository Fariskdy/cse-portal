const express = require('express');
const multer = require('multer');
const path = require('path');
const createHttpError = require('http-errors')
const morgan = require('morgan');
const methodOverride = require('method-override');
const bodyParser = require('body-parser'); // Import body-parser
const connectDB = require('./db/connect')
const session = require('express-session');
const connectFlash = require('connect-flash')
require('dotenv').config();
const PORT = process.env.PORT || 3000;
const passport = require('passport')
const mongoose = require('mongoose');
const Expense = require('./models/expense.model');
const MongoStore = require('connect-mongo');// https://www.npmjs.com/package/express-session#compatible-session-stores [FROM expression-session package for persistent session storage after server reboots]
const {ensureLoggedIn} = require('connect-ensure-login');
const { roles } = require('./utils/constants');
const app = express();

//middlewares
app.use(morgan('dev'));
app.set('view engine', 'ejs');
app.use(express.static('public'));


app.use(express.json());
app.use(express.urlencoded({ extended: false }));


app.use(methodOverride('_method'));



//init session
app.use(session({
    secret: process.env.SESSION_SECRET,
    resave: false,
    saveUninitialized: false,
    cookie: {
        // secure:true, //for only https(secure)
        httpOnly: true,
    },
    store: MongoStore.create({ mongoUrl: process.env.MONGO_URI })
}))

// Use body-parser middleware to parse form data
app.use(bodyParser.urlencoded({ extended: false }));
app.use(bodyParser.json());

//for passport js authentication
app.use(passport.initialize());
app.use(passport.session());
require('./utils/passport.auth');

app.use((req, res, next) => {
    res.locals.user = req.user;
    next();
})

//flash-message
app.use(connectFlash());
app.use((req, res, next) => {
    res.locals.messages = req.flash()
    next()
})

//routes
app.use('/', require('./routes/index.route'));
app.use('/auth', require('./routes/auth.route'));
app.use('/user', ensureLoggedIn({ redirectTo: '/auth/login' }), require('./routes/user.route'));
app.use('/admin', ensureLoggedIn({ redirectTo: '/auth/login' }), ensureAdmin, require('./routes/admin.route'))
app.use('/rm', ensureLoggedIn({ redirectTo: '/auth/login' }), ensureRm, require('./routes/rm.route'))
app.use('/fcm', ensureLoggedIn({ redirectTo: '/auth/login' }), ensureFcm, require('./routes/fcm.route'))
app.use('/dop', ensureLoggedIn({ redirectTo: '/auth/login' }), ensureDop, require('./routes/dop.route'))
app.use('/adm', ensureLoggedIn({ redirectTo: '/auth/login' }), ensureAdm, require('./routes/adm.route'))
app.use('/acc', ensureLoggedIn({ redirectTo: '/auth/login' }), ensureAcc, require('./routes/acc.route'))
//404 handler
app.use((req, res, next) => {
    next(createHttpError.NotFound())
})

app.use((error, req, res, next) => {
    error.status = error.status || 500
    res.status(error.status)
    res.render('404', { error })
})






const start = async () => {
    try {
        await connectDB(process.env.MONGO_URI);
        app.listen(PORT, () => console.log(`Listening on port: ${PORT}`))
    } catch (err) {
        console.log(err);
    }
}
// //my custom function to avoid user to unauthorised sessions routes [replaced with connectEnsureLogin]
// function ensureAuthenticated(req, res, next) {
//     if (req.isAuthenticated()) {
//         next();
//     } else {
//         res.redirect('/auth/login');
//     }
// };

function ensureAdmin(req, res, next) {
    if (req.user.role === roles.admin) {
        next()
    } else {
        req.flash('warning', 'You are not an authorised user to see this page')
        res.redirect('/')
    }
}

function ensureRm(req, res, next) {
    if (req.user.role === roles.Region_Manager) {
        next()
    } else {
        req.flash('warning', 'You are not an authorised user to see this page')
        res.redirect('/')
    }
}

function ensureFcm(req, res, next) {
    if (req.user.role === roles.FCM) {
        next()
    } else {
        req.flash('warning', 'You are not an authorised user to see this page')
        res.redirect('/')
    }
}

function ensureDop(req, res, next) {
    if (req.user.role === roles.DOP) {
        next()
    } else {
        req.flash('warning', 'You are not an authorised user to see this page')
        res.redirect('/')
    }
}

function ensureAdm(req, res, next) {
    if (req.user.role === roles.Administrator) {
        next()
    } else {
        req.flash('warning', 'You are not an authorised user to see this page')
        res.redirect('/')
    }
}

function ensureAcc(req, res, next) {
    if (req.user.role === roles.Accountant) {
        next()
    } else {
        req.flash('warning', 'You are not an authorised user to see this page')
        res.redirect('/')
    }
}
start();


