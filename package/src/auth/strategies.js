const passport = require('passport');
const { BasicStrategy } = require('passport-http');
const { Strategy: BearerStrategy } = require('passport-http-bearer');
const { CognitoJwtVerifier } = require('aws-jwt-verify');

passport.use(
  'http',
  new BasicStrategy((email, password, done) => {
    if (!email || !password) return done(null, false);
    return done(null, email);
  })
);

const userPoolId = process.env.AWS_COGNITO_POOL_ID;
const clientId = process.env.AWS_COGNITO_CLIENT_ID;

if (userPoolId && clientId) {
  const verifier = CognitoJwtVerifier.create({
    userPoolId,
    clientId,
    tokenUse: 'id',
  });

  passport.use(
    'bearer',
    new BearerStrategy(async (token, done) => {
      try {
        const payload = await verifier.verify(token);
        return done(null, { sub: payload.sub, email: payload.email });
      } catch {
        return done(null, false);
      }
    })
  );
}

module.exports = {};
