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

// --- Cognito Bearer strategy ---
const userPoolId = process.env.AWS_COGNITO_POOL_ID;
const clientId = process.env.AWS_COGNITO_CLIENT_ID;

let verifier = null;

if (userPoolId && clientId) {
  verifier = CognitoJwtVerifier.create({
    userPoolId,
    clientId,
    tokenUse: 'access',
  });
  console.log('[auth] Cognito verifier initialized', { userPoolId, clientId });
} else {
  console.warn(
    '[auth] AWS_COGNITO_POOL_ID or AWS_COGNITO_CLIENT_ID missing — bearer auth disabled'
  );
}

passport.use(
  'bearer',
  new BearerStrategy(async (token, done) => {
    if (!verifier) {
      return done(null, false);
    }

    try {
      const payload = await verifier.verify(token);
      return done(null, { sub: payload.sub, email: payload.email });
    } catch {
      console.warn('[auth] Token verification failed');
      return done(null, false);
    }
  })
);

module.exports = {};
