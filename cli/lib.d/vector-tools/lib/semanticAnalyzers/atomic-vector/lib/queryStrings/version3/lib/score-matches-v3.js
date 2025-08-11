'use strict';

/*
SCORING SUMMARY (plain English):

Goal:
Given a shortlist of candidates (already retrieved via embeddings), decide
SAME / RELATED / DIFFERENT / INSUFFICIENT_EVIDENCE using ONLY each pair's
definition/path JSON deconstruction ("atomicVector JSON"). Blend that semantic
signal with the embedding distance to rank results.

Sequence:
1) Normalize inputs: use the JSON deconstruction for both query and candidate.
2) Hard gates:
   - If either has low confidence or missing evidence → INSUFFICIENT_EVIDENCE.
   - If value types are incompatible (e.g., number vs date) → DIFFERENT.
3) Anchor match:
   - If canonical.entity, canonical.attribute, and canonical.role all match → SAME.
4) Relation typing:
   - If one is attribute=comment and the other is attribute=score_value and role includes about_score → RELATED ('about_score').
5) Role & entity alignment:
   - If same entity+attribute but roles differ → RELATED ('same_field_different_role').
6) Context overlap:
   - Small boost when path_cues overlap (e.g., both mention "student").
7) Composite score:
   - Build a semantic score from anchors + entity/attribute/role + context overlap.
8) Blend with distance:
   - finalScore = semanticScore + verdictBoost − (avgDistance * distanceWeight).
   - Prefer highest finalScore; SAME > RELATED > DIFFERENT where scores tie.

Assumptions (explicit):
- canonical values are lowercase from fixed tag sets.
- confidence ∈ [0,1]; default threshold for sufficient evidence is ≥ 0.6 (tunable).
- value_type compatibility: number↔number; date↔date; boolean↔boolean; string↔string or text.
- No external lexicon beyond canonical tags and provided path_cues.
*/

const moduleName = __filename.replace(__dirname + '/', '').replace(/.js$/, '');

