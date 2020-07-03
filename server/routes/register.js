var express = require('express');
var router = express.Router();

const sgMail = require('@sendgrid/mail');
sgMail.setApiKey(process.env.SENDGRID_API_KEY);

//DB Models
const { User } = require('./../models/user');

router.get('/', function (req, res, next) {

    if (req.user) return res.redirect('/dashboard');

    res.render('register');
    
});


router.post('/', function (req, res, next) {
    if (!req.body.email) return res.status(404).end('Nothing send')

    const user = new User(req.body);

    User.findOne({
        $or: [
            { email: req.body.email },
            { username: req.body.username }
        ]
    }).exec(function (err, userDoc) {

        if (userDoc && (userDoc.email === req.body.email)) return res.status(404).json({message: "Email is already in use"}) 
        if (userDoc && (userDoc.username === req.body.username)) return res.status(404).json({message: "Username is already in use"}) 

        user.genRefreshToken((err, user, refreshToken, accessToken) => {
            if (err) return res.status(404).end();

            const msg = {
                to: `${user.email}`,
                from: 'Mayorga Dev <me@alexmayorga.dev>',
                subject: 'Verification Email',
                text: `Hi ${user.firstname}, Please use this link to verify your email address: http://localhost:3000/verify-account/${user.email}/${refreshToken}`,
                html: `
                Hi ${user.firstname}, Please use this link to verify your email address:
                <br><br>
                http://localhost:3000/verify-account/${user.email}/${refreshToken}
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


            res
                .cookie('refreshToken', refreshToken, { httpOnly: true, expires: new Date(Date.now() + 24 * 3600000) })
                .cookie('accessToken', accessToken, { httpOnly: true, expires: new Date(Date.now() + (60 * 10000)) })
                .status(200)
                .end();
        })
    });

});

module.exports = router;
