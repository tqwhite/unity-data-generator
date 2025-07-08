#!/usr/bin/env node
'use strict';

/*
 * ITERATE-OVER-COLLECTION FACILITATOR
 * ===================================
 *
 * This facilitator processes collections of items through conversations, managing
 * the wisdom flow for each item independently while preserving collection-wide state.
 *
 * KEY DATA FLOW CONCEPTS:
 * ----------------------
 * 1. COLLECTION SOURCE: Gets collection from a thinker (e.g., getAllElements)
 *    - Collection thinker returns wisdom.elementsToProcess array
 *    - Each element becomes currentElement in itemWisdom
 *
 * 2. ITEM WISDOM CREATION:
 *    - For each item: itemWisdom = { ...latestWisdom, [resultValueWisdomPropertyName]: currentItem }
 *    - Default resultValueWisdomPropertyName is 'currentElement' (configurable)
 *    - Previous iteration results are cleaned (generatedSynthData, isValid, etc.)
 *
 * 3. CONVERSATION EXECUTION:
 *    - Each item gets its own conversation instance
 *    - itemWisdom flows into conversation-generator
 *    - Results are collected in processedItems[currentItem]
 *
 * 4. CRITICAL DATA FLOW PATTERNS:
 *    - latestWisdom → itemWisdom → conversation → processedItems
 *    - Collection metadata preserved across iterations
 *    - Each item's results isolated from others
 *
 * COMMON INTEGRATION PATTERNS:
 * ---------------------------
 * - UDG: getAllElements → iterate-over-collection → ['unityGenerator', 'refinerUntilValid']
 * - JEDX: getAllElements → iterate-over-collection → 'unityGenerator'
 *
 * DATA FLOW ISSUES TO WATCH:
 * -------------------------
 * - resultValueWisdomPropertyName must match what downstream thinkers expect (usually 'currentElement')
 * - Wisdom must be properly spread to preserve upstream data
 * - Previous iteration results must be cleaned to avoid contamination
 */

const moduleName = __filename.replace(__dirname + '/', '').replace(/.js$/, '');

const qt = require('qtools-functional-library');
const fs = require('fs');
const wisdomBus = require('../../wisdom-bus/wisdom-bus');
const { migrateThinker } = require('../../wisdom-bus/migrate-thinker-helper');

// Throttling class for async processing
class ThrottledProcessor {
	constructor(maxConcurrent, requestsPerSecond) {
		this.maxConcurrent = maxConcurrent;
		this.requestsPerSecond = requestsPerSecond;
		this.activeCount = 0;
		this.queue = [];
		this.lastRequestTime = 0;
	}

	async acquire() {
		// Rate limiting
		if (this.requestsPerSecond) {
			const now = Date.now();
			const timeSinceLastRequest = now - this.lastRequestTime;
			const minInterval = 1000 / this.requestsPerSecond;

			if (timeSinceLastRequest < minInterval) {
				await new Promise((resolve) =>
					setTimeout(resolve, minInterval - timeSinceLastRequest),
				);
			}

			this.lastRequestTime = Date.now();
		}

		// Concurrency limiting
		while (this.activeCount >= this.maxConcurrent) {
			await new Promise((resolve) => this.queue.push(resolve));
		}

		this.activeCount++;
	}

	release() {
		this.activeCount--;

		if (this.queue.length > 0) {
			const resolve = this.queue.shift();
			resolve();
		}
	}

	async process(fn) {
		await this.acquire();

		try {
			return await fn();
		} finally {
			this.release();
		}
	}
}

// START OF moduleFunction() ============================================================