const moduleFunction = function(args = {}) {
    const { xLog, getConfig } = process.global;

    // ---------- Tunables & helpers ----------

    const DEFAULTS = {
        minConfidence: 0.6,
        distanceWeight: 0.1,
        sameBoost: 0.15,
        relatedBoost: 0.05
    };

    const hasSufficientEvidence = (r, minConfidence) => {
        if (!r) return false;
        const c = r.confidence ?? 0;
        const ev = r.evidence || {};
        const anyEvidence =
            (ev.entity && ev.entity.length) ||
            (ev.attribute && ev.attribute.length) ||
            (ev.role && ev.role.length) ||
            (ev.value_type && ev.value_type.length) ||
            (Array.isArray(ev.path_cues) && ev.path_cues.length > 0);
        return c >= minConfidence && !!anyEvidence;
    };

    const sameCanon = (a, b, key) =>
        a?.canonical?.[key] && b?.canonical?.[key] &&
        a.canonical[key] === b.canonical[key];

    const valueTypeCompatible = (a, b) => {
        const av = a?.canonical?.value_type || 'unknown';
        const bv = b?.canonical?.value_type || 'unknown';
        if (av === 'unknown' || bv === 'unknown') return true;
        if (av === bv) return true;
        const s = new Set([av, bv]);
        if (s.has('string') && s.has('text')) return true;
        return false;
    };

    const commentAboutScore = (a, b) => {
        const aAttr = a?.canonical?.attribute, bAttr = b?.canonical?.attribute;
        const aRole = a?.canonical?.role, bRole = b?.canonical?.role;
        const pair =
            (aAttr === 'comment' && bAttr === 'score_value') ||
            (bAttr === 'comment' && aAttr === 'score_value');
        const about = aRole === 'about_score' || bRole === 'about_score';
        return pair && about;
    };

    const setIntersectSize = (arrA = [], arrB = []) => {
        const A = new Set((arrA || []).map(String));
        let hit = 0;
        for (const x of (arrB || [])) if (A.has(String(x))) hit++;
        return hit;
    };

    const baseSemanticScore = (A, B) => {
        const anchor = (sameCanon(A,B,'entity') && sameCanon(A,B,'attribute') && sameCanon(A,B,'role')) ? 1 : 0;
        const ent    = sameCanon(A,B,'entity') ? 1 : 0;
        const attr   = sameCanon(A,B,'attribute') ? 1 : 0;
        const role   = sameCanon(A,B,'role') ? 1 : 0;
        const cuesA  = A?.evidence?.path_cues || [];
        const cuesB  = B?.evidence?.path_cues || [];
        const ctx    = Math.min(1, setIntersectSize(cuesA, cuesB) / 3); // cap after 3 overlaps
        const score  = 0.55*anchor + 0.15*ent + 0.15*attr + 0.10*role + 0.05*ctx;
        return +score.toFixed(3);
    };

    const decidePair = (A, B, minConfidence = DEFAULTS.minConfidence) => {
        if (!hasSufficientEvidence(A, minConfidence) || !hasSufficientEvidence(B, minConfidence)) {
            return { verdict: 'INSUFFICIENT_EVIDENCE', semanticScore: 0.0, reasons: ['low_confidence_or_no_evidence'] };
        }
        if (!valueTypeCompatible(A, B)) {
            return { verdict: 'DIFFERENT', semanticScore: 0.05, reasons: ['value_type_incompatible'] };
        }
        if (commentAboutScore(A, B)) {
            return { verdict: 'RELATED', relation: 'about_score', semanticScore: 0.72, reasons: ['comment_about_score'] };
        }
        if (sameCanon(A,B,'entity') && sameCanon(A,B,'attribute') && sameCanon(A,B,'role')) {
            const s = Math.max(0.86, baseSemanticScore(A,B));
            return { verdict: 'SAME', semanticScore: s, reasons: ['entity_attribute_role_match'] };
        }
        if (sameCanon(A,B,'entity') && sameCanon(A,B,'attribute') && !sameCanon(A,B,'role')) {
            const s = Math.max(0.70, baseSemanticScore(A,B));
            return { verdict: 'RELATED', relation: 'same_field_different_role', semanticScore: s, reasons: ['entity_attribute_match_role_differs'] };
        }
        const s = baseSemanticScore(A, B);
        if (s >= 0.85) return { verdict: 'SAME', semanticScore: s, reasons: ['high_composite_score'] };
        if (s >= 0.65) return { verdict: 'RELATED', semanticScore: s, reasons: ['moderate_composite_score'] };
        return { verdict: 'DIFFERENT', semanticScore: s, reasons: ['low_composite_score'] };
    };

    /**
     * Score and rank aggregated results using semantic decision + distance blending.
     *
     * @param {Map|Iterable|Array} allMatches - values shaped as:
     *   {
     *     refId: string,
     *     candidateElement: object,  // mapped JSON deconstruction (one "element")
     *     distances: number[],       // from embedding retrieval
     *     factTypes?: Set|Array
     *   }
     * @param {Object} options
     *   - queryElement: object (required) mapped JSON deconstruction for the query
     *   - distanceWeight: number (default 0.1)
     *   - sameBoost: number (default 0.15)
     *   - relatedBoost: number (default 0.05)
     *   - minConfidence: number (default 0.6)
     * @returns {Array} sorted results [{ refId, verdict, relation, semanticScore, distance, finalScore, reasons, ... }]
     */
    const scoreMatches = (allMatches, options = {}) => {
        const {
            queryElement,
            distanceWeight = DEFAULTS.distanceWeight,
            sameBoost = DEFAULTS.sameBoost,
            relatedBoost = DEFAULTS.relatedBoost,
            minConfidence = DEFAULTS.minConfidence
        } = options;

        if (!queryElement) {
            throw new Error('scoreMatches requires options.queryElement (mapped JSON deconstruction for the query).');
        }

        const values = typeof allMatches?.values === 'function'
            ? Array.from(allMatches.values())
            : Array.isArray(allMatches) ? allMatches : [];

        const scoredResults = values.map(match => {
            if (!match || !match.candidateElement) {
                return {
                    refId: match?.refId ?? null,
                    verdict: 'INSUFFICIENT_EVIDENCE',
                    relation: null,
                    semanticScore: 0,
                    distance: null,
                    finalScore: -Infinity,
                    reasons: ['missing_candidate_element'],
                    factTypesMatched: 0,
                    totalMatches: Array.isArray(match?.distances) ? match.distances.length : 0
                };
            }

            const avgDistance = (match.distances && match.distances.length)
                ? match.distances.reduce((a, b) => a + b, 0) / match.distances.length
                : Number.POSITIVE_INFINITY;

            const decision = decidePair(queryElement, match.candidateElement, minConfidence);

            const verdictBoost =
                decision.verdict === 'SAME' ? sameBoost :
                decision.verdict === 'RELATED' ? relatedBoost : 0;

            const finalScore = +(decision.semanticScore + verdictBoost - (avgDistance * distanceWeight)).toFixed(3);

            return {
                refId: match.refId,
                verdict: decision.verdict,
                relation: decision.relation || null,
                semanticScore: decision.semanticScore,
                distance: Number.isFinite(avgDistance) ? avgDistance : null,
                finalScore,
                reasons: decision.reasons || [],
                factTypesMatched: match.factTypes ? (match.factTypes.size || match.factTypes.length || 0) : 0,
                totalMatches: match.distances ? match.distances.length : 0
            };
        });

        xLog.verbose(`Scored ${scoredResults.length} matches using version3 semantic analysis`);
        xLog.verbose(`Version3 scoring: canonical tags + evidence + distance blending`);

        return scoredResults.sort((a, b) => b.finalScore - a.finalScore);
    };

    return {
        scoreMatches,
        decidePair,
        DEFAULTS
    };
};

module.exports = moduleFunction;