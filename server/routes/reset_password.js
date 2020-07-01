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


        const msg = {
            to: `${user.email}`,
            from: 'Mayorga Dev <me@alexmayorga.dev>',
            subject: 'Your Password has been reset',
            text: `Hi ${user.firstname}, we are letting you know your password has been changed. If this was not you please contact us immediately`,
            html: `Hi ${user.firstname}, we are letting you know your password has been changed. If this was not you please contact us immediately`,
        };
        //ES6
        sgMail
            .send(msg)
            .then((res) => {
                // console.log(res)
                // message sent
            }, error => {
                return res.status(400).json({ message: 'There was an error processing your request. Please try again.' })
            });


        user.save((err, user) => {
            res.status(200).send();
        })

    })

})

module.exports = router;