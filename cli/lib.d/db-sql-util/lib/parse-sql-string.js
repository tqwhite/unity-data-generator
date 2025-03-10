#!/usr/bin/env node
'use strict';

const moduleName = __filename.replace(__dirname + '/', '').replace(/.js$/, ''); //this just seems to come in handy a lot

//START OF moduleFunction() ============================================================
const moduleFunction =
	({ moduleName } = {}) =>
	(sqlContent = '') => {
		const { xLog } = process.global;
		
		if (!sqlContent) {
			xLog.error('No SQL content provided to parse');
			return [];
		}
		
		xLog.status('Parsing SQL content using sqlite-parser...');
		
		// Parse SQL into statements using the sqlite-parser library
		let validSqlStatements = sqlContent.split('\n');
		
console.log(`validSqlStatements=${validSqlStatements.length}`);

		return validSqlStatements;
	};


//END OF moduleFunction() ============================================================

module.exports = moduleFunction({ moduleName }); //returns initialized moduleFunction