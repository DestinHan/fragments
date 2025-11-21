// src/auth/strategies.js
const passport = require('passport');
const { BasicStrategy } = require('passport-http');
const { Strategy: BearerStrategy } = require('passport-http-bearer');
const { CognitoJwtVerifier } = require('aws-jwt-verify');

// --------------------------------------------------
// 1) HTTP Basic strategy (로컬 / Lab1-8용)
// --------------------------------------------------
passport.use(
  'http',
  new BasicStrategy((email, password, done) => {
    if (!email || !password) {
      return done(null, false);
    }
    return done(null, email);
  })
);

// --------------------------------------------------
// 2) Cognito Bearer strategy (Lab9 이후 ECS용)
//    - id_token 이든 access_token 이든 둘 다 허용
// --------------------------------------------------
const userPoolId = process.env.AWS_COGNITO_POOL_ID;
const clientId = process.env.AWS_COGNITO_CLIENT_ID;

let idVerifier = null;
let accessVerifier = null;

// 환경변수 확인용 로그
console.log('[auth] Cognito config:', {
  userPoolId,
  clientId,
});

if (userPoolId && clientId) {
  // id_token 검증용
  idVerifier = CognitoJwtVerifier.create({
    userPoolId,
    clientId,
    tokenUse: 'id',
  });

  // access_token 검증용
  accessVerifier = CognitoJwtVerifier.create({
    userPoolId,
    clientId,
    tokenUse: 'access',
  });

  console.log('[auth] Cognito verifiers initialized (id + access)');
} else {
  console.warn(
    '[auth] AWS_COGNITO_POOL_ID / AWS_COGNITO_CLIENT_ID not set → bearer auth will always fail'
  );
}

// Bearer 전략은 무조건 등록
passport.use(
  'bearer',
  new BearerStrategy(async (token, done) => {
    if (!idVerifier && !accessVerifier) {
      console.warn('[auth] No Cognito verifiers → rejecting bearer token');
      return done(null, false);
    }

    let payload = null;

    // 1) id_token 으로 시도
    if (idVerifier) {
      try {
        payload = await idVerifier.verify(token);
        console.log('[auth] Verified as id_token');
      } catch (err) {
        // 무시하고 access_token으로 재시도
      }
    }

    // 2) access_token 으로 시도
    if (!payload && accessVerifier) {
      try {
        payload = await accessVerifier.verify(token);
        console.log('[auth] Verified as access_token');
      } catch (err) {
        console.warn(
          '[auth] Token verification failed for both id/access:',
          err?.message || err
        );
        return done(null, false);
      }
    }

    if (!payload) {
      // 둘 다 실패한 경우
      return done(null, false);
    }

    // 통합된 user 객체
    const user = {
      sub: payload.sub,
      email: payload.email,
      username: payload['cognito:username'],
    };

    console.log('[auth] Authenticated user:', user.email || user.sub);
    return done(null, user);
  })
);

// 이 파일은 전략 등록만 담당
module.exports = {};
