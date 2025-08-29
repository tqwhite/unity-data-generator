<script setup>
import { ref, computed, watch } from 'vue';

const props = defineProps({
	classes: {
		type: Array,
		required: true,
		default: () => []
	},
	functionalAreas: {
		type: Array,
		default: () => []
	},
	selectedClass: {
		type: Object,
		default: null
	},
	isLoading: {
		type: Boolean,
		default: false
	}
});

const emit = defineEmits(['class-select']);

const searchQuery = ref('');
const expandedAreas = ref([]);

// Filter classes based on search
const filteredClasses = computed(() => {
	if (!searchQuery.value) {
		return props.classes;
	}
	
	const query = searchQuery.value.toLowerCase();
	return props.classes.filter(cls => 
		cls.label?.toLowerCase().includes(query) ||
		cls.prefLabel?.toLowerCase().includes(query) ||
		cls.name?.toLowerCase().includes(query) ||
		cls.description?.toLowerCase().includes(query)
	);
});

// Group classes by functional area (if available)
const groupedClasses = computed(() => {
	// If we have functional areas, group by them
	if (props.functionalAreas && props.functionalAreas.length > 0) {
		const grouped = {};
		
		// Sort functional areas by label
		const sortedAreas = [...props.functionalAreas].sort((a, b) => {
			const labelA = a.label || a.areaName || '';
			const labelB = b.label || b.areaName || '';
			return labelA.localeCompare(labelB);
		});
		
		sortedAreas.forEach(area => {
			// Use the id or refId field as the key for matching
			const areaId = area.id || area.refId;
			const areaLabel = area.label || area.areaName || areaId;
			
			// Find classes that belong to this functional area
			const areaClasses = filteredClasses.value.filter(
				cls => cls.functionalAreaRefId === areaId
			);
			
			// Only include areas that have classes after filtering
			if (areaClasses.length > 0) {
				grouped[areaLabel] = areaClasses;
			}
		});
		
		// Add ungrouped classes
		const functionalAreaIds = props.functionalAreas.map(a => a.id || a.refId);
		const ungrouped = filteredClasses.value.filter(
			cls => !functionalAreaIds.includes(cls.functionalAreaRefId)
		);
		if (ungrouped.length > 0) {
			grouped['Other'] = ungrouped;
		}
		
		return grouped;
	}
	
	// Otherwise just return all classes in one group
	return {
		'All Classes': filteredClasses.value
	};
});

// Select a class
const selectClass = (classObj) => {
	emit('class-select', classObj);
};

// Auto-expand area containing selected class
watch(() => props.selectedClass, (newClass) => {
	if (newClass) {
		// Find which area contains this class
		Object.entries(groupedClasses.value).forEach(([areaName, classes]) => {
			if (classes.some(c => c.refId === newClass.refId)) {
				if (!expandedAreas.value.includes(areaName)) {
					expandedAreas.value.push(areaName);
				}
			}
		});
	}
});

// Format class name for display
const formatClassName = (cls) => {
	// Show multi-domain indicator
	const displayName = cls.label || cls.prefLabel || cls.name;
	if (cls.otherDomains && cls.otherDomains.length > 0) {
		return `${displayName} *`;
	}
	return displayName;
};

// Get tooltip for class
const getClassTooltip = (cls) => {
	if (cls.otherDomains && cls.otherDomains.length > 0) {
		const domainNames = cls.otherDomains.map(d => {
			// Extract readable name from refId
			return d.replace('DOM_', '').replace(/___/g, ' & ').replace(/_/g, ' ');
		});
		return `Also in: ${domainNames.join(', ')}`;
	}
	return cls.description || cls.name || cls.label;
};
</script>

