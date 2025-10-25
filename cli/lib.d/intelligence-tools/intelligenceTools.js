#!/usr/bin/env node
'use strict';

const moduleName = __filename.replace(__dirname + '/', '').replace(/.js$/, '');

//START OF moduleFunction() ============================================================

const moduleFunction = function (args = { initAtp }) {
	const qt = require('qtools-functional-library');

	// Access from process.global
	const { xLog, getConfig, commandLineParameters } = process.global;
	const { initLogOnly } = initAtp;

	// Validate command line parameters
	const refId = commandLineParameters.qtGetSurePath('values.refId[0]');
	const xPath = commandLineParameters.qtGetSurePath('values.xPath[0]');
	const element = commandLineParameters.qtGetSurePath('values.element[0]');
	const resultCount = commandLineParameters.qtGetSurePath(
		'values.resultCount[0]',
		5,
	);
	const loadDatabase = commandLineParameters.qtGetSurePath(
		'switches.loadDatabase',
		false,
	);

	initAtp().initLogOnly({ debugLogName: 'Job' });

	if (!refId && !xPath && !element) {
		xLog.error('Must provide either --refId, --xPath, or --element');
		process.exit(1);
	}

	xLog.status('🧠 Intelligence Tools - Hierarchical LLM Matching');
	xLog.status(
		`Process detail files directory set: ${xLog.getProcessFilesDirectory()}`,
	);
	xLog.status('===============================================');

	// Get database connection
	const databaseFetcher = require('./lib/database-fetcher')();

	// Initialize database and hierarchical matcher
	databaseFetcher.getDatabase((err, database) => {
		if (err) {
			xLog.error(`Failed to initialize database: ${err.message}`);
			process.exit(1);
		}

		// Get hierarchical matcher with database instance
		const hierarchicalMatcher = require('./lib/hierarchical-matcher')({
			database,
		});

		// Get output formatter
		const outputFormatter = require('./lib/output-formatter')();

		// Fetch SIF object from database
		let sifObject;
		const fetchCallback = (err, result) => {
			if (err) {
				xLog.error(`Failed to fetch SIF object: ${err.message}`);
				process.exit(1);
			}

			sifObject = result;

			xLog.verbose(`Fetched SIF object: ${sifObject.ElementName}`);
			xLog.verbose(`XPath: ${sifObject.XPath}`);
			xLog.verbose(`Type: ${sifObject.Type}`);
			xLog.verbose(`Mandatory: ${sifObject.Mandatory}`);

			// Create session header for process files
			const commandLine = process.argv.slice(2).join(' ');
			const sessionHeader = [
				'====================================================================',
				'INTELLIGENCE TOOLS - HIERARCHICAL MATCHING SESSION',
				'====================================================================',
				`Command Line: intelligenceTools ${commandLine}`,
				`SIF Element: ${sifObject.ElementName}`,
				`SIF XPath: ${sifObject.XPath}`,
				`SIF Description: ${sifObject.Description || '(no description)'}`,
				`SIF Type: ${sifObject.Type || 'N/A'}`,
				`SIF Mandatory: ${sifObject.Mandatory || 'N/A'}`,
				`Timestamp: ${new Date().toISOString()}`,
				'====================================================================',
				'',
				'',
			].join('\n');

			// Perform hierarchical matching
			const startTime = Date.now();
			hierarchicalMatcher.match(
				sifObject,
				sessionHeader,
				(err, cedsMatches) => {
					if (err) {
						xLog.error(`Hierarchical matching failed: ${err.message}`);
						process.exit(1);
					}

					// Format output
					const formattedResults = outputFormatter.format({
						sifObject,
						cedsMatches,
						resultCount,
						mode: 'pureIntelligence',
					});

					// Output results
					xLog.status('\n📊 CEDS MATCH RESULTS:');
					xLog.status('='.repeat(50));
					formattedResults.forEach((match, index) => {
						xLog.status(`\nRank ${index + 1}:`);
						xLog.status(`  CEDS Element: ${match.cedsElement}`);
						xLog.status(`  Distance: ${match.distance}`);
						xLog.status(`  Score: ${match.score}`);
						xLog.status(`  Confidence: ${match.confidence}`);
						xLog.status(`  Reasoning: ${match.reasoning}`);
						xLog.status(`\n  SIF XPath: ${sifObject.XPath}`);
						xLog.status(
							`  SIF Description: ${sifObject.Description || '(no description)'}`,
						);
						xLog.status(
							`\n  CEDS Path: ${match.domain} → ${match.entity} → ${match.cedsElement}`,
						);
						xLog.status(
							`  CEDS Definition: ${match.cedsDefinition || '(no definition available)'}`,
						);
					});

					xLog.status('\n');

					// Save process files
					const totalProcessingTime = Date.now() - startTime;

					// Save results.json
					const resultsData = {
						queryInfo: {
							sifRefId: sifObject.refId,
							sifElement: sifObject.ElementName,
							sifXPath: sifObject.XPath,
							sifDescription: sifObject.Description || '(no description)',
							sifType: sifObject.Type || 'N/A',
							sifMandatory: sifObject.Mandatory || 'N/A',
							requestedResultCount: resultCount,
							semanticAnalysisMode: 'pureIntelligence',
						},
						hierarchicalPath: {
							domain: formattedResults[0]?.domain || '',
							entity: formattedResults[0]?.entity || '',
							element: formattedResults[0]?.cedsElement || '',
						},
						matchResults: formattedResults.map((match) => ({
							rank: match.rank,
							cedsRefId: match.cedsRefId,
							cedsElement: match.cedsElement,
							cedsDefinition: match.cedsDefinition,
							distance: match.distance,
							score: match.score,
							confidence: match.confidence,
							reasoning: match.reasoning,
							domain: match.domain,
							entity: match.entity,
							hierarchicalPath: match.hierarchicalPath,
						})),
						metadata: {
							timestamp: new Date().toISOString(),
							totalProcessingTime: totalProcessingTime,
							method: 'hierarchical_llm',
							success: true,
						},
					};
					xLog.saveProcessFile(
						'results.json',
						JSON.stringify(resultsData, null, 2),
						{ suppressLogNotification: true },
					);

					// Save summary
					const summary = {
						metadata: {
							success: true,
							sifElement: sifObject.ElementName,
							sifXPath: sifObject.XPath,
							duration: totalProcessingTime,
							timestamp: new Date().toISOString(),
						},
						matchResult: {
							domain: formattedResults[0]?.domain || '',
							entity: formattedResults[0]?.entity || '',
							cedsElement: formattedResults[0]?.cedsElement || '',
							confidence: formattedResults[0]?.confidence || 0,
						},
					};
					xLog.saveProcessFile(
						'hierarchical-matcher_summary.json',
						JSON.stringify(summary, null, 2),
						{ suppressLogNotification: true },
					);

					// Save to database if requested
					if (loadDatabase) {
						xLog.status('\n💾 Saving to unityCedsMatches database...');

						databaseFetcher.saveMatches(
							{
								sifObject,
								cedsMatches: formattedResults,
								semanticAnalysisMode: 'pureIntelligence',
							},
							(err, savedCount) => {
								if (err) {
									xLog.error(`Failed to save matches: ${err.message}`);
									process.exit(1);
								}

								xLog.status(`✅ Saved ${savedCount} matches to database`);
								xLog.status(
									`\nprocess detail log files saved to ${xLog.getProcessFilesDirectory()}`,
								);
								xLog.status('\n🧠 Intelligence Tools Complete');
							},
						);
					} else {
						xLog.status(
							`\nprocess detail log files saved to ${xLog.getProcessFilesDirectory()}`,
						);
						xLog.status('\n🧠 Intelligence Tools Complete');
					}
				},
			);
		};

		// Determine which fetch method to use
		if (refId) {
			xLog.status(`Fetching SIF object by refId: ${refId}`);
			databaseFetcher.fetchByRefId(refId, fetchCallback);
		} else if (xPath) {
			xLog.status(`Fetching SIF object by XPath: ${xPath}`);
			databaseFetcher.fetchByXPath(xPath, fetchCallback);
		} else if (element) {
			xLog.status(`Fetching SIF object by element name: ${element}`);
			databaseFetcher.fetchByElementName(element, fetchCallback);
		}
	});
};

