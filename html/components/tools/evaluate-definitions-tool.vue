<script setup>
import { ref, computed, watch, onMounted } from 'vue';

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
});

// Table state
const tableItems = ref([]);
const sortBy = ref({ key: 'cedsMatchesConfidence', order: 'desc' });

// Button state tracking
const buttonStates = ref({});

// Function to handle approval action
const handleApprove = (item) => {
	const itemId = item.refId || item.id;
	// Set temporary button state
	if (!buttonStates.value[itemId]) {
		buttonStates.value[itemId] = {};
	}
	buttonStates.value[itemId].approveClicked = true;
	
	// Implement approval logic here
	console.log('Approved:', item);
	
	// Reset button state after 10 seconds
	setTimeout(() => {
		buttonStates.value[itemId].approveClicked = false;
	}, 10000);
};

// Function to handle rejection action
const handleReject = (item) => {
	const itemId = item.refId || item.id;
	// Set temporary button state
	if (!buttonStates.value[itemId]) {
		buttonStates.value[itemId] = {};
	}
	buttonStates.value[itemId].rejectClicked = true;
	
	// Implement rejection logic here
	console.log('Rejected (Terrible):', item);
	
	// Reset button state after 10 seconds
	setTimeout(() => {
		buttonStates.value[itemId].rejectClicked = false;
	}, 10000);
};

// Filter items that have cedsMatchesConfidence
const filteredItems = computed(() => {
	return tableItems.value.filter(item => 
		item.cedsMatchesConfidence !== undefined && 
		item.cedsMatchesConfidence !== null
	);
});

// Sorted items based on current sort criteria
const sortedItems = computed(() => {
	return [...filteredItems.value].sort((a, b) => {
		const aValue = a[sortBy.value.key];
		const bValue = b[sortBy.value.key];
		
		// Handle nullish values
		if (aValue === null || aValue === undefined) return sortBy.value.order === 'asc' ? -1 : 1;
		if (bValue === null || bValue === undefined) return sortBy.value.order === 'asc' ? 1 : -1;
		
		// Sort for confidence - handle it as a string if it's not a number
		if (sortBy.value.key === 'cedsMatchesConfidence') {
			// Try numeric sort first
			const aNum = parseFloat(aValue);
			const bNum = parseFloat(bValue);
			
			// Check if both values can be parsed as numbers
			if (!isNaN(aNum) && !isNaN(bNum)) {
				return sortBy.value.order === 'asc' 
					? aNum - bNum
					: bNum - aNum;
			}
			
			// Fall back to string comparison if they're not valid numbers
			const strComp = String(aValue).localeCompare(String(bValue));
			return sortBy.value.order === 'asc' ? strComp : -strComp;
		}
		
		// String comparison for other fields
		const comparison = String(aValue).localeCompare(String(bValue));
		return sortBy.value.order === 'asc' ? comparison : -comparison;
	});
});

// Change sort criteria
const changeSort = (key) => {
	console.log('Changing sort to:', key);
	if (sortBy.value.key === key) {
		// Toggle direction if clicking the same column
		sortBy.value.order = sortBy.value.order === 'asc' ? 'desc' : 'asc';
	} else {
		// New column, default to descending for confidence, ascending for others
		sortBy.value = { 
			key: key, 
			order: key === 'cedsMatchesConfidence' ? 'desc' : 'asc' 
		};
	}
	console.log('New sort state:', sortBy.value);
};

// Initialize data
const initializeData = () => {
	if (!props.workingData) {
		tableItems.value = [];
		return;
	}

	// Convert data to array format
	let items = [];
	if (Array.isArray(props.workingData)) {
		items = props.workingData;
	} else if (typeof props.workingData === 'object') {
		items = Object.values(props.workingData);
	}

	tableItems.value = items;
};

// Initialize on mount and when workingData changes
onMounted(() => {
	initializeData();
});

// Watch for changes in workingData
watch(
	() => props.workingData,
	() => {
		initializeData();
	},
	{ immediate: true }
);
</script>

