const mongoose = require('mongoose');
const bcrypt = require('bcrypt');
const jwt = require('jsonwebtoken');
const config = require('./../config');
const SALT_I = 10;

//DB Schema
const userSchema = mongoose.Schema({
	username:{
		type:String,
		required:true,
		unique:1,
		maxlength:100
	},
	firstname:{
		type:String,
		required:true,
		trim:true
	},
	lastname:{
		type:String,
		required:true,
		trim:true
	},
	email:{
		type:String,
		required:true,
		trim:true,
		unique:1
	},
	password: {
		type: String,
		required: true,
		minlength: 5
	},
	resetToken: {
		type: String,
	},
	refreshTokens: {
		type: [String],
		required: true,
		default: []
	},
    active: {
        type: Number,
        default: 0
    }
}, { timestamps: true });

//Before sending to database
//Creates encrypted Password
userSchema.pre('save',function(next){ //ES5 Function
	var user = this;

	if (user.isModified("password")) {
		bcrypt.genSalt(SALT_I,function(err,salt){
			if (err) return next(err);
			bcrypt.hash(user.password,salt,function(err,hash){
				if (err) return next(err);
				user.password = hash;
				next();
			})
		})
	}else{
		next();
	}
})

// userSchema.post('save', function() {
//   console.log('this gets printed second');
// });

//Create new method for the schema
//Compares a password provided by the user with the one in the db
userSchema.methods.comparePassword = function( candidatePassword, cb ){
	bcrypt.compare( candidatePassword, this.password, function( err, isMatch ){
		if(err) return cb(err);
		cb( null, isMatch );
	})
}

userSchema.methods.genRefreshToken = function (cb) {
	let user = this;

	let refreshToken = jwt.sign(
		{ userId: user._id.toHexString(), email: user.email, firstname: user.firstname }, 
		config.REFRESH_TOKEN_SECRET, 
		{ expiresIn: '1d' }
		);


	cleanRefreshTokens(user.refreshTokens)
	.then(tokens =>{
		const activeRefreshTokens = tokens.filter(token => token !== null)

		user.refreshTokens = [...activeRefreshTokens, refreshToken];

		const accessToken = user.genAccessToken();

		user.save((err, user) => {
			if (err) return cb(err);
			cb(null, user, refreshToken, accessToken)
		})
	})
	.catch(error => {
		return cb(error);
	})

}

userSchema.methods.genAccessToken = function () {
	const user = this;
	let refreshToken = jwt.sign({ userId: user._id.toHexString() }, config.ACCESS_TOKEN_SECRET, { expiresIn: '10m' });

	return refreshToken;
}

userSchema.statics.refreshAccessToken = function (refreshToken,cb) {
	const user = this;

	jwt.verify( refreshToken, config.REFRESH_TOKEN_SECRET, (err, decode) => {
		if (err) return cb(err); // Refresh Token Invalid or Expired

		//Check if in DB list
		user.findOne({ '_id': decode.userId }, (err, user) => {
			if (err) return cb(err);
			
			const matchRefreshToken = token => token == refreshToken;
			const validToken = user.refreshTokens.some(matchRefreshToken);

			//Todo: Delete Refresh Token from client
			if (!validToken) return cb({
				message: "No Matching Refresh Token in DB. Delete Refresh Token from client",
				deleteClientRefreshToken: true
			});


			jwt.sign({ userId: decode.userId }, config.ACCESS_TOKEN_SECRET, { expiresIn: '10m' }, (err, accessToken) => {
				if (err) return cb(err);
				return cb(null, {user, accessToken} );
			});
		})
	})
}

userSchema.statics.verifyAccessToken = function (tokens, cb) {
	const user = this;

	jwt.verify( tokens.accessToken, config.ACCESS_TOKEN_SECRET, (err, decode) => {

		if (err) {  // Access Token Invalid or Expired. Try to generate a new one.
			user.refreshAccessToken(tokens.refreshToken, (err, data) => {
				if (err) return cb(err); // Refresh Token Invalid or Expired

				return cb(null, data.user, data.accessToken)
				
			});
		}
		else { // Valid Access Token
			user.findOne({ '_id': decode.userId }, (err, user) => {
				if (err) return cb(err);

				cb(null, user)
			})
		}
	})
}

userSchema.methods.genResetToken = function (cb) {
	const user = this;

	user.resetToken = jwt.sign({ userId: user._id.toHexString() }, config.RESET_TOKEN_SECRET, { expiresIn: '1d' });

	user.save((err, user) => {
		if (err) return cb(err);
		cb(null, user.resetToken);
	})
}

userSchema.statics.findByResetToken = function (resetToken, cb) {
	const user = this;

	jwt.verify(resetToken, config.RESET_TOKEN_SECRET, (err, decode) => {
		if (err) return cb(null)

		user.findOne({ '_id': decode.userId, 'resetToken': resetToken }, (err, user) => {
			if (err) return cb(err);

			cb(null, user)
		})
	})

}

userSchema.statics.deleteTokens = function (refreshToken,cb) {
	const user = this;

	jwt.verify(refreshToken, config.REFRESH_TOKEN_SECRET, (err, decode) => {
		if (err) return cb(err); 

		//Check if in DB list
		user.findOne({ '_id': decode.userId }, (err, user) => {
			if (err) return cb(err);

			const newTokenList = user.refreshTokens.filter(token => token !== refreshToken);

			user.refreshTokens = newTokenList;

			user.save((err, user) => {
				if (err) return cb(err);
				return cb(null)
			})
		})

	})

}

/**
 * Takes an array of JWT tokens and returns a new array of non Expired tokens
 * @param {Array} refreshTokens 
 */
function cleanRefreshTokens(refreshTokens) {
	if (refreshTokens.length < 1) return new Promise((res,rej) => res([null]))

	return Promise.all(refreshTokens.map(
		async (refreshToken) => {
			try {
				const promise = new Promise((res, rej) => {

					jwt.verify(refreshToken, config.REFRESH_TOKEN_SECRET, (err, decode) => {
						if (err && err.name != 'TokenExpiredError') return rej(err)
						if (err && err.name == 'TokenExpiredError') return res(null)
						res(refreshToken)
					})

				})

				const result = await promise;
				return result;
			} catch (rejected) {
				return rejected;
			}
		}
	))
}


const User = mongoose.model('User',userSchema);

//Export the model
module.exports = {User}