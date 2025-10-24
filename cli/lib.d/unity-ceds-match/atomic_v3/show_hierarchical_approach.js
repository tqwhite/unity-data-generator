#!/usr/bin/env node

console.log('=== HIERARCHICAL LLM MATCHING APPROACH ===\n');

console.log('STEP 1: Ask LLM for Domain Mapping');
console.log('----------------------------------------');
console.log('Prompt: "Which CEDS domain best fits /xStudents/xStudent/demographics/birthDate?"');
console.log('Options: K12, Postsecondary, Workforce, Adult Education, Early Learning, Assessments...');
console.log('LLM Response: "K12"');
console.log('Cost: ~20 tokens ($0.000003)\n');

console.log('STEP 2: Ask LLM for Entity Within Domain');
console.log('----------------------------------------');
console.log('Prompt: "Which K12 entity best fits /xStudents/xStudent/demographics/birthDate?"');
console.log('Options: K12 Student, K12 Staff, K12 School, K12 Organization, Parent/Guardian...');
console.log('LLM Response: "K12 Student"');
console.log('Cost: ~30 tokens ($0.0000045)\n');

console.log('STEP 3: Ask LLM for Element Within Entity');
console.log('----------------------------------------');
console.log('Prompt: "Match birthDate to best element in K12/K12 Student"');
console.log('Options: [~50 elements including Birthdate, Enrollment Date, Exit Date...]');
console.log('LLM Response: "000033 (Birthdate)"');
console.log('Cost: ~500 tokens ($0.000075)\n');

console.log('TOTAL COST: ~$0.00008 per element (vs $0.0001 for single-shot)\n');

console.log('ADVANTAGES:');
console.log('- More accurate (narrows search space progressively)');
console.log('- Learns domain mappings we can cache');
console.log('- Easier to debug (see which step failed)');
console.log('- Can use different models for different steps');
console.log('- Domain mappings become reusable knowledge\n');

console.log('DOMAIN MAPPING CACHE (after learning):');
console.log('----------------------------------------');
const mappings = {
    '/xStudents/*': 'K12',
    '/xStudent/*': 'K12',
    '/xStaff/*': 'K12 (Staff entity)',
    '/EmployeePersonal/*': 'K12 (Staff entity)',
    '/StudentPersonal/*': 'K12 (Student entity)',
    '/xLea/*': 'K12 (Organization entity)',
    '/xSchool/*': 'K12 (School entity)',
    '/Assessment*/*': 'Assessments',
    '/LearningStandard*/*': 'Learning Resources',
    '/xTransferIep/*': 'K12 (Student/IEP context)',
    '/FinancialTransaction/*': 'K12 (Financial context)',
    '/FoodService*/*': 'K12 (Food Service Program)'
};

console.log(JSON.stringify(mappings, null, 2));

console.log('\n\nIMPLEMENTATION PLAN:');
console.log('1. Run Step 1 on 100 unique xPath patterns');
console.log('2. Cache the domain mappings');
console.log('3. Use cached mappings + Steps 2-3 for actual matching');
console.log('4. Total: ~$8 to map all 15,620 elements with higher accuracy');