<template>
	<div class="evaluate-tool-container">
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
		<div v-else-if="workingData" class="w-100 h-100">
			<div v-if="filteredItems.length === 0" class="text-center pa-4">
				<div class="text-h6 mb-3">No CEDS Match Candidates Found</div>
				<div class="text-body-1">
					Use outline or spreadsheet view to look at this object.
				</div>
			</div>
			<div v-else class="evaluate-table-container">
				<table class="evaluate-table">
					<thead>
						<tr>
							<th class="actions-col">Actions</th>
							<th 
								class="confidence-col"
								@click="changeSort('cedsMatchesConfidence')"
								:class="{ 
									'sort-active': sortBy.key === 'cedsMatchesConfidence',
									'sort-asc': sortBy.key === 'cedsMatchesConfidence' && sortBy.order === 'asc',
									'sort-desc': sortBy.key === 'cedsMatchesConfidence' && sortBy.order === 'desc'
								}"
							>
								<div class="header-content">
									<span>Confidence</span>
									<v-icon size="small">{{ 
										sortBy.key === 'cedsMatchesConfidence' 
											? (sortBy.order === 'asc' ? 'mdi-arrow-up' : 'mdi-arrow-down') 
											: 'mdi-arrow-up-down' 
									}}</v-icon>
								</div>
							</th>
							<th 
								class="element-col"
								@click="changeSort('Name')"
								:class="{ 
									'sort-active': sortBy.key === 'Name',
									'sort-asc': sortBy.key === 'Name' && sortBy.order === 'asc',
									'sort-desc': sortBy.key === 'Name' && sortBy.order === 'desc'
								}"
							>
								<div class="header-content">
									<span>Element Information</span>
									<v-icon size="small">{{ 
										sortBy.key === 'Name' 
											? (sortBy.order === 'asc' ? 'mdi-arrow-up' : 'mdi-arrow-down') 
											: 'mdi-arrow-up-down' 
									}}</v-icon>
								</div>
							</th>
						</tr>
					</thead>
					<tbody>
						<tr v-for="item in sortedItems" :key="item.refId || item.id">
							<td class="actions-col">
								<div class="action-buttons">
									<v-btn 
										:color="buttonStates[item.refId || item.id]?.approveClicked ? 'grey' : 'success'" 
										size="small" 
										variant="outlined" 
										class="mb-2"
										@click="handleApprove(item)"
									>
										<span :class="{'smaller-text': buttonStates[item.refId || item.id]?.approveClicked}">
											{{ buttonStates[item.refId || item.id]?.approveClicked ? 'Not Implemented' : 'Approve' }}
										</span>
									</v-btn>
									<v-btn 
										:color="buttonStates[item.refId || item.id]?.rejectClicked ? 'grey' : 'error'"
										size="small" 
										variant="outlined"
										@click="handleReject(item)"
									>
										<span :class="{'smaller-text': buttonStates[item.refId || item.id]?.rejectClicked}">
											{{ buttonStates[item.refId || item.id]?.rejectClicked ? 'Not Implemented' : 'Terrible' }}
										</span>
									</v-btn>
								</div>
							</td>
							<td class="confidence-col">
								{{ item.cedsMatchesConfidence }}
							</td>
							<td class="element-col">
								<div class="element-container">
									<div class="element-line">
										<span class="element-description"><b>{{ item.Name || item.refId }}:</b> {{ item.Description }}</span>
									</div>
									<div class="ceds-line">
										<span class="ceds-definition"><b>{{ item.cedsMatchesGlobalID }}:</b> {{ item.cedsMatchesDefinition || item.cedsDefinition }}</span>
									</div>
								</div>
							</td>
						</tr>
					</tbody>
				</table>
			</div>
		</div>
		<div v-else class="text-center">
			<v-icon size="64" class="mb-3 text-medium-emphasis">mdi-table-check</v-icon>
			<div>Select an item from the list to evaluate CEDS matches</div>
		</div>
	</div>
</template>

<style scoped>
.evaluate-tool-container {
	width: 100%;
	height: 100%;
	display: flex;
	justify-content: flex-start;
	align-items: flex-start;
}

.evaluate-table-container {
	width: 100%;
	max-height: calc(100vh - 200px);
	overflow-y: auto;
}

.evaluate-table {
	width: 100%;
	border-collapse: collapse;
	table-layout: fixed;
}

.evaluate-table th {
	background-color: rgba(76, 175, 80, 0.1);
	font-weight: bold;
	text-align: left;
	padding: 10px;
	border-bottom: 2px solid rgba(76, 175, 80, 0.3);
	cursor: pointer;
	user-select: none;
	transition: background-color 0.2s;
}

.evaluate-table th:hover {
	background-color: rgba(76, 175, 80, 0.2);
}

/* Add styles for header content */
.header-content {
	display: inline-flex;
	align-items: center;
	gap: 5px;
}

.evaluate-table td {
	padding: 10px;
	border-bottom: 1px solid rgba(128, 128, 128, 0.5);
	vertical-align: top;
}

.evaluate-table tr:hover td {
	background-color: rgba(128, 128, 128, 0.05);
}

.actions-col {
	width: 100px;
}

.confidence-col {
	width: 140px;
	text-align: center;
}

.element-col {
	width: calc(100% - 240px);
}

.action-buttons {
	display: flex;
	flex-direction: column;
	align-items: center;
}

.element-container {
	display: flex;
	flex-direction: column;
	gap: 8px;
}

.element-line {
	display: flex;
	flex-direction: column;
}

.ceds-line {
	display: flex;
	flex-direction: column;
	margin-top: 4px;
	padding-top: 4px;
	border-top: 1px dashed rgba(0, 0, 0, 0.1);
}

.element-name {
	font-weight: bold;
}

.element-description {
	font-style: italic;
	margin-top: 2px;
	color: rgba(0, 0, 0, 0.7);
}

.ceds-id {
	font-weight: bold;
	color: #2196F3;
}

.ceds-definition {
	margin-top: 2px;
	color: rgba(0, 0, 0, 0.7);
}

.sort-active {
	background-color: rgba(76, 175, 80, 0.2);
}

.sort-asc .v-icon,
.sort-desc .v-icon {
	color: rgba(76, 175, 80, 0.8);
}

.smaller-text {
	font-size: 80%;
}
</style>