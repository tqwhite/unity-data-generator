'use strict';

const moduleName = __filename.replace(__dirname + '/', '').replace(/.js$/, '');

const moduleFunction = function (args = {}) {
	const { xLog, getConfig } = process.global;
	// Accept atomicFactExtractor from parent module
	const { atomicFactExtractor } = args;
	const atomicFactExtractorGen = atomicFactExtractor || require('./atomic-fact-extractor')();
	const { extractAtomicFacts, convertAtomicFactsToEmbeddingStrings, scoringMethod } =
		atomicFactExtractorGen;

	// ---------------------------------------------------------------------
	// dataProfileStrategies - defines key formatting strategies for different data profiles

	const dataProfileStrategies = {
		sif: {
			formatKeyForLookup: (key) => key.toString(), // Standard string conversion
			name: 'SIF',
		},
		ceds: {
			formatKeyForLookup: (key) => key.toString().padStart(6, '0'), // Zero-pad to 6 digits
			name: 'CEDS',
		},
	};

	const scoreDistanceResults = async (args) => {
		const {
			queryString,
			vectorDb,
			openai,
			tableName,
			resultCount = 5,
			dataProfile,
			sourceTableName,
			sourcePrivateKeyName,
			sourceEmbeddableContentName,
		} = args;

		const atomicTableName = `${tableName}_atomic`;

		// Get the strategy for this data profile
		const strategy = dataProfileStrategies[dataProfile];
		if (!strategy) {
			xLog.error(
				`Unknown data profile: ${dataProfile}. Supported profiles: ${Object.keys(dataProfileStrategies).join(', ')}`,
			);
			return [];
		}

		// Extract atomic facts from query
		xLog.verbose(`Extracting atomic facts from query: ${queryString}`);
		const extractedData = await extractAtomicFacts(queryString, openai);
		
		const embeddingStrings = convertAtomicFactsToEmbeddingStrings(
			extractedData,
			queryString,
		);

		xLog.saveProcessFile(
			`${moduleName}_atomicQueryParameters.log`,
			`QUERY STRING\n${queryString}\nATOMIC EXTRACTION\n${JSON.stringify(extractedData, '', '\t')}\n${'='.repeat(50)}\nEMBEDDING STRINGS\n${JSON.stringify(embeddingStrings, '', '\t')}`,
		);

		// Generate embeddings for each query string
		const queryEmbeddings = [];
		for (const embeddingData of embeddingStrings) {
			if (!embeddingData.text) {
				xLog.error(
					`Empty or undefined embedding text: ${JSON.stringify(embeddingData)}`,
				);
				continue;
			}

			xLog.verbose(`Generating embedding for: "${embeddingData.text}"`);
			const response = await openai.embeddings.create({
				model: 'text-embedding-3-small',
				input: embeddingData.text,
			});

			if (!response.data || !response.data[0] || !response.data[0].embedding) {
				xLog.error(`Invalid embedding response: ${JSON.stringify(response)}`);
				continue;
			}

			queryEmbeddings.push({
				...embeddingData,
				embedding: response.data[0].embedding,
			});
		}

		if (queryEmbeddings.length === 0) {
			xLog.error('No valid embeddings generated from query');
			return { results: [], verboseData: {} };
		}

		// Collect matches for each query embedding
		const allMatches = new Map(); // sourceRefId -> match data
		const verboseData = {
			originalQuery: queryString,
			enrichedStrings: [],
			queryExpansionAnalysis: [],
		};

		for (const queryEmb of queryEmbeddings) {
			if (!queryEmb.embedding || !Array.isArray(queryEmb.embedding)) {
				xLog.error(`Invalid embedding data: ${JSON.stringify(queryEmb)}`);
				continue;
			}

			const queryBuffer = Buffer.from(
				new Float32Array(queryEmb.embedding).buffer,
			);

			// Find K nearest for this query embedding using L2 distance
			const sql = `
                SELECT sourceRefId, factType, factText, 
                       vec_distance_L2(embedding, ?) as distance
                FROM ${atomicTableName}
                WHERE embedding IS NOT NULL
                ORDER BY distance
                LIMIT ?
            `;

			// DirectQueryUtility is REQUIRED - no fallbacks
			if (!vectorDb.query || typeof vectorDb.query !== 'function') {
				throw new Error('DirectQueryUtility required - received invalid database interface');
			}

			// Log the SQL query for debugging
			xLog.saveProcessFile(
				`${moduleName}_vectorMatching.log`,
				`\n=== Vector Matching Query ${queryEmb.type} ===\nSQL: ${sql}\nResult Count Requested: ${resultCount * 2}\nQuery Text: ${queryEmb.text}\n`,
				{ append: true }
			);

			// Use parameterized query with binary embedding
			const results = await new Promise((resolve, reject) => {
				vectorDb.query(sql, [queryBuffer, resultCount * 2], (err, res) => {
					if (err) reject(err);
					else resolve(res);
				});
			});

			// Log the raw results from vector search
			xLog.saveProcessFile(
				`${moduleName}_vectorMatching.log`,
				`Results found: ${results.length}\n${JSON.stringify(results.slice(0, 10), null, 2)}\n`,
				{ append: true }
			);
			

			const enrichedStringData = {
				enrichedString: queryEmb.text,
				type: queryEmb.type,
				matches: results
					.slice(0, Math.min(results.length, resultCount))
					.map((row) => ({
						sourceRefId: row.sourceRefId,
						factType: row.factType,
						factText: row.factText,
						distance: row.distance,
					})),
			};
			verboseData.enrichedStrings.push(enrichedStringData);

			// Aggregate by sourceRefId
			results.forEach((row) => {
				if (!allMatches.has(row.sourceRefId)) {
					allMatches.set(row.sourceRefId, {
						refId: row.sourceRefId,
						distances: [],
						matchedFacts: [],
						factTypes: new Set(),
					});
				}
				const match = allMatches.get(row.sourceRefId);
				match.distances.push(row.distance);
				match.matchedFacts.push({
					type: row.factType,
					text: row.factText,
					queryType: queryEmb.type,
				});
				match.factTypes.add(row.factType);
			});
		}

		// Log aggregated matches before scoring
		xLog.saveProcessFile(
			`${moduleName}_vectorMatching.log`,
			`\n=== Aggregated Matches (${allMatches.size} unique sources) ===\n${JSON.stringify(
				Array.from(allMatches.entries()).slice(0, 10).map(([id, data]) => ({
					refId: id,
					distanceCount: data.distances.length,
					avgDistance: data.distances.reduce((a, b) => a + b, 0) / data.distances.length,
					factTypes: Array.from(data.factTypes)
				}))
			, null, 2)}\n`,
			{ append: true }
		);

		// Score and rank aggregated results using version-specific scoring method
		const scoredResults = scoringMethod(allMatches, { distanceWeight: 0.1 });

		// Log scored results
		xLog.saveProcessFile(
			`${moduleName}_vectorMatching.log`,
			`\n=== Scored Results (top 10) ===\n${JSON.stringify(scoredResults.slice(0, 10), null, 2)}\n`,
			{ append: true }
		);

		// Look up source records and format final results
		const finalResults = [];

		for (let i = 0; i < Math.min(scoredResults.length, resultCount); i++) {
			const result = scoredResults[i];
			const searchValue = result.refId;

			// Use the strategy to format the key for lookup
			const formattedKey = strategy.formatKeyForLookup(searchValue);
			xLog.verbose(
				`Looking up record with ${sourcePrivateKeyName}=${searchValue} (formatted as: ${formattedKey})`,
			);

			// Use the formatted key for lookup
			let record;
			if (vectorDb.query && typeof vectorDb.query === 'function') {
				// Using DirectQueryUtility with qtTemplateReplace
				require('qtools-functional-library');
				const lookupSql = `select * from <!tableName!> where <!keyName!>='<!keyValue!>'`.qtTemplateReplace({
					tableName: sourceTableName,
					keyName: sourcePrivateKeyName,
					keyValue: formattedKey.replace(/'/g, "''")  // Escape single quotes
				});
				
				// Log source record lookup
				xLog.saveProcessFile(
					`${moduleName}_sourceLookup.log`,
					`Looking up source: ${lookupSql}\n`,
					{ append: true }
				);
				
				const records = await new Promise((resolve, reject) => {
					vectorDb.query(lookupSql, [], (err, res) => {
						if (err) reject(err);
						else resolve(res);
					});
				});
				record = records && records[0];
			} else {
				// No fallback - DirectQueryUtility is required
				throw new Error('DirectQueryUtility required - received invalid database interface');
			}

			if (!record) {
				xLog.error(
					`No record found for ${sourcePrivateKeyName}=${formattedKey} using ${strategy.name} strategy`,
				);
				continue;
			}

			xLog.verbose(`Found record using ${strategy.name} strategy`);

			finalResults.push({
				rank: i + 1,
				refId: record[sourcePrivateKeyName],
				distance: result.distance,
				score: result.score, // Use composite score for atomic-vector
				factTypesMatched: result.factTypesMatched,
				totalMatches: result.totalMatches,
				record,
			});
		}

		xLog.verbose(`Found ${finalResults.length} matches using atomic scoring`);

		return {
			results: finalResults,
			verboseData: verboseData,
		};
	};

	return { scoreDistanceResults };
};

module.exports = moduleFunction;