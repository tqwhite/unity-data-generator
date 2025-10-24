#!/usr/bin/env node

const Database = require('better-sqlite3');
const db = new Database('/Users/tqwhite/Documents/webdev/A4L/unityObjectGenerator/system/datastore/cedsIds.sqlite3');

// Get all high-confidence matches to learn from
const matches = db.prepare(`
    SELECT 
        n.xpath as sif_path,
        c.Domain as ceds_domain,
        c.Entity as ceds_entity,
        m.confidence
    FROM unityCedsMatches m
    JOIN naDataModel n ON m.naDataModelRefId = n.refId
    JOIN _CEDSElements c ON m._CEDSElementsRefId = c.GlobalID
    WHERE m.confidence > 0.85
        AND n.xpath IS NOT NULL
        AND c.Domain IS NOT NULL
`).all();

console.log(`Found ${matches.length} high-confidence matches to learn from\n`);

// Extract path components and their mappings
const mappings = {};

matches.forEach(match => {
    // Extract SIF path components
    const sifParts = match.sif_path.split('/').filter(p => p);
    
    // For each significant SIF component
    sifParts.forEach(part => {
        // Skip generic parts
        if (part.match(/^\d+$/) || part.length < 3) return;
        
        // Normalize the part
        const normalized = part.toLowerCase().replace(/^x/, '');
        
        // Track what CEDS domains/entities it maps to
        if (!mappings[normalized]) {
            mappings[normalized] = {
                domains: {},
                entities: {},
                count: 0
            };
        }
        
        // Count domain mapping
        if (match.ceds_domain) {
            mappings[normalized].domains[match.ceds_domain] = 
                (mappings[normalized].domains[match.ceds_domain] || 0) + 1;
        }
        
        // Count entity mapping
        if (match.ceds_entity) {
            mappings[normalized].entities[match.ceds_entity] = 
                (mappings[normalized].entities[match.ceds_entity] || 0) + 1;
        }
        
        mappings[normalized].count++;
    });
});

// Show the learned mappings
console.log('LEARNED PATH COMPONENT MAPPINGS:\n');
console.log('='.repeat(60));

// Sort by frequency
const sortedMappings = Object.entries(mappings)
    .sort((a, b) => b[1].count - a[1].count)
    .slice(0, 20);

sortedMappings.forEach(([sifComponent, data]) => {
    console.log(`\nSIF Component: "${sifComponent}" (seen ${data.count} times)`);
    
    // Top domains
    const topDomains = Object.entries(data.domains)
        .sort((a, b) => b[1] - a[1])
        .slice(0, 3);
    
    console.log('  Maps to domains:');
    topDomains.forEach(([domain, count]) => {
        const percent = ((count / data.count) * 100).toFixed(1);
        console.log(`    - ${domain}: ${count} times (${percent}%)`);
    });
    
    // Top entities
    const topEntities = Object.entries(data.entities)
        .sort((a, b) => b[1] - a[1])
        .slice(0, 3);
    
    if (topEntities.length > 0 && topEntities[0][0] !== 'null') {
        console.log('  Maps to entities:');
        topEntities.forEach(([entity, count]) => {
            const percent = ((count / data.count) * 100).toFixed(1);
            console.log(`    - ${entity}: ${count} times (${percent}%)`);
        });
    }
});

db.close();
