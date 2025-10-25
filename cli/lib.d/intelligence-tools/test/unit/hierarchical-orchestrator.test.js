#!/usr/bin/env node
'use strict';

const { expect } = require('chai');
const sinon = require('sinon');
const {
    setupProcessGlobal,
    clearRequireCache,
    createMockOpenAIClient,
    createMockDatabase
} = require('../helpers/test-setup');
const {
    sampleSifObjects
} = require('../fixtures/test-data');

describe('HierarchicalOrchestrator', () => {
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
        const modulePath = '../../lib/processing/hierarchical-orchestrator';
        clearRequireCache(modulePath);
    });

    describe('Constructor and Initialization', () => {
        it('should initialize with all three sub-modules', () => {
            const HierarchicalOrchestrator = require('../../lib/processing/hierarchical-orchestrator');
            const orchestrator = HierarchicalOrchestrator({ openai: mockOpenAI, database: mockDatabase });

            expect(orchestrator).to.exist;
            expect(orchestrator.performHierarchicalMatch).to.be.a('function');
        });
    });

    describe('performHierarchicalMatch() - Full Pipeline', () => {
        it('should complete all three steps successfully', (done) => {
            const HierarchicalOrchestrator = require('../../lib/processing/hierarchical-orchestrator');

            // Mock OpenAI responses for each step
            let callCount = 0;
            const testMockOpenAI = {
                chat: {
                    completions: {
                        create: sinon.stub().callsFake(() => {
                            callCount++;

                            // Step 1: Domain classification
                            if (callCount === 1) {
                                return Promise.resolve({
                                    choices: [{ message: { content: 'K12' } }]
                                });
                            }

                            // Step 2: Entity selection
                            if (callCount === 2) {
                                return Promise.resolve({
                                    choices: [{ message: { content: 'K12 Student' } }]
                                });
                            }

                            // Step 3: Element matching
                            return Promise.resolve({
                                choices: [{
                                    message: {
                                        content: JSON.stringify({
                                            cedsRefId: 'CEDS_000033',
                                            cedsElement: 'Birthdate',
                                            confidence: 0.95,
                                            reasoning: 'Exact semantic match'
                                        })
                                    }
                                }]
                            });
                        })
                    }
                }
            };

            const testMockDatabase = {
                getTable: sinon.stub().callsArgWith(2, null, {
                    getData: sinon.stub().callsArgWith(2, null, [{
                        refId: 'CEDS_000033',
                        ElementName: 'Birthdate',
                        Definition: 'Birth date',
                        Domain: 'K12',
                        Entity: 'K12 Student'
                    }]),
                    saveObject: sinon.stub().callsArgWith(2, null, 'cache-id')
                })
            };

            const orchestrator = HierarchicalOrchestrator({
                openai: testMockOpenAI,
                database: testMockDatabase
            });

            orchestrator.performHierarchicalMatch(sampleSifObjects.studentBirthDate, (err, result) => {
                expect(err).to.be.null;
                expect(result).to.exist;

                // Verify all steps completed
                expect(result.domain).to.equal('K12');
                expect(result.entity).to.equal('K12 Student');
                expect(result.elementMatch).to.exist;
                expect(result.elementMatch.cedsElement).to.equal('Birthdate');

                // Verify hierarchical path
                expect(result.hierarchicalPath).to.equal('K12 → K12 Student → Birthdate');

                // Verify confidence
                expect(result.confidence).to.exist;
                expect(result.confidence).to.be.a('number');

                done();
            });
        });

        it('should track processing time', (done) => {
            const HierarchicalOrchestrator = require('../../lib/processing/hierarchical-orchestrator');

            // Mock all three steps
            let callCount = 0;
            const testMockOpenAI = {
                chat: {
                    completions: {
                        create: sinon.stub().callsFake(() => {
                            callCount++;

                            // Step 1: Domain
                            if (callCount === 1) {
                                return Promise.resolve({
                                    choices: [{ message: { content: 'K12' } }]
                                });
                            }

                            // Step 2: Entity
                            if (callCount === 2) {
                                return Promise.resolve({
                                    choices: [{ message: { content: 'K12 Student' } }]
                                });
                            }

                            // Step 3: Element
                            return Promise.resolve({
                                choices: [{
                                    message: {
                                        content: JSON.stringify({
                                            cedsRefId: 'CEDS_000033',
                                            cedsElement: 'Birthdate',
                                            confidence: 0.95,
                                            reasoning: 'Match'
                                        })
                                    }
                                }]
                            });
                        })
                    }
                }
            };

            const testMockDatabase = {
                getTable: sinon.stub().callsFake((tableName, options, callback) => {
                    // Mock different tables
                    callback(null, {
                        getData: sinon.stub().callsArgWith(2, null, tableName === '_CEDSElements' ? [{
                            refId: 'CEDS_000033',
                            ElementName: 'Birthdate',
                            Domain: 'K12',
                            Entity: 'K12 Student'
                        }] : []),
                        saveObject: sinon.stub().callsArgWith(2, null, 'id')
                    });
                })
            };

            const orchestrator = HierarchicalOrchestrator({
                openai: testMockOpenAI,
                database: testMockDatabase
            });

            orchestrator.performHierarchicalMatch(sampleSifObjects.studentBirthDate, (err, result) => {
                expect(err).to.be.null;
                expect(result.processingTime).to.exist;
                expect(result.processingTime).to.be.a('number');
                expect(result.processingTime).to.be.greaterThan(0);
                done();
            });
        });

        it('should return formatted results compatible with unityCedsMatch', (done) => {
            const HierarchicalOrchestrator = require('../../lib/processing/hierarchical-orchestrator');

            // Mock all three steps
            let callCount = 0;
            const testMockOpenAI = {
                chat: {
                    completions: {
                        create: sinon.stub().callsFake(() => {
                            callCount++;

                            if (callCount === 1) {
                                return Promise.resolve({
                                    choices: [{ message: { content: 'K12' } }]
                                });
                            }

                            if (callCount === 2) {
                                return Promise.resolve({
                                    choices: [{ message: { content: 'K12 Student' } }]
                                });
                            }

                            return Promise.resolve({
                                choices: [{
                                    message: {
                                        content: JSON.stringify({
                                            cedsRefId: 'CEDS_000033',
                                            cedsElement: 'Birthdate',
                                            confidence: 0.95,
                                            reasoning: 'Match'
                                        })
                                    }
                                }]
                            });
                        })
                    }
                }
            };

            const testMockDatabase = {
                getTable: sinon.stub().callsFake((tableName, options, callback) => {
                    // Mock different tables
                    callback(null, {
                        getData: sinon.stub().callsArgWith(2, null, tableName === '_CEDSElements' ? [{
                            refId: 'CEDS_000033',
                            ElementName: 'Birthdate',
                            Domain: 'K12',
                            Entity: 'K12 Student'
                        }] : []),
                        saveObject: sinon.stub().callsArgWith(2, null, 'id')
                    });
                })
            };

            const orchestrator = HierarchicalOrchestrator({
                openai: testMockOpenAI,
                database: testMockDatabase
            });

            orchestrator.performHierarchicalMatch(sampleSifObjects.studentBirthDate, (err, result) => {
                expect(err).to.be.null;

                // Should have all required fields for database compatibility
                expect(result.elementMatch.cedsRefId).to.exist;
                expect(result.elementMatch.cedsElement).to.exist;
                expect(result.elementMatch.distance).to.exist;
                expect(result.elementMatch.score).to.exist;
                expect(result.elementMatch.reasoning).to.exist;

                done();
            });
        });
    });

    describe('Error Handling', () => {
        it('should propagate domain classification errors', (done) => {
            const HierarchicalOrchestrator = require('../../lib/processing/hierarchical-orchestrator');

            const testMockOpenAI = {
                chat: {
                    completions: {
                        create: sinon.stub().rejects(new Error('Domain classification failed'))
                    }
                }
            };

            const orchestrator = HierarchicalOrchestrator({
                openai: testMockOpenAI,
                database: mockDatabase
            });

            orchestrator.performHierarchicalMatch(sampleSifObjects.studentBirthDate, (err, result) => {
                expect(err).to.exist;
                expect(err.message).to.include('Domain classification failed');
                done();
            });
        });

        it('should handle entity selection failures', (done) => {
            const HierarchicalOrchestrator = require('../../lib/processing/hierarchical-orchestrator');

            let callCount = 0;
            const testMockOpenAI = {
                chat: {
                    completions: {
                        create: sinon.stub().callsFake(() => {
                            callCount++;
                            if (callCount === 1) {
                                // Domain succeeds
                                return Promise.resolve({
                                    choices: [{ message: { content: 'K12' } }]
                                });
                            }
                            // Entity fails
                            return Promise.reject(new Error('Entity selection failed'));
                        })
                    }
                }
            };

            const testMockDatabase = {
                getTable: sinon.stub().callsArgWith(2, null, {
                    getData: sinon.stub().callsArgWith(2, null, []),
                    saveObject: sinon.stub().callsArgWith(2, null, 'id')
                })
            };

            const orchestrator = HierarchicalOrchestrator({
                openai: testMockOpenAI,
                database: testMockDatabase
            });

            orchestrator.performHierarchicalMatch(sampleSifObjects.studentBirthDate, (err, result) => {
                expect(err).to.exist;
                expect(err.message).to.include('Entity selection failed');
                done();
            });
        });
    });

    describe('Confidence Calculation', () => {
        it('should calculate overall confidence from element match', (done) => {
            const HierarchicalOrchestrator = require('../../lib/processing/hierarchical-orchestrator');

            // Mock all three steps
            let callCount = 0;
            const testMockOpenAI = {
                chat: {
                    completions: {
                        create: sinon.stub().callsFake(() => {
                            callCount++;

                            if (callCount === 1) {
                                return Promise.resolve({
                                    choices: [{ message: { content: 'K12' } }]
                                });
                            }

                            if (callCount === 2) {
                                return Promise.resolve({
                                    choices: [{ message: { content: 'K12 Student' } }]
                                });
                            }

                            return Promise.resolve({
                                choices: [{
                                    message: {
                                        content: JSON.stringify({
                                            cedsRefId: 'CEDS_000033',
                                            cedsElement: 'Birthdate',
                                            confidence: 0.87,
                                            reasoning: 'Match'
                                        })
                                    }
                                }]
                            });
                        })
                    }
                }
            };

            const testMockDatabase = {
                getTable: sinon.stub().callsFake((tableName, options, callback) => {
                    // Mock different tables
                    callback(null, {
                        getData: sinon.stub().callsArgWith(2, null, tableName === '_CEDSElements' ? [{
                            refId: 'CEDS_000033',
                            ElementName: 'Birthdate',
                            Domain: 'K12',
                            Entity: 'K12 Student'
                        }] : []),
                        saveObject: sinon.stub().callsArgWith(2, null, 'id')
                    });
                })
            };

            const orchestrator = HierarchicalOrchestrator({
                openai: testMockOpenAI,
                database: testMockDatabase
            });

            orchestrator.performHierarchicalMatch(sampleSifObjects.studentBirthDate, (err, result) => {
                expect(err).to.be.null;
                expect(result.confidence).to.equal(0.87);
                done();
            });
        });
    });
});
