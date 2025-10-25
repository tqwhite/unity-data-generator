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
    expectedEntitySelections,
    cedsEntitiesByDomain
} = require('../fixtures/test-data');

describe('EntitySelector', () => {
    let entitySelector;
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
        const modulePath = '../../lib/processing/entity-selector/entity-selector';
        clearRequireCache(modulePath);
    });

    describe('Constructor and Initialization', () => {
        it('should initialize with OpenAI client and database', () => {
            const EntitySelector = require('../../lib/processing/entity-selector/entity-selector');
            const selector = EntitySelector({ openai: mockOpenAI, database: mockDatabase });

            expect(selector).to.exist;
            expect(selector.selectEntity).to.be.a('function');
        });

        it('should load entity definitions from database', (done) => {
            const EntitySelector = require('../../lib/processing/entity-selector/entity-selector');

            // Mock database to return entity definitions
            mockDatabase.getTable = sinon.stub().callsArgWith(2, null, {
                getData: sinon.stub().callsArgWith(2, null, [
                    { Domain: 'K12', Entity: 'K12 Student' },
                    { Domain: 'K12', Entity: 'K12 School' }
                ])
            });

            const selector = EntitySelector({ openai: mockOpenAI, database: mockDatabase });

            // Should have method to get entities for a domain
            expect(selector.getEntitiesForDomain).to.be.a('function');

            selector.getEntitiesForDomain('K12', (err, entities) => {
                expect(err).to.be.null;
                expect(entities).to.be.an('array');
                expect(entities.length).to.be.greaterThan(0);
                done();
            });
        });
    });

    describe('selectEntity() - Entity Selection', () => {
        it('should select K12 Student for /xStudent paths', (done) => {
            const EntitySelector = require('../../lib/processing/entity-selector/entity-selector');

            const testMockOpenAI = {
                chat: {
                    completions: {
                        create: sinon.stub().resolves({
                            choices: [{
                                message: {
                                    content: 'K12 Student'
                                }
                            }]
                        })
                    }
                }
            };

            const selector = EntitySelector({ openai: testMockOpenAI, database: mockDatabase });

            const context = {
                xpath: '/xStudents/xStudent/demographics/birthDate',
                domain: 'K12',
                elementName: 'BirthDate'
            };

            selector.selectEntity(context, (err, entity) => {
                expect(err).to.be.null;
                expect(entity).to.equal('K12 Student');
                done();
            });
        });

        it('should select Assessment for /Assessment paths', (done) => {
            const EntitySelector = require('../../lib/processing/entity-selector/entity-selector');

            const testMockOpenAI = {
                chat: {
                    completions: {
                        create: sinon.stub().resolves({
                            choices: [{
                                message: {
                                    content: 'Assessment'
                                }
                            }]
                        })
                    }
                }
            };

            const selector = EntitySelector({ openai: testMockOpenAI, database: mockDatabase });

            const context = {
                xpath: '/Assessments/Assessment/@RefId',
                domain: 'Assessments',
                elementName: '@RefId'
            };

            selector.selectEntity(context, (err, entity) => {
                expect(err).to.be.null;
                expect(entity).to.equal('Assessment');
                done();
            });
        });

        it('should select K12 School for /xSchool paths', (done) => {
            const EntitySelector = require('../../lib/processing/entity-selector/entity-selector');

            const testMockOpenAI = {
                chat: {
                    completions: {
                        create: sinon.stub().resolves({
                            choices: [{
                                message: {
                                    content: 'K12 School'
                                }
                            }]
                        })
                    }
                }
            };

            const selector = EntitySelector({ openai: testMockOpenAI, database: mockDatabase });

            const context = {
                xpath: '/xSchools/xSchool/schoolName',
                domain: 'K12',
                elementName: 'schoolName'
            };

            selector.selectEntity(context, (err, entity) => {
                expect(err).to.be.null;
                expect(entity).to.equal('K12 School');
                done();
            });
        });
    });

    describe('LLM Prompt Construction', () => {
        it('should build prompt with domain context', (done) => {
            const EntitySelector = require('../../lib/processing/entity-selector/entity-selector');

            let capturedPrompt = null;
            const testMockOpenAI = {
                chat: {
                    completions: {
                        create: sinon.stub().callsFake((params) => {
                            capturedPrompt = params.messages[0].content;
                            return Promise.resolve({
                                choices: [{
                                    message: {
                                        content: 'K12 Student'
                                    }
                                }]
                            });
                        })
                    }
                }
            };

            const selector = EntitySelector({ openai: testMockOpenAI, database: mockDatabase });

            const context = {
                xpath: '/xStudents/xStudent/demographics/birthDate',
                domain: 'K12',
                elementName: 'BirthDate'
            };

            selector.selectEntity(context, (err, entity) => {
                expect(err).to.be.null;

                // Verify prompt includes domain
                expect(capturedPrompt).to.include('K12');

                // Verify prompt includes xpath
                expect(capturedPrompt).to.include('/xStudents/xStudent');

                // Verify prompt includes element name
                expect(capturedPrompt).to.include('BirthDate');

                done();
            });
        });

        it('should use temperature 0 for deterministic results', (done) => {
            const EntitySelector = require('../../lib/processing/entity-selector/entity-selector');

            let capturedParams = null;
            const testMockOpenAI = {
                chat: {
                    completions: {
                        create: sinon.stub().callsFake((params) => {
                            capturedParams = params;
                            return Promise.resolve({
                                choices: [{
                                    message: {
                                        content: 'K12 Student'
                                    }
                                }]
                            });
                        })
                    }
                }
            };

            const selector = EntitySelector({ openai: testMockOpenAI, database: mockDatabase });

            const context = {
                xpath: '/xStudents/xStudent/demographics/birthDate',
                domain: 'K12',
                elementName: 'BirthDate'
            };

            selector.selectEntity(context, (err, entity) => {
                expect(err).to.be.null;
                expect(capturedParams.temperature).to.equal(0);
                done();
            });
        });
    });

    describe('Entity Validation', () => {
        it('should validate entity exists in domain', (done) => {
            const EntitySelector = require('../../lib/processing/entity-selector/entity-selector');

            const testMockOpenAI = {
                chat: {
                    completions: {
                        create: sinon.stub().resolves({
                            choices: [{
                                message: {
                                    content: 'Invalid Entity'
                                }
                            }]
                        })
                    }
                }
            };

            const selector = EntitySelector({ openai: testMockOpenAI, database: mockDatabase });

            const context = {
                xpath: '/xStudents/xStudent/demographics/birthDate',
                domain: 'K12',
                elementName: 'BirthDate'
            };

            selector.selectEntity(context, (err, entity) => {
                // Pure intelligence approach - should fail hard on invalid LLM response
                expect(err).to.exist;
                expect(err.message).to.include('LLM returned invalid entity');
                expect(err.message).to.include('Invalid Entity');
                done();
            });
        });
    });

    describe('Error Handling', () => {
        it('should handle OpenAI API errors', (done) => {
            const EntitySelector = require('../../lib/processing/entity-selector/entity-selector');

            const testMockOpenAI = {
                chat: {
                    completions: {
                        create: sinon.stub().rejects(new Error('API error'))
                    }
                }
            };

            const selector = EntitySelector({ openai: testMockOpenAI, database: mockDatabase });

            const context = {
                xpath: '/xStudents/xStudent/demographics/birthDate',
                domain: 'K12',
                elementName: 'BirthDate'
            };

            selector.selectEntity(context, (err, entity) => {
                expect(err).to.exist;
                expect(err.message).to.include('API error');
                done();
            });
        });

        it('should handle database errors gracefully', (done) => {
            const EntitySelector = require('../../lib/processing/entity-selector/entity-selector');

            const testMockDatabase = {
                getTable: sinon.stub().callsArgWith(2, new Error('Database error'), null)
            };

            const testMockOpenAI = {
                chat: {
                    completions: {
                        create: sinon.stub().resolves({
                            choices: [{
                                message: {
                                    content: 'K12 Student'
                                }
                            }]
                        })
                    }
                }
            };

            const selector = EntitySelector({ openai: testMockOpenAI, database: testMockDatabase });

            const context = {
                xpath: '/xStudents/xStudent/demographics/birthDate',
                domain: 'K12',
                elementName: 'BirthDate'
            };

            selector.selectEntity(context, (err, entity) => {
                // Pure intelligence - should fail hard if database fails (no fallbacks)
                expect(err).to.exist;
                expect(err.message).to.match(/Failed to load entities|No entities found/);
                done();
            });
        });
    });

    describe('Performance and Optimization', () => {
        it('should use cost-effective model (gpt-3.5-turbo)', (done) => {
            const EntitySelector = require('../../lib/processing/entity-selector/entity-selector');

            let capturedModel = null;
            const testMockOpenAI = {
                chat: {
                    completions: {
                        create: sinon.stub().callsFake((params) => {
                            capturedModel = params.model;
                            return Promise.resolve({
                                choices: [{
                                    message: {
                                        content: 'K12 Student'
                                    }
                                }]
                            });
                        })
                    }
                }
            };

            const selector = EntitySelector({ openai: testMockOpenAI, database: mockDatabase });

            const context = {
                xpath: '/xStudents/xStudent/demographics/birthDate',
                domain: 'K12',
                elementName: 'BirthDate'
            };

            selector.selectEntity(context, (err, entity) => {
                expect(err).to.be.null;
                expect(capturedModel).to.include('gpt-3.5-turbo');
                done();
            });
        });
    });
});
