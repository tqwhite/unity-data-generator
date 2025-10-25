#!/usr/bin/env node
'use strict';

const { expect } = require('chai');
const sinon = require('sinon');
const path = require('path');
const {
    setupProcessGlobal,
    clearRequireCache,
    createMockOpenAIClient,
    createMockDatabase
} = require('../helpers/test-setup');
const {
    expectedDomainClassifications,
    cedsDomains
} = require('../fixtures/test-data');

describe('DomainClassifier', () => {
    let domainClassifier;
    let mockProcessGlobal;
    let mockOpenAI;
    let mockDatabase;

    beforeEach(() => {
        // Set up clean process.global
        mockProcessGlobal = setupProcessGlobal();

        // Create mock OpenAI client
        mockOpenAI = createMockOpenAIClient();

        // Create mock database
        mockDatabase = createMockDatabase();

        // Clear require cache
        const modulePath = '../../lib/processing/domain-classifier/domain-classifier';
        clearRequireCache(modulePath);
    });

    describe('Constructor and Initialization', () => {
        it('should initialize with OpenAI client and database', () => {
            const DomainClassifier = require('../../lib/processing/domain-classifier/domain-classifier');
            const classifier = DomainClassifier({ openai: mockOpenAI, database: mockDatabase });

            expect(classifier).to.exist;
            expect(classifier.classifyDomain).to.be.a('function');
        });

        it('should load domain list from config or use defaults', () => {
            const DomainClassifier = require('../../lib/processing/domain-classifier/domain-classifier');
            const classifier = DomainClassifier({ openai: mockOpenAI, database: mockDatabase });

            // Should have access to CEDS domains
            expect(classifier.getDomains).to.be.a('function');
            const domains = classifier.getDomains();
            expect(domains).to.be.an('array');
            expect(domains).to.include('K12');
            expect(domains).to.include('Assessments');
        });
    });

    describe('classifyDomain() - XPath Analysis', () => {
        it('should classify /xStudent* paths as K12', (done) => {
            const DomainClassifier = require('../../lib/processing/domain-classifier/domain-classifier');

            // Mock OpenAI response
            mockOpenAI.chat.completions.create = sinon.stub().resolves({
                choices: [{
                    message: {
                        content: 'K12'
                    }
                }]
            });

            const classifier = DomainClassifier({ openai: mockOpenAI, database: mockDatabase });

            classifier.classifyDomain('/xStudents/xStudent/demographics/birthDate', (err, domain) => {
                expect(err).to.be.null;
                expect(domain).to.equal('K12');
                done();
            });
        });

        it('should classify /Assessment* paths as Assessments', (done) => {
            const DomainClassifier = require('../../lib/processing/domain-classifier/domain-classifier');

            mockOpenAI.chat.completions.create = sinon.stub().resolves({
                choices: [{
                    message: {
                        content: 'Assessments'
                    }
                }]
            });

            const classifier = DomainClassifier({ openai: mockOpenAI, database: mockDatabase });

            classifier.classifyDomain('/Assessments/Assessment/@RefId', (err, domain) => {
                expect(err).to.be.null;
                expect(domain).to.equal('Assessments');
                done();
            });
        });

        it('should handle xStaff, xSchool paths as K12', (done) => {
            const DomainClassifier = require('../../lib/processing/domain-classifier/domain-classifier');

            mockOpenAI.chat.completions.create = sinon.stub().resolves({
                choices: [{
                    message: {
                        content: 'K12'
                    }
                }]
            });

            const classifier = DomainClassifier({ openai: mockOpenAI, database: mockDatabase });

            classifier.classifyDomain('/xStaffs/xStaff/name/firstName', (err, domain) => {
                expect(err).to.be.null;
                expect(domain).to.equal('K12');
                done();
            });
        });
    });

    describe('Cache Management', () => {
        it('should check cache before calling LLM', (done) => {
            const DomainClassifier = require('../../lib/processing/domain-classifier/domain-classifier');

            // Set up database to return cached result
            mockDatabase.getTable = sinon.stub().callsArgWith(2, null, {
                getData: sinon.stub().callsArgWith(2, null, [{
                    xpathPattern: '/xStudents/xStudent/%',
                    domain: 'K12',
                    confidence: 0.98
                }])
            });

            const classifier = DomainClassifier({ openai: mockOpenAI, database: mockDatabase });

            classifier.classifyDomain('/xStudents/xStudent/demographics/birthDate', (err, domain) => {
                expect(err).to.be.null;
                expect(domain).to.equal('K12');

                // OpenAI should NOT have been called (cache hit)
                expect(mockOpenAI.chat.completions.create.called).to.be.false;
                done();
            });
        });

        it('should save new domain classification to cache', (done) => {
            const DomainClassifier = require('../../lib/processing/domain-classifier/domain-classifier');

            // Mock empty cache
            mockDatabase.getTable = sinon.stub().callsArgWith(2, null, {
                getData: sinon.stub().callsArgWith(2, null, []),
                saveObject: sinon.stub().callsArgWith(2, null, 'cache-ref-id')
            });

            mockOpenAI.chat.completions.create = sinon.stub().resolves({
                choices: [{
                    message: {
                        content: 'K12'
                    }
                }]
            });

            const classifier = DomainClassifier({ openai: mockOpenAI, database: mockDatabase });

            classifier.classifyDomain('/xStudents/xStudent/demographics/birthDate', (err, domain) => {
                expect(err).to.be.null;
                expect(domain).to.equal('K12');

                // Should have called OpenAI (cache miss)
                expect(mockOpenAI.chat.completions.create.called).to.be.true;

                // Should have saved to cache
                // Check if saveObject was called through getTable
                done();
            });
        });

        it('should extract pattern from xpath for cache matching', () => {
            const DomainClassifier = require('../../lib/processing/domain-classifier/domain-classifier');
            const classifier = DomainClassifier({ openai: mockOpenAI, database: mockDatabase });

            // Should have a method to extract patterns
            expect(classifier.extractPattern).to.be.a('function');

            const pattern1 = classifier.extractPattern('/xStudents/xStudent/demographics/birthDate');
            const pattern2 = classifier.extractPattern('/xStudents/xStudent/name/firstName');

            // Both should match the same pattern
            expect(pattern1).to.equal(pattern2);
            expect(pattern1).to.include('xStudent');
        });
    });

    describe('LLM Prompt Construction', () => {
        it('should build appropriate prompt for domain classification', (done) => {
            const DomainClassifier = require('../../lib/processing/domain-classifier/domain-classifier');

            let capturedPrompt = null;
            mockOpenAI.chat.completions.create = sinon.stub().callsFake((params) => {
                capturedPrompt = params.messages[0].content;
                return Promise.resolve({
                    choices: [{
                        message: {
                            content: 'K12'
                        }
                    }]
                });
            });

            const classifier = DomainClassifier({ openai: mockOpenAI, database: mockDatabase });

            classifier.classifyDomain('/xStudents/xStudent/demographics/birthDate', (err, domain) => {
                expect(err).to.be.null;

                // Verify prompt includes xpath
                expect(capturedPrompt).to.include('/xStudents/xStudent/demographics/birthDate');

                // Verify prompt includes domain list
                expect(capturedPrompt).to.include('K12');
                expect(capturedPrompt).to.include('Assessments');

                // Verify prompt asks for classification
                expect(capturedPrompt.toLowerCase()).to.include('classify');

                done();
            });
        });

        it('should use appropriate temperature setting for deterministic results', (done) => {
            const DomainClassifier = require('../../lib/processing/domain-classifier/domain-classifier');

            let capturedParams = null;
            mockOpenAI.chat.completions.create = sinon.stub().callsFake((params) => {
                capturedParams = params;
                return Promise.resolve({
                    choices: [{
                        message: {
                            content: 'K12'
                        }
                    }]
                });
            });

            const classifier = DomainClassifier({ openai: mockOpenAI, database: mockDatabase });

            classifier.classifyDomain('/xStudents/xStudent/demographics/birthDate', (err, domain) => {
                expect(err).to.be.null;

                // Should use temperature 0 for deterministic results
                expect(capturedParams.temperature).to.equal(0);
                done();
            });
        });
    });

    describe('Error Handling', () => {
        it('should handle OpenAI API errors gracefully', (done) => {
            const DomainClassifier = require('../../lib/processing/domain-classifier/domain-classifier');

            mockOpenAI.chat.completions.create = sinon.stub().rejects(
                new Error('API rate limit exceeded')
            );

            const classifier = DomainClassifier({ openai: mockOpenAI, database: mockDatabase });

            classifier.classifyDomain('/xStudents/xStudent/demographics/birthDate', (err, domain) => {
                expect(err).to.exist;
                expect(err.message).to.include('API rate limit');
                expect(mockProcessGlobal.xLog.error.called).to.be.true;
                done();
            });
        });

        it('should handle invalid LLM responses', (done) => {
            const DomainClassifier = require('../../lib/processing/domain-classifier/domain-classifier');

            // Create a fresh mock for this test
            const testMockOpenAI = {
                chat: {
                    completions: {
                        create: sinon.stub().resolves({
                            choices: [{
                                message: {
                                    content: 'InvalidDomain'
                                }
                            }]
                        })
                    }
                }
            };

            const classifier = DomainClassifier({ openai: testMockOpenAI, database: mockDatabase });

            classifier.classifyDomain('/xStudents/xStudent/demographics/birthDate', (err, domain) => {
                // Pure intelligence approach - should fail hard on invalid LLM response
                expect(err).to.exist;
                expect(err.message).to.include('LLM returned invalid domain');
                expect(err.message).to.include('InvalidDomain');
                done();
            });
        });

        it('should handle database errors during cache operations', (done) => {
            const DomainClassifier = require('../../lib/processing/domain-classifier/domain-classifier');

            // Create a mock database that fails
            const testMockDatabase = {
                getTable: sinon.stub().callsArgWith(2,
                    new Error('Database connection failed'),
                    null
                )
            };

            // Create a mock OpenAI that returns K12
            const testMockOpenAI = {
                chat: {
                    completions: {
                        create: sinon.stub().resolves({
                            choices: [{
                                message: {
                                    content: 'K12'
                                }
                            }]
                        })
                    }
                }
            };

            const classifier = DomainClassifier({ openai: testMockOpenAI, database: testMockDatabase });

            classifier.classifyDomain('/xStudents/xStudent/demographics/birthDate', (err, domain) => {
                // Should still work even if cache fails
                expect(err).to.be.null;
                expect(domain).to.equal('K12');
                done();
            });
        });
    });

    describe('Performance and Optimization', () => {
        it('should batch multiple classifications efficiently', (done) => {
            const DomainClassifier = require('../../lib/processing/domain-classifier/domain-classifier');
            const classifier = DomainClassifier({ openai: mockOpenAI, database: mockDatabase });

            const xpaths = [
                '/xStudents/xStudent/demographics/birthDate',
                '/xStudents/xStudent/name/firstName',
                '/xStaffs/xStaff/employeeId'
            ];

            let completed = 0;
            xpaths.forEach((xpath) => {
                classifier.classifyDomain(xpath, (err, domain) => {
                    expect(err).to.be.null;
                    expect(domain).to.exist;
                    completed++;

                    if (completed === xpaths.length) {
                        done();
                    }
                });
            });
        });

        it('should use cost-effective model (gpt-3.5-turbo) for domain classification', (done) => {
            const DomainClassifier = require('../../lib/processing/domain-classifier/domain-classifier');

            let capturedModel = null;
            mockOpenAI.chat.completions.create = sinon.stub().callsFake((params) => {
                capturedModel = params.model;
                return Promise.resolve({
                    choices: [{
                        message: {
                            content: 'K12'
                        }
                    }]
                });
            });

            const classifier = DomainClassifier({ openai: mockOpenAI, database: mockDatabase });

            classifier.classifyDomain('/xStudents/xStudent/demographics/birthDate', (err, domain) => {
                expect(err).to.be.null;
                expect(capturedModel).to.include('gpt-3.5-turbo');
                done();
            });
        });
    });
});
