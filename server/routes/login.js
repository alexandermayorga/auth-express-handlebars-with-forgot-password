var express = require('express');
var router = express.Router();

//DB Models
const { User } = require('./../models/user');

router.get('/', function (req, res, next) {

    if (req.user) return res.redirect('/dashboard');

    res.render('login');
});

router.post('/', function (req, res, next) {
    const badRequest = 'There was an error with your request. Please check your information and try again.';

    //Query the database
    User.findOne({ 'email': req.body.email }, (err, user) => {
        if (err) return res.status(400).json({ message: badRequest })
        
        if (!user) return res.status(400).json({ message: 'Auth Failed. No User found with that email.' });

        //Check if password match
        user.comparePassword(req.body.password, function (err, isMatch) {
            if (err) return res.status(400).json({ message: badRequest })
            
            if (!isMatch) return res.status(400).json({ message: 'Wrong password.' })
            

            user.genRefreshToken((err, user, refreshToken, accessToken) => {
                if (err) res.status(400).json({ message: badRequest })

                res
                    .cookie('refreshToken', refreshToken, { httpOnly: true, expires: new Date(Date.now() + 24 * 3600000) })
                    .cookie('accessToken', accessToken, { httpOnly: true, expires: new Date(Date.now() + (60 * 15000)) })
                    .status(200)
                    .end();
                
            })
        })
    })


});

module.exports = router;
