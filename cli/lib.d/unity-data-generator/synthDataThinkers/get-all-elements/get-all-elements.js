const qt = require('qtools-functional-library');
const xlsx = require('xlsx');

const moduleFunction = function(args = {}) {
    const { xLog, commandLineParameters } = process.global;
    const moduleName = 'get-all-elements';
    
    const executeRequest = (args, callback) => {
        const { thinkerParameters = {}, wisdomBus } = args;
        
        if (!wisdomBus) {
            return callback(new Error(`${moduleName}: wisdom-bus is required`));
        }
        
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
            let elementsToInclude = [];
            
            // Determine base element set
            if (commandLineParameters.switches.allElements) {
                // Start with all elements from spreadsheet
                elementsToInclude = [...elementsToProcess];
            } else if (commandLineParameters.values.elements) {
                const requestedElements = commandLineParameters.values.elements;
                elementsToInclude = elementsToProcess.filter(name => 
                    requestedElements.includes(name)
                );
            }
            
            // Apply elementCounts if specified
            if (commandLineParameters.values.elementCounts) {
                const elementCounts = commandLineParameters.values.elementCounts;
                const countsMap = {};
                
                // Parse elementCounts
                elementCounts.forEach(countSpec => {
                    const [elementName, count] = countSpec.split(':');
                    countsMap[elementName] = parseInt(count, 10);
                });
                
                // Note: Validation of elementCounts is now done earlier in unityDataGenerator.js
                
                // Build final list: elements not in countsMap get count of 1, elements in countsMap get specified count
                const finalElements = [];
                
                // Add elements with count of 1 (not in elementCounts)
                elementsToInclude.forEach(elementName => {
                    if (!countsMap[elementName]) {
                        finalElements.push(elementName);
                    }
                });
                
                // Add elements with specified counts
                Object.keys(countsMap).forEach(elementName => {
                    const count = countsMap[elementName];
                    for (let i = 0; i < count; i++) {
                        finalElements.push(elementName);
                    }
                });
                
                elementsToInclude = finalElements;
                xLog.progress(`${moduleName}: Applied elementCounts, final elements: ${elementsToInclude.join(', ')}`);
            }
            
            if (elementsToInclude.length > 0) {
                elementsToProcess = elementsToInclude;
            } else if (commandLineParameters.switches.allElements) {
            } else {
                // Return empty collection - not in multi-element mode
                elementsToProcess = [];
            }
            
            // Add results to wisdom-bus
            wisdomBus.add('elementsToProcess', elementsToProcess);
            wisdomBus.add('elementCount', elementsToProcess.length);
            
            // Return success only (no wisdom)
            callback(null, { 
                success: true,
                message: `Found ${elementsToProcess.length} elements to process`
            });
            
        } catch (error) {
            callback(error);
        }
    };
    
    return { executeRequest };
};

module.exports = moduleFunction;