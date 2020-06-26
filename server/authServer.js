const config = require('./config').get(process.env.NODE_ENV)
const express = require('express'); // Routing
const mongoose = require('mongoose'); // Mongoose - DB util
const bodyParser = require('body-parser'); // to catch POST
const cookieParser = require('cookie-parser'); // to parse Cookies
const hbs = require('express-handlebars'); // Templating Engine
const crypto = require('crypto');
const sgMail = require('@sendgrid/mail'); // Email Util

sgMail.setApiKey(config.SENDGRID_API_KEY);
const app = express(); // Express App

//DB Config
mongoose.Promise = global.Promise;
mongoose.connect(config.DATABASE, {
    useNewUrlParser: true,
    useUnifiedTopology: true,
    useFindAndModify: false,
    useCreateIndex: true
});
/**
    Deprecation Notes: https://mongoosejs.com/docs/deprecations.html
    Replace update() with updateOne(), updateMany(), or replaceOne()
    Replace remove() with deleteOne() or deleteMany().
    Replace count() with countDocuments(), unless you want to count how many documents are in the whole collection(no filter).In the latter case, use estimatedDocumentCount().
*/


//DB Models
const { User } = require('./models/user');

//Middleware
const { auth } = require('./middleware/auth');

//Get Static Files
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


//// ############# ROUTES ############# ////
app.get('/', (req, res) => res.render('home') );

app.get('/dashboard', auth, (req, res) => {
    //If no user is found "req.user" returns "null" 
    if (!req.user) return res.redirect('/login');
    res.render('dashboard', { //TODO: add middleware ID:1234
        dashboard: true,
        isAdmin: req.user.role === 1 ? true : false,
        active: req.user.active === 1 ? true : false,
    });
})


//// SOF USER AUTHENTICATION
app.get('/register', auth, (req, res) => {
    //If no user is found "req.user" returns "null" 
    if (req.user) return res.redirect('/dashboard');
    res.render('register');
})

app.post('/api/register', (req, res) => {
    const user = new User(req.body);

    user.genToken((err, user) => {
        if (err) return res.status(400).send(err);

        sgMail.setApiKey(process.env.SENDGRID_API_KEY);
        const msg = {
            to: `${user.email}`,
            from: 'Mayorga Dev <me@alexmayorga.dev>',
            subject: 'Verification Email',
            text: `Hi ${user.firstname}, Please use this link to verify your email address: http://localhost:3000/verify/${user.email}/${user.token}`,
            html: `
                Hi ${user.firstname}, Please use this link to verify your email address:
                <br><br>
                http://localhost:3000/verify/${user.email}/${user.token}
            `,
        };
        //ES6
        sgMail
            .send(msg)
            .then(() => {
                // console.log("Message sent!");
            }, error => {
                console.error(error);

                if (error.response) return console.error(error.response.body)

            });

        res.cookie('auth', user.token, { httpOnly:true }).status(200).send();
    })

})

app.get('/verify/:email?/:token?', (req, res) => {

    let error;

    User.findOne({ 'email': req.params.email }, (err, user) => {
        //Check if email exists in the database
        if (!user) {
            error = `No user found with email '${req.params.email }'`;
        } else if (user.token !== req.params.token){
            //Check if token matches
            error = `This link is not correct. Please request a "Resend Verification Email".`;
        }

        if(!error){
            user.active = 1;
            user.save((err, user) => {
                if (err) return err;
            })
        } 
        
        res.render('verify', {
            message: error || 'Your account has been verified! Go to your dashboard.',
            verified: error ? false : true ,
        });

    })

})

app.get('/login', auth, (req, res) => {
    //If no user is found "req.user" returns "null" 
    if (req.user) return res.redirect('/dashboard');
    res.render('login');
})

app.post('/api/login', (req, res) => {
    //Query the database
    User.findOne({ 'email': req.body.email }, (err, user) => {
        //Check if email exists in the database
        if (!user) {
            console.log('Auth Failed. No User find with that email.');
            return res.status(400).json({ message: 'Auth Failed. No User find with that email.' });
        } else {
            //Check if password match
            user.comparePassword(req.body.password, function (err, isMatch) {
                if (err) throw err;
                if (!isMatch) {
                    console.log('Auth Failed. Wrong password.');
                    return res.status(400).json({ message: 'Auth Failed. Wrong password.' })
                }

                //res.status(200).send(isMatch);
                //res.status(200).json({message:'Password Match'});

                user.genToken((err, user) => {
                    res.cookie('auth', user.token, { httpOnly:true }).send("Logged in");
                })

            })
        }
    })
})

app.get('/dashboard/logout', auth, (req, res) => {
    req.user.deleteToken(req.token, (err, user) => {
        if (err) return res.status(400).send(err);
        res.redirect('/login')
    })
})

//// SOF Password Forgot and Reset
app.get('/forgot', auth, (req, res) => {
    if (req.user) return res.redirect('/dashboard');
    res.render('forgot');
})

