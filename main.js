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
 * Redis 주석 해제
 * kkutu-lib 모듈에 호환되도록 수정
 * Login 을 Passport 로 수행하기 위한 수정
 * HTTPS 대응코드 삽입
 */

const WS		 = require("ws");
const Express	 = require("express");
const Exession = require("express-session");
const Redission = require("connect-redis")(Exession);
const Redis	 = require("redis");
const Parser	 = require("body-parser");
const DDDoS	 = require("dddos");
const Server	 = Express();
const DB		 = require("./db");
const lib 	= require('kkutu-lib');
const JLog	 = lib.jjlog;
const WebInit	 = require('./webinit.js');
const GLOBAL	 = require("./global.json");
const Const	 = require("./const");
const passport = require('passport');
const https	 = require('https');
const fs		 = require('fs');
const secure = lib.secure;

const Language = {
	'ko_KR': require("./lang/ko_KR.json"),
	'en_US': require("./lang/en_US.json")
};
const ROUTES = [
	"major", "consume", "admin", "login"
];
const page = WebInit.page;
const gameServers = [];

WebInit.MOBILE_AVAILABLE = [
	"portal", "main", "kkutu"
];

lib.checkpub;

let redisConfig = {
	host: GLOBAL.REDIS_ADDR,
	port: GLOBAL.REDIS_PORT,
	password: GLOBAL.REDIS_PASS,
	db: GLOBAL.REDIS_SESSION_DB
};
if(redisConfig.password == '') {
	delete redisConfig.password;
}

const session_configure = {
	store: new Redission({
		client: Redis.createClient(redisConfig),
		ttl: 3600 * 12
	}),
	secret: 'kkutu',
	resave: false,
	saveUninitialized: true
};

JLog.info("<< KKuTu Web >>");
Server.set('views', __dirname + "/views");
Server.set('view engine', "pug");
Server.use(Express.static(__dirname + "/public"));
Server.use(Parser.urlencoded({ extended: true }));
Server.use(Exession(session_configure));
Server.use(passport.initialize());
Server.use(passport.session());
Server.use((req, res, next) => {
	if(req.session.passport) {
		delete req.session.passport;
	}
	next();
});

Server.use((req, res, next) => {
	if(Const.IS_SECURED) {
		if(req.protocol == 'http') {
			let url = 'https://'+req.get('host')+req.path;
			res.status(302).redirect(url);
		} else {
			next();
		}
	} else {
		next();
	}
});
/* use this if you want

DDDoS = new DDDoS({
	maxWeight: 6,
	checkInterval: 10000,
	rules: [{
		regexp: "^/(cf|dict|gwalli)",
		maxWeight: 20,
		errorData: "429 Too Many Requests"
	}, {
		regexp: ".*",
		errorData: "429 Too Many Requests"
	}]
});
DDDoS.rules[0].logFunction = DDDoS.rules[1].logFunction = function(ip, path){
	JLog.warn(`DoS from IP ${ip} on ${path}`);
};
Server.use(DDDoS.express());*/

