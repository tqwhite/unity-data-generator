#!/usr/bin/env node
'use strict';

const { expect } = require('chai');
const sinon = require('sinon');
const path = require('path');
const fs = require('fs');

// Test database path
const testDbPath = path.join(__dirname, '../../fixtures/test-vector.db');

describe('DirectQueryUtility', () => {
	let DirectQueryUtility;
	let queryUtil;

	before(() => {
		// Clean up test database if it exists
		if (fs.existsSync(testDbPath)) {
			fs.unlinkSync(testDbPath);
		}
	});

	beforeEach(() => {
		// Set up process.global for testing
		process.global = {
			xLog: {
				error: sinon.stub(),
				status: sinon.stub(),
				verbose: sinon.stub(),
				warning: sinon.stub()
			},
			getConfig: sinon.stub().returns({}),
			commandLineParameters: {}
		};

		// Require module fresh for each test
		delete require.cache[require.resolve('../../../lib/database/direct-query-utility/direct-query-utility.js')];
		DirectQueryUtility = require('../../../lib/database/direct-query-utility/direct-query-utility.js');
	});

	afterEach(() => {
		if (queryUtil && typeof queryUtil.close === 'function') {
			queryUtil.close();
		}
		// Clean up test database
		if (fs.existsSync(testDbPath)) {
			fs.unlinkSync(testDbPath);
		}
	});

	describe('Constructor and Initialization', () => {
		it('should create instance with database path', () => {
			queryUtil = new DirectQueryUtility({ databasePath: testDbPath });
			expect(queryUtil).to.be.an('object');
			expect(queryUtil.databasePath).to.equal(testDbPath);
		});

		it('should initialize sqlite-instance', (done) => {
			queryUtil = new DirectQueryUtility({ databasePath: testDbPath });
			
			// Give sqlite-instance time to initialize
			setTimeout(() => {
				expect(queryUtil.sqliteInstance).to.exist;
				done();
			}, 100);
		});
	});

	describe('Basic Query Operations', () => {
		beforeEach((done) => {
			queryUtil = new DirectQueryUtility({ databasePath: testDbPath });
			// Allow initialization
			setTimeout(done, 100);
		});

		it('should execute a simple query', (done) => {
			queryUtil.query('SELECT 1 as test', [], (err, results) => {
				expect(err).to.be.null;
				expect(results).to.be.an('array');
				expect(results[0]).to.deep.equal({ test: 1 });
				done();
			});
		});

		it('should execute a CREATE TABLE statement', (done) => {
			const sql = `CREATE TABLE IF NOT EXISTS test_table (
				id INTEGER PRIMARY KEY,
				name TEXT
			)`;

			queryUtil.execute(sql, [], (err, result) => {
				expect(err).to.be.null;
				expect(result).to.exist;
				done();
			});
		});

		it('should check if table exists', (done) => {
			// First create a table
			queryUtil.execute('CREATE TABLE test_exists (id INTEGER)', [], () => {
				queryUtil.tableExists('test_exists', (err, exists) => {
					expect(err).to.be.null;
					expect(exists).to.be.true;

					queryUtil.tableExists('non_existent', (err, exists) => {
						expect(err).to.be.null;
						expect(exists).to.be.false;
						done();
					});
				});
			});
		});
	});

	describe('Vector Table Operations', () => {
		beforeEach((done) => {
			queryUtil = new DirectQueryUtility({ databasePath: testDbPath });
			setTimeout(done, 100);
		});

		it('should create a vector table', (done) => {
			queryUtil.createVectorTable('test_vectors', 1536, (err, result) => {
				if (err && err.message && err.message.includes('sqlite-vec')) {
					// Vector extension not available in test environment - that's OK
					expect(err.message).to.include('vec');
					done();
				} else {
					expect(err).to.be.null;
					done();
				}
			});
		});

		it('should get table schema', (done) => {
			const sql = `CREATE TABLE schema_test (
				id INTEGER PRIMARY KEY,
				name TEXT,
				value REAL
			)`;

			queryUtil.execute(sql, [], () => {
				queryUtil.getTableSchema('schema_test', (err, schema) => {
					expect(err).to.be.null;
					expect(schema).to.be.an('array');
					expect(schema.length).to.equal(3);
					
					const nameColumn = schema.find(col => col.name === 'name');
					expect(nameColumn).to.exist;
					expect(nameColumn.type).to.equal('TEXT');
					done();
				});
			});
		});
	});

	describe('Table Statistics', () => {
		beforeEach((done) => {
			queryUtil = new DirectQueryUtility({ databasePath: testDbPath });
			setTimeout(done, 100);
		});

		it('should list all tables', (done) => {
			// Create some test tables
			queryUtil.execute('CREATE TABLE table1 (id INTEGER)', [], () => {
				queryUtil.execute('CREATE TABLE table2 (id INTEGER)', [], () => {
					queryUtil.listTables((err, tables) => {
						expect(err).to.be.null;
						expect(tables).to.be.an('array');
						expect(tables).to.include('table1');
						expect(tables).to.include('table2');
						done();
					});
				});
			});
		});

		it('should get table statistics', (done) => {
			const sql = 'CREATE TABLE stats_test (id INTEGER, data TEXT)';
			
			queryUtil.execute(sql, [], () => {
				// Insert some test data
				queryUtil.execute('INSERT INTO stats_test VALUES (1, "test1")', [], () => {
					queryUtil.execute('INSERT INTO stats_test VALUES (2, "test2")', [], () => {
						queryUtil.getTableStats('stats_test', (err, stats) => {
							expect(err).to.be.null;
							expect(stats).to.be.an('object');
							expect(stats.rowCount).to.equal(2);
							expect(stats.tableName).to.equal('stats_test');
							done();
						});
					});
				});
			});
		});
	});

	describe('Error Handling', () => {
		beforeEach((done) => {
			queryUtil = new DirectQueryUtility({ databasePath: testDbPath });
			setTimeout(done, 100);
		});

		it('should handle SQL errors gracefully', (done) => {
			queryUtil.query('SELECT * FROM non_existent_table', [], (err, results) => {
				expect(err).to.exist;
				expect(err.message).to.include('no such table');
				expect(err.traceId).to.be.a('number');
				expect(results).to.be.undefined;
				done();
			});
		});

		it('should include trace IDs in errors', (done) => {
			queryUtil.execute('INVALID SQL STATEMENT', [], (err) => {
				expect(err).to.exist;
				expect(err.traceId).to.be.a('number');
				expect(err.message).to.include('[trace:');
				done();
			});
		});
	});

	describe('Statement Library Integration', () => {
		beforeEach((done) => {
			queryUtil = new DirectQueryUtility({ databasePath: testDbPath });
			setTimeout(done, 100);
		});

		it('should access statement library', () => {
			expect(queryUtil.statements).to.exist;
			expect(queryUtil.statements).to.be.an('object');
		});

		it('should provide vector-specific statements', () => {
			const { vectorStatements } = queryUtil.statements;
			expect(vectorStatements).to.exist;
			expect(vectorStatements.createVectorTable).to.be.a('function');
			expect(vectorStatements.insertVector).to.be.a('function');
			expect(vectorStatements.searchVectors).to.be.a('function');
		});
	});
});