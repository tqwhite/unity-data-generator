-- CEDS Elements Database Queries
-- Based on CEDS Domain and Entity Structure Documentation

-- Query 1: Find a Term/Element by domain and see all its applicable values
-- This helps identify valid values/codes for elements within a specific educational domain
SELECT 
    t.GlobalID,
    t.ElementName,
    t.Definition,
    tp.Category AS Domain,
    tp.Topic AS EntityCategory,
    cs.Description AS CodeSetName,
    c.Code,
    c.Description AS CodeDescription,
    c.CodeDefinition
FROM 
    CEDS_Term t
JOIN 
    CEDS_TermxTopic txt ON t.TermID = txt.TermID
JOIN 
    CEDS_Topic tp ON txt.TopicID = tp.TopicID
LEFT JOIN 
    CEDS_TermxCodeSet txcs ON t.TermID = txcs.TermID
LEFT JOIN 
    CEDS_CodeSet cs ON txcs.CodeSetID = cs.CodeSetID
LEFT JOIN 
    CEDS_CodeSetxCode csxc ON cs.CodeSetID = csxc.CodeSetID
LEFT JOIN 
    CEDS_Code c ON csxc.CodeID = c.CodeID
WHERE 
    tp.Category LIKE '%K12%'  -- Replace with domain: 'Early Learning', 'K12', 'Postsecondary', 'Assessments', etc.
    AND t.ElementName LIKE '%Student%'  -- Optional: Filter by element name
ORDER BY 
    t.ElementName, csxc.SortOrder;

-- Query 2: Find elements by entity type across all domains
-- Useful for finding elements related to specific entities like "Student" across all education domains
SELECT 
    t.GlobalID,
    t.ElementName,
    t.Definition,
    tp.Category AS Domain,
    tp.Topic AS EntityType,
    t.HasOptionSet,  -- 1 means this element has a code set of valid values
    t.Format,        -- Format constraints for the element
    t.URL            -- Link to CEDS documentation
FROM 
    CEDS_Term t
JOIN 
    CEDS_TermxTopic txt ON t.TermID = txt.TermID
JOIN 
    CEDS_Topic tp ON txt.TopicID = tp.TopicID
WHERE 
    tp.Topic LIKE '%Student%'  -- Replace with entity type: 'Course', 'Staff', 'School', etc.
ORDER BY 
    tp.Category, t.ElementName;

-- Query 3: Find all elements that use a specific code value
-- Helpful when you need to understand where a particular value is used across the CEDS standard
SELECT 
    t.GlobalID,
    t.ElementName,
    t.Definition,
    tp.Category AS Domain,
    tp.Topic AS EntityType,
    cs.Description AS CodeSetName,
    c.Code,
    c.Description AS CodeDescription
FROM 
    CEDS_Code c
JOIN 
    CEDS_CodeSetxCode csxc ON c.CodeID = csxc.CodeID
JOIN 
    CEDS_CodeSet cs ON csxc.CodeSetID = cs.CodeSetID
JOIN 
    CEDS_TermxCodeSet txcs ON cs.CodeSetID = txcs.CodeSetID
JOIN 
    CEDS_Term t ON txcs.TermID = t.TermID
LEFT JOIN 
    CEDS_TermxTopic txt ON t.TermID = txt.TermID
LEFT JOIN 
    CEDS_Topic tp ON txt.TopicID = tp.TopicID
WHERE 
    c.Code = 'Yes'  -- Replace with your code value of interest
    OR c.Description LIKE '%Yes%'  -- Or search by description
ORDER BY 
    tp.Category, t.ElementName;

-- Query 4: Domain-specific element search
-- Finds all elements within a specific domain and categorizes them by entity type
SELECT 
    tp.Category AS Domain,
    tp.Topic AS EntityType,
    COUNT(DISTINCT t.TermID) AS ElementCount,
    GROUP_CONCAT(t.ElementName, ', ') AS Elements
FROM 
    CEDS_Term t
JOIN 
    CEDS_TermxTopic txt ON t.TermID = txt.TermID
JOIN 
    CEDS_Topic tp ON txt.TopicID = tp.TopicID
WHERE 
    tp.Category LIKE '%Assessment%'  -- Replace with domain of interest
GROUP BY 
    tp.Category, tp.Topic
ORDER BY 
    tp.Category, tp.Topic;

-- Query 5: Find all option sets (code sets) and their values
-- Useful for exploring the standardized value lists available in CEDS
SELECT 
    cs.Description AS CodeSetName,
    COUNT(c.CodeID) AS ValueCount,
    GROUP_CONCAT(c.Code || ': ' || c.Description, ' | ') AS Values,
    t.ElementName AS SampleElementUsingThisCodeSet
FROM 
    CEDS_CodeSet cs
LEFT JOIN 
    CEDS_CodeSetxCode csxc ON cs.CodeSetID = csxc.CodeSetID
LEFT JOIN 
    CEDS_Code c ON csxc.CodeID = c.CodeID
LEFT JOIN 
    CEDS_TermxCodeSet txcs ON cs.CodeSetID = txcs.CodeSetID
LEFT JOIN 
    CEDS_Term t ON txcs.TermID = t.TermID
GROUP BY 
    cs.CodeSetID, cs.Description, t.ElementName
ORDER BY 
    cs.Description;

-- Query 6: Find elements by specific format type
-- Helps identify elements with a particular data format (date, text, numeric, etc.)
SELECT 
    t.GlobalID,
    t.ElementName,
    t.Definition,
    t.Format,
    tp.Category AS Domain,
    tp.Topic AS EntityType
FROM 
    CEDS_Term t
LEFT JOIN 
    CEDS_TermxTopic txt ON t.TermID = txt.TermID
LEFT JOIN 
    CEDS_Topic tp ON txt.TopicID = tp.TopicID
WHERE 
    t.Format LIKE '%date%'  -- Replace with format type: 'date', 'numeric', 'alphanumeric', etc.
ORDER BY 
    tp.Category, tp.Topic, t.ElementName;

-- Query 7: Element relationship mapper
-- Creates a visualization of how elements relate across domains
WITH DomainCounts AS (
    SELECT 
        t.ElementName,
        tp.Category AS Domain,
        COUNT(*) AS NumRelatedTopics
    FROM 
        CEDS_Term t
    JOIN 
        CEDS_TermxTopic txt ON t.TermID = txt.TermID
    JOIN 
        CEDS_Topic tp ON txt.TopicID = tp.TopicID
    GROUP BY 
        t.ElementName, tp.Category
)
SELECT 
    dc.ElementName,
    GROUP_CONCAT(dc.Domain || ' (' || dc.NumRelatedTopics || ')', ', ') AS DomainsUsedIn
FROM 
    DomainCounts dc
GROUP BY 
    dc.ElementName
HAVING 
    COUNT(DISTINCT dc.Domain) > 1  -- Only shows elements used in multiple domains
ORDER BY 
    COUNT(DISTINCT dc.Domain) DESC, dc.ElementName;

-- Note: Some SQLite implementations may not support GROUP_CONCAT with multiple arguments.
-- If you encounter errors, simplify those queries by removing the concatenation operators.