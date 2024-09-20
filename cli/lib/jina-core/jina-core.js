#!/usr/bin/env node
'use strict';

const moduleName = __filename.replace(__dirname + '/', '').replace(/.js$/, ''); //this just seems to come in handy a lot
//const projectRoot=fs.realpathSync(path.join(__dirname, '..', '..')); // adjust the number of '..' to fit reality

const qt = require('qtools-functional-library'); //qt.help({printOutput:true, queryString:'.*', sendJson:false});
const asynchronousPipePlus = new require('qtools-asynchronous-pipe-plus')();
const pipeRunner = asynchronousPipePlus.pipeRunner;
const taskListPlus = asynchronousPipePlus.taskListPlus;

//START OF moduleFunction() ============================================================

const moduleFunction = function() {

	const { xLog, getConfig } = process.global;
	const localConfig = getConfig(moduleName); //getConfig(`${moduleName}`);

	const smartyPantsChooser=require('../smarty-pants-chooser')(); //reserving the right to have overarching controls

	const conversationGenerator=({thoughtProcess}={})=>require('../conversation-generator')({thoughtProcess, smartyPantsChooser});

	const embedGenerator=()=>{someModule:'Not Yet Implemented'}
	const fileUploader=()=>{someModule:'Not Yet Implemented'}

	return {conversationGenerator, embedGenerator, fileUploader}
};

//END OF moduleFunction() ============================================================

module.exports = moduleFunction();
//module.exports = new moduleFunction();
//moduleFunction().workingFunction().qtDump();

