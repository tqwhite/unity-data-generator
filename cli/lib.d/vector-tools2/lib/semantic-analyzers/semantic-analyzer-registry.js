#!/usr/bin/env node
'use strict';

const moduleName = __filename.replace(__dirname + '/', '').replace(/.js$/, '');

const qt = require('qtools-functional-library');

// =====================================================================
// SEMANTIC ANALYZER REGISTRY - Registry pattern for analyzer selection
// =====================================================================

/**
 * @interface SemanticAnalyzer
 * @property {function(Object): Object} extractAtomicFactsAndGenerateEmbeddings
 * @property {function(Array): Array} scoreDistanceResults
 * @property {function(): function} getPrettyPrintFunction - Optional
 * @property {function(): string} getAnalyzerType - Returns 'simple' or 'atomic'
 * @property {function(): string} getVersion - Returns version identifier
 */

class SemanticAnalyzerRegistry {
	constructor({ commandLineParameters }) {
		const { xLog, getConfig } = process.global;
		this.xLog = xLog;
		this.commandLineParameters = commandLineParameters;
		this.moduleConfig = getConfig(moduleName);
		
		// Initialize analyzer implementations registry
		this.analyzers = {
			simpleVector: require('./analyzers/simple-vector/simple-vector'),
			atomicVector: require('./analyzers/atomic-vector/atomic-vector')
		};
	}

	// ---------------------------------------------------------------------
	// getAnalyzer - Get analyzer instance by type
	
	getAnalyzer(type = null) {
		// Get type from command line if not provided
		const analyzerType = type || this.commandLineParameters.qtGetSurePath(
			'values.semanticAnalysisMode[0]',
			'simpleVector'  // Default to simple
		);
		
		// Validate analyzer type
		if (!this.analyzers[analyzerType]) {
			const errorId = Math.floor(Math.random() * 1e9);
			this.xLog.error(`[${errorId}] Unknown analyzer type: ${analyzerType}`);
			const availableTypes = Object.keys(this.analyzers).join(', ');
			this.xLog.error(`Available types: ${availableTypes}`);
			throw new Error(`Unknown analyzer: ${analyzerType} [trace:${errorId}]`);
		}
		
		// Get the analyzer module
		const AnalyzerModule = this.analyzers[analyzerType];
		
		// Instantiate and return
		this.xLog.status(`Using ${analyzerType} semantic analyzer`);
		return new AnalyzerModule();
	}

	// ---------------------------------------------------------------------
	// registerAnalyzer - Add new analyzer to registry
	
	registerAnalyzer(name, analyzerModule) {
		if (this.analyzers[name]) {
			this.xLog.status(`Overwriting existing analyzer: ${name}`);
		}
		
		this.analyzers[name] = analyzerModule;
		this.xLog.verbose(`Registered analyzer: ${name}`);
	}

	// ---------------------------------------------------------------------
	// listAnalyzers - Get list of available analyzers
	
	listAnalyzers() {
		return Object.keys(this.analyzers);
	}

	// ---------------------------------------------------------------------
	// validateAnalyzer - Check if analyzer implements interface
	
	validateAnalyzer(analyzer) {
		const requiredMethods = [
			'extractAtomicFactsAndGenerateEmbeddings',
			'scoreDistanceResults',
			'getAnalyzerType',
			'getVersion'
		];
		
		const missing = requiredMethods.filter(method => 
			typeof analyzer[method] !== 'function'
		);
		
		if (missing.length > 0) {
			const errorId = Math.floor(Math.random() * 1e9);
			this.xLog.error(`[${errorId}] Analyzer missing required methods: ${missing.join(', ')}`);
			throw new Error(`Invalid analyzer interface [trace:${errorId}]`);
		}
		
		return true;
	}
}

// =====================================================================
// MODULE EXPORTS
// =====================================================================

const moduleFunction = ({ commandLineParameters }) => {
	return new SemanticAnalyzerRegistry({ commandLineParameters });
};

module.exports = moduleFunction;