<template>
	<v-container fluid class="pa-0">
		<!-- Search bar -->
		<v-text-field
			v-model="searchQuery"
			prepend-inner-icon="mdi-magnify"
			placeholder="Filter classes..."
			variant="solo"
			density="compact"
			hide-details
			clearable
			class="ma-2"
		/>
		
		<!-- Loading indicator -->
		<v-progress-linear
			v-if="isLoading"
			indeterminate
			color="primary"
			height="2"
		/>
		
		<!-- Class tree -->
		<v-list
			v-if="!isLoading"
			density="compact"
			class="pa-0"
		>
			<template v-for="(classes, areaName) in groupedClasses" :key="areaName">
				<!-- Area header (if we have multiple areas) -->
				<v-list-group
					v-if="Object.keys(groupedClasses).length > 1"
					:value="areaName"
				>
					<template v-slot:activator="{ props }">
						<v-list-item
							v-bind="props"
							:title="areaName"
							density="compact"
						>
							<template v-slot:append>
								<v-chip
									size="x-small"
									variant="tonal"
									color="primary"
									class="ml-2"
								>
									{{ classes.length }}
								</v-chip>
							</template>
						</v-list-item>
					</template>
					
					<!-- Classes in area -->
					<v-list-item
						v-for="cls in classes"
						:key="cls.refId"
						:title="formatClassName(cls)"
						:subtitle="cls.description"
						:active="selectedClass?.refId === cls.refId"
						@click="selectClass(cls)"
						density="compact"
						class="pl-8"
						:ripple="false"
					>
						<v-tooltip
							v-if="cls.otherDomains && cls.otherDomains.length > 0"
							:text="getClassTooltip(cls)"
							location="right"
						>
							<template v-slot:activator="{ props }">
								<v-icon
									v-bind="props"
									size="small"
									color="info"
									class="ml-2"
								>
									mdi-information-outline
								</v-icon>
							</template>
						</v-tooltip>
					</v-list-item>
				</v-list-group>
				
				<!-- Direct class list (if only one group) -->
				<template v-else>
					<v-list-item
						v-for="cls in classes"
						:key="cls.refId"
						:title="formatClassName(cls)"
						:subtitle="cls.description"
						:active="selectedClass?.refId === cls.refId"
						@click="selectClass(cls)"
						density="compact"
						:ripple="false"
					>
						<v-tooltip
							v-if="cls.otherDomains && cls.otherDomains.length > 0"
							:text="getClassTooltip(cls)"
							location="right"
						>
							<template v-slot:activator="{ props }">
								<v-icon
									v-bind="props"
									size="small"
									color="info"
									class="ml-2"
								>
									mdi-information-outline
								</v-icon>
							</template>
						</v-tooltip>
					</v-list-item>
				</template>
			</template>
		</v-list>
		
		<!-- Empty state -->
		<v-card
			v-if="!isLoading && filteredClasses.length === 0"
			flat
			class="text-center pa-4 ma-2"
		>
			<v-icon size="48" color="grey-lighten-1">
				mdi-file-search-outline
			</v-icon>
			<div class="text-body-2 mt-2">
				{{ searchQuery ? 'No matching classes found' : 'No classes in this domain' }}
			</div>
		</v-card>
	</v-container>
</template>

<style scoped>
.v-list-item--active {
	background-color: rgba(var(--v-theme-primary), 0.08);
}

.v-list-item:hover {
	background-color: rgba(0, 0, 0, 0.04);
}

.v-list-item__subtitle {
	overflow: hidden;
	text-overflow: ellipsis;
	white-space: nowrap;
}

/* Disable transitions to prevent flashing */
.v-list-item,
.v-list-item * {
	transition: none !important;
}

.v-list-item::before,
.v-list-item::after {
	transition: none !important;
	animation: none !important;
}

/* Disable focus and ripple effects */
.v-list-item:focus::before,
.v-list-item:focus-visible::before {
	opacity: 0 !important;
}

.v-list-item .v-ripple__container {
	display: none !important;
}

/* Prevent any overlay effects */
.v-list-item__overlay {
	display: none !important;
	background: none !important;
	opacity: 0 !important;
}
</style>