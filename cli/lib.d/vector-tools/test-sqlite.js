#!/usr/bin/env node
'use strict';

// Simple SQLite test to diagnose crashes
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
    
    // Test if vec extension is available
    console.log('Testing vec extension...');
    try {
        const version = db.prepare('SELECT vec_version() as version').get();
        console.log('Vec extension loaded:', version);
    } catch (err) {
        console.log('Vec extension not loaded:', err.message);
    }
    
    console.log('All tests passed');
    db.close();
    
} catch (error) {
    console.error('Error:', error.message);
    console.error('Stack:', error.stack);
    process.exit(1);
}