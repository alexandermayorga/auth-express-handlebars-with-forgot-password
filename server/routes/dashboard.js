var express = require('express');
var router = express.Router();

//DB Models
const { User } = require('./../models/user');

router.get('/', function (req, res, next) {

    if (!req.user) return res.redirect('/login');

    res.render('dashboard',{
        dashboard: true,
        active: req.user.active === 1 ? true : false,
    });

});


router.get('/logout', function (req, res, next) {

    if (!req.cookies.refreshToken) return res.redirect('/');

    User.deleteTokens(req.cookies.refreshToken, (err) => {
        if (err) res.status(400).json({ message: "Bad Request", err });

        res
            .clearCookie('accessToken')
            .clearCookie('refreshToken')
            .redirect('/');
    })
    
});

module.exports = router;
