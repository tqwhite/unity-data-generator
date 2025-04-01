<script setup>
import { ref, computed, watch, onMounted } from 'vue';
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
});

// Table state
const tableItems = ref([]);
const sortBy = ref({ key: 'cedsMatchesConfidence', order: 'desc' });

// Watch for changes in store sort preferences
watch(
	() => namodelStore.evaluationPreferences.sortBy,
	(newSortPreference) => {
		if (newSortPreference) {
			sortBy.value = { ...newSortPreference };
		}
	},
	{ immediate: true, deep: true }
);

// Button state tracking
const buttonStates = ref({});

// Function to handle approval action
const handleApprove = async (item) => {
	const itemId = item.refId || item.id;
	const matchRefId = item.cedsMatchesRefId || itemId;
	
	// Set voting state
	if (!buttonStates.value[itemId]) {
		buttonStates.value[itemId] = {};
	}
	buttonStates.value[itemId].isVoting = true;
	
	try {
		// Send the vote to the API (true = good match)
		const result = await namodelStore.sendCedsMatchVote(matchRefId, true);
		
		// Update button state to show counts
		buttonStates.value[itemId].voted = true;
		buttonStates.value[itemId].voteType = 'approve';
		buttonStates.value[itemId].goodCount = result.goodCount;
		buttonStates.value[itemId].badCount = result.badCount;
		
		// Force a refresh of the component
		buttonStates.value = { ...buttonStates.value };
	} catch (err) {
		console.error('Error submitting approval vote:', err);
		buttonStates.value[itemId].error = err.message;
	} finally {
		buttonStates.value[itemId].isVoting = false;
	}
};

// Function to handle rejection action
const handleReject = async (item) => {
	const itemId = item.refId || item.id;
	const matchRefId = item.cedsMatchesRefId || itemId;
	
	// Set voting state
	if (!buttonStates.value[itemId]) {
		buttonStates.value[itemId] = {};
	}
	buttonStates.value[itemId].isVoting = true;
	
	try {
		// Send the vote to the API (false = bad match)
		const result = await namodelStore.sendCedsMatchVote(matchRefId, false);
		
		// Update button state to show counts
		buttonStates.value[itemId].voted = true;
		buttonStates.value[itemId].voteType = 'reject';
		buttonStates.value[itemId].goodCount = result.goodCount;
		buttonStates.value[itemId].badCount = result.badCount;
		
		// Force a refresh of the component
		buttonStates.value = { ...buttonStates.value };
	} catch (err) {
		console.error('Error submitting rejection vote:', err);
		buttonStates.value[itemId].error = err.message;
	} finally {
		buttonStates.value[itemId].isVoting = false;
	}
};