app.post('/api/reset', (req, res) => {
    User.findOne({ 'email': req.body.email }, (err, user) => {
        if (err) return res.status(400).send('There was an error processing your request. Please try again.');

        //Check if email exists in the database
        if (!user) {
            return res.status(400).send('No User found with that email.');
        } else {
            user.genToken((err, user) => {

                if (err) return res.status(400).send('There was an error processing your request. Please try again.');

                const msg = {
                    to: `${user.email}`,
                    from: 'Mayorga Dev <me@alexmayorga.dev>',
                    subject: 'Password Reset',
                    text: `Hi ${user.firstname}, Please use this link to reset your password: http://localhost:3000/reset_password/${user.token}`,
                    html: `
                        Hi ${user.firstname}, Please use this link to verify your email address:
                        <br><br>
                        http://localhost:3000/reset_password/${user.token}
                    `,
                };
                //ES6
                sgMail
                    .send(msg)
                    .then(() => {
                        res.status(200).send();
                    }, error => {
                        return res.status(400).send("There was a problem sending the email")
                    });

            }) //EOF genToken()
        }
    })//EOF findOne()
})

app.get('/reset_password/:token?', (req, res) => {

    User.findByToken(req.params.token, (err, user) => {

        if (err) return res.status(400).send('There was an error processing your request. Please try again.');

        if (!user){
            res.render('reset_password', {
                validURI: false
            });
            return;
        }else{
            res.render('reset_password', {
                token: req.params.token,
                validURI: true
            });
        }

    })

})
app.post('/api/reset_password', (req, res) => {
    User.findByToken(req.body.token, (err, user) => {
        if (err) return res.status(400).send('There was an error processing your request. Please try again.');

        if(!user) return res.status(400).send('No user match! Check your email for correct link');

        user.password = req.body.password;
        user.hash = crypto.randomBytes(16).toString('hex');

        user.save((err, user)=>{
            res.status(200).send();
        })
    })
})






app.post('/api/genRefreshToken', (req, res) => {
    const user = new User(req.body);

    user.genRefreshToken((err, user, refreshToken,accessToken) =>{

        // res.send({user, accessToken}).status(200);

        res.cookie('accessToken', accessToken, { httpOnly: true })
            .cookie('refreshToken', refreshToken, { httpOnly: true })
            .send({ user, accessToken }).status(200);

    })

})

app.post('/api/newDeviceLogin', (req, res) => {
    //Query the database
    User.findOne({ 'email': req.body.email }, (err, user) => {
        if (err) return res.status(400).json({ message: 'There was an issue with your request. Please try again.' });

        //Check if email exists in the database
        if (!user) {
            console.log('Auth Failed. No User find with that email.');
            return res.status(400).json({ message: 'Auth Failed. No User find with that email.' });
        } else {
            //Check if password match
            user.comparePassword(req.body.password, function (err, isMatch) {
                if (err) throw err;
                if (!isMatch) {
                    console.log('Auth Failed. Wrong password.');
                    return res.status(400).json({ message: 'Wrong password.' })
                }

                // res.status(200).send(isMatch);
                // res.status(200).json({message:'Password Match'});

                user.genRefreshToken((err, user, refreshToken, accessToken) => {

                    res.status(200).send({ user, refreshToken, accessToken });

                    // res.cookie('accessToken', accessToken, { httpOnly: true })
                    //     .cookie('refreshToken', refreshToken, { httpOnly: true })
                    //     .send({ user, accessToken }).status(200);

                })

            })
        }
    })

})

app.post('/api/restrictedPage', (req, res) => {
    if (!req.body.accessToken || !req.body.refreshToken) return res.json({ message: "Unauthorized" }).status(403);

    const tokens = {
        accessToken: req.body.accessToken,
        refreshToken: req.body.refreshToken
    }
    
    // if (!token) return next(); // if there is no token in cookies, don't hit the DB
    // res.json({accessToken}).status(200);

    User.verifyAccessToken( tokens, (err, user, accessToken) => {
        //if (err && req.cookies.refreshToken) res.clearCookie('refreshToken')
        if (err) return res.json(err).status(401); //Error Verifying Token

        const message = {
            message: "Valid Refresh Token",
            accessToken,
            user
        }

        if (accessToken){ res.cookie('accessToken', accessToken, { httpOnly: true })};

        //return user to do customization in Front End like displaying the name
        res.status(200).json(message)
    })
    

})

app.post('/api/forgotPassword', (req, res) => {
    User.findOne({ 'email': req.body.email }, (err, user) => {
        if (err) return res.json({ message: "Bad Request" }).status(400);

        user.genResetToken((err,user)=>{
            const message = {
                resetToken : user.resetToken
            }
            res.json(message).status(200);
        })

    })
})

app.post('/api/logout', (req, res) => {

    User.deleteTokens(req.body.refreshToken, (err)=>{
        if (err) res.json({ message: "Bad Request", err }).status(400);
        
        //res.clearCookie('accessToken')
        //res.clearCookie('refreshToken')
        res.json({ message: "You have logged out succesfully" }).status(200);
    })

})

//Ignite Server!
app.listen(config.PORT, () => {
    console.log(`Server up on port ${config.PORT}`)
});