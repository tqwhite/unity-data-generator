<script setup>
	import { ref, computed } from 'vue';
	import RecursivePanel from '@/components/RecursivePanel.vue';
	
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
	
	// Calculate the total number of nodes in the tree
	const totalNodeCount = computed(() => {
		// Function to recursively count objects
		const countNodes = (obj) => {
			if (!obj) return 0;
			
			// Initialize count with this node
			let count = 1;
			
			// If it's an object, add the counts of all its properties
			if (typeof obj === 'object' && obj !== null) {
				// For arrays, count each element
				if (Array.isArray(obj)) {
					obj.forEach(item => {
						count += countNodes(item);
					});
				} else {
					// For objects, count each property
					Object.keys(obj).forEach(key => {
						count += countNodes(obj[key]);
					});
				}
			}
			
			return count;
		};
		
		// Start counting from the root
		return props.workingData ? countNodes(props.workingData) - 1 : 0; // Subtract 1 to not count the root itself
	});
	
	// Get the number of top-level nodes
	const topLevelNodeCount = computed(() => {
		if (!props.workingData) return 0;
		return Object.keys(props.workingData).length;
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
			v-else-if="workingData"
			class="w-100 h-100 overflow-auto content-container"
		>
			<!-- Controls for expanding/collapsing -->
			<div class="expansion-controls">
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
				:model-value="expandAll ? Array.from({ length: Object.keys(workingData || {}).length }, (_, i) => i) : [0, 1, 2, 3, 4, 5, 6, 7, 8, 9]"
			>
				<RecursivePanel 
					:data="workingData" 
					:level="1" 
					:default-expanded="defaultExpanded"
					:expand-all="expandAll"
				/>
			</v-expansion-panels>

			<!-- pre class="data-display">{{ JSON.stringify(workingData, null, 2) }}</pre -->
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
		justify-content: flex-end;
		align-items: center;
		margin-bottom: 4px;
		padding-right: 8px;
	}
	
	/* Ensure the buttons maintain consistent width */
	.expansion-controls .v-btn {
		min-width: 110px;
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
