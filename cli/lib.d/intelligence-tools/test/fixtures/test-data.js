#!/usr/bin/env node
'use strict';

/**
 * Test fixtures with known-good data for testing hierarchical matching
 */

/**
 * Sample SIF objects from naDataModel
 */
const sampleSifObjects = {
    studentBirthDate: {
        refId: '155750186191366',
        ElementName: 'BirthDate',
        XPath: '/xStudents/xStudent/demographics/birthDate',
        Type: 'xs:date',
        Mandatory: 'M',
        Description: 'The month, day, and year on which a person was born.',
        Format: 'CCYY-MM-DD',
        cedsId: null,
        SheetName: 'xStudent'
    },

    studentPersonalRefId: {
        refId: '155749654683366',
        ElementName: 'StudentPersonalRefId',
        XPath: '/Activitys/Activity/Students/StudentPersonalRefId',
        Type: 'IdRefType',
        Mandatory: 'M',
        Description: 'Reference to student participating in activity',
        Format: null,
        cedsId: null,
        SheetName: 'Activity'
    },

    assessmentRefId: {
        refId: '155750186191500',
        ElementName: '@RefId',
        XPath: '/Assessments/Assessment/@RefId',
        Type: 'RefIdType',
        Mandatory: 'M',
        Description: 'The GUID that uniquely identifies an instance of the object.',
        Format: null,
        cedsId: null,
        SheetName: 'Assessment'
    }
};

/**
 * Sample CEDS elements from _CEDSElements table
 */
const sampleCedsElements = {
    k12Domain: [
        {
            refId: 'CEDS_000033',
            ElementName: 'Birthdate',
            Definition: 'The month, day, and year on which a person was born.',
            Description: 'The year, month and day on which a person was born.',
            Domain: 'K12',
            Entity: 'K12 Student',
            refUrl: 'https://ceds.ed.gov/element/000033'
        },
        {
            refId: 'CEDS_001492',
            ElementName: 'Student Identifier State',
            Definition: 'A unique number or alphanumeric code assigned to a student by a state education agency.',
            Description: 'The unique identifier for a student assigned by the state.',
            Domain: 'K12',
            Entity: 'K12 Student',
            refUrl: 'https://ceds.ed.gov/element/001492'
        }
    ],

    assessmentDomain: [
        {
            refId: 'CEDS_000115',
            ElementName: 'Assessment Identifier',
            Definition: 'A unique number or alphanumeric code assigned to an assessment.',
            Description: 'Identifier for the assessment.',
            Domain: 'Assessments',
            Entity: 'Assessment',
            refUrl: 'https://ceds.ed.gov/element/000115'
        },
        {
            refId: 'CEDS_000116',
            ElementName: 'Assessment Title',
            Definition: 'The title or name of the Assessment.',
            Description: 'Name of the assessment.',
            Domain: 'Assessments',
            Entity: 'Assessment',
            refUrl: 'https://ceds.ed.gov/element/000116'
        }
    ]
};

/**
 * Expected domain classifications for test SIF objects
 */
const expectedDomainClassifications = {
    '/xStudents/xStudent/demographics/birthDate': 'K12',
    '/Activitys/Activity/Students/StudentPersonalRefId': 'K12',
    '/Assessments/Assessment/@RefId': 'Assessments',
    '/xSchools/xSchool/schoolName': 'K12',
    '/xStaffs/xStaff/name/firstName': 'K12'
};

/**
 * Expected entity selections
 */
const expectedEntitySelections = {
    'K12_/xStudents/xStudent/demographics/birthDate': 'K12 Student',
    'K12_/Activitys/Activity/Students/StudentPersonalRefId': 'K12 Student',
    'Assessments_/Assessments/Assessment/@RefId': 'Assessment',
    'K12_/xSchools/xSchool/schoolName': 'K12 School',
    'K12_/xStaffs/xStaff/name/firstName': 'K12 Staff'
};

/**
 * Expected element matches with confidence scores
 */
const expectedElementMatches = {
    'BirthDate': {
        cedsRefId: 'CEDS_000033',
        cedsElement: 'Birthdate',
        confidence: 0.95,
        domain: 'K12',
        entity: 'K12 Student'
    },
    'StudentPersonalRefId': {
        cedsRefId: 'CEDS_001492',
        cedsElement: 'Student Identifier State',
        confidence: 0.85,
        domain: 'K12',
        entity: 'K12 Student'
    },
    '@RefId': {
        cedsRefId: 'CEDS_000115',
        cedsElement: 'Assessment Identifier',
        confidence: 0.90,
        domain: 'Assessments',
        entity: 'Assessment'
    }
};

/**
 * All available CEDS domains
 */
const cedsDomains = [
    'K12',
    'Postsecondary',
    'Workforce',
    'Adult Education',
    'Early Learning',
    'Assessments',
    'Learning Resources'
];

/**
 * CEDS entities by domain
 */
const cedsEntitiesByDomain = {
    'K12': ['K12 Student', 'K12 School', 'K12 Staff', 'K12 Course', 'K12 Organization'],
    'Assessments': ['Assessment', 'Assessment Administration', 'Assessment Item', 'Assessment Form'],
    'Postsecondary': ['PS Student', 'PS Institution', 'PS Course'],
    'Workforce': ['Worker', 'Employer', 'Training Program'],
    'Adult Education': ['AE Student', 'AE Provider', 'AE Staff'],
    'Early Learning': ['EL Child', 'EL Provider', 'EL Staff'],
    'Learning Resources': ['Learning Resource', 'Learning Standard']
};

module.exports = {
    sampleSifObjects,
    sampleCedsElements,
    expectedDomainClassifications,
    expectedEntitySelections,
    expectedElementMatches,
    cedsDomains,
    cedsEntitiesByDomain
};
