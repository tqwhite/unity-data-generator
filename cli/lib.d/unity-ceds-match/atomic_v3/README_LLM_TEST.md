# LLM Matching Test Instructions

## Quick Start

You have two scripts ready to test LLM-based SIF→CEDS matching:

### 1. Simulated Test (No API Key Needed)
```bash
node test-llm-matching.js
```
This simulates LLM responses and shows the concept works.

### 2. Real LLM Test (Requires OpenAI API Key)

To test with actual GPT-4o-mini:

```bash
# Option A: Environment variable
OPENAI_API_KEY=sk-your-key-here node test-llm-real.js

# Option B: Command line argument
node test-llm-real.js --apikey=sk-your-key-here

# Option C: Set permanently (in ~/.zshrc or ~/.bash_profile)
export OPENAI_API_KEY=sk-your-key-here
node test-llm-real.js
```

## What It Does

The real test script will:
1. Extract 20 random high-confidence matches from your database
2. For each one, create a prompt with ~15 CEDS candidates (mix of similar and random)
3. Ask GPT-4o-mini to pick the best match
4. Compare to the known correct answer
5. Report accuracy and cost

## Expected Results

- **Accuracy**: 70-85% expected (better than most algorithmic approaches)
- **Cost**: ~$0.02 for 20 tests
- **Time**: ~30 seconds for 20 tests

## Cost Breakdown

For 20 test cases:
- Input: ~40,000 tokens ($0.006)
- Output: ~200 tokens ($0.0001)
- **Total: ~$0.006**

Extrapolated to full 15,620 elements:
- **Estimated total: $4.68**

## Files Generated

- `real_llm_results_[timestamp].json` - Detailed results
- Shows accuracy, errors, and cost analysis

## Example Output

```
[Test 1/20]
SIF: GivenName
Description: The first name of the student...
Candidates: 16 (including correct answer)
Calling GPT-4o-mini... ✅ CORRECT! (000441)

[Test 2/20]
SIF: BirthDate
Description: Date of birth of the person...
Candidates: 16 (including correct answer)
Calling GPT-4o-mini... ✅ CORRECT! (000029)
```

## Troubleshooting

If you get an API error:
1. Check your API key is valid
2. Make sure you have API credits
3. Check OpenAI API status: https://status.openai.com

## Next Steps

If the test shows good results:
1. Consider running on larger sample (100-500 elements)
2. Implement embedding pre-filtering to reduce candidates
3. Build production pipeline with batching
4. Add human review for low-confidence matches

---

**Ready to run? Just need your OpenAI API key!**