WebInit.init(Server, true);
DB.ready = function(){
	setInterval(function(){
		let q = [ 'createdAt', { $lte: Date.now() - 3600000 * 12 } ];
		
		DB.session.remove(q).on();
	}, 600000);
	setInterval(function(){
		gameServers.forEach(function(v){
			if(v.socket) v.socket.send(`{"type":"seek"}`);
			else v.seek = undefined;
		});
	}, 4000);
	JLog.success("DB is ready.");
	
	DB.kkutu_shop_desc.find().on(function($docs){
		let i, j;
		
		for(let i in Language) flush(i);
		function flush(lang){
			let db;
			
			Language[lang].SHOP = db = {};
			for(let j in $docs){
				db[$docs[j]._id] = [ $docs[j][`name_${lang}`], $docs[j][`desc_${lang}`] ];
			}
		}
	});
	Server.listen(GLOBAL.WEB_PORT);
	if(Const.IS_SECURED) {
		const options = secure(Const.SSL_OPTIONS);
		https.createServer(options, Server).listen(GLOBAL.SSL_PORT);
	}
};
Const.MAIN_PORTS.forEach(function(v, i){
	if(Array.isArray(v)) {
		v = v[0]
	}
	let KEY = GLOBAL.WS_KEY+'-'+(process.env['WS_KEY'] != undefined ? process.env['WS_KEY'] : 1);
	
	gameServers[i] = new GameClient(i, `${v}/${KEY}`);
});
function GameClient(id, url){
	let my = this;
	
	my.id = id;
	let override;
	if(url.match(/127\.0\.0\.[0-255]/) != null) {
		override = false;
	} else {
		override = true;
	}
	my.socket = new WS(url, {perMessageDeflate: false, rejectUnauthorized: override});
	
	my.send = function(type, data){
		if(!data) data = {};
		data.type = type;
		
		my.socket.send(JSON.stringify(data));
	};
	my.socket.on('open', function(){
		JLog.info(`Game server #${my.id} connected`);
	});
	my.socket.on('error', function(err){
		JLog.warn(`Game server #${my.id} has an error: ${err.toString()}`);
	});
	my.socket.on('close', function(code){
		JLog.error(`Game server #${my.id} closed: ${code}`);
		my.socket.removeAllListeners();
		delete my.socket;
	});
	my.socket.on('message', function(data){
		let _data = data;
		let i;
		
		data = JSON.parse(data);
		
		switch(data.type){
			case "seek":
				my.seek = data.value;
				break;
			case "narrate-friend":
				for(i in data.list){
					gameServers[i].send('narrate-friend', { id: data.id, s: data.s, stat: data.stat, list: data.list[i] });
				}
				break;
			default:
		}
	});
}
ROUTES.forEach(function(v){
	require(`./routes/${v}`).run(Server, WebInit.page);
});
Server.get("/", function(req, res){
	let server = req.query.server;
	
	DB.session.findOne([ '_id', req.session.id ]).on(function($ses){
		// let sid = (($ses || {}).profile || {}).sid || "NULL";
		if(global.isPublic){
			onFinish($ses);
			// DB.jjo_session.findOne([ '_id', sid ]).limit([ 'profile', true ]).on(onFinish);
		}else{
			if($ses) $ses.profile.sid = $ses._id;
			onFinish($ses);
		}
	});
	function onFinish($doc){
		let id = req.session.id;
		
		if($doc){
			req.session.profile = $doc.profile;
			id = $doc.profile.sid;
		}else{
			delete req.session.profile;
		}
		page(req, res, (Array.isArray(Const.MAIN_PORTS[server]) ? Const.MAIN_PORTS[server][0] : Const.MAIN_PORTS[server]) ? "kkutu" : "portal", {
			'_page': "kkutu",
			'_id': id,
			'PORT': (Array.isArray(Const.MAIN_PORTS[server]) ? Const.MAIN_PORTS[server][0] : Const.MAIN_PORTS[server]),
			'HOST': req.hostname,
			'TEST': req.query.test,
			'MOREMI_PART': Const.MOREMI_PART,
			'AVAIL_EQUIP': Const.AVAIL_EQUIP,
			'CATEGORIES': Const.CATEGORIES,
			'GROUPS': Const.GROUPS,
			'MODE': Const.GAME_TYPE,
			'RULE': Const.RULE,
			'OPTIONS': Const.OPTIONS,
			'KO_INJEONG': Const.KO_INJEONG,
			'EN_INJEONG': Const.EN_INJEONG,
			'KO_ADDABLETHEME': Const.KO_ADDABLETHEME,
			'KO_THEME': Const.KO_THEME,
			'EN_THEME': Const.EN_THEME,
			'IJP_EXCEPT': Const.IJP_EXCEPT,
			'ogImage': "http://kkutu.kr/img/kkutu/logo.png",
			'ogURL': "http://kkutu.kr/",
			'ogTitle': "글자로 놀자! 끄투 온라인",
			'ogDescription': "끝말잇기가 이렇게 박진감 넘치는 게임이었다니!"
		});
	}
});
Server.get("/servers", function(req, res){
	let list = [];
	
	gameServers.forEach(function(v, i){
		list[i] = v.seek;
	});
	res.send({ list: list, max: Const.KKUTU_MAX });
});

Server.post("/session/set", function(req, res){
	res.sendStatus(200);
});
Server.get("/legal/:page", function(req, res){
	page(req, res, "legal/"+req.params.page);
});