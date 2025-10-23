#!/usr/bin/env node
'use strict';

/**
 * Script to update _CEDSElements table with Domain and Entity information
 * from CEDS-V13.0.0.0.xlsx spreadsheet
 *
 * This adds domain/entity columns for atomic_version3 implementation
 */

const Database = require('better-sqlite3');
const xlsx = require('xlsx');
const path = require('path');

// Configuration
const SPREADSHEET_PATH = '/Users/tqwhite/Documents/webdev/A4L/unityObjectGenerator/system/code/assets/databaseDefinitionss/CEDS/CEDS-Elements_v13_hasSpreadsheet/CEDS-V13.0.0.0.xlsx';
const DATABASE_PATH = '/Users/tqwhite/Documents/webdev/A4L/unityObjectGenerator/system/datastore/cedsIds.sqlite3';

// Initialize database connection
const db = new Database(DATABASE_PATH);

try {
    console.log('Starting CEDS Elements domain/entity update...\n');

    // Step 1: Add Domain and Entity columns if they don't exist
    console.log('Step 1: Adding Domain and Entity columns...');

    // Check if columns exist
    const tableInfo = db.prepare("PRAGMA table_info(_CEDSElements)").all();
    const hasDomainsColumn = tableInfo.some(col => col.name === 'Domain');
    const hasEntityColumn = tableInfo.some(col => col.name === 'Entity');

    if (!hasDomainsColumn) {
        db.prepare("ALTER TABLE _CEDSElements ADD COLUMN Domain TEXT").run();
        console.log('  ✓ Added Domain column');
    } else {
        console.log('  - Domain column already exists');
    }

    if (!hasEntityColumn) {
        db.prepare("ALTER TABLE _CEDSElements ADD COLUMN Entity TEXT").run();
        console.log('  ✓ Added Entity column');
    } else {
        console.log('  - Entity column already exists');
    }

    // Step 2: Read the spreadsheet
    console.log('\nStep 2: Reading CEDS spreadsheet...');
    const workbook = xlsx.readFile(SPREADSHEET_PATH);
    const sheet = workbook.Sheets['All - By Domain'];
    const data = xlsx.utils.sheet_to_json(sheet);
    console.log(`  ✓ Found ${data.length} elements in spreadsheet`);

    // Step 3: Prepare update statement
    console.log('\nStep 3: Updating database records...');
    const updateStmt = db.prepare(`
        UPDATE _CEDSElements
        SET Domain = @domain, Entity = @entity
        WHERE GlobalID = @globalId
    `);

    // Step 4: Process updates in a transaction for performance
    let updateCount = 0;
    let skipCount = 0;
    let noMatchCount = 0;

    const updates = db.transaction(() => {
        data.forEach(row => {
            const globalId = row['Global ID'];
            const domain = row['Domain'];
            const entity = row['Entity'];

            // Skip if no GlobalID
            if (!globalId) {
                skipCount++;
                return;
            }

            // Clean domain value (skip obvious bad data)
            if (domain && domain.length > 50) {
                skipCount++;
                return;
            }

            // Update the record
            const result = updateStmt.run({
                globalId: globalId,
                domain: domain || null,
                entity: entity || null
            });

            if (result.changes > 0) {
                updateCount++;
            } else {
                noMatchCount++;
            }
        });
    });

    updates();

    console.log(`  ✓ Updated ${updateCount} records`);
    console.log(`  - Skipped ${skipCount} invalid rows`);
    console.log(`  - No match found for ${noMatchCount} GlobalIDs`);

    // Step 5: Verify the update
    console.log('\nStep 4: Verifying updates...');
    const verifyQuery = db.prepare(`
        SELECT
            Domain,
            COUNT(*) as count
        FROM _CEDSElements
        WHERE Domain IS NOT NULL
        GROUP BY Domain
        ORDER BY count DESC
    `).all();

    console.log('  Domain distribution:');
    verifyQuery.forEach(row => {
        console.log(`    - ${row.Domain}: ${row.count} elements`);
    });

    const totalWithDomain = db.prepare(
        "SELECT COUNT(*) as count FROM _CEDSElements WHERE Domain IS NOT NULL"
    ).get();
    const totalElements = db.prepare(
        "SELECT COUNT(*) as count FROM _CEDSElements"
    ).get();

    console.log(`\n✓ Success! Updated ${totalWithDomain.count} of ${totalElements.count} total elements with domain/entity information`);

    // Sample the updated data
    console.log('\nSample of updated records:');
    const samples = db.prepare(`
        SELECT GlobalID, ElementName, Domain, Entity
        FROM _CEDSElements
        WHERE Domain IS NOT NULL
        LIMIT 5
    `).all();

    samples.forEach(row => {
        console.log(`  ${row.GlobalID}: ${row.ElementName}`);
        console.log(`    Domain: ${row.Domain}, Entity: ${row.Entity}`);
    });

} catch (error) {
    console.error('Error:', error.message);
    process.exit(1);
} finally {
    db.close();
}