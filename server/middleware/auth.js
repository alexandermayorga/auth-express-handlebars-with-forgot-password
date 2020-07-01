const {User} = require('./../models/user');

let auth = (req, res, next) => {
	const accessToken = req.cookies.accessToken; //Get token 
	const refreshToken = req.cookies.refreshToken; //Get token 
	
	if (!refreshToken) return next();


	User.verifyAccessToken({ accessToken, refreshToken }, (err, user, accessToken) => {
		if (err && err.name == 'TokenExpiredError'){
			res
				.clearCookie('accessToken')
				.clearCookie('refreshToken')
		}

		if (err) return next();
		
		//Need to set new accessToken
		if (accessToken) res.cookie('accessToken', accessToken, { httpOnly: true, expires: new Date(Date.now() + (60 * 15000)) })
			
		req.user = user;
		next()
	})

}

//Export the model
module.exports = { auth }