'use strict';

const moduleName = __filename.replace(__dirname + '/', '').replace(/.js$/, '');

const moduleFunction = ({ moduleName } = {}) => ({ unused } = {}) => {
	const { xLog, getConfig, rawConfig, commandLineParameters, projectRoot } = process.global;
	const moduleConfig = getConfig(moduleName);

	const getAnalyzer = ({ semanticAnalysisMode, xLog }) => {
		const validAnalyzers = ['simpleVector', 'atomicVector'];
		if (!validAnalyzers.includes(semanticAnalysisMode)) {
			xLog.error(
				`Invalid semantic analyzer: ${semanticAnalysisMode ? semanticAnalysisMode : 'MISSING VALUE'}`,
			);
			process.exit(1);
		}

		// Map command line names to directory names
		const analyzerMap = {
			simpleVector: 'simple-vector',
			atomicVector: 'atomic-vector',
		};

		const analyserName = analyzerMap[semanticAnalysisMode];
		const analyzerModule = require(`../${analyserName}`);
		const semanticAnalyzer = analyzerModule();
		xLog.status(`Using ${semanticAnalysisMode} semantic analyzer`);

		return semanticAnalyzer;
	};

	return { getAnalyzer };
};

module.exports = moduleFunction({ moduleName }); //returns initialized moduleFunction