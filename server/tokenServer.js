const config = require('./config');
const express = require('express');
const mongoose = require('mongoose');
const bodyParser = require('body-parser'); // to catch POST
const cookieParser = require('cookie-parser'); // to parse Cookies
const hbs = require('express-handlebars'); // Templating Engine

// ROUTES
const indexRouter = require('./routes/index');
const registerRouter = require('./routes/register');
const loginRouter = require('./routes/login');
const forgotPasswordRouter = require('./routes/forgot_password');
const resetPasswordRouter = require('./routes/reset_password');
const dashboardRouter = require('./routes/dashboard');
const verifyAccountRouter = require('./routes/verify_account');

const app = express();

//DB Config
mongoose.Promise = global.Promise;
mongoose.connect(config.DATABASE, {
    useNewUrlParser: true,
    useUnifiedTopology: true,
    useFindAndModify: false,
    useCreateIndex: true
});

//Middleware
const { auth } = require('./middleware/auth');

//Get Static Files (css,js,etc)
app.use( express.static(__dirname + './../public/') );

app.use( bodyParser.json() ); //Needed to do POST
app.use( cookieParser() ); //Needed for Cookies

//// ############# HBS SETUP ############# ////
app.engine('hbs', hbs({
    extname: 'hbs',
    defaultLayout: 'main',
    layoutsDir: __dirname + './../views/layouts',
    partialsDir: __dirname + './../views/partials'
}));
app.set('view engine', 'hbs');

//// ############# //// ############# //// ############# //// ############# //// ############# //// ############# ////

// ROUTES
app.use('/', indexRouter);
app.use('/verify-account', verifyAccountRouter);
app.use('/register', auth, registerRouter);
app.use('/login', auth, loginRouter);
app.use('/forgot-password', auth, forgotPasswordRouter);
app.use('/reset-password', auth, resetPasswordRouter);
app.use('/dashboard', auth, dashboardRouter);


//Ignite Server!
app.listen(config.PORT, () => {
    console.log(`Server up on port ${config.PORT}`)
});