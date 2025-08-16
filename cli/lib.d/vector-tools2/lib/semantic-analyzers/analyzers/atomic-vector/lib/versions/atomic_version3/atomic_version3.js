'use strict';

const moduleName = __filename.replace(__dirname + '/', '').replace(/.js$/, '');

const moduleFunction = function (args = {}) {
	const { xLog, getConfig } = process.global;
	const { prettyPrintAtomicExpansion } = require('./lib/pretty-print')();

	// ===================================================================================

	const getTemplateString = (persona) => `

SYSTEM ROLE: You are a computational linguist with knowledge graph/ontology experience, working in semantic parsing and knowledge representation. You must only use evidence found in the provided field name, path, and definition text.

TASK:
Given a data element (field name, path, optional definition), break it into smallest self-contained semantic statements and identify underlying conceptual dimensions. Then map it to a small canonical representation usable for cross-system equivalence.

CONSTRAINTS:
- Evidence-first: For every tag you assign, include the exact substring(s) you used. If no clear evidence exists, output "unknown" and reduce confidence.
- No invention: Do not infer semantics beyond the text. Do not use external knowledge unless it is explicitly stated in the input.
- Prefer head nouns from the definition/path for anchors.
- All canonical.* values must be lowercase from the tag sets.
- evidence.* must be exact substrings (verbatim) from the name, path, or definition.
- If any evidence.* is empty, set the corresponding canonical.* to "unknown" and cap confidence ≤ 0.4.
- element_id must be URI-safe: lowercase, [a-z0-9_]+, derived from name/path.
- Include evidence.sources: ["name"|"path"|"definition"] listing which sources supported each tag.
- Emit one element unless the text clearly encodes multiple senses; if multiple, each must have distinct evidence.
- Do not paraphrase in facts[].text; use minimally edited phrases grounded by the text.

CANONICAL TAG SETS (EXAMPLE—EXTEND ONLY IF YOU EXPLICITLY ADD TERMS AND DOCUMENT THEM):
- entity: person | assessment | assessment_item | response | score | diagnostic_statement | organization | unknown
- attribute: name_last | name_first | name_middle | id | score_value | score_scale | comment | date | status | classification | unknown
- role: of_person | of_response | of_item | about_score | classification | unknown
- value_type: string | number | date | text | boolean | unknown

OUTPUT JSON SHAPE:
{
  "elements": [
    {
      "element_id": "<descriptive_identifier>",
      "facts": [
        { "text": "<standalone statement>" }
      ],
      "Subject": ["<subject1>", "..."],
      "Category": ["<category1>", "..."],
      "Data_Meaning": ["<meaning1>", "..."],
      "predicate_nominal": "<core noun phrase>",
      "canonical": {
        "entity": "<from tag set>",
        "attribute": "<from tag set>",
        "role": "<from tag set>",
        "value_type": "<from tag set>"
      },
      "evidence": {
        "entity": "<exact substring or empty>",
        "attribute": "<exact substring or empty>",
        "role": "<exact substring or empty>",
        "value_type": "<exact substring or empty>",
        "path_cues": ["<path tokens used>"],
        "sources": ["<source(s) for each tag>"]
      },
      "confidence": 0.0-1.0,
      "notes": "Only if ambiguity needs explaining."
    }
  ]
}

PROCEDURE:
1) Deconstruct the input into subject, verb, object, contextual elements.
2) Emit minimal standalone sentences (one idea per fact).
3) Map to canonical.entity/attribute/role/value_type using only supported synonyms that are literally present (e.g., surname/family name/last name → name_last; score/mark/points → score_value).
4) Quote evidence for each mapping; otherwise mark the field as unknown and lower confidence.
5) If the path provides cues (e.g., '/student/...', 'Student ->'), include those tokens in evidence.path_cues.
6) If any evidence.* is empty, enforce the unknown/confidence rule.
7) Apply determinism rules to ensure repeatable outputs.

DECISION GUARDRAILS:
- If definition does not justify a canonical tag, use "unknown" and confidence ≤ 0.4.
- Prefer narrower, defensible tags over broad guesses.

`;

	// ===================================================================================

	// --- helpers for path → cues ---
	const splitCamel = (s) => s.replace(/([a-z0-9])([A-Z])/g, '$1 $2');
	const tokenizePath = (p) =>
		splitCamel(String(p || ''))
			.split(/[/>\-_.\s]+/)
			.map((t) => t.toLowerCase().trim())
			.filter(Boolean);

	const makeNgrams = (tokens, nMin = 1, nMax = 3) => {
		const out = [];
		for (let n = nMin; n <= nMax; n++) {
			for (let i = 0; i + n <= tokens.length; i++) {
				out.push(tokens.slice(i, i + n).join(' '));
			}
		}
		return out;
	};

	const derivePathCues = (path) => {
		if (!path) return [];
		const toks = tokenizePath(path);
		if (!toks.length) return [];
		const ngrams = makeNgrams(toks, 1, 3);
		const dotJoined = toks.join('.');
		return Array.from(new Set([...toks, ...ngrams, dotJoined]));
	};

	const convertAtomicFactsToEmbeddingStrings = (
		extractedData,
		originalDefinition,
		originalPath, // optional raw path string
	) => {
		const embeddingStrings = [];

		// 1) Add the original definition if provided
		if (originalDefinition && originalDefinition.trim()) {
			embeddingStrings.push({
				type: 'original_definition',
				text: originalDefinition.trim()
			});
		}

		// 2) Loop through elements in extractedData
		if (extractedData?.elements && Array.isArray(extractedData.elements)) {
			extractedData.elements.forEach((el, elementIndex) => {
				// Facts text
				if (Array.isArray(el.facts)) {
					el.facts.forEach((factObj, factIndex) => {
						if (factObj?.text && factObj.text.trim()) {
							embeddingStrings.push({
								type: 'individual_fact',
								text: factObj.text.trim(),
								factIndex,
								elementIndex
							});
						}
					});
				}

				// Subject / Category / Data_Meaning / predicate_nominal
				['Subject', 'Category', 'Data_Meaning'].forEach((key) => {
					if (Array.isArray(el[key])) {
						el[key].forEach((val) => {
							if (val && val.trim()) {
								embeddingStrings.push({
									type: `${key.toLowerCase()}_focus`,
									text: `${key}: ${val.trim()}`,
									[key.toLowerCase()]: val.trim()
								});
							}
						});
					}
				});
				
				if (el.predicate_nominal && el.predicate_nominal.trim()) {
					embeddingStrings.push({
						type: 'predicate_nominal_focus',
						text: `predicate_nominal: ${el.predicate_nominal.trim()}`,
						predicate_nominal: el.predicate_nominal.trim()
					});
				}

				// Canonical tags
				if (el.canonical) {
					const parts = [];
					Object.entries(el.canonical).forEach(([k, v]) => {
						if (v && v !== 'unknown') {
							embeddingStrings.push({
								type: 'canonical_tag',
								text: `${k}: ${v}`,
								canonical_key: k,
								canonical_value: v
							});
							parts.push(`${k}=${v}`);
						}
					});
					if (parts.length) {
						embeddingStrings.push({
							type: 'canonical_combined',
							text: `canonical: ${parts.join('; ')}`,
							canonical: el.canonical
						});
					}
				}

				// Path cues from JSON evidence (if present)
				if (el.evidence?.path_cues && Array.isArray(el.evidence.path_cues)) {
					el.evidence.path_cues.forEach((cue) => {
						if (cue && cue.trim()) {
							embeddingStrings.push({
								type: 'path_cue_evidence',
								text: `path_cue: ${cue.trim()}`,
								path_cue: cue.trim()
							});
						}
					});
				}

				// Store element for later use in scoring
				if (el && embeddingStrings.length > 0) {
					embeddingStrings[embeddingStrings.length - 1].element = el;
				}
			});
		}

		// 3) Derive extra cues from the raw path (if provided)
		if (originalPath) {
			derivePathCues(originalPath).forEach((c) =>
				embeddingStrings.push({
					type: 'path_cue_derived',
					text: `path_cue: ${c}`,
					path_cue: c
				})
			);
		}

		// 4) Deduplicate & clean while preserving object structure
		const seen = new Set();
		const uniqueEmbeddings = embeddingStrings.filter(item => {
			if (!item.text || !item.text.trim()) return false;
			
			const cleanText = item.text.trim();
			const truncatedText = cleanText.length > 300 ? cleanText.slice(0, 300) : cleanText;
			
			if (seen.has(truncatedText)) return false;
			
			seen.add(truncatedText);
			item.text = truncatedText; // Update with truncated version
			return true;
		});

		return uniqueEmbeddings;
	};

	// ===================================================================================
	
	/**
	 * Score and rank aggregated results using semantic decision + distance blending.
	 * Advanced scoring method that uses canonical tag analysis and evidence-based matching.
	 * Falls back to simple composite scoring when no queryElement is provided for backward compatibility.
	 * @param {Map|Iterable|Array} allMatches - Match data with candidateElement, distances, etc.
	 * @param {Object} options - Scoring options, queryElement optional for backward compatibility
	 * @returns {Array} Array of scored and sorted results with semantic verdicts or composite scores
	 */
	const scoringMethod = (allMatches, options = {}) => {
		// Version3 REQUIRES queryElement - no fallbacks, no graceful degradation
		if (!options.queryElement) {
			throw new Error('atomic_version3 scoringMethod requires options.queryElement - missing required data indicates a bug that must be fixed');
		}
		
		const { scoreMatches } = require('../../scoringUtilityLib/v3-canonical-semantic-analysis')();
		xLog.verbose(`Using version3 semantic scoring with canonical tag analysis`);
		return scoreMatches(allMatches, options);
	};
	
	// ===================================================================================

	return {
		getTemplateString,
		convertAtomicFactsToEmbeddingStrings,
		prettyPrintAtomicExpansion,
		scoringMethod,
	};
};

module.exports = moduleFunction;