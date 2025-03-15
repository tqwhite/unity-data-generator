<script setup>
	import { ref, computed } from 'vue';
	import RecursivePanel from '@/components/RecursivePanel.vue';
	import SampleObjectPanel from '@/components/tools/SampleObjectPanel.vue';
	
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
		}
	});

	// State for expansion control
	const expandAll = ref(false);
	const isExpanding = ref(false);
	const isCollapsing = ref(false);
	
	// State for sample object panel
	const showSampleObject = ref(false);
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
				
				<v-spacer></v-spacer>
				
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
				/>
			</v-expansion-panels>

			<!-- pre class="data-display">{{ JSON.stringify(hierarchicalData, null, 2) }}</pre -->
			
			<!-- Sample Object Panel -->
			<SampleObjectPanel 
				:data="sampleObject"
				:is-open="showSampleObject"
				@close="closeSampleObjectPanel"
			/>
		</div>
		<div v-else class="text-center">
			<v-icon size="64" class="mb-3 text-medium-emphasis">mdi-file-tree</v-icon>
			<div>Select an item from the list to view details in outline format</div>
		</div>
	</div>
</template>

<style scoped>
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
</style>
