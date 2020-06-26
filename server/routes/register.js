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

    const user = new User(req.body);

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
            .cookie('refreshToken', refreshToken, { httpOnly: true })
            .cookie('accessToken', accessToken, { httpOnly: true })
            .status(200)
            .end();
    })

});

module.exports = router;
