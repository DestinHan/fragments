// src/auth/strategies.js
const passport = require('passport');
const { BasicStrategy } = require('passport-http');
const { Strategy: BearerStrategy } = require('passport-http-bearer');
const { CognitoJwtVerifier } = require('aws-jwt-verify');

// ------------------------------
// 1) HTTP Basic strategy (로컬 용)
// ------------------------------
passport.use(
  'http',
  new BasicStrategy((email, password, done) => {
    if (!email || !password) {
      return done(null, false);
    }
    return done(null, email);
  })
);

// ------------------------------
// 2) Cognito Bearer strategy (배포 환경)
// ------------------------------
const userPoolId = process.env.AWS_COGNITO_POOL_ID;
const clientId = process.env.AWS_COGNITO_CLIENT_ID;

let verifier = null;

// 환경변수 존재 여부 로그
console.log('[auth] Loading Cognito config:', {
  userPoolId,
  clientId,
});

if (userPoolId && clientId) {
  verifier = CognitoJwtVerifier.create({
    userPoolId,
    clientId,
    tokenUse: 'access', // ⭐ OIDC access_token 검증 (중요)
  });

  console.log('[auth] Cognito verifier initialized successfully');
} else {
  console.warn(
    '[auth] Missing AWS_COGNITO_POOL_ID or AWS_COGNITO_CLIENT_ID -> Bearer tokens cannot be verified'
  );
}

// ------------------------------
// 3) Bearer strategy 등록 (항상 등록되어야 함)
// ------------------------------
passport.use(
  'bearer',
  new BearerStrategy(async (token, done) => {
    // Cognito verifier 가 없으면 인증 불가 → false
    if (!verifier) {
      console.warn('[auth] No verifier loaded → rejecting token');
      return done(null, false);
    }

    try {
      const payload = await verifier.verify(token);

      // 통일된 사용자 객체 반환
      const user = {
        sub: payload.sub,
        email: payload.email,
        username: payload['cognito:username'],
      };

      console.log('[auth] Token verified OK for user:', user.email);

      return done(null, user);
    } catch (err) {
      console.warn(
        '[auth] Cognito token verification failed:',
        err?.message || err
      );
      return done(null, false);
    }
  })
);

// 이 파일은 전략 등록만 수행하므로 export 없음
module.exports = {};
