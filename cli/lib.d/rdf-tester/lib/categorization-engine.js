#!/usr/bin/env node
'use strict';

const moduleName = __filename.replace(__dirname + '/', '').replace(/.js$/, '');

// =====================================================================
// CATEGORIZATION ENGINE FOR CEDS ONTOLOGY
// =====================================================================

const categorizationRules = {
	'people-demographics': {
		domainRefId: 'DOM_People___Demographics',
		name: 'People & Demographics',
		patterns: [
			/^Person/i,
			/^Student/i,
			/^Staff/i,
			/^Teacher/i,
			/^Parent/i,
			/^Contact/i,
			/^Individual/i,
			/Demographics/i,
			/Birth/i,
			/Gender/i,
			/Race/i,
			/Ethnicity/i
		],
		keywords: ['person', 'student', 'staff', 'teacher', 'parent', 'demographic', 'individual', 'learner', 'educator', 'personnel', 'employee', 'guardian'],
		priority: 2
	},
	'organizations-institutions': {
		domainRefId: 'DOM_Organizations___Institutions',
		name: 'Organizations & Institutions',
		patterns: [
			/^Organization/i,
			/^Institution/i,
			/^School/i,
			/^LEA/i,
			/^SEA/i,
			/^District/i,
			/^K12School/i,
			/^PostsecondaryInstitution/i,
			/Agency/i,
			/Department/i
		],
		keywords: ['organization', 'institution', 'school', 'district', 'agency', 'college', 'university', 'lea', 'sea', 'education agency', 'provider'],
		priority: 2
	},
	'academic-programs': {
		domainRefId: 'DOM_Academic_Programs___Courses',
		name: 'Academic Programs & Courses',
		patterns: [
			/^Course/i,
			/^Program/i,
			/^K12Course/i,
			/^Curriculum/i,
			/^Learning/i,
			/^Section/i,
			/^Class/i,
			/^Activity/i,
			/^Standard/i,
			/Competency/i,
			/Academic/i,
			/Instruction/i
		],
		keywords: ['course', 'program', 'curriculum', 'learning', 'instruction', 'academic', 'class', 'section', 'syllabus', 'educational', 'competency', 'standard'],
		priority: 3
	},
	'assessment-evaluation': {
		domainRefId: 'DOM_Assessment___Evaluation',
		name: 'Assessment & Evaluation',
		patterns: [
			/^Assessment/i,
			/^Test/i,
			/^Score/i,
			/^Evaluation/i,
			/^Grade/i,
			/^Rubric/i,
			/^Performance/i,
			/^Achievement/i,
			/^Result/i,
			/Accommodation/i,
			/Outcome/i
		],
		keywords: ['assessment', 'test', 'score', 'grade', 'evaluation', 'performance', 'achievement', 'examination', 'quiz', 'measurement', 'rubric', 'outcome'],
		priority: 4
	},
	'student-services': {
		domainRefId: 'DOM_Student_Services___Support',
		name: 'Student Services & Support',
		patterns: [
			/^Service/i,
			/^Support/i,
			/^Intervention/i,
			/^Counseling/i,
			/^Discipline/i,
			/^Attendance/i,
			/^Behavior/i,
			/^Special/i,
			/^IEP/i,
			/Transportation/i,
			/Meal/i,
			/Health/i
		],
		keywords: ['service', 'support', 'intervention', 'counseling', 'discipline', 'attendance', 'behavior', 'special education', 'iep', 'transportation', 'health', 'welfare'],
		priority: 5
	},
	'facilities-infrastructure': {
		domainRefId: 'DOM_Facilities___Infrastructure',
		name: 'Facilities & Infrastructure',
		patterns: [
			/^Facility/i,
			/^Building/i,
			/^Room/i,
			/^Location/i,
			/^Space/i,
			/^Equipment/i,
			/^Technology/i,
			/Infrastructure/i,
			/Physical/i,
			/Site/i,
			/Asset/i
		],
		keywords: ['facility', 'building', 'room', 'location', 'equipment', 'technology', 'infrastructure', 'physical', 'site', 'campus', 'classroom', 'asset'],
		priority: 6
	},
	'finance-administration': {
		domainRefId: 'DOM_Finance___Administration',
		name: 'Finance & Administration',
		patterns: [
			/^Finance/i,
			/^Fund/i,
			/^Budget/i,
			/^Account/i,
			/^Financial/i,
			/^Administrative/i,
			/^Policy/i,
			/^Governance/i,
			/^Grant/i,
			/^Contract/i,
			/Expenditure/i,
			/Revenue/i
		],
		keywords: ['finance', 'fund', 'budget', 'financial', 'administrative', 'policy', 'governance', 'grant', 'contract', 'accounting', 'fiscal', 'monetary'],
		priority: 7
	},
	'credentials-recognition': {
		domainRefId: 'DOM_Credentials___Recognition',
		name: 'Credentials & Recognition',
		patterns: [
			/^Credential/i,
			/^Certificate/i,
			/^Diploma/i,
			/^Degree/i,
			/^License/i,
			/^Recognition/i,
			/^Award/i,
			/^Badge/i,
			/^Qualification/i,
			/Certification/i,
			/Transcript/i
		],
		keywords: ['credential', 'certificate', 'diploma', 'degree', 'license', 'recognition', 'award', 'badge', 'qualification', 'certification', 'transcript', 'achievement'],
		priority: 8
	}
};

// ---------------------------------------------------------------------
// categorizeClass - Determine which domain(s) a class belongs to

