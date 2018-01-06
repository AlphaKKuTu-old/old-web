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
 */

const GLOBAL	 = require("./global.json");
const lib 	= require('kkutu-lib');
const JLog	 = lib.jjlog;
const Language = {
	'ko_KR': require("./lang/ko_KR.json"),
	'en_US': require("./lang/en_US.json")
};

function updateLanguage(){
	let i, src;
	
	for(let i in Language){
		src = `../Web/lang/${i}.json`;
		
		delete require.cache[require.resolve(src)];
		Language[i] = require(src);
	}
}
function getLanguage(locale, page, shop){
	let i;
	let L = Language[locale] || {};
	let R = {};
	
	for(i in L.GLOBAL) R[i] = L.GLOBAL[i];
	if(shop) for(i in L.SHOP) R[i] = L.SHOP[i];
	for(i in L[page]) R[i] = L[page][i];
	if(R['title']) R['title'] = `[${GLOBAL.SERVER_NAME}] ${R['title']}`;
	
	return R;
}
function page(req, res, file, data){
	if(data == undefined)	data = {};
	if(req.session.createdAt){
		if(new Date() - req.session.createdAt > 3600000){
			delete req.session.profile;
		}
	}else{
		req.session.createdAt = new Date();
	}
	let addr = req.ip || "";
	let sid = req.session.id || "";
	
	data.published = global.isPublic;
	data.lang = req.query.locale || "ko_KR";
	if(!Language[data.lang]) data.lang = "ko_KR";
	// URL ...?locale=en_US will show the page in English
	
	// if(exports.STATIC) data.static = exports.STATIC[data.lang];
	data.season = GLOBAL.SEASON;
	data.season_pre = GLOBAL.SEASON_PRE;
	
	data.locale = getLanguage(data.lang, data._page || file.split('_')[0], data._shop);
	data.session = req.session;
	if((/mobile/i).test(req.get('user-agent')) || req.query.mob){
		data.mobile = true;
		if(req.query.pc){
			data.as_pc = true;
			data.page = file;
		}else if(exports.MOBILE_AVAILABLE && exports.MOBILE_AVAILABLE.includes(file)){
			data.page = 'm_' + file;
		}else{
			data.mobile = false;
			data.page = file;
		}
	}else{
		data.page = file;
	}
	
	JLog.log(`${addr.slice(7)}@${sid.slice(0, 10)} ${data.page}, ${JSON.stringify(req.params)}`);
	res.render(data.page, data, function(err, html){
		if(err) res.send(err.toString());
		else res.send(html);
	});
}
exports.init = function(Server, shop){
	Server.get("/language/:page/:lang", function(req, res){
		let page = req.params.page.replace(/_/g, "/");
		let lang = req.params.lang;
		
		if(page.substr(0, 2) == "m/") page = page.slice(2);
		if(page == "portal") page = "kkutu";
		res.send("window.L = "+JSON.stringify(getLanguage(lang, page, shop))+";");
	});
	Server.get("/language/flush", function(req, res){
		updateLanguage();
		res.sendStatus(200);
	});
};
exports.page = page;