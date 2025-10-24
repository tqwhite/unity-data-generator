#!/usr/bin/env node

/**
 * test-llm-real.js
 * Test LLM-based matching with actual API calls
 *
 * Usage:
 * OPENAI_API_KEY=your-key-here node test-llm-real.js
 * or
 * node test-llm-real.js --apikey=your-key-here
 */

const Database = require('better-sqlite3');
const fs = require('fs');
const path = require('path');
const OpenAI = require('openai');

const dbPath = '/Users/tqwhite/Documents/webdev/A4L/unityObjectGenerator/system/datastore/cedsIds.sqlite3';

class RealLLMTester {
    constructor(apiKey) {
        if (!apiKey) {
            console.error('❌ No API key provided!');
            console.log('Usage: OPENAI_API_KEY=your-key node test-llm-real.js');
            console.log('   or: node test-llm-real.js --apikey=your-key');
            process.exit(1);
        }

        this.openai = new OpenAI({ apiKey });
        this.db = new Database(dbPath);
        this.results = [];
    }

    /**
     * Extract test cases
     */
    extractTestCases(limit = 20) {
        const query = `
            SELECT
                n.refId as sif_id,
                n.xpath as sif_path,
                n.Name as sif_name,
                n.description as sif_description,
                n.Type as sif_datatype,
                c.GlobalID as ceds_id,
                c.Domain || '/' || c.Entity || '/' || c.ElementName as ceds_path,
                c.ElementName as ceds_name,
                c.Definition as ceds_definition,
                c.Format as ceds_format,
                m.confidence as match_confidence
            FROM unityCedsMatches m
            JOIN naDataModel n ON m.naDataModelRefId = n.refId
            JOIN _CEDSElements c ON m._CEDSElementsRefId = c.GlobalID
            WHERE m.confidence > 0.85
                AND n.description IS NOT NULL
                AND LENGTH(n.description) > 15
            ORDER BY RANDOM()
            LIMIT ?
        `;

        return this.db.prepare(query).all(limit);
    }

    /**
     * Get CEDS candidates - mix of likely matches and distractors
     */
    getCEDSCandidates(testCase) {
        // Strategy: Get semantically similar candidates plus random distractors

        // 1. Get candidates with keyword overlap
        const keywords = this.extractKeywords(testCase.sif_name + ' ' + testCase.sif_description);
        const keywordQuery = `
            SELECT DISTINCT
                GlobalID as id,
                Domain || '/' || Entity || '/' || ElementName as path,
                ElementName as name,
                Definition as definition,
                Format as format
            FROM _CEDSElements
            WHERE (${keywords.map(k => `(ElementName LIKE '%${k}%' OR Definition LIKE '%${k}%')`).join(' OR ')})
            AND GlobalID != ?
            LIMIT 10
        `;

        const similar = this.db.prepare(keywordQuery).all(testCase.ceds_id);

        // 2. Add some random distractors
        const randomQuery = `
            SELECT
                GlobalID as id,
                Domain || '/' || Entity || '/' || ElementName as path,
                ElementName as name,
                Definition as definition,
                Format as format
            FROM _CEDSElements
            WHERE GlobalID != ?
                AND GlobalID NOT IN (${similar.map(() => '?').join(',')})
            ORDER BY RANDOM()
            LIMIT 5
        `;

        const randoms = this.db.prepare(randomQuery).all(
            testCase.ceds_id,
            ...similar.map(s => s.id)
        );

        // 3. Always include the correct answer
        const correct = {
            id: testCase.ceds_id,
            path: testCase.ceds_path,
            name: testCase.ceds_name,
            definition: testCase.ceds_definition,
            format: testCase.ceds_format
        };

        // Combine and shuffle
        const candidates = [...similar, ...randoms, correct];
        return candidates.sort(() => Math.random() - 0.5);
    }

    /**
     * Extract meaningful keywords
     */
    extractKeywords(text) {
        const stopWords = new Set(['the', 'a', 'an', 'of', 'to', 'in', 'for', 'and', 'or', 'is', 'that', 'this']);
        const words = text.toLowerCase()
            .replace(/[^a-z0-9\s]/g, ' ')
            .split(/\s+/)
            .filter(word => word.length > 2 && !stopWords.has(word));

        // Return unique keywords
        return [...new Set(words)];
    }

    /**
     * Create optimized prompt for GPT-4o-mini
     */
    createPrompt(sifElement, cedsCandidates) {
        return `Match this SIF element to the BEST CEDS definition.

SIF ELEMENT:
Path: ${sifElement.sif_path}
Name: ${sifElement.sif_name}
Description: ${sifElement.sif_description || 'None'}
Type: ${sifElement.sif_datatype || 'Unknown'}

CEDS OPTIONS:
${cedsCandidates.map((c, i) =>
`${i + 1}. [${c.id}] ${c.name}
   ${c.definition.substring(0, 150)}${c.definition.length > 150 ? '...' : ''}`
).join('\n')}

Return ONLY the ID (e.g., "001234") of the best match, or "NONE" if no good match.

ID:`;
    }

