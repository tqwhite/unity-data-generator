#!/usr/bin/env node
'use strict';

const util=require('util');


//START OF moduleFunction() ============================================================

const moduleFunction = function(inString) {
	
	inString = inString.replace(/  +/g, '\t');
	const inputLines = inString
		.trim()
		.split(/\n/)
		.map(item => item.split(/\t/));

	const fieldNames = inputLines[0];
	inputLines.splice(0, 1); //remove fieldnames, leaving only data
	
	const resultObject = inputLines.map(dataList =>
		dataList.reduce((result, item, inx) => {
			result[fieldNames[inx]] = item;
			return result;
		}, {})
	);
	
	return resultObject;
};

//END OF moduleFunction() ============================================================

module.exports = moduleFunction;