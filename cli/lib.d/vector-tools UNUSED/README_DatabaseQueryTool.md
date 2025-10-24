# Schema Information & Query Types

## Show all available query types and their SQL for CEDS

vectorTools --dataProfile=ceds --query=showQueryInfo

## Show all available query types and their SQL for SIF

vectorTools --dataProfile=sif --query=showQueryInfo

## Show CEDS with atomic vector mode

vectorTools --dataProfile=ceds --semanticAnalysisMode=atomicVector --query=showQueryInfo

## Show SIF with simple vector mode (default)

vectorTools --dataProfile=sif --semanticAnalysisMode=simpleVector --query=showQueryInfo

# Basic Data Queries

## CEDS: Find elements with "student" in definition

vectorTools --dataProfile=ceds --whereClause='Definition like "%student%"' --query=sourceOnly --resultLimit=5

## SIF: Find elements with "student" in description

vectorTools --dataProfile=sif --whereClause='Description like "%student%"' --query=sourceOnly --resultLimit=5

## CEDS: Find elements by ID range

vectorTools --dataProfile=ceds --whereClause='GlobalID > "001000"' --query=sourceOnly --resultLimit=3

## SIF: Find mandatory elements

vectorTools --dataProfile=sif --whereClause='Mandatory = "*"' --query=sourceOnly --resultLimit=4

## CEDS: Find elements with option sets

vectorTools --dataProfile=ceds --whereClause='HasOptionSet = "1"' --query=showAll --resultLimit=3

? Advanced Queries (Atomic Vector Mode)

## CEDS: Show source + vector data combined

vectorTools --dataProfile=ceds --semanticAnalysisMode=atomicVector --whereClause='GlobalID < "000050"' --query=showAll --resultLimit=2

## CEDS: Query vector-only data

vectorTools --dataProfile=ceds --semanticAnalysisMode=atomicVector --whereClause='factType = "primary_context"'
--query=vectorsOnly --resultLimit=3

## CEDS: Find recent vector entries

vectorTools --dataProfile=ceds --semanticAnalysisMode=atomicVector --whereClause='createdAt > "2025-06-01"' --query=vectorsOnly --resultLimit=5

## CEDS: Find specific semantic categories

vectorTools --dataProfile=ceds --semanticAnalysisMode=atomicVector --whereClause='semanticCategory = "Education"' --query=vectorsOnly --resultLimit=3

# Filtering & Search Patterns

## Pattern matching with wildcards

vectorTools --dataProfile=ceds --whereClause='ElementName like "Student%"' --query=sourceOnly --resultLimit=4

## Multiple word search

vectorTools --dataProfile=sif --whereClause='Description like "%data%" AND Type = "string"' --query=sourceOnly --resultLimit=3

## Format-specific searches

vectorTools --dataProfile=ceds --whereClause='Format like "%Date%"' --query=sourceOnly --resultLimit=3

## XPath-based searches (SIF)

vectorTools --dataProfile=sif --whereClause='XPath like "%Student%"' --query=sourceOnly --resultLimit=3

# Error Handling & Validation

## Test column name suggestions (Definition vs Description)

vectorTools --dataProfile=sif --whereClause='Definition like "%test%"' --query=sourceOnly

## Test reverse suggestion (Description vs Definition)

vectorTools --dataProfile=ceds --whereClause='Description like "%test%"' --query=sourceOnly

## Test invalid column name

vectorTools --dataProfile=ceds --whereClause='InvalidColumn = "test"' --query=sourceOnly

## Test SQL injection prevention

vectorTools --dataProfile=ceds --whereClause='GlobalID = "001"; DROP TABLE test; --' --query=sourceOnly

## Test vectorsOnly on simple mode (should fail gracefully)

vectorTools --dataProfile=ceds --whereClause='factType = "test"' --query=vectorsOnly

# Result Limiting & Pagination

## Small result sets

vectorTools --dataProfile=ceds --whereClause='GlobalID > "000001"' --query=sourceOnly --resultLimit=2

## Larger result sets

vectorTools --dataProfile=sif --whereClause='Type = "string"' --query=sourceOnly --resultLimit=10

## No limit (shows default)

vectorTools --dataProfile=ceds --whereClause='Format like "%Text%"' --query=sourceOnly

? Performance & Scale Testing

## Broad searches (tests performance)

vectorTools --dataProfile=ceds --whereClause='GlobalID > "000000"' --query=sourceOnly --resultLimit=20

## Complex atomic vector queries

vectorTools --dataProfile=ceds --semanticAnalysisMode=atomicVector --whereClause='factText like "%education%"' --query=showAll --resultLimit=5

