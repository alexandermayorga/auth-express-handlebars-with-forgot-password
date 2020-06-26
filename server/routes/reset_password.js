var express = require('express');
var router = express.Router();

const sgMail = require('@sendgrid/mail');
sgMail.setApiKey(process.env.SENDGRID_API_KEY);

//DB Models
const { User } = require('./../models/user');

router.get('/:resetToken?', function (req, res, next) {

    User.findByResetToken(req.params.resetToken, (err, user) => {

        if (err) return res.status(400).send('There was an error processing your request. Please try again.');

        if (!user) {
            res.render('reset_password', {
                validURI: false
            });
            return;
        } else {
            res.render('reset_password', {
                resetToken: req.params.resetToken,
                validURI: true
            });
        }

    })


});


router.post('/', function (req, res, next) {

    User.findByResetToken(req.body.resetToken, (err, user) => {

        if (err) return res.status(400).send('There was an error processing your request. Please try again.');

        if (!user) return res.status(400).json({ message: 'Your Reset Link is invalid or has expired. Request new one.'});

        user.password = req.body.password;
        user.set('refreshTokens', []);
        user.set('resetToken', undefined);

        user.save((err, user) => {
            res.status(200).send();
        })

    })

})

module.exports = router;