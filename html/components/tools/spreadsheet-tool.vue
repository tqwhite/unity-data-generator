<script setup>
	import { ref, computed, watch, onMounted } from 'vue';
import NaDescriptionEditor from './editors/naDescriptionEditor.vue';

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

	// Prepare data for data table
	const tableItems = ref([]);
	const tableHeaders = ref([]);
	const expandedHeaders = ref([]);
	const search = ref('');
	
	// Filter checkboxes
	const noAtFilter = ref(false);
	const noTypesFilter = ref(false);
	const noBlanksFilter = ref(false);
	const noRefIdsFilter = ref(false);
	
	// Modal control
	const showModal = ref(false);
	const selectedItem = ref(null);

	// Function to open edit modal
	const openEditModal = (item) => {
		selectedItem.value = item;
		showModal.value = true;
	};

	// Function to close modal
	const closeModal = () => {
		showModal.value = false;
		selectedItem.value = null;
	};

	// Priority columns to show in main table
	const priorityColumns = ['Name', 'CEDS ID', 'Match', 'Description'];

	// Debug helper to log actual properties
	const logDataStructure = () => {
		if (!props.workingData) return;

		// Get the flat array of items
		let items = [];
		if (Array.isArray(props.workingData)) {
			items = props.workingData;
		} else if (typeof props.workingData === 'object') {
			items = Object.values(props.workingData);
		}

		if (items.length === 0) return;
	};

	// Ensure each item has a unique ID
	const processItems = (items) => {
		return items.map((item, index) => ({
			...item,
			_rowId: item.refId || item.id || `row-${index}`,
			// Add virtual Match column that displays cedsMatchesConfidence
			Match: item.cedsMatchesConfidence || ''
		}));
	};

	// Initialize the table data
	const initializeTable = () => {
		if (!props.workingData) {
			tableItems.value = [];
			tableHeaders.value = [];
			expandedHeaders.value = [];
			return;
		}

		// Convert data to array format
		let processedItems = [];
		if (Array.isArray(props.workingData)) {
			processedItems = processItems(props.workingData);
		} else if (typeof props.workingData === 'object') {
			processedItems = processItems(Object.values(props.workingData));
		} else {
			tableItems.value = [];
			return;
		}

		tableItems.value = processedItems;

		if (tableItems.value.length === 0) return;

		// Get all unique properties across all items
		const allProperties = new Set();
		tableItems.value.forEach((item) => {
			if (item && typeof item === 'object') {
				Object.keys(item).forEach((key) => {
					if (key !== '_rowId') {
						// Skip our added property
						allProperties.add(key);
					}
				});
			}
		});
		
		// Add virtual "Match" column that will display cedsMatchesConfidence
		allProperties.add('Match');

		// Create headers lists
		const mainHeaders = [];
		const otherHeaders = [];
		const tmp = [];
		const keySequence = [
			'Description',
			'cedsDefinition',
			'XPath',
			'Name',
			'Mandatory',
			'Characteristics',
			'Type',
			/* 'SheetName', */ //omit from display
			/*'refId', */ //omit from display
		];
		
		const removeHoles = (arr) => arr.filter((item) => item);
		
		// Process properties
		Array.from(allProperties).forEach((key) => {
			const headerObj = {
				title: key,
				key: key,
				align: 'start',
				sortable: true,
			};

			// Set widths for priority columns
			if (key === 'Name') {
				headerObj.width = '200px';
				headerObj.class = 'mid-col';
			} else if (key === 'CEDS ID') {
				headerObj.width = '120px';
				headerObj.class = 'small-col';
			} else if (key === 'Match') {
				headerObj.width = '80px';
				headerObj.class = 'match-col';
			} else if (key === 'Description') {
				// Description will flex to fill available space and truncate if needed
				headerObj.width = '100px';
				headerObj.class = 'description-col';
			}

			// Check if this is a priority column
			if (priorityColumns.includes(key)) {
				mainHeaders.push(headerObj);
			} else {
				//  otherHeaders.push(headerObj);
				otherHeaders[keySequence.indexOf(key)] = headerObj;
			}
			if (key == 'Description') {
				otherHeaders[keySequence.indexOf(key)] = headerObj;
			}
		});

		// Sort main headers by priority
		mainHeaders.sort((a, b) => {
			return (
				priorityColumns.indexOf(a.title) - priorityColumns.indexOf(b.title)
			);
		});

		tableHeaders.value = mainHeaders;

		expandedHeaders.value = removeHoles(otherHeaders);
	};

	// Filtered items based on search and checkbox filters
	const filteredItems = computed(() => {
		let filtered = tableItems.value;
		
		// Apply text search filter
		if (search.value) {
			const searchLower = search.value.toLowerCase();
			filtered = filtered.filter((item) => {
				return Object.values(item).some((value) => {
					if (value === null || value === undefined) return false;
					return String(value).toLowerCase().includes(searchLower);
				});
			});
		}
		
		// Apply checkbox filters
		if (noAtFilter.value) {
			filtered = filtered.filter(item => !item.Name?.match(/^@/));
		}
		
		if (noTypesFilter.value) {
			filtered = filtered.filter(item => !item.Type?.match(/type/i));
		}
		
		if (noBlanksFilter.value) {
			filtered = filtered.filter(item => item.Description !== '' && item.Description !== undefined);
		}
		
		if (noRefIdsFilter.value) {
			filtered = filtered.filter(item => !item.Name?.match(/refid/i));
		}
		
		return filtered;
	});

	// Initialize on mount and when workingData changes
	onMounted(() => {
		logDataStructure();
		initializeTable();
	});

	// Watch for changes in workingData
	watch(
		() => props.workingData,
		() => {
			logDataStructure();
			initializeTable();
		},
		{ immediate: true },
	);
