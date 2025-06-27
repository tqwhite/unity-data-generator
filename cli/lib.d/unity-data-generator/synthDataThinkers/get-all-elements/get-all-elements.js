const qt = require('qtools-functional-library');
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
                xLog.debug(`commandLineParameters.values.elements: ${JSON.stringify(commandLineParameters.values.elements)}`);
                // Command line parser already splits on commas, so elements is already an array
                const requestedElements = commandLineParameters.values.elements;
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