//END OF moduleFunction() ============================================================

const qt = require('qtools-functional-library');

// Find project root
const findProjectRoot = ({ rootFolderName = 'system', closest = true } = {}) =>
	__dirname.replace(
		new RegExp(`^(.*${closest ? '' : '?'}\/${rootFolderName}).*$`),
		'$1',
	);
const applicationBasePath = findProjectRoot();

// Help text
const helpText = `
Intelligence Tools - Hierarchical LLM Matching for SIF to CEDS

Usage:
  intelligenceTools --element=<elementName> [options]
  intelligenceTools --refId=<refId> [options]
  intelligenceTools --xPath=<xPath> [options]

Options:
  --element=<name>       Fetch SIF object by element name
  --refId=<id>          Fetch SIF object by refId
  --xPath=<path>        Fetch SIF object by XPath
  --resultCount=<n>     Number of results to return (default: 5)
  -loadDatabase         Save matches to unityCedsMatches table
  -help                 Show this help text
`;

// Initialize using qtools-ai-framework
const initAtp = require('../../../lib/qtools-ai-framework/jina')({
	configFileBaseName: 'intelligenceTools',
	applicationBasePath,
	helpText,
	applicationControls: [
		'--refId',
		'--xPath',
		'--element',
		'--resultCount',
		'-loadDatabase',
		'-help',
	],
});

// Execute main function with async wrapper
const executeMain = async () => {
	const { xLog } = process.global;

	try {
		await moduleFunction({ initAtp });
	} catch (error) {
		xLog.error(`Fatal error: ${error.message}`);
		xLog.error(`Stack: ${error.stack}`);
		process.exit(1);
	}
};

executeMain();
