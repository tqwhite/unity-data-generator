const qtools = require('qtools');
const qtoolsGen = require('qtools').getInstance();
const xlsx = require('xlsx');

const moduleFunction = function(args = {}) {
    const { xLog, commandLineParameters } = process.global;
    const moduleName = 'get-all-elements';
    
    const executeRequest = (args, callback) => {
        const { thinkerParameters = {} } = args;
        
        // Get spreadsheet path from configuration
        const elementSpecWorksheetPath = 
            thinkerParameters.qtGetSurePath('get-specification-data.spreadsheetPath') ||
            thinkerParameters.qtGetSurePath('elementSpecWorksheetPath') ||
            thinkerParameters.qtGetSurePath('spreadsheetPath');
        
        if (!elementSpecWorksheetPath) {
            return callback(new Error('elementSpecWorksheetPath not found in configuration'));
        }
        
        try {
            // Read spreadsheet to get all worksheet names
            const workbook = xlsx.readFile(elementSpecWorksheetPath);
            let elementsToProcess = workbook.SheetNames;
            
            // Apply filtering based on command line
            if (commandLineParameters.values.elements) {
                const requestedElements = commandLineParameters.values.elements[0].split(',');
                elementsToProcess = elementsToProcess.filter(name => 
                    requestedElements.includes(name)
                );
                xLog.status(`${moduleName}: Filtered to specific elements: ${elementsToProcess.join(', ')}`);
            } else if (commandLineParameters.switches.allElements) {
                xLog.status(`${moduleName}: Processing all ${elementsToProcess.length} elements`);
            } else {
                // Return empty collection - not in multi-element mode
                elementsToProcess = [];
                xLog.status(`${moduleName}: No multi-element flags found, returning empty collection`);
            }
            
            callback(null, { 
                wisdom: { 
                    elementsToProcess,
                    elementCount: elementsToProcess.length
                },
                args 
            });
            
        } catch (error) {
            callback(error);
        }
    };
    
    return { executeRequest };
};

module.exports = moduleFunction;