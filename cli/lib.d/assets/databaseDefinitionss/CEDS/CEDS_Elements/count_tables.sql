SELECT 
  'CEDS_Code' AS table_name, 
  (SELECT COUNT(*) FROM CEDS_Code) AS row_count
UNION ALL
SELECT 
  'CEDS_CodeSet' AS table_name, 
  (SELECT COUNT(*) FROM CEDS_CodeSet) AS row_count
UNION ALL
SELECT 
  'CEDS_CodeSetxCode' AS table_name, 
  (SELECT COUNT(*) FROM CEDS_CodeSetxCode) AS row_count
UNION ALL
SELECT 
  'CEDS_Term' AS table_name, 
  (SELECT COUNT(*) FROM CEDS_Term) AS row_count
UNION ALL
SELECT 
  'CEDS_TermxCodeSet' AS table_name, 
  (SELECT COUNT(*) FROM CEDS_TermxCodeSet) AS row_count
UNION ALL
SELECT 
  'CEDS_TermxTopic' AS table_name, 
  (SELECT COUNT(*) FROM CEDS_TermxTopic) AS row_count
UNION ALL
SELECT 
  'CEDS_Topic' AS table_name, 
  (SELECT COUNT(*) FROM CEDS_Topic) AS row_count
UNION ALL
SELECT 
  '_CEDSElements' AS table_name, 
  (SELECT COUNT(*) FROM _CEDSElements) AS row_count
UNION ALL
SELECT 
  '_CEDStoNDSMapping' AS table_name, 
  (SELECT COUNT(*) FROM _CEDStoNDSMapping) AS row_count;