#!/usr/bin/env node
'use strict';

const Database = require('better-sqlite3');
const path = require('path');

// Database path
const dbPath = '/Users/tqwhite/Documents/webdev/A4L/unityObjectGenerator/system/datastore/cedsIds.sqlite3';
const db = new Database(dbPath);

console.log('\n========== INTELLIGENT FUNCTIONAL AREA ANALYSIS ==========\n');

// Get all domains
const domains = db.prepare(`
    SELECT DISTINCT refId as domainRefId, label 
    FROM CEDS_RDF_UI_SUPPORT_INDEX 
    WHERE entityType = 'domain' 
    ORDER BY displayOrder
`).all();

// For each domain, analyze the class name patterns
domains.forEach(domain => {
    console.log(`\n=== Domain: ${domain.label} ===`);
    
    // Get all classes in this domain
    const classes = db.prepare(`
        SELECT label 
        FROM CEDS_RDF_UI_SUPPORT_INDEX 
        WHERE entityType = 'class' 
        AND domainRefId = ?
    `).all(domain.domainRefId);
    
    if (classes.length === 0) {
        console.log('No classes in this domain');
        return;
    }
    
    // Extract first 1, 2, and 3 word combinations
    const oneWordFreq = new Map();
    const twoWordFreq = new Map();
    const threeWordFreq = new Map();
    
    classes.forEach(cls => {
        const words = cls.label.split(/\s+/);
        
        // One word
        if (words[0]) {
            const key = words[0];
            oneWordFreq.set(key, (oneWordFreq.get(key) || 0) + 1);
        }
        
        // Two words
        if (words[0] && words[1]) {
            const key = `${words[0]} ${words[1]}`;
            twoWordFreq.set(key, (twoWordFreq.get(key) || 0) + 1);
        }
        
        // Three words
        if (words[0] && words[1] && words[2]) {
            const key = `${words[0]} ${words[1]} ${words[2]}`;
            threeWordFreq.set(key, (threeWordFreq.get(key) || 0) + 1);
        }
    });
    
    // Analyze patterns to determine optimal grouping
    const functionalAreaSuggestions = new Map();
    
    // Process each unique first word
    oneWordFreq.forEach((count, oneWord) => {
        // Check if this one-word appears with consistent two-word patterns
        const relatedTwoWords = Array.from(twoWordFreq.entries())
            .filter(([twoWord, count]) => twoWord.startsWith(oneWord + ' '))
            .sort((a, b) => b[1] - a[1]);
        
        const relatedThreeWords = Array.from(threeWordFreq.entries())
            .filter(([threeWord, count]) => threeWord.startsWith(oneWord + ' '))
            .sort((a, b) => b[1] - a[1]);
        
        // Decision logic:
        // 1. If a two-word combo appears 5+ times AND represents 50%+ of the one-word occurrences, use two words
        // 2. If a three-word combo appears 5+ times AND represents 50%+ of the two-word occurrences, use three words
        // 3. Otherwise use one word
        
        let suggestion = oneWord;
        let reason = `appears ${count} times`;
        
        if (relatedTwoWords.length > 0) {
            const [topTwoWord, twoWordCount] = relatedTwoWords[0];
            if (twoWordCount >= 5 && twoWordCount >= count * 0.5) {
                suggestion = topTwoWord;
                reason = `"${topTwoWord}" appears ${twoWordCount}/${count} times (${Math.round(twoWordCount/count*100)}%)`;
                
                // Check for three-word pattern
                if (relatedThreeWords.length > 0) {
                    const [topThreeWord, threeWordCount] = relatedThreeWords[0];
                    if (threeWordCount >= 5 && threeWordCount >= twoWordCount * 0.5) {
                        suggestion = topThreeWord;
                        reason = `"${topThreeWord}" appears ${threeWordCount}/${twoWordCount} times (${Math.round(threeWordCount/twoWordCount*100)}% of "${topTwoWord}")`;
                    }
                }
            }
        }
        
        if (!functionalAreaSuggestions.has(suggestion)) {
            functionalAreaSuggestions.set(suggestion, {
                count: 0,
                reason: reason,
                examples: []
            });
        }
        
        // Count how many classes would fall under this functional area
        classes.forEach(cls => {
            if (cls.label.startsWith(suggestion)) {
                functionalAreaSuggestions.get(suggestion).count++;
                if (functionalAreaSuggestions.get(suggestion).examples.length < 3) {
                    functionalAreaSuggestions.get(suggestion).examples.push(cls.label);
                }
            }
        });
    });
    
    // Display smart suggestions
    console.log(`\nTotal classes: ${classes.length}`);
    console.log('\nSuggested Functional Areas:');
    
    const sortedSuggestions = Array.from(functionalAreaSuggestions.entries())
        .filter(([key, data]) => data.count > 0)
        .sort((a, b) => b[1].count - a[1].count)
        .slice(0, 20); // Top 20
    
    sortedSuggestions.forEach(([functionalArea, data]) => {
        console.log(`\n  "${functionalArea}" (${data.count} classes) - ${data.reason}`);
        data.examples.forEach(ex => console.log(`    - ${ex}`));
    });
    
    // Show statistics
    const totalCovered = sortedSuggestions.reduce((sum, [key, data]) => sum + data.count, 0);
    console.log(`\nCoverage: ${totalCovered}/${classes.length} classes (${Math.round(totalCovered/classes.length*100)}%)`);
});

db.close();
console.log('\n========== ANALYSIS COMPLETE ==========\n');