</script>

<template>
	<div class="tool-container">
		<!-- Editor Component -->
		<NaDescriptionEditor 
			:item="selectedItem" 
			v-model:show="showModal" 
			@close="closeModal"
		/>
		
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
		<div v-else-if="workingData" class="w-100 h-100 content-container">
			<!-- Basic search field -->
			<div class="filter-container pa-0">
				<div class="filter-row">
					<v-text-field
						v-model="search"
						prepend-inner-icon="mdi-filter-outline"
						variant="outlined"
						label="Filter"
						hide-details
						density="compact"
						class="filter-field"
						placeholder="Property List Filter"
					></v-text-field>
					
					<!-- Filter checkboxes -->
					<div class="filter-checkboxes">
						<v-checkbox
							v-model="noAtFilter"
							label="No @"
							density="compact"
							hide-details
							class="filter-checkbox"
						></v-checkbox>
						<v-checkbox
							v-model="noTypesFilter"
							label="No Types"
							density="compact"
							hide-details
							class="filter-checkbox"
						></v-checkbox>
						<v-checkbox
							v-model="noBlanksFilter"
							label="No Blanks"
							density="compact"
							hide-details
							class="filter-checkbox"
						></v-checkbox>
						<v-checkbox
							v-model="noRefIdsFilter"
							label="No RefIds"
							density="compact"
							hide-details
							class="filter-checkbox"
						></v-checkbox>
					</div>
				</div>

				<!-- Data table with expandable rows -->
				<div class="table-container">
					<v-data-table
						:headers="tableHeaders"
						:items="filteredItems"
						item-value="_rowId"
						class="spreadsheet-table"
						density="compact"
						fixed-header
						height="calc(100vh - 180px)"
						:items-per-page="-1"
						hide-default-footer
						show-expand
						expand-icon-right
					>
						<!-- Simple cell template to prevent wrapping -->
						<template
							v-for="header in tableHeaders"
							:key="header.key"
							v-slot:[`item.${header.key}`]="{ item }"
						>
							<div class="no-wrap" :class="header.class">
								<v-icon 
									v-if="header.key === 'Description'" 
									class="edit-icon mr-1" 
									size="small" 
									color="primary"
									@click.stop="openEditModal(item)"
								>
									mdi-pencil
								</v-icon>
								<span v-html="item[header.key]"></span>
							</div>
						</template>

						<!-- Expanded row content -->
						<template v-slot:expanded-row="{ columns, item }">
							<tr>
								<td :colspan="columns.length">
									<div class="expanded-content pa-3">
										<v-table density="compact" class="expanded-table">
											<tbody>
												<tr v-for="header in expandedHeaders" :key="header.key">
													<td class="property-name">
														{{ header.key === 'cedsDefinition' ? 'CEDS Assigned Definition' : header.title }}
													</td>
													<td class="property-value">
														<span v-if="header.key === 'cedsDefinition' && item.cedsDefinition && item['CEDS ID']" v-html="'[' + item['CEDS ID'] + '] ' + item.cedsDefinition"></span>
														<span v-else v-html="item[header.key]"></span>
													</td>
												</tr>
												
												<!-- CEDS Matches Information -->
												<tr v-if="item.cedsMatchesGlobalID">
													<td class="property-name">CEDS Matched ID</td>
													<td class="property-value"><span v-html="item.cedsMatchesGlobalID"></span></td>
												</tr>
												<tr v-if="item.cedsMatchesElementName">
													<td class="property-name">CEDS Element Name</td>
													<td class="property-value"><span v-html="item.cedsMatchesElementName"></span></td>
												</tr>
												<tr v-if="item.cedsMatchesDefinition">
													<td class="property-name">CEDS Definition</td>
													<td class="property-value"><span v-html="item.cedsMatchesDefinition"></span></td>
												</tr>
												<tr v-if="item.cedsMatchesConfidence">
													<td class="property-name">CEDS Match Confidence</td>
													<td class="property-value"><span v-html="item.cedsMatchesConfidence"></span></td>
												</tr>
											</tbody>
										</v-table>
									</div>
								</td>
							</tr>
						</template>
					</v-data-table>
				</div>

				<div class="text-center pt-2">
					<span class="text-caption">{{ tableItems.length }} items</span>
				</div>
			</div>
		</div>
		<div v-else class="text-center">
			<v-icon size="64" class="mb-3 text-medium-emphasis">mdi-table</v-icon>
			<div>
				Select an item from the list to view details in spreadsheet format
			</div>
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

	.content-container {
		max-width: 80vw;
		padding-top: 0 !important;
		margin-top: 0 !important;
	}

	.spreadsheet-table {
		border: 1px solid rgba(76, 175, 80, 0.2);
		table-layout: fixed;
		overflow-x: hidden !important;
	}

	/* Force cells not to wrap */
	:deep(.v-data-table) {
		white-space: nowrap !important;
	}

	:deep(.v-data-table__wrapper) {
		overflow-x: hidden;
	}

	/* Custom styling for table headers */
	:deep(.v-data-table-header th) {
		font-weight: bold;
		background-color: rgba(76, 175, 80, 0.05);
		white-space: nowrap;
		font-size: 10pt;
		padding: 2px 4px !important;
	}

	/* Style for the table cells */
	:deep(.v-data-table-row td) {
		border-bottom: 1px solid rgba(76, 175, 80, 0.1);
		white-space: nowrap !important;
		max-width: 100% !important;
		overflow: hidden;
		text-overflow: ellipsis;
		font-size: 10pt;
		padding: 0px 4px !important;
		height: 24px !important;
		min-height: 24px !important;
	}

	/* Override v-data-table default padding */
	:deep(.v-data-table__td),
	:deep(.v-data-table__th) {
		padding: 0 4px !important;
	}

	.no-wrap {
		white-space: nowrap !important;
		overflow: hidden;
		text-overflow: ellipsis;
		padding: 0;
	}

	.table-container {
		overflow-x: hidden;
		width: 70vw;
	}

	/* Expanded content styling */
	.expanded-content {
		background-color: rgba(76, 175, 80, 0.05);
		border-radius: 4px;
		max-height: 300px;
		overflow-y: auto;
	}

	.expanded-table {
		background-color: transparent !important;
		border: none;
	}

	.property-name {
		font-weight: bold;
		width: 200px;
		font-size: 10pt;
		padding: 2px 8px !important;
		vertical-align: top;
	}

	.property-value {
		max-width: 400px;
		font-size: 10pt;
		padding: 2px 8px !important;
		white-space: normal !important;
		word-break: break-word;
	}

	.small-col {
		color: red;
		boder: 1pt solid red;
		width: 5vw;
	}

	.mid-col {
		color: red;
		boder: 1pt solid red;
		width: 10vw;
	}
	
	.match-col {
		color: blue;
		width: 7vw;
	}
	
	.description-col {
		color: blue;
		width: 40vw;
	}
	
	.edit-icon {
		cursor: pointer;
		opacity: 0.7;
		transition: opacity 0.2s;
	}
	
	.edit-icon:hover {
		opacity: 1;
	}
	
	.filter-container {
		width: 100%;
		max-width: 100%;
		box-sizing: border-box;
	}
	
	.filter-row {
		display: flex;
		flex-direction: row;
		align-items: center;
		margin-bottom: 12px;
		gap: 16px;
	}
	
	.filter-field {
		width: 300px !important;
		flex-shrink: 0;
		box-sizing: border-box;
	}
	
	.filter-checkboxes {
		display: flex;
		flex-direction: row;
		gap: 8px;
		flex-grow: 1;
	}
	
	.filter-checkbox {
		margin: 0;
		padding: 0;
	}
	
	:deep(.filter-checkbox .v-label) {
		font-size: 0.7rem;
		opacity: 0.8;
	}
	
	:deep(.filter-checkbox .v-selection-control) {
		min-height: 20px;
		margin-right: -8px;
	}
	
	:deep(.filter-checkbox .v-selection-control__wrapper) {
		transform: scale(0.8);
	}
	
	/* Ensure consistent styling with selection-list filter */
	:deep(.v-field__input::placeholder) {
		color: rgba(0, 0, 0, 0.6) !important;
		opacity: 0.7;
	}
	
	/* Match border styling */
	:deep(.v-field.v-field--variant-outlined .v-field__outline) {
		color: rgba(0, 0, 0, 0.38) !important;
	}
	
	:deep(.v-field.v-field--variant-outlined:hover .v-field__outline) {
		color: rgba(0, 0, 0, 0.86) !important;
	}
	
	:deep(.v-field.v-field--variant-outlined.v-field--focused .v-field__outline) {
		color: var(--v-theme-primary) !important;
	}
</style>