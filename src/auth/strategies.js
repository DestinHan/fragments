const passport = require('passport');
const { BasicStrategy } = require('passport-http');
const { Strategy: BearerStrategy } = require('passport-http-bearer');
const { CognitoJwtVerifier } = require('aws-jwt-verify');

passport.use(
  'http',
  new BasicStrategy((email, password, done) => {
    if (!email || !password) {
      return done(null, false);
    }
    return done(null, email);
  })
);

const userPoolId = process.env.AWS_COGNITO_POOL_ID;
const clientId = process.env.AWS_COGNITO_CLIENT_ID;

let accessVerifier = null;
let idVerifier = null;

if (userPoolId && clientId) {
  accessVerifier = CognitoJwtVerifier.create({
    userPoolId,
    clientId,
    tokenUse: 'access',
  });

  idVerifier = CognitoJwtVerifier.create({
    userPoolId,
    clientId,
    tokenUse: 'id',
  });

  console.log('[auth] Cognito verifiers initialized', { userPoolId, clientId });
} else {
  console.warn(
    '[auth] AWS_COGNITO_POOL_ID or AWS_COGNITO_CLIENT_ID missing — bearer auth disabled'
  );
}

passport.use(
  'bearer',
  new BearerStrategy(async (token, done) => {
    if (!accessVerifier || !idVerifier) {
      console.warn('[auth] Bearer strategy used but verifiers not initialized');
      return done(null, false);
    }

    try {
      let payload;

      try {
        payload = await accessVerifier.verify(token);
        console.log('[auth] Verified Cognito access token');
      } catch (errAccess) {
        console.warn(
          '[auth] Access token verification failed, trying id token',
          errAccess.message || errAccess
        );

        payload = await idVerifier.verify(token);
        console.log('[auth] Verified Cognito id token');
      }

      return done(null, { sub: payload.sub, email: payload.email });
    } catch (err) {
      console.warn('[auth] Token verification completely failed', err.message || err);
      return done(null, false);
    }
  })
);

module.exports = {};
