<script setup>
	import { ref, computed, watch, nextTick } from 'vue';
	import RecursivePanel from '@/components/RecursivePanel.vue';
	import SampleObjectPanel from '@/components/tools/SampleObjectPanel.vue';
	import { useNamodelStore } from '@/stores/namodelStore';
	
	// Initialize the store
	const namodelStore = useNamodelStore();
	
	// Props to receive the data and loading/error states
	const props = defineProps({
		workingData: {
			type: [Object, Array],
			default: null,
		},
		isLoading: {
			type: Boolean,
			default: false,
		},
		error: {
			type: String,
			default: '',
		},
		// Number of levels to expand by default
		defaultExpanded: {
			type: Number,
			default: 2 // Expand top two levels by default
		},
		// Target path to expand to (array of keys)
		targetPath: {
			type: Array,
			default: () => []
		}
	});

	// State for expansion control
	const expandAll = ref(false);
	const isExpanding = ref(false);
	const isCollapsing = ref(false);
	
	// State for sample object panel
	const showSampleObject = ref(false);
	
	// State for search
	const showSearch = ref(false);
	const searchQuery = ref('');
	const searchResults = ref([]);
	const searchLoading = ref(false);
	const selectedSearchResult = ref(null);
	const activeTargetPath = ref([]);

	// Toggle search overlay
	const toggleSearch = () => {
		showSearch.value = !showSearch.value;
		if (!showSearch.value) {
			// Clear search when closing
			searchQuery.value = '';
			searchResults.value = [];
		} else {
			// Focus the search input when opening
			nextTick(() => {
				document.getElementById('outline-search-input')?.focus();
			});
		}
	};
	
	const sampleObject = computed(() => {
		return props.workingData ? 
			(Array.isArray(props.workingData) ? props.workingData[0] : props.workingData) : 
			{};
	});
	
	// Create a hierarchical structure based on XPath values
	const hierarchicalData = computed(() => {
		if (!props.workingData) return null;
		
		// Create an empty hierarchy object
		const hierarchy = {};
		
		// We need to convert the 'combined object' from flat to hierarchical
		// Get all items from the workingData (which is already in combined format)
		const allItems = props.workingData;
		
		// Process each item based on its XPath
		Object.values(allItems).forEach(item => {
			if (!item.XPath) return; // Skip items without XPath
			
			// Split the XPath into parts, removing empty entries
			// e.g. "/root/child/grandchild" -> ["root", "child", "grandchild"]
			const parts = item.XPath.split('/').filter(part => part);
			
			// If no valid parts, skip
			if (parts.length === 0) return;
			
			// Start at the root of our hierarchy
			let current = hierarchy;
			
			// Navigate through each part of the path
			for (let i = 0; i < parts.length; i++) {
				const part = parts[i];
				
				// If we're at the final part, store the actual item
				if (i === parts.length - 1) {
					// Use the part as a key, add metadata to display the item nicely
					current[part] = {
						_metadata: {
							name: item.Name || part,
							description: item.Description || '',
							xpath: item.XPath || '',
							type: item.Type || '',
							characteristics: item.Characteristics || '',
							format: item.Format || '',
							cedsId: item['CEDS ID'] || '',
						},
						_data: item
					};
				} else {
					// Create the nested object path if it doesn't exist
					if (!current[part]) {
						current[part] = {};
					}
					// Move to the next level
					current = current[part];
				}
			}
		});
		
		return hierarchy;
	});
	
	// Calculate the total number of nodes in the tree
	const totalNodeCount = computed(() => {
		// Function to recursively count objects
		const countNodes = (obj) => {
			if (!obj) return 0;
			
			// Initialize count with this node
			let count = 1;
			
			// If it's an object, add the counts of all its properties
			if (typeof obj === 'object' && obj !== null) {
				// Skip _metadata and _data properties
				const keys = Object.keys(obj).filter(key => key !== '_metadata' && key !== '_data');
				
				// For arrays, count each element
				if (Array.isArray(obj)) {
					obj.forEach(item => {
						count += countNodes(item);
					});
				} else {
					// For objects, count each property
					keys.forEach(key => {
						count += countNodes(obj[key]);
					});
				}
			}
			
			return count;
		};
		
		// Start counting from the root
		return hierarchicalData.value ? countNodes(hierarchicalData.value) - 1 : 0; // Subtract 1 to not count the root itself
	});
	
	// Get the number of elements with CEDS matches from the store
	const cedsMatchCount = computed(() => {
		// If we're working with a standalone data object not in the store
		if (props.workingData && !namodelStore.combinedObject) {
			// Use local calculation
			return Object.values(props.workingData).filter(item => 
				item && item.cedsMatchesConfidence !== undefined && item.cedsMatchesConfidence !== null
			).length;
		}
		
		// Otherwise use the store getter
		return namodelStore.cedsMatchCount;
	});
	
	// Get the number of top-level nodes
	const topLevelNodeCount = computed(() => {
		if (!hierarchicalData.value) return 0;
		return Object.keys(hierarchicalData.value).length;
	});
	
	// Text to display for node counts
	const nodeCountDisplay = computed(() => {
		if (totalNodeCount.value === 0) return "No nodes to render";
		
		if (expandAll.value) {
			return `Rendering all ${totalNodeCount.value} nodes`;
		} else {
			// Default is showing 2 levels
			return `Rendering ${topLevelNodeCount.value} top-level nodes (${totalNodeCount.value} total)`;
		}
	});
	
	// Debounce function to prevent rapid consecutive calls
	const debounce = (fn, delay) => {
		let timeoutId;
		return function(...args) {
			if (timeoutId) {
				clearTimeout(timeoutId);
			}
			timeoutId = setTimeout(() => {
				fn.apply(this, args);
				timeoutId = null;
			}, delay);
		};
	};
	
	// Expand function with immediate UI feedback
	const expandAllPanels = () => {
		if (isExpanding.value || isCollapsing.value) return;
		
		// Immediately show spinner
		isExpanding.value = true;
		
		// Use setTimeout to allow UI to update before the heavy operation
		setTimeout(() => {
			// Perform the actual expansion
			expandAll.value = true;
			
			// Clear the spinner after a delay
			setTimeout(() => {
				isExpanding.value = false;
			}, 800); // Keep spinner visible for at least 800ms for feedback
		}, 50); // Small delay to ensure UI updates
	};
	
	// Collapse function with immediate UI feedback
	const collapseAllPanels = () => {
		if (isExpanding.value || isCollapsing.value) return;
		
		// Immediately show spinner
		isCollapsing.value = true;
		
		// Use setTimeout to allow UI to update before the heavy operation
		setTimeout(() => {
			// Perform the actual collapse
			expandAll.value = false;
			
			// Clear the spinner after a delay
			setTimeout(() => {
				isCollapsing.value = false;
			}, 800); // Keep spinner visible for at least 800ms for feedback
		}, 50); // Small delay to ensure UI updates
	};
	
	// Function to open the sample object panel
	const openSampleObjectPanel = () => {
		showSampleObject.value = true;
	};
	
	// Function to close the sample object panel
	const closeSampleObjectPanel = () => {
		showSampleObject.value = false;
	};
	
	// Search functionality
	const performSearch = () => {
		if (!searchQuery.value.trim() || !props.workingData) {
			searchResults.value = [];
			return;
		}
		
		searchLoading.value = true;
		
		// Use setTimeout to prevent UI blocking during search
		setTimeout(() => {
			const query = searchQuery.value.toLowerCase().trim();
			const results = [];
			
			// Helper function to search recursively through the hierarchical data
			const searchInObject = (obj, currentPath = []) => {
				if (!obj) return;
				
				Object.entries(obj).forEach(([key, value]) => {
					// Skip metadata and data properties in the search
					if (key === '_metadata' || key === '_data') return;
					
					// Build the current path including this key
					const path = [...currentPath, key];
					
					// Check if this item has metadata (is a leaf node)
					if (value && value._metadata) {
						const metadata = value._metadata;
						const name = metadata.name || key;
						const description = metadata.description || '';
						
						// Search in name, description, and other relevant fields
						if (
							name.toLowerCase().includes(query) ||
							description.toLowerCase().includes(query) ||
							(metadata.xpath && metadata.xpath.toLowerCase().includes(query)) ||
							(metadata.type && metadata.type.toLowerCase().includes(query)) ||
							(metadata.characteristics && metadata.characteristics.toLowerCase().includes(query)) ||
							(metadata.format && metadata.format.toLowerCase().includes(query))
						) {
							// Track which fields matched
							const matches = {
								name: name.toLowerCase().includes(query),
								description: description.toLowerCase().includes(query),
								xpath: metadata.xpath ? metadata.xpath.toLowerCase().includes(query) : false,
								type: metadata.type ? metadata.type.toLowerCase().includes(query) : false,
								characteristics: metadata.characteristics ? metadata.characteristics.toLowerCase().includes(query) : false,
								format: metadata.format ? metadata.format.toLowerCase().includes(query) : false
							};
							
							// Add to results with full context and match information
							results.push({
								name,
								description: description.substring(0, 100) + (description.length > 100 ? '...' : ''),
								xpath: metadata.xpath || '',
								type: metadata.type || '',
								characteristics: metadata.characteristics || '',
								format: metadata.format || '',
								path,
								context: generatePathString(path),
								data: value._data,
								matches,
								query  // Store the query to use for highlighting
							});
						}
					}
					
					// Continue searching in nested objects if they exist
					if (value && typeof value === 'object' && !(value instanceof Array)) {
						searchInObject(value, path);
					}
				});
			};
			
			// Start the search from the root of hierarchical data
			searchInObject(hierarchicalData.value);
			
			// Sort results by relevance (name matches first, then path length)
			results.sort((a, b) => {
				// Name matches take precedence
				const aNameMatch = a.name.toLowerCase().includes(query);
				const bNameMatch = b.name.toLowerCase().includes(query);
				
				if (aNameMatch && !bNameMatch) return -1;
				if (!aNameMatch && bNameMatch) return 1;
				
				// Then sort by path length (shorter paths first)
				return a.path.length - b.path.length;
			});
			
			searchResults.value = results;
			searchLoading.value = false;
		}, 10);
	};
	
	// Generate a readable path string for display
	const generatePathString = (path) => {
		return path.join(' > ');
	};
	
	// Function to highlight matched text in strings
	const highlightMatch = (text, query) => {
		if (!text || !query || query.trim() === '') return text;
		
		const regex = new RegExp(`(${escapeRegExp(query.trim())})`, 'gi');
		return text.replace(regex, '<span class="highlight-match">$1</span>');
	};
	
	// Helper to escape special characters in regex
	const escapeRegExp = (str) => {
		return str.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
	};
	
	// Handle search result selection
	const selectSearchResult = (result) => {
		// Reset any existing selection first
		activeTargetPath.value = [];
		
		// Close the search overlay before updating path to allow UI to update
		showSearch.value = false;
		
		// Wait a short moment to ensure the overlay is closed
		setTimeout(() => {
			// Update selected result
			selectedSearchResult.value = result;
			
			// Set the target path, which will trigger expansion in RecursivePanel
			activeTargetPath.value = result.path;
			
			// Log to console to help debug
			console.log('Navigating to:', result.path);
		}, 50);
	};
	
	// Watch for changes in the search query
	watch(searchQuery, (newQuery) => {
		if (newQuery.trim()) {
			performSearch();
		} else {
			searchResults.value = [];
		}
	});
