const passport = require('passport');
const { Strategy: BearerStrategy } = require('passport-http-bearer');
const { CognitoJwtVerifier } = require('aws-jwt-verify');

const region     = process.env.AWS_COGNITO_REGION;
const userPoolId = process.env.AWS_COGNITO_POOL_ID;
const clientId   = process.env.AWS_COGNITO_CLIENT_ID;

const verifier = CognitoJwtVerifier.create({
  userPoolId,
  tokenUse: 'id',
  clientId,
});

console.log('[Auth] Cognito verifier initialized', { region, userPoolId, clientId });

passport.use(
  new BearerStrategy(async (token, done) => {
    try {
      const payload = await verifier.verify(token);

      const user = {
        sub: payload.sub,
        email: payload.email,
        username: payload['cognito:username'],
      };

      console.log('[Auth] Verified user', user);
      return done(null, user);
    } catch (err) {
      console.warn('[Auth] Token verification failed:', err?.message);
      return done(null, false);
    }
  })
);

module.exports = {
  passport,
  authenticate: () => passport.authenticate('bearer', { session: false }),
};
