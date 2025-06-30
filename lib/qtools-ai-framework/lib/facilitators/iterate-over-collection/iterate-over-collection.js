#!/usr/bin/env node
'use strict';

const moduleName = __filename.replace(__dirname + '/', '').replace(/.js$/, '');

const qt = require('qtools-functional-library');
const fs = require('fs');

// START OF moduleFunction() ============================================================

const moduleFunction = function ({
	jinaCore,
	conversationName,
	thinkerParameters,
	thoughtProcessName,
}) {
	const { xLog, getConfig } = process.global;
	
	xLog.status(`using iterate-over-collection facilitator`);
	
	const facilitator = ({ latestWisdom, args }) => {
		return new Promise(async (resolve, reject) => {
			try {
				// Get iteration configuration from thought process
				const thoughtProcessConfig = getConfig(thoughtProcessName);
				const iterationConfig = thoughtProcessConfig.thoughtProcessConversationList[0];
				
				const {
					collectionSource,
					itemKey = 'currentElement',
					conversationThinkerListName = 'unityGenerator', // Default for backward compatibility
					accumulator = 'object',
					continueOnError = true
				} = iterationConfig;
				
				
				xLog.status(`${moduleName}: Getting collection from ${collectionSource}`);
				
				// Step 1: Get the collection to iterate over
				// Get the thinker configuration
				const thinkers = getConfig('thinkers');
				const collectionThinkerConfig = thinkers[collectionSource];
				
				if (!collectionThinkerConfig) {
					throw new Error(`Collection source thinker '${collectionSource}' not found in configuration`);
				}
				
				// Load and execute the collection thinker directly
				const collectionThinker = require(collectionThinkerConfig.module)({
					thinkerParameters,
					thinkerSpec: collectionThinkerConfig
				});
				
				const collectionResult = await new Promise((resolve, reject) => {
					collectionThinker.executeRequest({
						...args,
						latestWisdom,
						thinkerParameters
					}, (err, result) => {
						if (err) return reject(err);
						resolve(result);
					});
				});
				
				const collection = collectionResult.wisdom.elementsToProcess || [];
				xLog.status(`${moduleName}: Found ${collection.length} items to process`);
				
				if (collection.length === 0) {
					return resolve({
						latestWisdom: {
							...latestWisdom,
							processedElements: {},
							_iterationMetadata: {
								success: true,
								processedCount: 0,
								errorCount: 0,
								totalElements: 0,
								timestamp: new Date().toISOString()
							}
						},
						args
					});
				}
				
				// Step 2: Process each item in the collection
				const processedItems = {};
				const errors = {};
				const allConversationMetadata = {};
				const startTime = Date.now();
				
				// Use the configured conversation name
				xLog.status(`${moduleName}: Using conversation '${conversationThinkerListName}' for item processing`);
				
				for (let i = 0; i < collection.length; i++) {
					const currentItem = collection[i];
					const itemNumber = i + 1;
					
					xLog.status(`${moduleName}: Processing item ${itemNumber} of ${collection.length}: ${currentItem}`);
					
					// Set current item in wisdom
					const itemWisdom = {
						...latestWisdom,
						[itemKey]: currentItem,
						_iterationContext: {
							index: i,
							total: collection.length,
							isFirst: i === 0,
							isLast: i === collection.length - 1
						}
					};
					
					// Debug: Check what we're sending
					console.log(`[${moduleName}] Setting ${itemKey} = ${currentItem}`);
					console.log(`[${moduleName}] itemWisdom keys: ${Object.keys(itemWisdom).join(', ')}`);
					
					// Remove previous iteration results
					delete itemWisdom.generatedSynthData;
					delete itemWisdom.isValid;
					delete itemWisdom.validationMessage;
					delete itemWisdom.explanation;
					
					try {
						// Create a new conversation instance for each element
						const itemConversation = jinaCore.conversationGenerator({
							conversationName: conversationThinkerListName,
							thinkerParameters,
							thoughtProcessName,
						});
						
						// Run the item processor conversation
						const itemResponse = await itemConversation.getResponse({
							args: {
								...args
							},
							latestWisdom: itemWisdom
						});
						
						// Extract the generated content
						const resultWisdom = itemResponse.latestWisdom;
						const generatedContent = resultWisdom.generatedSynthData || 
						                       resultWisdom.generatedContent || 
						                       resultWisdom.result;
						
						// Collect conversation metadata if present
						if (resultWisdom._conversationMetadata) {
							Object.assign(allConversationMetadata, resultWisdom._conversationMetadata);
						}
						
						if (generatedContent) {
							if (accumulator === 'object') {
								processedItems[currentItem] = generatedContent;
							} else if (accumulator === 'array') {
								if (!Array.isArray(processedItems)) {
									processedItems = [];
								}
								processedItems.push({
									element: currentItem,
									content: generatedContent
								});
							}
							xLog.emphatic(`${moduleName}: Successfully processed ${currentItem}`);
						}
					} catch (error) {
						xLog.error(`${moduleName}: Error processing ${currentItem}: ${error.message}`);
						errors[currentItem] = {
							error: error.message,
							timestamp: new Date().toISOString()
						};
						
						if (!continueOnError) {
							throw error;
						}
					}
				}
				
				// Step 3: Build final results
				const successCount = accumulator === 'array' ? processedItems.length : Object.keys(processedItems).length;
				const errorCount = Object.keys(errors).length;
				const duration = Date.now() - startTime;
				
				xLog.result(`${moduleName}: Completed processing ${successCount} items successfully, ${errorCount} errors in ${duration}ms`);
				
				// Just add our data to the existing wisdom
				latestWisdom.processedElements = processedItems;
				latestWisdom._iterationMetadata = {
					success: errorCount === 0,
					processedCount: successCount,
					errorCount: errorCount,
					totalElements: collection.length,
					duration: duration,
					timestamp: new Date().toISOString()
				};
				if (errorCount > 0) {
					latestWisdom.elementErrors = errors;
				}
				
				// Add any collected conversation metadata
				if (Object.keys(allConversationMetadata).length > 0) {
					latestWisdom._conversationMetadata = {
						...latestWisdom._conversationMetadata,
						...allConversationMetadata
					};
				}
				
				const finalWisdom = latestWisdom;
				
				// Save summary
				xLog.saveProcessFile(
					`${moduleName}_summary.json`,
					JSON.stringify({
						metadata: finalWisdom._iterationMetadata,
						processedElements: accumulator === 'array' ? processedItems.map(p => p.element) : Object.keys(processedItems),
						errors: errors
					}, null, 2)
				);
				
				resolve({
					latestWisdom: finalWisdom,
					args
				});
				
			} catch (error) {
				xLog.error(`${moduleName} fatal error: ${error.message}`);
				reject(error);
			}
		});
	};
	
	return { facilitator };
};

// END OF moduleFunction() ============================================================

module.exports = moduleFunction;