const categorizeClass = (classObj) => {
	const results = [];
	const { label, comment, description, name } = classObj;
	
	// Combine all text fields for analysis
	const searchText = [
		label || '',
		comment || '',
		description || '',
		name || ''
	].join(' ').toLowerCase();
	
	// Check each domain
	for (const [key, domain] of Object.entries(categorizationRules)) {
		let confidence = 0;
		let matchReasons = [];
		
		// Check label patterns (highest weight)
		const labelMatches = domain.patterns.filter(pattern => 
			pattern.test(label || '')
		);
		if (labelMatches.length > 0) {
			confidence += 0.6;
			matchReasons.push(`Label pattern match: ${labelMatches.length} patterns`);
		}
		
		// Check name patterns (if different from label)
		if (name && name !== label) {
			const nameMatches = domain.patterns.filter(pattern => 
				pattern.test(name)
			);
			if (nameMatches.length > 0) {
				confidence += 0.3;
				matchReasons.push(`Name pattern match: ${nameMatches.length} patterns`);
			}
		}
		
		// Check keywords in all text (lower weight)
		const keywordMatches = domain.keywords.filter(keyword => 
			searchText.includes(keyword)
		);
		if (keywordMatches.length > 0) {
			confidence += Math.min(keywordMatches.length * 0.1, 0.4);
			matchReasons.push(`Keyword matches: ${keywordMatches.join(', ')}`);
		}
		
		// Special case: Early* classes often belong to multiple domains
		if (/^Early/i.test(label)) {
			if (key === 'people-demographics' || key === 'academic-programs') {
				confidence += 0.2;
				matchReasons.push('Early education pattern');
			}
		}
		
		// Threshold for inclusion
		if (confidence >= 0.5) {
			results.push({
				domainRefId: domain.domainRefId,
				domainName: domain.name,
				confidence: Math.min(confidence, 1.0),
				matchReasons,
				priority: domain.priority
			});
		}
	}
	
	// If no matches, assign to Uncategorized
	if (results.length === 0) {
		results.push({
			domainRefId: 'DOM_Uncategorized',
			domainName: 'Uncategorized',
			confidence: 1.0,
			matchReasons: ['No domain patterns matched'],
			priority: 9
		});
	}
	
	// Sort by confidence, then by priority
	results.sort((a, b) => {
		if (Math.abs(a.confidence - b.confidence) > 0.1) {
			return b.confidence - a.confidence;
		}
		return a.priority - b.priority;
	});
	
	// Mark the highest confidence as primary
	if (results.length > 0) {
		results[0].isPrimary = true;
	}
	
	return results;
};

// ---------------------------------------------------------------------
// generateCategorizationReport - Generate summary statistics

const generateCategorizationReport = (categorizationResults) => {
	const report = {
		totalClasses: categorizationResults.length,
		domainCounts: {},
		multiDomainClasses: [],
		uncategorizedClasses: [],
		averageDomainsPerClass: 0,
		timestamp: new Date().toISOString()
	};
	
	// Initialize domain counts
	Object.values(categorizationRules).forEach(domain => {
		report.domainCounts[domain.name] = {
			count: 0,
			asPrimary: 0,
			asSecondary: 0,
			classes: []
		};
	});
	report.domainCounts['Uncategorized'] = {
		count: 0,
		asPrimary: 0,
		asSecondary: 0,
		classes: []
	};
	
	// Process each class
	let totalDomainAssignments = 0;
	categorizationResults.forEach(result => {
		const { classObj, categorizations } = result;
		
		totalDomainAssignments += categorizations.length;
		
		// Track multi-domain classes
		if (categorizations.length > 1) {
			report.multiDomainClasses.push({
				label: classObj.label,
				name: classObj.name,
				domains: categorizations.map(c => c.domainName)
			});
		}
		
		// Process each categorization
		categorizations.forEach((cat, index) => {
			const domainName = cat.domainName;
			if (report.domainCounts[domainName]) {
				report.domainCounts[domainName].count++;
				if (index === 0 || cat.isPrimary) {
					report.domainCounts[domainName].asPrimary++;
				} else {
					report.domainCounts[domainName].asSecondary++;
				}
				// Add class info for verification
				report.domainCounts[domainName].classes.push({
					label: classObj.label,
					confidence: cat.confidence,
					isPrimary: cat.isPrimary || false
				});
			}
			
			// Track uncategorized
			if (domainName === 'Uncategorized') {
				report.uncategorizedClasses.push({
					label: classObj.label,
					name: classObj.name,
					uri: classObj.uri
				});
			}
		});
	});
	
	// Calculate statistics
	report.averageDomainsPerClass = (totalDomainAssignments / report.totalClasses).toFixed(2);
	report.uncategorizedPercentage = ((report.domainCounts['Uncategorized'].count / report.totalClasses) * 100).toFixed(1);
	report.multiDomainPercentage = ((report.multiDomainClasses.length / report.totalClasses) * 100).toFixed(1);
	
	// Sort classes in each domain by confidence
	Object.values(report.domainCounts).forEach(domain => {
		domain.classes.sort((a, b) => b.confidence - a.confidence);
		// Keep only top 10 for report brevity
		domain.topClasses = domain.classes.slice(0, 10);
		delete domain.classes;
	});
	
	return report;
};

// ---------------------------------------------------------------------
// Module exports

module.exports = {
	categorizeClass,
	generateCategorizationReport,
	categorizationRules
};