var express = require('express');
var router = express.Router();
const config = require('../config');

const sgMail = require('@sendgrid/mail');
sgMail.setApiKey(process.env.SENDGRID_API_KEY);

//DB Models
const { User } = require('./../models/user');

router.get('/', function (req, res, next) {
    res.render('forgot');
});


router.post('/', function (req, res, next) {

    User.findOne({ 'email': req.body.email }, (err, user) => {
        if (err) return res.status(400).json({ message: 'There was an error processing your request. Please try again.'});

        //Check if email exists in the database
        if (!user) {
            return res.status(400).json({ message: 'No User found with that email.'});
        } else {
            user.genResetToken((err, resetToken)=>{
                if (err) return res.status(400).json({ message: 'There was an error processing your request. Please try again.' });

                const hostname = (process.env.NODE_ENV === 'production' ? req.hostname : `http://localhost:${config.PORT}`)

                const msg = {
                    to: `${user.email}`,
                    from: 'Mayorga Dev <me@alexmayorga.dev>',
                    subject: 'Password Reset',
                    text: `Hi ${user.firstname}, Please use this link to reset your password: ${hostname}/reset-password/${resetToken}`,
                    html: `
                        Hi ${user.firstname}, Please use this link to reset your password:
                        <br><br>
                        <a 
                            style="padding:6px 12px; background-color:#7557B9;color: #fff;border-radius:6px;display: inline-block;text-decoration:none" 
                            href="${hostname}/reset-password/${resetToken}">Reset Token</a>
                    `,
                };
                //ES6
                sgMail
                    .send(msg)
                    .then(() => {
                        res.status(200).send();
                    }, error => {
                        return res.status(400).json({ message: 'There was an error processing your request. Please try again.' })
                    });
            })
        }
    })//EOF findOne()
})

module.exports = router;