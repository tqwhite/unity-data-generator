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