</script>

<template>
	<div class="tool-container">
		<div v-if="isLoading" class="text-center">
			<v-progress-circular
				indeterminate
				size="64"
				class="mb-3"
			></v-progress-circular>
			<div>Loading data...</div>
		</div>
		<div v-else-if="error" class="text-center text-error">
			<v-icon color="error" size="64" class="mb-3">mdi-alert-circle</v-icon>
			<div>{{ error }}</div>
		</div>
		<div
			v-else-if="hierarchicalData"
			class="w-100 h-100 overflow-auto content-container"
		>
			<!-- Controls for the outline view -->
			<div class="expansion-controls">
				<!-- Sample Object Button - Left Aligned -->
				<v-btn
					density="compact"
					variant="text"
					size="small"
					color="primary"
					@click="openSampleObjectPanel"
					:disabled="!workingData"
					class="sample-object-btn mr-2"
					title="Sample Object"
				>
					<v-icon size="small" class="mr-1">mdi-file-document-outline</v-icon>
				</v-btn>
				
				<!-- Search Button -->
				<v-btn
					density="compact"
					variant="text"
					size="small"
					color="primary"
					@click="toggleSearch"
					:disabled="!workingData"
					class="search-btn mr-2"
					title="Search"
				>
					<v-icon size="small" class="mr-1">mdi-magnify</v-icon>
				</v-btn>
				
				<v-spacer></v-spacer>
				
				<!-- Element Count Legend -->
				<div class="element-count-legend" v-if="workingData">
					<span class="legend-item" v-if="workingData && Object.values(workingData)[0]?.SheetName">
						<strong>{{ Object.values(workingData)[0]?.SheetName || Object.values(workingData)[0]?.sheetName || '' }}</strong>
					</span>
					<span class="legend-item ml-2">Total Elements: {{ namodelStore.combinedObject ? namodelStore.totalElementCount : totalNodeCount }}</span>
					<span class="legend-item ml-2">CEDS AI Matches: {{ cedsMatchCount }}</span>
				</div>
				
				<!-- Expand and Collapse Buttons - Right Aligned -->
				<v-btn
					density="compact"
					variant="text"
					size="small"
					color="primary"
					@click="expandAllPanels"
					:disabled="isExpanding || isCollapsing"
					class="mr-2"
				>
					<div class="d-inline-flex align-center">
						<v-progress-circular
							v-if="isExpanding"
							indeterminate
							size="18"
							width="2"
							color="primary"
							class="mr-1"
						></v-progress-circular>
						<v-icon v-else size="small" class="mr-1">mdi-unfold-more-horizontal</v-icon>
					</div>
					Expand All
				</v-btn>
				<v-btn
					density="compact"
					variant="text"
					size="small"
					color="grey-darken-1"
					@click="collapseAllPanels"
					:disabled="isExpanding || isCollapsing"
				>
					<div class="d-inline-flex align-center">
						<v-progress-circular
							v-if="isCollapsing"
							indeterminate
							size="18"
							width="2"
							color="grey-darken-1"
							class="mr-1"
						></v-progress-circular>
						<v-icon v-else size="small" class="mr-1">mdi-unfold-less-horizontal</v-icon>
					</div>
					Collapse All
				</v-btn>
			</div>
			
			<!-- Node count information -->
			<div class="node-count-info">
				<span>{{ nodeCountDisplay }}</span>
			</div>
			
			<!-- Data will be displayed here -->
			<v-expansion-panels 
				density="compact" 
				class="mt-1 pt-0" 
				multiple 
				:model-value="expandAll ? Array.from({ length: Object.keys(hierarchicalData || {}).length }, (_, i) => i) : [0, 1, 2, 3, 4, 5, 6, 7, 8, 9]"
			>
				<RecursivePanel 
					:data="hierarchicalData" 
					:level="1" 
					:default-expanded="defaultExpanded"
					:expand-all="expandAll"
					:target-path="activeTargetPath"
				/>
			</v-expansion-panels>

			<!-- pre class="data-display">{{ JSON.stringify(hierarchicalData, null, 2) }}</pre -->
			
			<!-- Sample Object Panel -->
			<SampleObjectPanel 
				:data="sampleObject"
				:is-open="showSampleObject"
				@close="closeSampleObjectPanel"
			/>
			
			<!-- Search Overlay -->
			<div class="search-overlay" v-if="showSearch">
				<div class="search-container">
					<div class="search-header">
						<div class="search-title">Search Elements</div>
						<v-btn
							icon
							density="compact"
							variant="text"
							size="small"
							@click="toggleSearch"
							class="close-search-btn"
						>
							<v-icon>mdi-close</v-icon>
						</v-btn>
					</div>
					
					<div class="search-input-container">
						<v-text-field
							id="outline-search-input"
							v-model="searchQuery"
							label="Search by name, description, type..."
							variant="outlined"
							density="compact"
							hide-details
							clearable
							autofocus
							prepend-inner-icon="mdi-magnify"
							class="search-input"
						></v-text-field>
					</div>
					
					<div class="search-results-container">
						<div v-if="searchLoading" class="search-loading">
							<v-progress-circular indeterminate size="24" width="2" color="primary"></v-progress-circular>
							<span class="ml-2">Searching...</span>
						</div>
						
						<div v-else-if="searchResults.length === 0 && searchQuery.trim()" class="search-no-results">
							No results found for "{{ searchQuery }}"
						</div>
						
						<div v-else-if="searchResults.length === 0" class="search-prompt">
							Enter a search term to find elements
						</div>
						
						<div v-else class="search-results-list">
							<div 
								v-for="(result, index) in searchResults" 
								:key="index" 
								class="search-result-item"
								@click="selectSearchResult(result)"
							>
								<div class="result-name" v-html="result.matches.name ? highlightMatch(result.name, result.query) : result.name"></div>
								<div class="result-path">{{ result.context }}</div>
								
								<!-- Description with highlighting if matched -->
								<div v-if="result.description" class="result-description"
									v-html="result.matches.description ? highlightMatch(result.description, result.query) : result.description">
								</div>
								
								<!-- Show matched fields with highlighting -->
								<div v-if="result.matches.xpath" class="result-matched-field">
									<span class="field-label">XPath:</span>
									<span v-html="highlightMatch(result.xpath, result.query)"></span>
								</div>
								
								<div v-if="result.matches.type" class="result-matched-field">
									<span class="field-label">Type:</span>
									<span v-html="highlightMatch(result.type, result.query)"></span>
								</div>
								
								<div v-if="result.matches.characteristics" class="result-matched-field">
									<span class="field-label">Characteristics:</span>
									<span v-html="highlightMatch(result.characteristics, result.query)"></span>
								</div>
								
								<div v-if="result.matches.format" class="result-matched-field">
									<span class="field-label">CodeSet:</span>
									<span v-html="highlightMatch(result.format, result.query)"></span>
								</div>
							</div>
						</div>
					</div>
				</div>
			</div>
		</div>
		<div v-else class="text-center">
			<v-icon size="64" class="mb-3 text-medium-emphasis">mdi-file-tree</v-icon>
			<div>Select an item from the list to view details in outline format</div>
		</div>
	</div>
