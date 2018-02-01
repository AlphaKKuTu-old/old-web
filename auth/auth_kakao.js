const config = require('../auth.json')

module.exports.config = {
  Strategy: require('passport-kakao').Strategy,
  color: '#FFDE00',
  fontColor: '#3C1E1E',
  vendor: 'kakao',
  displayName: 'withKakao',
  'useoAuth-buttons': true
}

module.exports.strategyConfig = {
  clientID: config.kakao.clientID, // 보안을 위해서입니다.
  callbackURL: config.kakao.callbackURL, // 이 방법을 사용하는 것을
  passReqToCallback: true // 적극 권장합니다.
}

module.exports.Strategy = (process, MainDB, Ajae) => {
  return (req, accessToken, refreshToken, profile, done) => {
    const $p = {}

    $p.authType = 'kakao'
    $p.id = 'kakao-' + profile.id
    $p.name = profile.username
    $p.title = profile.displayName
    $p.image = profile._json.properties.profile_image

    process(req, accessToken, MainDB, $p, done)
  }
}