// Filter items that have cedsMatchesConfidence
const filteredItems = computed(() => {
	return tableItems.value.filter(item => 
		item.cedsMatchesConfidence !== undefined && 
		item.cedsMatchesConfidence !== null
	);
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

// Get the total element count 
const totalElementCount = computed(() => {
	if (props.workingData && !namodelStore.combinedObject) {
		// Use local calculation
		return Object.keys(props.workingData).length;
	}
	
	// Otherwise use the store getter
	return namodelStore.totalElementCount;
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

// Helper function to get approve button color
const getApproveButtonColor = (item) => {
	const itemId = item.refId || item.id;
	const buttonState = buttonStates.value[itemId];
	
	if (!buttonState?.voted) return 'success';
	
	// If this is the button that was clicked, use a darker success color
	if (buttonState.voteType === 'approve') return 'green-darken-3';
	
	// Otherwise use a darker grey for the other button
	return 'grey-darken-3';
};

// Helper function to get reject button color
const getRejectButtonColor = (item) => {
	const itemId = item.refId || item.id;
	const buttonState = buttonStates.value[itemId];
	
	if (!buttonState?.voted) return 'error';
	
	// If this is the button that was clicked, use a darker error color
	if (buttonState.voteType === 'reject') return 'red-darken-3';
	
	// Otherwise use a darker grey for the other button
	return 'grey-darken-3';
};

// Get button style based on vote state
const getButtonStyle = (item, voteType) => {
	const itemId = item.refId || item.id;
	const buttonState = buttonStates.value[itemId];
	
	if (!buttonState?.voted) return '';
	
	// Base style for all voted buttons - set opacity to 1
	const baseStyle = 'opacity: 1 !important; font-weight: bold !important; color: white !important;';
	
	if (buttonState.voteType === voteType) {
		// Voted button style
		if (voteType === 'approve') {
			// Light green background
			return `${baseStyle} background-color: #4CAF50 !important; border: 2px solid #66BB6A !important;`;
		} else {
			// Light red background
			return `${baseStyle} background-color: #F44336 !important; border: 2px solid #EF5350 !important;`;
		}
	} else {
		// Other button style - light grey
		return `${baseStyle} background-color: #9E9E9E !important; border: 2px solid #BDBDBD !important;`;
	}
};

// Determine the vote direction based on counts
const getVoteDirection = (item) => {
	const itemId = item.refId || item.id;
	const buttonState = buttonStates.value[itemId];
	
	if (!buttonState?.voted) return null;
	
	// Convert to numbers and handle nullish values
	const goodCount = parseInt(buttonState.goodCount || 0);
	const badCount = parseInt(buttonState.badCount || 0);
	
	if (goodCount > badCount) return 'up';
	if (badCount > goodCount) return 'down';
	return null; // Equal votes
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
			<!-- Element Count and Selected Item Legend -->
			<div class="element-count-legend" v-if="workingData">
				<span class="legend-item" v-if="workingData && workingData.length > 0 && workingData[0]">
					<strong>{{ workingData[0].SheetName || workingData[0].sheetName || 'Unknown Sheet' }}</strong>
				</span>
				<span class="legend-item ml-2">Total Elements: {{ totalElementCount }}</span>
				<span class="legend-item ml-2">CEDS AI Matches: {{ cedsMatchCount }}</span>
			</div>
			
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
								<div class="action-wrapper">
									<div class="vote-direction-indicator" v-if="buttonStates[item.refId || item.id]?.voted && getVoteDirection(item)">
										<v-icon class="vote-arrow" :color="getVoteDirection(item) === 'up' ? 'light-green-accent-4' : 'red-accent-2'" size="large">
											{{ getVoteDirection(item) === 'up' ? 'mdi-arrow-up-bold' : 'mdi-arrow-down-bold' }}
										</v-icon>
									</div>
									<div class="action-buttons">
										<v-btn 
											:color="getApproveButtonColor(item)" 
											size="small" 
											variant="outlined" 
											class="mb-2"
											@click="handleApprove(item)"
											:disabled="buttonStates[item.refId || item.id]?.voted || buttonStates[item.refId || item.id]?.isVoting"
											:loading="buttonStates[item.refId || item.id]?.isVoting && !buttonStates[item.refId || item.id]?.voted"
											:style="getButtonStyle(item, 'approve')"
										>
											<span v-if="!buttonStates[item.refId || item.id]?.voted">
												Approve
											</span>
											<span v-else class="vote-count">
												👍 {{ buttonStates[item.refId || item.id]?.goodCount || 0 }}
											</span>
										</v-btn>
										<v-btn 
											:color="getRejectButtonColor(item)"
											size="small" 
											variant="outlined"
											@click="handleReject(item)"
											:disabled="buttonStates[item.refId || item.id]?.voted || buttonStates[item.refId || item.id]?.isVoting"
											:loading="buttonStates[item.refId || item.id]?.isVoting && !buttonStates[item.refId || item.id]?.voted"
											:style="getButtonStyle(item, 'reject')"
										>
											<span v-if="!buttonStates[item.refId || item.id]?.voted">
												Terrible
											</span>
											<span v-else class="vote-count">
												👎 {{ buttonStates[item.refId || item.id]?.badCount || 0 }}
											</span>
										</v-btn>
									</div>
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
	flex-direction: column;
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
	width: 130px;
}

.action-wrapper {
	display: flex;
	flex-direction: row;
	align-items: center;
	gap: 8px;
}

.vote-direction-indicator {
	display: flex;
	align-items: center;
	justify-content: center;
	width: 24px;
}

.vote-arrow {
	font-size: 24px;
	filter: drop-shadow(0px 0px 2px rgba(0,0,0,0.3));
}

.action-buttons {
	display: flex;
	flex-direction: column;
	align-items: center;
}

.confidence-col {
	width: 140px;
	text-align: center;
}

.element-col {
	width: calc(100% - 270px);
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

.vote-count {
	font-weight: bold;
	color: white !important;
	text-shadow: 0px 0px 2px rgba(0, 0, 0, 0.5);
}

/* Override Vuetify's disabled button opacity */
:deep(.v-btn--disabled) {
	opacity: 1 !important;
}

/* Element Count Legend styling */
.element-count-legend {
	display: flex;
	align-items: center;
	margin: 0 12px 12px 0;
	background-color: rgba(0, 0, 0, 0.03);
	padding: 4px 10px;
	border-radius: 4px;
	font-size: 0.8rem;
	border: 1px solid rgba(0, 0, 0, 0.1);
	align-self: flex-end;
}

.legend-item {
	white-space: nowrap;
	font-weight: 500;
}

.legend-title {
	font-weight: 600;
	color: #1976d2;
}
</style>