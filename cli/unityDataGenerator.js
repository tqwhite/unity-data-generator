#!/usr/bin/env node
'use strict';

const moduleName = __filename.replace(__dirname + '/', '').replace(/.js$/, ''); //this just seems to come in handy a lot

// const qt = require('qtools-functional-library'); //also exposes qtLog(); qt.help({printOutput:true, queryString:'.*', sendJson:false});

const os = require('os');
const path = require('path');
const fs = require('fs');
const initJina=require('./jina'); //sets up process.global.Xlog and config stuff

//START OF moduleFunction() ============================================================
const moduleFunction = ({ moduleName } = {}) => ({ unused }={}) => {
const { xLog, getConfig, commandLineParameters }=process.global
xLog.status(`\n=-=============   unityDataGenerator.js  ========================= [unityDataGenerator.js.]\n`);

const {conversationNameList}=getConfig(moduleName);

const {askJina, makeFacilitators}=initJina({conversationNameList, initialWisdom:'first pass. no XML yet. replace with top-level object.'});

const facilitators=makeFacilitators();

askJina({facilitators});
	return {  };
};

//END OF moduleFunction() ============================================================

moduleFunction({moduleName})();