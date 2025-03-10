#!/usr/bin/env node
'use strict';

const process = require('process');

// Mock process.global for testing
process.global = {
  xLog: {
    status: console.log,
    error: console.error
  }
};

const parseSqlString = require('./parse-sql-string');

// Test SQL with various edge cases
const testSQL = `
-- This is a comment
CREATE TABLE users (id INTEGER PRIMARY KEY, name TEXT);

/* Multi-line comment
   spanning multiple lines
*/

-- Insert with semicolons in the data values
INSERT INTO users VALUES (1, 'John; Doe');

-- Insert with quotes in the data values
INSERT INTO users VALUES (2, 'O''Reilly''s Books');

-- Insert with both quotes and semicolons
INSERT INTO users VALUES (3, 'Company; Name "ABC''s"');

-- Normal select statement
SELECT * FROM users WHERE name LIKE '%Doe%';
`;

// Parse the SQL
const statements = parseSqlString(testSQL);

// Display the parsed statements
console.log("\n===== Parsed Statements =====");
statements.forEach((stmt, i) => {
  console.log(`\n----- Statement ${i + 1} -----`);
  console.log(stmt);
});
console.log("\n===== Total Statements:", statements.length, "=====");