const moduleFunction = function ({
	jinaCore,
	conversationName,
	thinkerParameters,
	thoughtProcessName,
}) {
	const { xLog, getConfig } = process.global;
	

	xLog.progress(`using iterate-over-collection facilitator`);
	

	const facilitator = ({ latestWisdom, args }) => {
		return new Promise(async (resolve, reject) => {
			try {
				// Get iteration configuration from thought process
				const thoughtProcessConfig = getConfig(thoughtProcessName);
				const iterationConfig =
					thoughtProcessConfig.thoughtProcessConversationList[0];

				const {
					iterableSourceThinkerName,
					resultValueWisdomPropertyName,
					conversationThinkerListName,
					continueOnError = true,
					asyncMode = false,
					maxConcurrentRequests = 1,
					requestsPerSecond = null,
				} = iterationConfig;

				// Debug logging
				xLog.verbose(
					`${moduleName}: asyncMode=${asyncMode}, maxConcurrentRequests=${maxConcurrentRequests}, requestsPerSecond=${requestsPerSecond}`,
				);

				xLog.progress(
					`${moduleName}: Getting collection from ${iterableSourceThinkerName}`,
				);

				// Step 1: Get the collection to iterate over
				// Get the thinker configuration
				const thinkers = getConfig('thinkers');
				const collectionThinkerConfig = thinkers[iterableSourceThinkerName];

				let wisdomAccessor;
				const facilitatorAccessor = {
					facilitatorName: moduleName,
					wisdomAccessor: (value) => {
						wisdomAccessor = value;
						// Don't set execution mode - conversations should remain in serial mode
						// so thinkers within each conversation can share data
					},
				};

				if (!collectionThinkerConfig) {
					throw new Error(
						`Collection source thinker '${iterableSourceThinkerName}' not found in configuration`,
					);
				}

				// Create wisdom-bus for getting collection
				const collectionWisdomBus = wisdomBus({
					initialWisdom: latestWisdom,
					collisionStrategy: 'sequence',
				});

				// Create accessor for collection thinker
				const collectionAccessor = collectionWisdomBus.createAccessor(
					`collection_${iterableSourceThinkerName}_${Date.now()}`,
				);

				// Load and execute the collection thinker directly
				let collectionThinker = require(collectionThinkerConfig.module)({
					thinkerParameters,
					thinkerSpec: collectionThinkerConfig,
				});

				// Wrap to handle both patterns
				collectionThinker = migrateThinker(collectionThinker);

				const collectionResult = await new Promise((resolve, reject) => {
					collectionThinker.executeRequest(
						{
							...args,
							wisdomBus: collectionAccessor,
							thinkerParameters,
						},
						(err, result) => {
							if (err) return reject(err);
							resolve(result);
						},
					);
				});

				// Consolidate to get the collection
				const { wisdom: collectionWisdom } = collectionWisdomBus.consolidate();
				const collection = collectionWisdom.elementsToProcess || [];
				xLog.progress(
					`${moduleName}: Found ${collection.length} items to process`,
				);

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
								timestamp: new Date().toISOString(),
							},
						},
						args,
					});
				}

				// Step 2: Process each item in the collection
				const processedItems = {};
				const errors = {};
				const allConversationMetadata = {};
				const elementCounts = {}; // Track element counts for unique naming
				const startTime = Date.now();

				// Use the configured conversation name
				xLog.progress(
					`${moduleName}: Using conversation '${conversationThinkerListName}' for item processing`,
				);

				// Decide between sync and async processing
				if (!asyncMode || maxConcurrentRequests === 1) {
					// Synchronous processing (existing logic)
					xLog.progress(
						`${moduleName}: Processing ${collection.length} items synchronously`,
					);

					for (let i = 0; i < collection.length; i++) {
						const currentItem = collection[i];
						const itemNumber = i + 1;

						xLog.progress(
							`${moduleName}: Processing item ${itemNumber} of ${collection.length}: ${currentItem}`,
						);

						// Set current item in wisdom
						const itemWisdom = {
							...latestWisdom,
							[resultValueWisdomPropertyName]: currentItem,
							_iterationContext: {
								index: i,
								total: collection.length,
								isFirst: i === 0,
								isLast: i === collection.length - 1,
							},
						};

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
								facilitatorAccessor,
							});
							// Run the item processor conversation
							const itemResponse = await itemConversation.getResponse({
								args: {
									...args,
									initialData: itemWisdom, // Pass item-specific data
								},
								latestWisdom: itemWisdom,
							});

							// Extract the generated content
							const resultWisdom = itemResponse.latestWisdom;
							const generatedContent =
								resultWisdom.generatedSynthData ||
								resultWisdom.generatedContent ||
								resultWisdom.result;

							// Collect conversation metadata if present
							if (resultWisdom._conversationMetadata) {
								Object.assign(
									allConversationMetadata,
									resultWisdom._conversationMetadata,
								);
							}

							if (generatedContent) {
								// Generate unique key for duplicate elements
								let uniqueKey = currentItem;

								// Check if this element name already exists
								if (processedItems[currentItem]) {
									// Initialize counter for this element if not exists
									if (!elementCounts[currentItem]) {
										elementCounts[currentItem] = 1;
									}
									elementCounts[currentItem]++;
									uniqueKey = `${currentItem}_${elementCounts[currentItem]}`;
								}

								processedItems[uniqueKey] = generatedContent;
								xLog.progress(
									`${moduleName}: Successfully processed ${currentItem} as ${uniqueKey}`,
								);
							}
						} catch (error) {
							xLog.error(
								`${moduleName}: Error processing ${currentItem}: ${error.message}`,
							);
							errors[currentItem] = {
								error: error.message,
								timestamp: new Date().toISOString(),
							};

							if (!continueOnError) {
								throw error;
							}
						}
					}
				} else {
					// Asynchronous processing with concurrency control
					xLog.progress(
						`${moduleName}: Processing ${collection.length} items asynchronously with max ${maxConcurrentRequests} concurrent requests`,
					);
					if (requestsPerSecond) {
						xLog.progress(
							`${moduleName}: Rate limited to ${requestsPerSecond} requests per second`,
						);
					}

					const throttler = new ThrottledProcessor(
						maxConcurrentRequests,
						requestsPerSecond,
					);

					// Process all items with throttling
					const results = await Promise.allSettled(
						collection.map((currentItem, i) =>
							throttler.process(async () => {
								const itemNumber = i + 1;
								const processId = `${currentItem}_${Date.now()}_${i}`;

								xLog.progress(
									`${moduleName}: [${processId}] Starting processing of item ${itemNumber}/${collection.length}: ${currentItem}`,
								);

								try {
									// Set current item in wisdom
									const itemWisdom = {
										...latestWisdom,
										[resultValueWisdomPropertyName]: currentItem,
										_iterationContext: {
											index: i,
											total: collection.length,
											isFirst: i === 0,
											isLast: i === collection.length - 1,
											processId: processId,
										},
									};

									// Remove previous iteration results
									delete itemWisdom.generatedSynthData;
									delete itemWisdom.isValid;
									delete itemWisdom.validationMessage;
									delete itemWisdom.explanation;
									delete itemWisdom.processedElements;

									// Create a new conversation instance for each element
									const itemConversation = jinaCore.conversationGenerator({
										conversationName: conversationThinkerListName,
										thinkerParameters,
										thoughtProcessName,
										facilitatorAccessor,
									});

									// Run the item processor conversation
									const itemResponse = await itemConversation.getResponse({
										args: {
											...args,
											initialData: itemWisdom, // Pass item-specific data
										},
										latestWisdom: itemWisdom,
									});

									// Extract the generated content
									const resultWisdom = itemResponse.latestWisdom;
									const generatedContent =
										resultWisdom.generatedSynthData ||
										resultWisdom.generatedContent ||
										resultWisdom.result;

									// Collect conversation metadata if present
									if (resultWisdom._conversationMetadata) {
										// Note: This may have race conditions in async mode
										// Consider using a thread-safe approach if needed
										Object.assign(
											allConversationMetadata,
											resultWisdom._conversationMetadata,
										);
									}

									xLog.progress(
										`${moduleName}: [${processId}] Completed processing of ${currentItem}`,
									);

									return {
										success: true,
										item: currentItem,
										content: generatedContent,
										processId: processId,
										index: i,
									};
								} catch (error) {
									xLog.error(
										`${moduleName}: [${processId}] Error processing ${currentItem}: ${error.message}`,
									);

									if (!continueOnError) {
										throw error;
									}

									return {
										success: false,
										item: currentItem,
										error: error.message,
										processId: processId,
										index: i,
									};
								}
							}),
						),
					);

					// Process results
					results.forEach((result, index) => {
						if (result.status === 'fulfilled' && result.value.success) {
							const { item, content } = result.value;

							if (content) {
								// Generate unique key for duplicate elements
								let uniqueKey = item;

								// Check if this element name already exists
								if (processedItems[item]) {
									// Initialize counter for this element if not exists
									if (!elementCounts[item]) {
										elementCounts[item] = 1;
									}
									elementCounts[item]++;
									uniqueKey = `${item}_${elementCounts[item]}`;
								}

								processedItems[uniqueKey] = content;
								xLog.progress(
									`${moduleName}: Successfully resolved ${item} as ${uniqueKey}`,
								);
							}
						} else {
							const errorInfo =
								result.status === 'rejected'
									? { error: result.reason, item: collection[index] }
									: result.value;

							const item = errorInfo.item || collection[index];
							errors[item] = {
								error: errorInfo.error || 'Unknown error',
								timestamp: new Date().toISOString(),
								processId: errorInfo.processId,
							};
						}
					});

					// Log async processing summary
					const successCount = results.filter(
						(r) => r.status === 'fulfilled' && r.value.success,
					).length;
					const errorCount = results.length - successCount;
					xLog.progress(
						`${moduleName}: Async processing complete: ${successCount} successful, ${errorCount} errors`,
					);
				}

				// Step 3: Build final results
				const successCount = Object.keys(processedItems).length;
				const errorCount = Object.keys(errors).length;
				const duration = Date.now() - startTime;

				xLog.progress(
					`${moduleName}: Completed processing ${successCount} items successfully, ${errorCount} errors in ${duration}ms`,
				);

				// Just add our data to the existing wisdom
				latestWisdom.processedElements = processedItems;
				latestWisdom._iterationMetadata = {
					success: errorCount === 0,
					processedCount: successCount,
					errorCount: errorCount,
					totalElements: collection.length,
					duration: duration,
					timestamp: new Date().toISOString(),
				};
				if (errorCount > 0) {
					latestWisdom.elementErrors = errors;
				}

				// Add any collected conversation metadata
				if (Object.keys(allConversationMetadata).length > 0) {
					latestWisdom._conversationMetadata = {
						...latestWisdom._conversationMetadata,
						...allConversationMetadata,
					};
				}

				const finalWisdom = latestWisdom;

				// Save summary
				xLog.saveProcessFile(
					`${moduleName}_summary.json`,
					JSON.stringify(
						{
							metadata: finalWisdom._iterationMetadata,
							processedElements: Object.keys(processedItems),
							errors: errors,
						},
						null,
						2,
					),
				);

				resolve({
					latestWisdom: finalWisdom,
					args,
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
