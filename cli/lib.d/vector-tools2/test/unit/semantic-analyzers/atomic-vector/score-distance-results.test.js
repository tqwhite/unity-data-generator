#!/usr/bin/env node
'use strict';

const { expect } = require('chai');
const sinon = require('sinon');
const path = require('path');

describe('score-distance-results', () => {
	let scoreDistanceResults;
	let mockDirectQueryUtility;
	let mockXLog;

	beforeEach(() => {
		// Set up process.global for testing
		mockXLog = {
			error: sinon.stub(),
			status: sinon.stub(),
			verbose: sinon.stub(),
			warning: sinon.stub(),
			saveProcessFile: sinon.stub()
		};
		
		process.global = {
			xLog: mockXLog,
			getConfig: sinon.stub().returns({}),
			commandLineParameters: {
				qtGetSurePath: sinon.stub().returns('atomic_version2')
			}
		};

		// Create mock DirectQueryUtility
		mockDirectQueryUtility = {
			query: sinon.stub(),
			execute: sinon.stub(),
			tableExists: sinon.stub(),
			getTableSchema: sinon.stub(),
			listTables: sinon.stub()
		};

		// Clear require cache and load module
		delete require.cache[require.resolve('../../../../lib/semantic-analyzers/analyzers/atomic-vector/lib/score-distance-results.js')];
		scoreDistanceResults = require('../../../../lib/semantic-analyzers/analyzers/atomic-vector/lib/score-distance-results.js');
	});

	describe('scoreDistanceResults', () => {
		it('should use DirectQueryUtility.query when vectorDb has query method', async () => {
			// Arrange
			const mockConfig = {
				vectorDb: mockDirectQueryUtility,
				openai: { embeddings: { create: sinon.stub().resolves({ data: [{ embedding: new Array(1536).fill(0) }] }) } },
				queryString: 'test query',
				tableName: 'test_table',
				sourceTableName: 'source_table',
				sourcePrivateKeyName: 'refId',
				resultCount: 5,
				dataProfile: 'sif',  // Use supported data profile
				collectVerboseData: false
			};

			// Mock successful query response
			mockDirectQueryUtility.query.callsArgWith(2, null, [
				{
					sourceRefId: 'ref1',
					factType: 'type1',
					factText: 'text1',
					distance: 0.5,
					semanticCategory: 'cat1',
					conceptualDimension: 'dim1'
				}
			]);

			// Mock source record query
			mockDirectQueryUtility.query.onSecondCall().callsArgWith(2, null, [
				{ refId: 'ref1', data: 'source data' }
			]);

			// Act
			const analyzer = scoreDistanceResults({});
			const result = await analyzer.scoreDistanceResults(mockConfig);

			// Assert
			expect(mockDirectQueryUtility.query.called).to.be.true;
			expect(mockDirectQueryUtility.query.firstCall.args[0]).to.include('SELECT');
			// Should NOT have any .prepare() calls
		});

		it('should handle query errors properly', async () => {
			// Arrange
			const mockConfig = {
				vectorDb: mockDirectQueryUtility,
				openai: { embeddings: { create: sinon.stub().resolves({ data: [{ embedding: new Array(1536).fill(0) }] }) } },
				queryString: 'test query',
				tableName: 'test_table',
				sourceTableName: 'source_table',
				sourcePrivateKeyName: 'refId',
				resultCount: 5,
				dataProfile: 'sif'  // Use supported data profile
			};

			// Mock query error
			mockDirectQueryUtility.query.callsArgWith(2, new Error('Database error'), null);

			// Act
			const analyzer = scoreDistanceResults({});
			const result = await analyzer.scoreDistanceResults(mockConfig);

			// Assert - scoreDistanceResults returns object with results and verboseData
			expect(result).to.be.an('object');
			expect(result.results).to.be.an('array');
			expect(result.results).to.have.lengthOf(0);
			expect(mockXLog.error.called).to.be.true;
		});

		it('should NOT use .prepare() when DirectQueryUtility is provided', async () => {
			// Arrange
			const mockConfig = {
				vectorDb: mockDirectQueryUtility,
				openai: { embeddings: { create: sinon.stub().resolves({ data: [{ embedding: new Array(1536).fill(0) }] }) } },
				queryString: 'test query',
				tableName: 'test_table',
				sourceTableName: 'source_table',
				sourcePrivateKeyName: 'refId',
				resultCount: 5,
				dataProfile: 'sif'  // Use supported data profile
			};

			// Ensure mockDirectQueryUtility does NOT have prepare method
			expect(mockDirectQueryUtility.prepare).to.be.undefined;

			// Mock successful query
			mockDirectQueryUtility.query.callsArgWith(2, null, []);

			// Act
			const analyzer = scoreDistanceResults({});
			const result = await analyzer.scoreDistanceResults(mockConfig);

			// Assert - should complete without trying to access .prepare()
			expect(result).to.be.an('object');
			expect(result.results).to.be.an('array');
		});

		it('should handle parameterized queries through DirectQueryUtility', async () => {
			// Arrange
			const mockConfig = {
				vectorDb: mockDirectQueryUtility,
				openai: { embeddings: { create: sinon.stub().resolves({ data: [{ embedding: new Array(1536).fill(0) }] }) } },
				queryString: 'test query',
				tableName: 'test_table_atomic',
				sourceTableName: 'source_table',
				sourcePrivateKeyName: 'refId',
				resultCount: 10,
				dataProfile: 'sif'  // Use supported data profile
			};

			mockDirectQueryUtility.query.callsArgWith(2, null, []);

			// Act
			const analyzer = scoreDistanceResults({});
			await analyzer.scoreDistanceResults(mockConfig);

			// Assert
			const queryCall = mockDirectQueryUtility.query.firstCall;
			expect(queryCall).to.exist;
			const sql = queryCall.args[0];
			const params = queryCall.args[1];
			
			// Should have SQL with placeholders
			expect(sql).to.include('SELECT');
			expect(sql).to.include('FROM');
			expect(sql).to.include('LIMIT');
			
			// Should pass parameters array (even if DirectQueryUtility doesn't support them yet)
			expect(params).to.be.an('array');
		});
	});

	describe('Integration with DirectQueryUtility', () => {
		it('should work with actual DirectQueryUtility interface', async () => {
			// This test verifies the contract with DirectQueryUtility
			const DirectQueryUtility = require('../../../../lib/database/direct-query-utility/direct-query-utility.js');
			
			// Create a mock instance that follows the real interface
			const dbUtility = {
				query: sinon.stub().callsArgWith(2, null, []),
				execute: sinon.stub().callsArgWith(2, null, { changes: 0 }),
				// ... other methods
			};

			const mockConfig = {
				vectorDb: dbUtility,
				openai: { embeddings: { create: sinon.stub().resolves({ data: [{ embedding: new Array(1536).fill(0) }] }) } },
				queryString: 'test',
				tableName: 'test_table',
				sourceTableName: 'source',
				sourcePrivateKeyName: 'id',
				resultCount: 5,
				dataProfile: 'sif'  // Use supported data profile
			};

			// Act
			const analyzer = scoreDistanceResults({});
			const result = await analyzer.scoreDistanceResults(mockConfig);

			// Assert
			expect(dbUtility.query.called).to.be.true;
			expect(result).to.be.an('object');
			expect(result.results).to.be.an('array');
		});
	});
});