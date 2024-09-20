#!/usr/bin/env node
'use strict';

const commandLineParser = require('qtools-parse-command-line');
const commandLineParameters = commandLineParser.getParameters();

const qt = require('qtools-functional-library');
//console.dir(qt.help());

const chalk = require('chalk');
const util = require('util');

//START OF moduleFunction() ============================================================

const moduleFunction = function () {
	const annotation = `HELLO FROM: ${__filename}. Note: this function accesses the command line directly.`;

	const { silent, quiet, verbose, debug } = commandLineParameters.switches; //flags used here need to be added to assemble-configuration-show-help-maybe-exit.js

	const outputFunction = console.error;
	debug && outputFunction(`found -debug flag`);
	verbose && outputFunction(`found -verbose flag`);

	const color =
		'writing to file' === true ? new chalk.Instance({ level: 0 }) : chalk; //wanted to figure out how I could write clean messages to files if I ever want to

	const stringify = (message, options = {}) => {
		if (typeof message == 'object') {
			const defaults = {
				showHidden: false, // if true, the object's non-enumerable and symbol properties will be shown
				depth: 4, // the recursion depth. Use null for unlimited depth
				colors: true, // if true, the output will be styled with ANSI color codes
				customInspect: true, // if false, custom inspect() functions defined on the objects being inspected won't be called
				showProxy: false, // if true, then objects created with `Proxy` are shown as they are
				maxArrayLength: 100, // specifies the maximum number of Array and TypedArray elements to include. Use null for unlimited
				breakLength: 60, // the length at which object properties will break onto new lines. Set to Infinity to format the object into a single line
				compact: false, // if false, every property of an object is put onto a new line
				sorted: false, // if true, object properties are sorted, can also be a compare function
				getters: false, // if true, getters are going to be inspected as well, can be 'get' or 'set' to only inspect one kind
			};
			const parms = { ...defaults, ...options };

				return(JSON.stringify(message, '', '\t'))
		}

		return message;
	};

	const error = (message, options = {}) => {
		message = stringify(message, options);
		if (silent) {
			return;
		}
		outputFunction(color.red(message));
	};
	const result = (message, options = {}) => {
		message = stringify(message, options);
		if (silent) {
			return;
		}
		process.stdout.write(message);
	};

	const status = (message, options = {}) => {
		message = stringify(message, options);
		if (silent || quiet) {
			return;
		}
		outputFunction(message);
	};

	const emphatic = (message, options = {}) => {
		message = stringify(message, options);
		if (silent || quiet) {
			return;
		}
		outputFunction(color.bgBlack.yellow(message));
	};

	const verboseFunction = (message, options = {}) => {
		message = stringify(message, options);
		if (silent || !verbose) {
			return;
		}

		outputFunction(message);
	};

	const debugFunction = (message, options = {}) => {
		message = stringify(message, options);
		if (!silent && (debug || verbose)) {
			if(options.label){
			outputFunction(`\n${'DEBUG: '.padEnd(43, '-')}\n${options.label}\n${message}${''.padEnd(50, '-')}\n`);
			}
			outputFunction(`\n${''.padEnd(50, '-')}\n${message}${''.padEnd(50, '-')}\n`);
		}

	};

	return {
		annotation,
		error,
		result,
		status,
		debug: debugFunction,
		emphatic,
		verbose: verboseFunction,
	};
};

//END OF moduleFunction() ============================================================

module.exports = moduleFunction();

/*

https://www.npmjs.com/package/chalk

eg,

const error = chalk.bold.red;

Styles

Modifiers
	reset - Resets the current color chain.
	bold - Make text bold.
	dim - Emitting only a small amount of light.
	italic - Make text italic. (Not widely supported)
	underline - Make text underline. (Not widely supported)
	inverse- Inverse background and foreground colors.
	hidden - Prints the text, but makes it invisible.
	strikethrough - Puts a horizontal line through the center of the text. (Not widely supported)
	visible- Prints the text only when Chalk has a color level > 0. Can be useful for things that are purely cosmetic.
Colors
	black
	red
	green
	yellow
	blue
	magenta
	cyan
	white
	blackBright (alias: gray, grey)
	redBright
	greenBright
	yellowBright
	blueBright
	magentaBright
	cyanBright
	whiteBright
Background colors
	bgBlack
	bgRed
	bgGreen
	bgYellow
	bgBlue
	bgMagenta
	bgCyan
	bgWhite
	bgBlackBright (alias: bgGray, bgGrey)
	bgRedBright
	bgGreenBright
	bgYellowBright
	bgBlueBright
	bgMagentaBright
	bgCyanBright
	bgWhiteBright

*/
