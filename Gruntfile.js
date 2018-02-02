const LICENSE = [
  'Rule the words! KKuTu Online',
  'Copyright (C) 2017 JJoriping(op@jjo.kr)',
  '',
  'This program is free software: you can redistribute it and/or modify',
  'it under the terms of the GNU General Public License as published by',
  'the Free Software Foundation, either version 3 of the License, or',
  '(at your option) any later version.',
  '',
  'This program is distributed in the hope that it will be useful,',
  'but WITHOUT ANY WARRANTY; without even the implied warranty of',
  'MERCHANTABILITY or FITNESS FOR A PARTICULAR PURPOSE.  See the',
  'GNU General Public License for more details.',
  '',
  'You should have received a copy of the GNU General Public License',
  'along with this program. If not, see <http://www.gnu.org/licenses/>.'
].join('\n')

/**
 * 볕뉘 수정사항:
 * var 에서 let/const 로 변수 변경
 * 파일 경로 변경
 * Login 실패 페이지 제작을 위한 대응코드 삽입
 */

const File = require('fs')
const path = require('path')

const LIST = [
  'global',

  'in_login',
  'in_game_kkutu',
  'in_game_kkutu_help',
  'in_admin',
  'in_portal',
  'in_m_portal',
  'in_loginfail',
  'in_404'
]
const KKUTU_LIST = [
  'lib/kkutu/head.js',
  'lib/kkutu/ready.js',
  'lib/kkutu/rule_classic.js',
  'lib/kkutu/rule_jaqwi.js',
  'lib/kkutu/rule_crossword.js',
  'lib/kkutu/rule_typing.js',
  'lib/kkutu/rule_hunmin.js',
  'lib/kkutu/rule_daneo.js',
  'lib/kkutu/rule_sock.js',
  'lib/kkutu/body.js',
  'lib/kkutu/tail.js'
]

module.exports = function (grunt) {
  let files = {}
  let KKUTU = 'public/js/in_game_kkutu.min.js'

  for (let i in LIST) {
    files['public/js/' + LIST[i] + '.min.js'] = 'lib/' + LIST[i] + '.js'
  }
  files[KKUTU] = KKUTU_LIST

  grunt.initConfig({
    uglify: {
      options: {
        banner: '/**\n' + LICENSE + '\n*/\n\n'
      },
      build: {
        files: [{
          expand: true,
          cwd: 'public/js',
          src: ['*.min.js', '!oauth-buttons.min.js',
            '!sweetalert.min.js', '!jquery.js'],
          dest: 'public/js',
          ext: '.min.js'
        }, {
          src: 'lib/in_game_kkutu.js',
          dest: 'public/js/in_game_kkutu.min.js'
        }]
      }
    },
    concat: {
      basic: {
        src: KKUTU_LIST,
        dest: 'lib/in_game_kkutu.js'
      }
    },
    babel: {
      options: {
        sourceMap: false,
        presets: ['es2015']
      },
      build: {
        files: [{
          expand: true,
          cwd: '/lib',
          src: ['*.js', '!in_game_kkutu.js'],
          dest: '/public/js',
          ext: '.min.js'
        }]
      }
    }
  })
  grunt.loadNpmTasks('grunt-contrib-uglify')
  grunt.loadNpmTasks('grunt-contrib-concat')
  grunt.loadNpmTasks('grunt-babel')

  grunt.registerTask('default', ['concat', 'babel', 'uglify'])
  grunt.registerTask('pack', 'Log', function () {
    let done = this.async()
    let url = path.join(__dirname, KKUTU)

    File.readFile(url, function (err, res) {
      if (err) console.error(err)
      File.writeFile(url, '(function(){' + res.toString() + '})();', function (err, res) {
        if (err) console.error(err)
        done()
      })
    })
  })
}
