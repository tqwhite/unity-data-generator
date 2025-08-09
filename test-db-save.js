#!/usr/bin/env node
'use strict';

// Test database save functionality directly
const dbSaver = require('./cli/lib.d/unity-ceds-match/lib/database/dbSaver');

// Mock global
process.global = {
  xLog: {
    status: console.log,
    error: console.error,
    verbose: console.log
  }
};

// Sample data structure that matches what AI returns
const testData = [
  {
    "CEDS_RECOMMENDATION": {
      "id": "000212",
      "type": "normalizedString", 
      "definition": "An appellation, if any, used to denote rank, placement, or status (e.g., Mr., Ms., Reverend, Sister, Dr., Colonel).",
      "url": "https://ceds.ed.gov/element/000212"
    },
    "SIF_ELEMENT": {
      "name": "Prefix",
      "definition": "A prefix associated with the name like Mr., Ms., etc.",
      "xpath": "/StudentPersonals/StudentPersonal/Name/Prefix",
      "origCeds": "000212"
    },
    "CONFIDENCE": "High",
    "CANDIDATES": [
      "A first name given to a person. (CEDS ID: 001514)",
      "An appellation, if any, used to denote rank, placement, or status (e.g., Mr., Ms., Reverend, Sister, Dr., Colonel). (CEDS ID: 000212)"
    ]
  }
];

async function testDbSave() {
  try {
    console.log('Testing database save with sample data...');
    
    const databaseFilePath = '/Users/tqwhite/Documents/webdev/A4L/unityObjectGenerator/system/datastore/cedsIds.sqlite3';
    
    const stats = await dbSaver.saveCedsMatches(databaseFilePath, testData, {
      semanticAnalysisMode: 'atomicVector',
      vectorModeVersion: 'v1.0'
    });
    
    console.log('Database save result:', stats);
    
  } catch (err) {
    console.error('Database save failed:', err.message);
  }
}

testDbSave();