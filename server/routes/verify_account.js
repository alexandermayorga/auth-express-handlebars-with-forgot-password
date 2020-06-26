var express = require('express');
var router = express.Router();

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


module.exports = router;