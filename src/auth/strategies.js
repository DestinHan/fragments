const passport = require('passport');
const { BasicStrategy } = require('passport-http');

passport.use(
  'http',
  new BasicStrategy((email, password, done) => {
    if (!email || !password) return done(null, false);

    return done(null, email);
  })
);

module.exports = {};
