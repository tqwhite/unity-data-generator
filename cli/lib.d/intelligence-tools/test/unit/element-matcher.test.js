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
    sampleSifObjects,
    sampleCedsElements,
    expectedElementMatches
} = require('../fixtures/test-data');

describe('ElementMatcher', () => {
    let elementMatcher;
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
        const modulePath = '../../lib/processing/element-matcher/element-matcher';
        clearRequireCache(modulePath);
    });

    describe('Constructor and Initialization', () => {
        it('should initialize with OpenAI client and database', () => {
            const ElementMatcher = require('../../lib/processing/element-matcher/element-matcher');
            const matcher = ElementMatcher({ openai: mockOpenAI, database: mockDatabase });

            expect(matcher).to.exist;
            expect(matcher.matchElement).to.be.a('function');
        });
    });

    describe('matchElement() - Element Matching', () => {
        it('should match SIF BirthDate to CEDS Birthdate', (done) => {
            const ElementMatcher = require('../../lib/processing/element-matcher/element-matcher');

            const testMockOpenAI = {
                chat: {
                    completions: {
                        create: sinon.stub().resolves({
                            choices: [{
                                message: {
                                    content: JSON.stringify({
                                        cedsRefId: 'CEDS_000033',
                                        cedsElement: 'Birthdate',
                                        confidence: 0.95,
                                        reasoning: 'Both represent the date a person was born'
                                    })
                                }
                            }]
                        })
                    }
                }
            };

            // Mock database to return CEDS elements
            const testMockDatabase = {
                getTable: sinon.stub().callsArgWith(2, null, {
                    getData: sinon.stub().callsArgWith(2, null, [
                        {
                            refId: 'CEDS_000033',
                            ElementName: 'Birthdate',
                            Definition: 'The month, day, and year on which a person was born.',
                            Domain: 'K12',
                            Entity: 'K12 Student'
                        }
                    ])
                })
            };

            const matcher = ElementMatcher({ openai: testMockOpenAI, database: testMockDatabase });

            const context = {
                sifElement: sampleSifObjects.studentBirthDate,
                domain: 'K12',
                entity: 'K12 Student'
            };

            matcher.matchElement(context, (err, match) => {
                expect(err).to.be.null;
                expect(match).to.exist;
                expect(match.cedsElement).to.equal('Birthdate');
                expect(match.cedsRefId).to.equal('CEDS_000033');
                expect(match.confidence).to.be.greaterThan(0.8);
                done();
            });
        });

        it('should include reasoning in match result', (done) => {
            const ElementMatcher = require('../../lib/processing/element-matcher/element-matcher');

            const testMockOpenAI = {
                chat: {
                    completions: {
                        create: sinon.stub().resolves({
                            choices: [{
                                message: {
                                    content: JSON.stringify({
                                        cedsRefId: 'CEDS_000033',
                                        cedsElement: 'Birthdate',
                                        confidence: 0.95,
                                        reasoning: 'Exact semantic match for birth date'
                                    })
                                }
                            }]
                        })
                    }
                }
            };

            const testMockDatabase = {
                getTable: sinon.stub().callsArgWith(2, null, {
                    getData: sinon.stub().callsArgWith(2, null, [
                        {
                            refId: 'CEDS_000033',
                            ElementName: 'Birthdate',
                            Definition: 'Birth date'
                        }
                    ])
                })
            };

            const matcher = ElementMatcher({ openai: testMockOpenAI, database: testMockDatabase });

            const context = {
                sifElement: sampleSifObjects.studentBirthDate,
                domain: 'K12',
                entity: 'K12 Student'
            };

            matcher.matchElement(context, (err, match) => {
                expect(err).to.be.null;
                expect(match.reasoning).to.exist;
                expect(match.reasoning).to.be.a('string');
                expect(match.reasoning.length).to.be.greaterThan(0);
                done();
            });
        });

        it('should calculate appropriate confidence scores', (done) => {
            const ElementMatcher = require('../../lib/processing/element-matcher/element-matcher');

            const testMockOpenAI = {
                chat: {
                    completions: {
                        create: sinon.stub().resolves({
                            choices: [{
                                message: {
                                    content: JSON.stringify({
                                        cedsRefId: 'CEDS_000033',
                                        cedsElement: 'Birthdate',
                                        confidence: 0.78,
                                        reasoning: 'Partial match'
                                    })
                                }
                            }]
                        })
                    }
                }
            };

            const testMockDatabase = {
                getTable: sinon.stub().callsArgWith(2, null, {
                    getData: sinon.stub().callsArgWith(2, null, [
                        {
                            refId: 'CEDS_000033',
                            ElementName: 'Birthdate'
                        }
                    ])
                })
            };

            const matcher = ElementMatcher({ openai: testMockOpenAI, database: testMockDatabase });

            const context = {
                sifElement: sampleSifObjects.studentBirthDate,
                domain: 'K12',
                entity: 'K12 Student'
            };

            matcher.matchElement(context, (err, match) => {
                expect(err).to.be.null;
                expect(match.confidence).to.be.a('number');
                expect(match.confidence).to.be.at.least(0);
                expect(match.confidence).to.be.at.most(1);
                done();
            });
        });
    });

    describe('LLM Prompt Construction', () => {
        it('should build prompt with full SIF element context', (done) => {
            const ElementMatcher = require('../../lib/processing/element-matcher/element-matcher');

            let capturedPrompt = null;
            const testMockOpenAI = {
                chat: {
                    completions: {
                        create: sinon.stub().callsFake((params) => {
                            capturedPrompt = params.messages[0].content;
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
                getTable: sinon.stub().callsArgWith(2, null, {
                    getData: sinon.stub().callsArgWith(2, null, [
                        {
                            refId: 'CEDS_000033',
                            ElementName: 'Birthdate',
                            Definition: 'Birth date'
                        }
                    ])
                })
            };

            const matcher = ElementMatcher({ openai: testMockOpenAI, database: testMockDatabase });

            const context = {
                sifElement: sampleSifObjects.studentBirthDate,
                domain: 'K12',
                entity: 'K12 Student'
            };

            matcher.matchElement(context, (err, match) => {
                expect(err).to.be.null;

                // Verify prompt includes SIF element details
                expect(capturedPrompt).to.include('BirthDate');
                expect(capturedPrompt).to.include('/xStudents/xStudent');

                // Verify prompt includes CEDS element details
                expect(capturedPrompt).to.include('Birthdate');

                // Verify prompt includes domain/entity context
                expect(capturedPrompt).to.include('K12');
                expect(capturedPrompt).to.include('K12 Student');

                done();
            });
        });

        it('should use more expensive model (gpt-4) for final matching', (done) => {
            const ElementMatcher = require('../../lib/processing/element-matcher/element-matcher');

            let capturedModel = null;
            const testMockOpenAI = {
                chat: {
                    completions: {
                        create: sinon.stub().callsFake((params) => {
                            capturedModel = params.model;
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
                getTable: sinon.stub().callsArgWith(2, null, {
                    getData: sinon.stub().callsArgWith(2, null, [
                        {
                            refId: 'CEDS_000033',
                            ElementName: 'Birthdate'
                        }
                    ])
                })
            };

            const matcher = ElementMatcher({ openai: testMockOpenAI, database: testMockDatabase });

            const context = {
                sifElement: sampleSifObjects.studentBirthDate,
                domain: 'K12',
                entity: 'K12 Student'
            };

            matcher.matchElement(context, (err, match) => {
                expect(err).to.be.null;
                expect(capturedModel).to.include('gpt-4');
                done();
            });
        });
    });

    describe('CEDS Element Retrieval', () => {
        it('should fetch CEDS elements for domain/entity from database', (done) => {
            const ElementMatcher = require('../../lib/processing/element-matcher/element-matcher');

            const testMockDatabase = {
                getTable: sinon.stub().callsArgWith(2, null, {
                    getData: sinon.stub().callsFake((sql, options, callback) => {
                        // Verify params contain correct domain/entity
                        expect(options.params).to.be.an('array');
                        expect(options.params[0]).to.equal('K12');
                        expect(options.params[1]).to.equal('K12 Student');

                        callback(null, [
                            {
                                refId: 'CEDS_000033',
                                ElementName: 'Birthdate',
                                Definition: 'Birth date',
                                Domain: 'K12',
                                Entity: 'K12 Student'
                            }
                        ]);
                    })
                })
            };

            const testMockOpenAI = {
                chat: {
                    completions: {
                        create: sinon.stub().resolves({
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
                        })
                    }
                }
            };

            const matcher = ElementMatcher({ openai: testMockOpenAI, database: testMockDatabase });

            const context = {
                sifElement: sampleSifObjects.studentBirthDate,
                domain: 'K12',
                entity: 'K12 Student'
            };

            matcher.matchElement(context, (err, match) => {
                expect(err).to.be.null;
                expect(testMockDatabase.getTable.called).to.be.true;
                done();
            });
        });
    });

    describe('Error Handling', () => {
        it('should handle OpenAI API errors', (done) => {
            const ElementMatcher = require('../../lib/processing/element-matcher/element-matcher');

            const testMockOpenAI = {
                chat: {
                    completions: {
                        create: sinon.stub().rejects(new Error('API error'))
                    }
                }
            };

            const testMockDatabase = {
                getTable: sinon.stub().callsArgWith(2, null, {
                    getData: sinon.stub().callsArgWith(2, null, [
                        { refId: 'CEDS_000033', ElementName: 'Birthdate' }
                    ])
                })
            };

            const matcher = ElementMatcher({ openai: testMockOpenAI, database: testMockDatabase });

            const context = {
                sifElement: sampleSifObjects.studentBirthDate,
                domain: 'K12',
                entity: 'K12 Student'
            };

            matcher.matchElement(context, (err, match) => {
                expect(err).to.exist;
                expect(err.message).to.include('API error');
                done();
            });
        });

        it('should handle invalid JSON responses from LLM', (done) => {
            const ElementMatcher = require('../../lib/processing/element-matcher/element-matcher');

            const testMockOpenAI = {
                chat: {
                    completions: {
                        create: sinon.stub().resolves({
                            choices: [{
                                message: {
                                    content: 'Invalid JSON response'
                                }
                            }]
                        })
                    }
                }
            };

            const testMockDatabase = {
                getTable: sinon.stub().callsArgWith(2, null, {
                    getData: sinon.stub().callsArgWith(2, null, [
                        { refId: 'CEDS_000033', ElementName: 'Birthdate' }
                    ])
                })
            };

            const matcher = ElementMatcher({ openai: testMockOpenAI, database: testMockDatabase });

            const context = {
                sifElement: sampleSifObjects.studentBirthDate,
                domain: 'K12',
                entity: 'K12 Student'
            };

            matcher.matchElement(context, (err, match) => {
                expect(err).to.exist;
                done();
            });
        });

        it('should handle database errors gracefully', (done) => {
            const ElementMatcher = require('../../lib/processing/element-matcher/element-matcher');

            const testMockDatabase = {
                getTable: sinon.stub().callsArgWith(2, new Error('Database error'), null)
            };

            const testMockOpenAI = {
                chat: {
                    completions: {
                        create: sinon.stub().resolves({
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
                        })
                    }
                }
            };

            const matcher = ElementMatcher({ openai: testMockOpenAI, database: testMockDatabase });

            const context = {
                sifElement: sampleSifObjects.studentBirthDate,
                domain: 'K12',
                entity: 'K12 Student'
            };

            matcher.matchElement(context, (err, match) => {
                expect(err).to.exist;
                done();
            });
        });

        it('should handle no CEDS elements found for domain/entity', (done) => {
            const ElementMatcher = require('../../lib/processing/element-matcher/element-matcher');

            const testMockDatabase = {
                getTable: sinon.stub().callsArgWith(2, null, {
                    getData: sinon.stub().callsArgWith(2, null, [])
                })
            };

            const testMockOpenAI = createMockOpenAIClient();

            const matcher = ElementMatcher({ openai: testMockOpenAI, database: testMockDatabase });

            const context = {
                sifElement: sampleSifObjects.studentBirthDate,
                domain: 'K12',
                entity: 'K12 Student'
            };

            matcher.matchElement(context, (err, match) => {
                expect(err).to.exist;
                expect(err.message).to.include('No CEDS elements found');
                done();
            });
        });
    });
});
