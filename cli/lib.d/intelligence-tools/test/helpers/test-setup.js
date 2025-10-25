#!/usr/bin/env node
'use strict';

/**
 * Test setup and common helpers for intelligence-tools tests
 */

const sinon = require('sinon');

/**
 * Create a mock process.global for testing
 */
const createMockProcessGlobal = () => {
    // Mock xLog with ONLY methods that actually exist in qtools x-log
    // (verified via console.dir(xLog) at runtime)
    // NOTE: NO warning() - it doesn't exist in real xLog!
    const mockXLog = {
        error: sinon.stub(),
        status: sinon.stub(),
        verbose: sinon.stub(),
        result: sinon.stub(),
        debug: sinon.stub(),
        emphatic: sinon.stub(),
        progress: sinon.stub(),
        saveProcessFile: sinon.stub(),
        getProcessFilesDirectory: sinon.stub().returns('/tmp/test'),
        setProcessFilesDirectory: sinon.stub(),
        setProgressMessageStatus: sinon.stub(),
        logToStdOut: sinon.stub(),
        logToStdErr: sinon.stub()
    };

    const mockGetConfig = sinon.stub().callsFake((moduleName) => {
        // Return appropriate configs based on module name
        if (moduleName === 'intelligenceTools') {
            return {
                databasePath: ':memory:',
                openAiApiKey: 'test-key-fake',
                domainCachePath: ':memory:',
                llmModels: {
                    domain: 'gpt-3.5-turbo',
                    entity: 'gpt-3.5-turbo',
                    element: 'gpt-4'
                },
                temperature: 0,
                maxRetries: 3
            };
        }
        return {};
    });

    const mockCommandLineParameters = {
        qtGetSurePath: sinon.stub().returns(null)
    };

    return {
        xLog: mockXLog,
        getConfig: mockGetConfig,
        commandLineParameters: mockCommandLineParameters
    };
};

/**
 * Set up process.global for tests
 */
const setupProcessGlobal = () => {
    const mocks = createMockProcessGlobal();
    process.global = mocks;
    return mocks;
};

/**
 * Clear require cache for a module to ensure clean reload
 */
const clearRequireCache = (modulePath) => {
    delete require.cache[require.resolve(modulePath)];
};

/**
 * Create a mock OpenAI client for testing
 */
const createMockOpenAIClient = () => {
    return {
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
};

/**
 * Create a mock database instance for testing
 * Returns actual entity data for entity-selector tests
 */
const createMockDatabase = () => {
    return {
        getTable: sinon.stub().callsFake((tableName, options, callback) => {
            // Return entity data for _CEDSElements table
            if (tableName === '_CEDSElements') {
                callback(null, {
                    getData: sinon.stub().callsArgWith(2, null, [
                        { Domain: 'K12', Entity: 'K12 Student' },
                        { Domain: 'K12', Entity: 'K12 School' },
                        { Domain: 'K12', Entity: 'K12 Staff' },
                        { Domain: 'Assessments', Entity: 'Assessment' },
                        { Domain: 'Assessments', Entity: 'Assessment Administration' },
                        { Domain: 'Learning Resources', Entity: 'Learning Resource' }
                    ]),
                    saveObject: sinon.stub().callsArgWith(2, null, 'test-ref-id')
                });
            } else {
                // Default for other tables
                callback(null, {
                    getData: sinon.stub().callsArgWith(2, null, []),
                    saveObject: sinon.stub().callsArgWith(2, null, 'test-ref-id')
                });
            }
        }),
        query: sinon.stub().callsArgWith(2, null, []),
        execute: sinon.stub().callsArgWith(2, null, { changes: 0 })
    };
};

module.exports = {
    createMockProcessGlobal,
    setupProcessGlobal,
    clearRequireCache,
    createMockOpenAIClient,
    createMockDatabase
};