    /**
     * Call OpenAI API
     */
    async callLLM(prompt, model = 'gpt-4o-mini') {
        try {
            const response = await this.openai.chat.completions.create({
                model: model,
                messages: [
                    {
                        role: 'system',
                        content: 'You are an expert in educational data standards, specifically SIF and CEDS. Match elements based on semantic meaning, not just word similarity.'
                    },
                    {
                        role: 'user',
                        content: prompt
                    }
                ],
                temperature: 0,
                max_tokens: 20
            });

            const answer = response.choices[0].message.content.trim();

            // Extract just the ID if the model added extra text
            const idMatch = answer.match(/\b(\d{6})\b/);
            return idMatch ? idMatch[1] : answer;

        } catch (error) {
            console.error('API Error:', error.message);
            return 'ERROR';
        }
    }

    /**
     * Run the test
     */
    async runTest() {
        console.log('🚀 Starting Real LLM Matching Test\n');
        console.log('=' .repeat(60));

        const testCases = this.extractTestCases(20);
        console.log(`\n✅ Extracted ${testCases.length} test cases\n`);

        let correct = 0;
        let apiCosts = {
            inputTokens: 0,
            outputTokens: 0,
            calls: 0
        };

        for (let i = 0; i < testCases.length; i++) {
            const testCase = testCases[i];
            console.log(`\n[Test ${i + 1}/${testCases.length}]`);
            console.log(`SIF: ${testCase.sif_name}`);
            console.log(`Description: ${(testCase.sif_description || '').substring(0, 60)}...`);

            // Get candidates
            const candidates = this.getCEDSCandidates(testCase);
            console.log(`Candidates: ${candidates.length} (including correct answer)`);

            // Create prompt
            const prompt = this.createPrompt(testCase, candidates);

            // Estimate tokens (rough)
            const promptTokens = Math.ceil(prompt.length / 4);
            apiCosts.inputTokens += promptTokens;
            apiCosts.outputTokens += 10;
            apiCosts.calls++;

            // Call LLM
            process.stdout.write('Calling GPT-4o-mini... ');
            const llmResponse = await this.callLLM(prompt);

            // Check result
            const isCorrect = llmResponse === testCase.ceds_id;
            if (isCorrect) {
                correct++;
                console.log(`✅ CORRECT! (${llmResponse})`);
            } else {
                console.log(`❌ WRONG. Got: ${llmResponse}, Expected: ${testCase.ceds_id}`);
                console.log(`   Correct was: ${testCase.ceds_name}`);
            }

            // Store result
            this.results.push({
                test_number: i + 1,
                sif_id: testCase.sif_id,
                sif_name: testCase.sif_name,
                sif_description: testCase.sif_description,
                correct_ceds_id: testCase.ceds_id,
                correct_ceds_name: testCase.ceds_name,
                llm_prediction: llmResponse,
                is_correct: isCorrect,
                num_candidates: candidates.length
            });

            // Rate limiting
            await new Promise(resolve => setTimeout(resolve, 100));
        }

        // Summary
        console.log('\n' + '=' .repeat(60));
        console.log('📊 RESULTS SUMMARY\n');
        console.log(`Total Tests: ${testCases.length}`);
        console.log(`Correct: ${correct}`);
        console.log(`Accuracy: ${((correct / testCases.length) * 100).toFixed(1)}%`);

        // Cost calculation
        const costPerMillion = { input: 0.15, output: 0.60 }; // GPT-4o-mini pricing
        const totalCost = (apiCosts.inputTokens * costPerMillion.input / 1000000) +
                         (apiCosts.outputTokens * costPerMillion.output / 1000000);

        console.log('\n💰 API USAGE:');
        console.log(`Calls: ${apiCosts.calls}`);
        console.log(`Input tokens: ~${apiCosts.inputTokens.toLocaleString()}`);
        console.log(`Output tokens: ~${apiCosts.outputTokens.toLocaleString()}`);
        console.log(`Estimated cost: $${totalCost.toFixed(4)}`);

        // Extrapolate to full dataset
        const fullDatasetCost = totalCost * (15620 / testCases.length);
        console.log(`\nExtrapolated to 15,620 elements: $${fullDatasetCost.toFixed(2)}`);

        // Save results
        const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
        const resultsFile = `./real_llm_results_${timestamp}.json`;
        fs.writeFileSync(resultsFile, JSON.stringify({
            summary: {
                total: testCases.length,
                correct,
                accuracy: (correct / testCases.length),
                api_costs: apiCosts,
                estimated_cost: totalCost
            },
            results: this.results
        }, null, 2));

        console.log(`\n💾 Results saved to: ${resultsFile}`);

        // Analyze errors
        const errors = this.results.filter(r => !r.is_correct);
        if (errors.length > 0) {
            console.log('\n❌ ERROR ANALYSIS:');
            errors.slice(0, 3).forEach(err => {
                console.log(`\n- SIF: ${err.sif_name}`);
                console.log(`  Expected: ${err.correct_ceds_name} (${err.correct_ceds_id})`);
                console.log(`  Got: ${err.llm_prediction}`);
            });
        }
    }

    close() {
        this.db.close();
    }
}

// Main
async function main() {
    // Get API key from env or command line
    const apiKey = process.env.OPENAI_API_KEY ||
                   process.argv.find(arg => arg.startsWith('--apikey='))?.split('=')[1];

    const tester = new RealLLMTester(apiKey);

    try {
        await tester.runTest();
    } catch (error) {
        console.error('Fatal error:', error);
    } finally {
        tester.close();
    }
}

if (require.main === module) {
    main().catch(console.error);
}

module.exports = RealLLMTester;