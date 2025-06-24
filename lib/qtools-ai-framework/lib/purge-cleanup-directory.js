#!/usr/bin/env node
'use strict';

const moduleName = __filename.replace(__dirname + '/', '').replace(/.js$/, ''); //this just seems to come in handy a lot

const os = require('os');
const path = require('path');
const fs = require('fs');

//
//START OF moduleFunction() ============================================================

const moduleFunction =
	({ moduleName } = {}) =>
	({ unused } = {}) => {
		const { xLog, getConfig, rawConfig, commandLineParameters } =
			process.global;
		const localConfig = getConfig(moduleName); //moduleName is closure

		const executePurging = (dirPath, retainedCount) => {
			// Check if the directory exists
			if (!fs.existsSync(dirPath)) {
				xLog.status(`${moduleName}: directory "${dirPath}" does not exist.`);
				return 0;
			}

			const items = fs.readdirSync(dirPath);
			const itemsWithStats = items.map((item) => {
				const fullPath = path.join(dirPath, item);
				const stats = fs.statSync(fullPath);
				return {
					name: item,
					fullPath: fullPath,
					mtime: stats.mtime,
					isDirectory: stats.isDirectory(),
				};
			});

			// Sort items by mtime ascending (oldest first)
			itemsWithStats.sort((a, b) => a.mtime - b.mtime);

			let deletedCount = 0;
			while (itemsWithStats.length > retainedCount) {
				const itemToDelete = itemsWithStats.shift();
				fs.rmSync(itemToDelete.fullPath, { recursive: true, force: true });
				deletedCount++;
			}

			xLog.status(`Purged ${deletedCount} files or directories from ${dirPath} [${moduleName}]`);
			return deletedCount;
		};

		return { executePurging };
	};

//END OF moduleFunction() ============================================================

module.exports = moduleFunction({ moduleName });
