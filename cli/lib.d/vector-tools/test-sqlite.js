#!/usr/bin/env node
'use strict';

// Simple SQLite test to diagnose crashes
// 
// IMPORTANT: This test only loads basic SQLite without the sqlite-vec extension.
// It's EXPECTED that vec_version() will fail here with "no such function: vec_version"
// This is normal and indicates basic SQLite is working but sqlite-vec is not loaded.
//
// For full vector functionality testing (with sqlite-vec extension), use:
// - test-vector-database-operations.js (loads sqlite-vec properly)
// - test-drop-all-vector-tables.js (tests vector table operations)
//
// This basic test is useful for:
// - Verifying SQLite connection works
// - Diagnosing database file access issues
// - Testing without vector dependencies
//
const Database = require('better-sqlite3');

console.log('Testing SQLite connection...');

try {
    const dbPath = '/Users/tqwhite/Documents/webdev/A4L/unityObjectGenerator/system/datastore/cedsIds.sqlite3';
    console.log(`Opening database: ${dbPath}`);
    
    const db = new Database(dbPath, { verbose: console.log });
    console.log('Database opened successfully');
    
    // Test basic query
    console.log('Testing basic query...');
    const tables = db.prepare(`SELECT name FROM sqlite_master WHERE type='table' LIMIT 3`).all();
    console.log('Basic query successful:', tables);
    
    // Test if vec extension is available (EXPECTED TO FAIL - see comments at top)
    console.log('Testing vec extension...');
    try {
        const version = db.prepare('SELECT vec_version() as version').get();
        console.log('Vec extension loaded:', version);
    } catch (err) {
        console.log('Vec extension not loaded:', err.message);
        console.log('(This is EXPECTED - sqlite-vec is not loaded in this basic test)');
    }
    
    console.log('All tests passed');
    db.close();
    
} catch (error) {
    console.error('Error:', error.message);
    console.error('Stack:', error.stack);
    process.exit(1);
}