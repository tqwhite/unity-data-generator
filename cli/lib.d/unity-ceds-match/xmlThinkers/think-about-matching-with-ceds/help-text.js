'use strict';

module.exports = (moduleName = 'unityCedsMatch') => {
  return `
============================================================

NAME

  ${moduleName} - Match Unity/SIF elements with CEDS recommendations

DESCRIPTION

  Analyze Unity/SIF elements and find potential CEDS matches
  based on element descriptions, types, and characteristics.

USAGE

  ${moduleName} [OPTIONS]
  
OPTIONS

  -echoAlso              Display the output in the console along with saving to file
  -loadDatabase          Save CEDS match results to database (creates unityCedsMatches table)
  -outFile=FILE          Specify custom output file path
  -help                  Show this help message

CONTROLS

  --overrideConfigPath=PATH  Specify a configuration file to override default

EXAMPLES

  ${moduleName}                      # Basic analysis with default settings
  ${moduleName} -echoAlso            # Show results in console
  ${moduleName} -loadDatabase        # Save results to database
  ${moduleName} -outFile=result.json # Custom output file

============================================================
`;
};