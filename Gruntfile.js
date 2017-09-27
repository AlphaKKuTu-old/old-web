const LICENSE = [
	"Rule the words! KKuTu Online",
	"Copyright (C) 2017 JJoriping(op@jjo.kr)",
	"",
	"This program is free software: you can redistribute it and/or modify",
	"it under the terms of the GNU General Public License as published by",
	"the Free Software Foundation, either version 3 of the License, or",
	"(at your option) any later version.",
	"",
	"This program is distributed in the hope that it will be useful,",
	"but WITHOUT ANY WARRANTY; without even the implied warranty of",
	"MERCHANTABILITY or FITNESS FOR A PARTICULAR PURPOSE.  See the",
	"GNU General Public License for more details.",
	"",
	"You should have received a copy of the GNU General Public License",
	"along with this program. If not, see <http://www.gnu.org/licenses/>."
].join('\n');

var File = require('fs');

const LIST = [
	"global",
	
	"in_login",
	"in_game_kkutu",
	"in_game_kkutu_help",
	"in_admin",
	"in_portal"
];
const KKUTU_LIST = [
	"lib/kkutu/head.js",
	"lib/kkutu/ready.js",
	"lib/kkutu/rule_classic.js",
	"lib/kkutu/rule_jaqwi.js",
	"lib/kkutu/rule_crossword.js",
	"lib/kkutu/rule_typing.js",
	"lib/kkutu/rule_hunmin.js",
	"lib/kkutu/rule_daneo.js",
	"lib/kkutu/rule_sock.js",
	"lib/kkutu/body.js",
	"lib/kkutu/tail.js"
];

module.exports = function(grunt){
	var i, files = {}, cons = {};
	var KKUTU = "public/js/in_game_kkutu.min.js";
	
	for(i in LIST){
		files["public/js/"+LIST[i]+".min.js"] = "lib/"+LIST[i]+".js";
	}
	files[KKUTU] = KKUTU_LIST;
	
	grunt.initConfig({
		uglify: {
			options: {
				banner: "/**\n" + LICENSE + "\n*/\n\n"
			},
			build: {
				files: files
			}
		},
		concat: {
			basic: {
				src: KKUTU_LIST,
				dest: "lib/in_game_kkutu.js"
			}
		}
	});
	grunt.loadNpmTasks('grunt-contrib-uglify');
	grunt.loadNpmTasks('grunt-contrib-concat');
	
	grunt.registerTask('default', ['concat', 'uglify']);
	grunt.registerTask('pack', 'Log', function(){
		var done = this.async();
		var url = __dirname + "/" + KKUTU;
		
		File.readFile(url, function(err, res){
			File.writeFile(url, "(function(){" + res.toString() + "})();", function(err, res){
				done();
			});
		})
	});
};