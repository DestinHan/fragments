// src/auth/strategies.js
const passport = require('passport');
const { BasicStrategy } = require('passport-http');
const { Strategy: BearerStrategy } = require('passport-http-bearer');
const { CognitoJwtVerifier } = require('aws-jwt-verify');

const userPoolId = process.env.AWS_COGNITO_POOL_ID;
const clientId   = process.env.AWS_COGNITO_CLIENT_ID;

// Bearer (Cognito)
const verifier = CognitoJwtVerifier.create({
  userPoolId,
  tokenUse: 'id',
  clientId,
});

verifier.hydrate?.().catch(() => { /* noop */ });

passport.use(
  'bearer',
  new BearerStrategy(async (token, done) => {
    try {
      const payload = await verifier.verify(token);
      const user = {
        sub: payload.sub,
        email: payload.email,
        username: payload['cognito:username'],
      };
      return done(null, user);
    } catch {
      return done(null, false);
    }
  })
);

passport.use(
  'http',
  new BasicStrategy((email, password, done) => {
    if (!email || !password) return done(null, false);
    return done(null, email);
  })
);

module.exports = {};
