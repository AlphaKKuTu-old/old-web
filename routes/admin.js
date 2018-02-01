/**
 * Rule the words! KKuTu Online
 * Copyright (C) 2017 JJoriping(op@jjo.kr)
 *
 * This program is free software: you can redistribute it and/or modify
 * it under the terms of the GNU General Public License as published by
 * the Free Software Foundation, either version 3 of the License, or
 * (at your option) any later version.
 *
 * This program is distributed in the hope that it will be useful,
 * but WITHOUT ANY WARRANTY; without even the implied warranty of
 * MERCHANTABILITY or FITNESS FOR A PARTICULAR PURPOSE.  See the
 * GNU General Public License for more details.
 *
 * You should have received a copy of the GNU General Public License
 * along with this program. If not, see <http://www.gnu.org/licenses/>.
 */

/**
 * 볕뉘 수정사항:
 * var 에서 let/const 로 변수 변경
 * kkutu-lib 모듈에 호환되도록 수정
 * 파일 위치관련 수정
 */

const File = require('fs')
const MainDB = require('../db')
const GLOBAL = require('../global.json')
const lib = require('kkutu-lib')
const JLog = lib.jjlog
const Lizard = lib.lizard
const WebInit = require('../webinit.js')

exports.run = function (Server, page) {
  Server.get('/gwalli', function (req, res) {
    if (!checkAdmin(req, res)) return

    req.session.admin = true
    page(req, res, 'gwalli')
  })
  Server.get('/gwalli/injeong', function (req, res) {
    if (!checkAdmin(req, res)) return

    MainDB.kkutu_injeong.find([ 'theme', { $not: '~' } ]).limit(100).on(function ($list) {
      res.send({ list: $list })
    })
  })
  Server.get('/gwalli/gamsi', function (req, res) {
    if (!checkAdmin(req, res)) return

    MainDB.users.findOne([ '_id', req.query.id ]).limit([ 'server', true ]).on(function ($u) {
      if (!$u) return res.sendStatus(404)
      let data = { _id: $u._id, server: $u.server }

      MainDB.session.findOne([ 'profile.id', $u._id ]).limit([ 'profile', true ]).on(function ($s) {
        if ($s) data.title = $s.profile.title || $s.profile.name
        res.send(data)
      })
    })
  })
  Server.get('/gwalli/users', function (req, res) {
    if (!checkAdmin(req, res)) return

    if (req.query.name) {
      MainDB.session.find([ 'profile.title', req.query.name ]).on(function ($u) {
        if ($u) return onSession($u)
        MainDB.session.find([ 'profile.name', req.query.name ]).on(function ($u) {
          if ($u) return onSession($u)
          res.sendStatus(404)
        })
      })
    } else {
      MainDB.users.findOne([ '_id', req.query.id ]).on(function ($u) {
        if ($u) return res.send({ list: [ $u ] })
        res.sendStatus(404)
      })
    }
    function onSession (list) {
      let board = {}

      Lizard.all(list.map(function (v) {
        if (board[v.profile.id]) return null
        else {
          board[v.profile.id] = true
          return getProfile(v.profile.id)
        }
      })).then(function (data) {
        res.send({ list: data })
      })
    }
    function getProfile (id) {
      let R = new Lizard.Tail()

      if (id) {
        MainDB.users.findOne([ '_id', id ]).on(function ($u) {
          R.go($u)
        })
      } else R.go(null)
      return R
    }
  })
  Server.get('/gwalli/kkutudb/:word', function (req, res) {
    if (!checkAdmin(req, res)) return

    let TABLE = MainDB.kkutu[req.query.lang]

    if (!TABLE) res.sendStatus(400)
    if (!TABLE.findOne) res.sendStatus(400)
    TABLE.findOne([ '_id', req.params.word ]).on(function ($doc) {
      res.send($doc)
    })
  })
  Server.get('/gwalli/kkututheme', function (req, res) {
    if (!checkAdmin(req, res)) return

    let TABLE = MainDB.kkutu[req.query.lang]

    if (!TABLE) res.sendStatus(400)
    if (!TABLE.find) res.sendStatus(400)
    TABLE.find([ 'theme', new RegExp(req.query.theme) ]).limit([ '_id', true ]).on(function ($docs) {
      res.send({ list: $docs.map(v => v._id) })
    })
  })
  Server.get('/gwalli/kkutuhot', function (req, res) {
    if (!checkAdmin(req, res)) return
    File.readFile(require('path').join(__dirname, '../', GLOBAL.KKUTUHOT_PATH), function (err, file) {
      if (err) {
        JLog.warn(err)
        res.sendStatus(400)
      } else {
        let data = JSON.parse(file.toString())

        parseKKuTuHot().then(function ($kh) {
          res.send({ prev: data, data: $kh })
        })
      }
    })
  })
  Server.get('/gwalli/shop/:key', function (req, res) {
    if (!checkAdmin(req, res)) return

    let q = (req.params.key === '~ALL') ? undefined : [ '_id', req.params.key ]

    MainDB.kkutu_shop.find(q).on(function ($docs) {
      MainDB.kkutu_shop_desc.find(q).on(function ($desc) {
        res.send({ goods: $docs, desc: $desc })
      })
    })
  })
  Server.post('/gwalli/injeong', function (req, res) {
    if (!checkAdmin(req, res)) return
    if (req.body.pw !== GLOBAL.PASS) return res.sendStatus(400)

    let list = JSON.parse(req.body.list).list

    list.forEach(function (v) {
      if (v.ok) {
        req.body.nof = true
        req.body.lang = 'ko'
        v.theme.split(',').forEach(function (w, i) {
          setTimeout(function (lid, x) {
            req.body.list = lid
            req.body.theme = x
            onKKuTuDB(req, res)
          }, i * 1000, v._id.replace(/[^가-힣0-9]/g, ''), w)
        })
      } else {
        MainDB.kkutu_injeong.update([ '_id', v._origin ]).set([ 'theme', '~' ]).on()
      }
      // MainDB.kkutu_injeong.remove([ '_id', v._origin ]).on();
    })
    res.sendStatus(200)
  })
  Server.post('/gwalli/kkutudb', onKKuTuDB)
  function onKKuTuDB (req, res) {
    if (!checkAdmin(req, res)) return
    if (req.body.pw !== GLOBAL.PASS) return res.sendStatus(400)

    let theme = req.body.theme
    let list = req.body.list
    let TABLE = MainDB.kkutu[req.body.lang]

    if (list) list = list.split(/[,\r\n]+/)
    else return res.sendStatus(400)
    if (!TABLE) res.sendStatus(400)
    if (!TABLE.insert) res.sendStatus(400)

    noticeAdmin(req, theme, list.length)
    list.forEach(function (item) {
      if (!item) return
      item = item.trim()
      if (!item.length) return
      TABLE.findOne([ '_id', item ]).on(function ($doc) {
        if (!$doc) return TABLE.insert([ '_id', item ], [ 'type', 'INJEONG' ], [ 'theme', theme ], [ 'mean', '＂1＂' ], [ 'flag', 2 ]).on()
        let means = $doc.mean.split(/＂[0-9]+＂/g).slice(1)
        let len = means.length

        if ($doc.theme.indexOf(theme) === -1) {
          $doc.type += ',INJEONG'
          $doc.theme += ',' + theme
          $doc.mean += `＂${len + 1}＂`
          TABLE.update([ '_id', item ]).set([ 'type', $doc.type ], [ 'theme', $doc.theme ], [ 'mean', $doc.mean ]).on()
        } else {
          JLog.warn(`Word '${item}' already has the theme '${theme}'!`)
        }
      })
    })
    if (!req.body.nof) res.sendStatus(200)
  }
  Server.post('/gwalli/kkutudb/:word', function (req, res) {
    if (!checkAdmin(req, res)) return
    if (req.body.pw !== GLOBAL.PASS) return res.sendStatus(400)
    let TABLE = MainDB.kkutu[req.body.lang]
    let data = JSON.parse(req.body.data)

    if (!TABLE) res.sendStatus(400)
    if (!TABLE.upsert) res.sendStatus(400)

    noticeAdmin(req, data._id)
    if (data.mean === '') {
      TABLE.remove([ '_id', data._id ]).on(function ($res) {
        res.send($res.toString())
      })
    } else {
      TABLE.upsert([ '_id', data._id ]).set([ 'flag', data.flag ], [ 'type', data.type ], [ 'theme', data.theme ], [ 'mean', data.mean ]).on(function ($res) {
        res.send($res.toString())
      })
    }
  })
  Server.post('/gwalli/kkutuhot', function (req, res) {
    if (!checkAdmin(req, res)) return
    if (req.body.pw !== GLOBAL.PASS) return res.sendStatus(400)

    noticeAdmin(req)
    parseKKuTuHot().then(function ($kh) {
      let obj = {}

      for (let i in $kh) {
        for (let j in $kh[i]) {
          obj[$kh[i][j]._id] = $kh[i][j].hit
        }
      }
      File.writeFile(require('path').join(__dirname, '../', GLOBAL.KKUTUHOT_PATH), JSON.stringify(obj), function (err) {
        res.send(err)
      })
    })
  })
  Server.post('/gwalli/users', function (req, res) {
    if (!checkAdmin(req, res)) return
    if (req.body.pw !== GLOBAL.PASS) return res.sendStatus(400)

    let list = JSON.parse(req.body.list).list

    list.forEach(function (item) {
      MainDB.users.upsert([ '_id', item._id ]).set(item).on()
    })
    res.sendStatus(200)
  })
  Server.post('/gwalli/shop', function (req, res) {
    if (!checkAdmin(req, res)) return
    if (req.body.pw !== GLOBAL.PASS) return res.sendStatus(400)

    let list = JSON.parse(req.body.list).list

    list.forEach(function (item) {
      item.core.options = JSON.parse(item.core.options)
      MainDB.kkutu_shop.upsert([ '_id', item._id ]).set(item.core).on()
      MainDB.kkutu_shop_desc.upsert([ '_id', item._id ]).set(item.text).on()
    })
    res.sendStatus(200)
  })
}
function noticeAdmin (req, ...args) {
  JLog.info(`[ADMIN] ${req.originalUrl} ${req.ip} | ${args.join(' | ')}`)
}
function checkAdmin (req, res) {
  const page = WebInit.page
  if (global.isPublic) {
    if (req.session.profile) {
      if (GLOBAL.ADMIN.indexOf(req.session.profile.id) === -1) {
        req.session.admin = false
        return page(req, res, '404', undefined, 404), false
      }
    } else {
      req.session.admin = false
      return page(req, res, '404', undefined, 404), false
    }
  }
  return true
}
function parseKKuTuHot () {
  const R = new Lizard.Tail()

  Lizard.all([
    query(`SELECT * FROM kkutu_ko WHERE hit > 0 ORDER BY hit DESC LIMIT 50`),
    query(`SELECT * FROM kkutu_ko WHERE _id ~ '^...$' AND hit > 0 ORDER BY hit DESC LIMIT 50`),
    query(`SELECT * FROM kkutu_ko WHERE type = 'INJEONG' AND hit > 0 ORDER BY hit DESC LIMIT 50`),
    query(`SELECT * FROM kkutu_en WHERE hit > 0 ORDER BY hit DESC LIMIT 50`)
  ]).then(function ($docs) {
    R.go($docs)
  })
  function query (q) {
    const R = new Lizard.Tail()

    MainDB.kkutu['ko'].direct(q, function (err, $docs) {
      if (err) return JLog.error(err.toString())
      R.go($docs.rows)
    })
    return R
  }
  return R
}
