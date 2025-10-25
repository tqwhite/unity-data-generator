'use strict';

const moduleName = __filename.replace(__dirname + '/', '').replace(/.js$/, '');

const moduleFunction = function(args = {}) {
    // Get from process.global instead of args
    const { xLog, getConfig } = process.global;

    const qt = require('qtools-functional-library');
    const path = require('path');

    // Initialize sqlite-instance
    const { initDatabaseInstance } = require('./sqlite-instance/sqlite-instance')({});

    // Get database path from config
    const moduleConfig = getConfig('intelligenceTools') || {};
    const databasePath = moduleConfig.databasePath ||
        '/Users/tqwhite/Documents/webdev/A4L/unityObjectGenerator/system/datastore/cedsIds.sqlite3';

    xLog.verbose(`Using database: ${databasePath}`);

    // Database instance
    let sqliteInstance = null;
    let isInitialized = false;

    // ===================================================================================
    // initDatabase - Initialize sqlite-instance connection
    // ===================================================================================

    const initDatabase = function(callback) {
        if (isInitialized && sqliteInstance) {
            callback(null, sqliteInstance);
            return;
        }

        initDatabaseInstance(databasePath, (err, dbInstance) => {
            if (err) {
                callback(err);
                return;
            }

            sqliteInstance = dbInstance;
            isInitialized = true;
            callback(null, sqliteInstance);
        });
    };

    // ===================================================================================
    // fetchByRefId - Fetch SIF object by refId from naDataModel
    // ===================================================================================

    const fetchByRefId = function(refId, callback) {
        initDatabase((err, dbInstance) => {
            if (err) {
                callback(err);
                return;
            }

            dbInstance.getTable('naDataModel', { suppressStatementLog: true }, (err, table) => {
                if (err) {
                    callback(err);
                    return;
                }

                const sql = `
                    SELECT
                        refId,
                        Name as ElementName,
                        XPath,
                        Type,
                        Mandatory,
                        Description,
                        Format,
                        "CEDS ID" as cedsId,
                        SheetName
                    FROM <!tableName!>
                    WHERE refId = ?
                    LIMIT 1
                `;

                table.getData(sql, {
                    suppressStatementLog: true,
                    params: [refId]
                }, (err, results) => {
                    if (err) {
                        callback(err);
                        return;
                    }

                    if (!results || results.length === 0) {
                        callback(new Error(`No SIF object found with refId: ${refId}`));
                        return;
                    }

                    callback(null, results[0]);
                });
            });
        });
    };

    // ===================================================================================
    // fetchByXPath - Fetch SIF object by XPath from naDataModel
    // ===================================================================================

    const fetchByXPath = function(xPath, callback) {
        initDatabase((err, dbInstance) => {
            if (err) {
                callback(err);
                return;
            }

            dbInstance.getTable('naDataModel', { suppressStatementLog: true }, (err, table) => {
                if (err) {
                    callback(err);
                    return;
                }

                const sql = `
                    SELECT
                        refId,
                        Name as ElementName,
                        XPath,
                        Type,
                        Mandatory,
                        Description,
                        Format,
                        "CEDS ID" as cedsId,
                        SheetName
                    FROM <!tableName!>
                    WHERE XPath = ?
                    LIMIT 1
                `;

                table.getData(sql, {
                    suppressStatementLog: true,
                    params: [xPath]
                }, (err, results) => {
                    if (err) {
                        callback(err);
                        return;
                    }

                    if (!results || results.length === 0) {
                        callback(new Error(`No SIF object found with XPath: ${xPath}`));
                        return;
                    }

                    callback(null, results[0]);
                });
            });
        });
    };

    // ===================================================================================
    // fetchByElementName - Fetch SIF object by ElementName from naDataModel
    // ===================================================================================

    const fetchByElementName = function(elementName, callback) {
        initDatabase((err, dbInstance) => {
            if (err) {
                callback(err);
                return;
            }

            dbInstance.getTable('naDataModel', { suppressStatementLog: true }, (err, table) => {
                if (err) {
                    callback(err);
                    return;
                }

                const sql = `
                    SELECT
                        refId,
                        Name as ElementName,
                        XPath,
                        Type,
                        Mandatory,
                        Description,
                        Format,
                        "CEDS ID" as cedsId,
                        SheetName
                    FROM <!tableName!>
                    WHERE Name = ?
                    LIMIT 1
                `;

                table.getData(sql, {
                    suppressStatementLog: true,
                    params: [elementName]
                }, (err, results) => {
                    if (err) {
                        callback(err);
                        return;
                    }

                    if (!results || results.length === 0) {
                        callback(new Error(`No SIF object found with ElementName: ${elementName}`));
                        return;
                    }

                    callback(null, results[0]);
                });
            });
        });
    };

    // ===================================================================================
    // fetchCEDSElements - Fetch CEDS elements for comparison
    // ===================================================================================

    const fetchCEDSElements = function(limit = 100, callback) {
        initDatabase((err, dbInstance) => {
            if (err) {
                callback(err);
                return;
            }

            dbInstance.getTable('_CEDSElements', { suppressStatementLog: true }, (err, table) => {
                if (err) {
                    callback(err);
                    return;
                }

                const sql = `
                    SELECT
                        refId,
                        ElementName,
                        Definition,
                        Description,
                        Domain,
                        Entity,
                        refUrl
                    FROM <!tableName!>
                    WHERE ElementName IS NOT NULL
                    LIMIT ?
                `;

                table.getData(sql, {
                    suppressStatementLog: true,
                    params: [limit]
                }, (err, results) => {
                    if (err) {
                        callback(err);
                        return;
                    }

                    callback(null, results || []);
                });
            });
        });
    };

    // ===================================================================================
    // validateMatchObject - Validate properties for unityCedsMatches table
    // ===================================================================================

    const validateMatchObject = function(sifObject, match, semanticAnalysisMode, index) {
        // Build the object that matches unityCedsMatches schema exactly
        const matchObject = {};

        // Generate refId (composite key)
        matchObject.refId = `${sifObject.refId}_${match.cedsRefId}_${semanticAnalysisMode}_${index}`;

        // Required fields from actual schema
        matchObject._CEDSElementsRefId = match.cedsRefId || match.refId || 'UNKNOWN';
        matchObject.naDataModelRefId = sifObject.refId;

        // Confidence as string (schema shows TEXT type)
        matchObject.confidence = String(match.confidence || match.score || 0);

        // JSON result string containing all match details
        const jsonResult = {
            cedsElement: match.cedsElement,
            distance: match.distance,
            score: match.score,
            confidence: match.confidence,
            reasoning: match.reasoning,
            hierarchicalPath: match.hierarchicalPath,
            domain: match.domain,
            entity: match.entity,
            rank: index + 1
        };
        matchObject.jsonResultString = JSON.stringify(jsonResult);

        // Semantic analysis metadata
        matchObject.semanticAnalysisMode = semanticAnalysisMode || 'pureIntelligence';
        matchObject.vectorModeVersion = 'pureIntelligence_v1';
        matchObject.semanticAnalyzerVersion = 'pureIntelligence_v1.0.0';

        // Log validation for debugging
        xLog.verbose(`Validated match object for saving:`);
        xLog.verbose(`  refId: ${matchObject.refId}`);
        xLog.verbose(`  _CEDSElementsRefId: ${matchObject._CEDSElementsRefId}`);
        xLog.verbose(`  naDataModelRefId: ${matchObject.naDataModelRefId}`);
        xLog.verbose(`  confidence: ${matchObject.confidence}`);
        xLog.verbose(`  semanticAnalysisMode: ${matchObject.semanticAnalysisMode}`);

        return matchObject;
    };

    // ===================================================================================
    // saveMatches - Save matches to unityCedsMatches table using sqlite-instance
    // ===================================================================================

    const saveMatches = function(args, callback) {
        const { sifObject, cedsMatches, semanticAnalysisMode } = args;

        initDatabase((err, dbInstance) => {
            if (err) {
                callback(err);
                return;
            }

            dbInstance.getTable('unityCedsMatches', { suppressStatementLog: true }, (err, table) => {
                if (err) {
                    callback(err);
                    return;
                }

                let savedCount = 0;
                let errorCount = 0;

                const saveNext = function(index) {
                    if (index >= cedsMatches.length) {
                        xLog.status(`Save complete: ${savedCount} saved, ${errorCount} errors`);
                        callback(null, savedCount);
                        return;
                    }

                    const match = cedsMatches[index];

                    // Validate and build the match object
                    const matchObject = validateMatchObject(sifObject, match, semanticAnalysisMode, index);

                    // Save using sqlite-instance's saveObject
                    // Now with our quote conversion fix, this should work!
                    table.saveObject(matchObject, {
                        suppressStatementLog: true
                    }, (err, refId) => {
                        if (err) {
                            xLog.error(`Failed to save match ${index}: ${err.message}`);
                            xLog.error(`Match object properties: ${Object.keys(matchObject).join(', ')}`);
                            errorCount++;
                        } else {
                            xLog.verbose(`Saved match with refId: ${refId}`);
                            savedCount++;
                        }
                        saveNext(index + 1);
                    });
                };

                saveNext(0);
            });
        });
    };

    // ===================================================================================
    // getDatabase - Get initialized database instance
    // ===================================================================================

    const getDatabase = function(callback) {
        initDatabase(callback);
    };

    // ===================================================================================

    return {
        fetchByRefId,
        fetchByXPath,
        fetchByElementName,
        fetchCEDSElements,
        saveMatches,
        getDatabase
    };
};

module.exports = moduleFunction;