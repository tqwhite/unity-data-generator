'use strict';

const moduleName = __filename.replace(__dirname + '/', '').replace(/.js$/, '');
const path = require('path');

const moduleFunction = function (args = {}) {
	const { xLog, getConfig, commandLineParameters } = process.global;

	const loadSemanticAnalyzer = (analyzerName) => {
		const validAnalyzers = ['simpleVector', 'atomicVector'];

		// Map command line names to directory names
		const analyzerMap = {
			simpleVector: 'simple-vector',
			atomicVector: 'atomic-vector',
		};

		if (!validAnalyzers.includes(analyzerName)) {
			throw `Invalid semantic analyzer: ${analyzerName}`;
		}

		const analyserName = analyzerMap[analyzerName];

		const analyzerModule = require(`./${analyserName}`);
		const analyzer = analyzerModule();

		return analyzer;
	};
		const semanticAnalysisMode = commandLineParameters.qtGetSurePath(
			'values.semanticAnalysisMode[0]',
			'simpleVector',
		);
		const semanticAnalyzer = loadSemanticAnalyzer(semanticAnalysisMode);
		xLog.status(`Using ${semanticAnalysisMode} semantic analyzer`);

	return { loadSemanticAnalyzer, semanticAnalyzer };
};

module.exports = moduleFunction();