</template>

<style>
	.tool-container {
		width: 100%;
		height: 100%;
		display: flex;
		justify-content: flex-start;
		align-items: flex-start;
	}

	.data-display {
		text-align: left;
		width: 100%;
		max-width: 100%;
		white-space: pre-wrap;
		word-wrap: break-word;
		color: #ff5722; /* Orange color for Outline */
	}

	.content-container {
		max-width: 100%;
		overflow-x: hidden;
		padding-top: 0 !important;
		margin-top: 0 !important;
	}
	
	.expansion-controls {
		display: flex;
		justify-content: space-between;
		align-items: center;
		margin-bottom: 4px;
		padding-right: 8px;
		padding-left: 8px;
	}
	
	/* Ensure the buttons maintain consistent width */
	.expansion-controls .v-btn:not(.sample-object-btn) {
		min-width: 110px;
	}
	
	/* Sample object button styles */
	.sample-object-btn {
		min-width: 40px;
	}
	
	/* Ensure spinner is visible */
	.v-progress-circular {
		opacity: 1 !important;
	}
	
	/* No Blanks checkbox styling */
	.no-blanks-checkbox {
		margin-top: 0;
		margin-left: 8px;
	}

	.no-blanks-checkbox :deep(.v-selection-control) {
		min-height: unset;
	}

	.no-blanks-checkbox :deep(.v-label) {
		font-size: 0.8rem;
		opacity: 0.8;
	}
	
	/* Style for node count information */
	.node-count-info {
		text-align: right;
		font-size: 0.75rem;
		color: rgba(0, 0, 0, 0.6);
		margin-top: -2px;
		margin-bottom: 4px;
		padding-right: 12px;
		font-style: italic;
	}
	
	/* Element Count Legend styling */
	.element-count-legend {
		display: flex;
		align-items: center;
		margin-right: 12px;
		background-color: rgba(0, 0, 0, 0.03);
		padding: 2px 8px;
		border-radius: 4px;
		font-size: 0.75rem;
		border: 1px solid rgba(0, 0, 0, 0.1);
	}
	
	.legend-item {
		white-space: nowrap;
		font-weight: 500;
	}

	/* Search Button Styling */
	.search-btn {
		min-width: 40px;
	}

	/* Search Overlay Styling */
	.search-overlay {
		position: fixed;
		top: 0;
		left: 0;
		right: 0;
		bottom: 0;
		background-color: rgba(0, 0, 0, 0.5);
		z-index: 1000;
		display: flex;
		align-items: center;
		justify-content: center;
	}

	.search-container {
		width: 90%;
		max-width: 600px;
		max-height: 80vh;
		background-color: white;
		border-radius: 8px;
		box-shadow: 0 4px 16px rgba(0, 0, 0, 0.15);
		display: flex;
		flex-direction: column;
		overflow: hidden;
	}

	.search-header {
		display: flex;
		justify-content: space-between;
		align-items: center;
		padding: 12px 16px;
		background-color: #f5f5f5;
		border-bottom: 1px solid rgba(0, 0, 0, 0.1);
	}

	.search-title {
		font-weight: 500;
		font-size: 1.1rem;
		color: rgba(0, 0, 0, 0.8);
	}

	.search-input-container {
		padding: 16px 16px 8px;
	}

	.search-results-container {
		overflow-y: auto;
		max-height: 60vh;
		padding: 0 16px 16px;
	}

	.search-loading, .search-no-results, .search-prompt {
		display: flex;
		align-items: center;
		justify-content: center;
		height: 100px;
		color: rgba(0, 0, 0, 0.6);
		font-style: italic;
	}

	.search-results-list {
		max-height: 100%;
	}

	.search-result-item {
		padding: 12px;
		border-radius: 4px;
		border: 1px solid rgba(0, 0, 0, 0.1);
		margin-bottom: 8px;
		cursor: pointer;
		transition: all 0.2s ease;
	}

	.search-result-item:hover {
		border-color: #1976d2;
		background-color: rgba(25, 118, 210, 0.05);
	}

	.result-name {
		font-weight: 500;
		font-size: 1rem;
		color: #1976d2;
		margin-bottom: 4px;
	}

	.result-path {
		font-size: 0.8rem;
		color: rgba(0, 0, 0, 0.6);
		margin-bottom: 6px;
		font-family: monospace;
	}

	.result-description {
		font-size: 0.85rem;
		color: rgba(0, 0, 0, 0.7);
		font-style: italic;
	}
	
	/* Highlighted match styling */
	.highlight-match {
		font-weight: bold;
	}
	
	/* Matched fields styling */
	.result-matched-field {
		font-size: 0.8rem;
		margin-top: 4px;
		color: rgba(0, 0, 0, 0.7);
	}
	
	.field-label {
		font-weight: 500;
		margin-right: 4px;
		color: rgba(0, 0, 0, 0.6);
	}
</style>