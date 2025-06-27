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
	
	// Get the conversation configuration
	const conversationConfig = getConfig('conversation-generator')[conversationName];
	
	const facilitator = ({ latestWisdom, args }) => {
		return new Promise(async (resolve, reject) => {
			try {
				// Get iteration configuration from thought process
				const thoughtProcessConfig = getConfig(thoughtProcessName);
				const iterationConfig = thoughtProcessConfig.thoughtProcessConversationList[0];
				
				const {
					collectionSource,
					itemKey = 'currentElement',
					itemProcessorList,
					accumulator = 'object',
					continueOnError = true
				} = iterationConfig;
				
				xLog.status(`${moduleName}: Getting collection from ${collectionSource}`);
				
				// Step 1: Get the collection to iterate over
				// Get the thinker configuration
				const thinkersList = getConfig('thinkers');
				const collectionThinkerSpec = thinkersList[collectionSource];
				
				if (!collectionThinkerSpec) {
					throw new Error(`Collection source thinker '${collectionSource}' not found in thinkers configuration`);
				}
				
				// Instantiate and execute the collection thinker directly
				const collectionThinker = require(collectionThinkerSpec.module)({
					thinkerSpec: collectionThinkerSpec,
					thinkerParameters,
				});
				
				// Execute the collection thinker
				const collectionResponse = await new Promise((resolve, reject) => {
					collectionThinker.executeRequest({ 
						latestWisdom,
						thinkerParameters,
						...args 
					}, (err, response) => {
						if (err) reject(err);
						else resolve(response);
					});
				});
				
				const collection = collectionResponse.wisdom.elementsToProcess || [];
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
				const startTime = Date.now();
				
				// Create a dynamic conversation for processing items
				// We'll need to use the conversation generator with a custom thinker list
				const tempConversationName = 'iterateItemProcessor';
				
				// Temporarily add our conversation to the config
				const conversationConfig = getConfig('conversation-generator');
				conversationConfig[tempConversationName] = {
					thinkerList: itemProcessorList
				};
				
				// Get the item processor conversation
				const itemConversation = jinaCore.conversationGenerator({
					conversationName: tempConversationName,
					thinkerParameters,
					thoughtProcessName,
				});
				
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
					
					// Remove previous iteration results
					delete itemWisdom.generatedSynthData;
					delete itemWisdom.isValid;
					delete itemWisdom.validationMessage;
					delete itemWisdom.explanation;
					
					try {
						// Run the item processor conversation
						const itemResponse = await itemConversation.getResponse({
							args,
							latestWisdom: itemWisdom
						});
						
						// Extract the generated content
						const resultWisdom = itemResponse.latestWisdom;
						const generatedContent = resultWisdom.generatedSynthData || 
						                       resultWisdom.generatedContent || 
						                       resultWisdom.result;
						
						if (generatedContent) {
							if (accumulator === 'object') {
								processedItems[currentItem] = generatedContent;
							} else if (accumulator === 'array') {
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
				const successCount = Object.keys(processedItems).length;
				const errorCount = Object.keys(errors).length;
				const duration = Date.now() - startTime;
				
				xLog.result(`${moduleName}: Completed processing ${successCount} items successfully, ${errorCount} errors in ${duration}ms`);
				
				const finalWisdom = {
					...latestWisdom,
					processedElements: processedItems,
					_iterationMetadata: {
						success: errorCount === 0,
						processedCount: successCount,
						errorCount: errorCount,
						totalElements: collection.length,
						duration: duration,
						timestamp: new Date().toISOString()
					},
					...(errorCount > 0 && { elementErrors: errors })
				};
				
				// Save summary
				xLog.saveProcessFile(
					`${moduleName}_summary.json`,
					JSON.stringify({
						metadata: finalWisdom._iterationMetadata,
						processedElements: Object.keys(processedItems),
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