## Cross-reference queries

vectorTools --dataProfile=ceds --semanticAnalysisMode=atomicVector --whereClause='sourceRefId in (select GlobalID from _CEDSElements where ElementName like "%Grade%")' --query=vectorsOnly --resultLimit=3

# Cross-Analysis & Comparison Queries

## Compare original definitions with atomic vector analysis (CEDS only)

vectorTools --dataProfile=ceds --whereClause='GlobalID < "000005"' --query=compareAnalysis --resultLimit=2

## Find most complex atomic breakdowns

vectorTools --dataProfile=ceds --whereClause='GlobalID = "000151" OR GlobalID = "000273" OR GlobalID = "001342"' --query=compareAnalysis --resultLimit=3

## Find SIF elements where simple and atomic vector matching disagree

vectorTools --dataProfile=sif --whereClause='1=1' --query=matchDiscrepancies --resultLimit=5

## Find more match discrepancies to analyze patterns

vectorTools --dataProfile=sif --whereClause='1=1' --query=matchDiscrepancies --resultLimit=10

# Output Format Testing

## Full data display (no truncation)

vectorTools --dataProfile=ceds --whereClause='Definition like "%assessment%"' --query=showAll --resultLimit=2

## Vector metadata only

vectorTools --dataProfile=ceds --semanticAnalysisMode=atomicVector --whereClause='conceptualDimension is not null'
--query=vectorsOnly --resultLimit=3

## Source data only

vectorTools --dataProfile=sif --whereClause='Name like "%Grade%"' --query=sourceOnly --resultLimit=3

# Quick Test Suite

For a rapid comprehensive test, run these in sequence:

## 1. Schema overview

vectorTools --dataProfile=ceds --query=showQueryInfo
vectorTools --dataProfile=sif --query=showQueryInfo

## 2. Basic functionality

vectorTools --dataProfile=ceds --whereClause='GlobalID < "000010"' --query=sourceOnly --resultLimit=3
vectorTools --dataProfile=sif --whereClause='Mandatory = "M"' --query=sourceOnly --resultLimit=3

## 3. Advanced features

vectorTools --dataProfile=ceds --semanticAnalysisMode=atomicVector --whereClause='factType = "primary_context"' --query=vectorsOnly --resultLimit=2

## 4. Error handling

vectorTools --dataProfile=sif --whereClause='Definition like "%test%"' --query=sourceOnly

## 5. Cross-analysis queries

vectorTools --dataProfile=ceds --whereClause='GlobalID < "000010"' --query=compareAnalysis --resultLimit=1
vectorTools --dataProfile=sif --whereClause='1=1' --query=matchDiscrepancies --resultLimit=2

# Comprehensive Test Commands (Copy-Paste Ready)

```bash
# Basic functionality tests
vectorTools --dataProfile=ceds --whereClause='Definition like "%student%"' --query=sourceOnly --resultLimit=5
vectorTools --dataProfile=sif --whereClause='Description like "%student%"' --query=sourceOnly --resultLimit=5
vectorTools --dataProfile=sif --whereClause='Mandatory = "*"' --query=sourceOnly --resultLimit=4

# Advanced atomic vector queries
vectorTools --dataProfile=ceds --semanticAnalysisMode=atomicVector --whereClause='factType = "primary_context"' --query=vectorsOnly --resultLimit=3
vectorTools --dataProfile=ceds --semanticAnalysisMode=atomicVector --whereClause='GlobalID < "000050"' --query=showAll --resultLimit=2
vectorTools --dataProfile=ceds --semanticAnalysisMode=atomicVector --whereClause='semanticCategory = "Education"' --query=vectorsOnly --resultLimit=3

# Cross-analysis queries
vectorTools --dataProfile=ceds --whereClause='GlobalID < "000005"' --query=compareAnalysis --resultLimit=2
vectorTools --dataProfile=sif --whereClause='1=1' --query=matchDiscrepancies --resultLimit=3

# Error handling and validation tests
vectorTools --dataProfile=sif --whereClause='Definition like "%test%"' --query=sourceOnly
vectorTools --dataProfile=ceds --whereClause='Description like "%test%"' --query=sourceOnly
vectorTools --dataProfile=ceds --whereClause='InvalidColumn = "test"' --query=sourceOnly
vectorTools --dataProfile=ceds --whereClause='GlobalID = "001"; DROP TABLE test; --' --query=sourceOnly

# Schema information queries
vectorTools --dataProfile=ceds --query=showQueryInfo
vectorTools --dataProfile=sif --query=showQueryInfo
vectorTools --dataProfile=ceds --semanticAnalysisMode=atomicVector --query=showQueryInfo
```