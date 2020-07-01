var express = require('express');
var router = express.Router();
const jwt = require('jsonwebtoken');
const config = require('./../config');

const sgMail = require('@sendgrid/mail');
sgMail.setApiKey(process.env.SENDGRID_API_KEY);

//DB Models
const { User } = require('./../models/user');

router.get('/:email?/:refreshToken?', function (req, res, next) {

    if (!req.params.email || !req.params.refreshToken) {
        res.render('verify', {
            message: "The submitted URL is invalid. Please check your email and try again.",
            verified: false,
        });
        return;
    }

    User.findOne({ 'email': req.params.email }, (err, user) => {
        if (err) return res.status(400).send('There was an error with your request. Please try again.');

        //Check if email exists in the database
        if (!user) return res.render('verify', { message: `No user found with email '${req.params.email}'`, verified: false, });

        //Check if token matches
        const refreshToken = user.refreshTokens.filter(token => token == req.params.refreshToken);
        if (refreshToken.length < 1) return res.render('verify', { message: "Link has expired. Please login and get a new Verification Link.", verified: false, });

        user.active = 1;
        user.save((err, user) => {
            if (err) return res.status(400).send('There was an error with your request. Please try again.');
            res.render('verify', {
                message: 'Your account has been verified! Go to your dashboard.',
                verified: true,
            });
        })

    })

});

router.post('/', function (req, res, next) {

    
    jwt.verify(req.cookies.refreshToken, config.REFRESH_TOKEN_SECRET, (err, user) => {
        if (err) return console.log(err)

        const msg = {
            to: `${user.email}`,
            from: 'Mayorga Dev <me@alexmayorga.dev>',
            subject: 'Verification Email',
            text: `Hi ${user.firstname}, Please use this link to verify your email address: http://localhost:3000/verify-account/${user.email}/${req.cookies.refreshToken}`,
            html: `
                    Hi ${user.firstname}, Please use this link to verify your email address:
                    <br><br>
                    http://localhost:3000/verify-account/${user.email}/${req.cookies.refreshToken}
                `,
        };
        //ES6
        sgMail
            .send(msg)
            .then(() => {
                // console.log("Message sent!");
                res.status(200).end()
            }, error => {
                // console.error(error);
                res.status(400).end()

                if (error.response) return console.error(error.response.body)

            });
    })

});

module.exports = router;