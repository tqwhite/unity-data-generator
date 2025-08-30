<script setup>
import { useRouter } from 'vue-router';

const props = defineProps({
	domains: {
		type: Array,
		required: true,
		default: () => []
	},
	classId: {
		type: String,
		required: true
	},
	isLoading: {
		type: Boolean,
		default: false
	}
});

const router = useRouter();

// Navigate to class with selected domain
const selectDomain = (domain) => {
	router.push({
		path: `/ceds/ontology/class/${props.classId}`,
		query: { domain: domain.refId }
	});
};
</script>

<template>
	<div class="domain-selector-list">
		<!-- Header matching ClassOutline style -->
		<v-toolbar 
			flat 
			density="compact" 
			color="grey-lighten-4"
			class="px-4"
		>
			<v-toolbar-title class="text-subtitle-2 font-weight-bold">
				Used in These Domains
			</v-toolbar-title>
		</v-toolbar>
		
		<!-- Loading state -->
		<div v-if="isLoading" class="pa-4 text-center">
			<v-progress-circular
				indeterminate
				size="32"
				color="primary"
			/>
			<div class="mt-2 text-caption">Loading domains...</div>
		</div>
		
		<!-- Domain list -->
		<v-list 
			v-else-if="domains && domains.length > 0"
			dense
			class="py-0"
		>
			<v-list-item
				v-for="domain in domains"
				:key="domain.refId"
				@click="selectDomain(domain)"
				class="domain-item"
				:title="domain.domainName || domain.name || domain.refId"
				:subtitle="domain.description || `Domain: ${domain.refId}`"
				lines="two"
			>
				<template v-slot:prepend>
					<v-icon 
						size="small" 
						color="primary"
						class="mr-2"
					>
						mdi-folder-outline
					</v-icon>
				</template>
				
				<template v-slot:append>
					<v-icon size="small" color="grey">
						mdi-chevron-right
					</v-icon>
				</template>
			</v-list-item>
		</v-list>
		
		<!-- Empty state -->
		<div v-else class="pa-4 text-center text-grey">
			<v-icon size="48" color="grey-lighten-1">
				mdi-folder-alert-outline
			</v-icon>
			<div class="mt-2">No domains available</div>
		</div>
		
		<!-- Help text -->
		<v-card-text class="text-caption text-grey pa-3">
			This class exists in multiple domains. Select a domain to view it in that context.
		</v-card-text>
	</div>
</template>

<style scoped>
.domain-selector-list {
	height: 100%;
	overflow-y: auto;
	background: white;
}

.domain-item {
	border-bottom: 1px solid rgba(0, 0, 0, 0.05);
	cursor: pointer;
	transition: background-color 0.2s;
}

.domain-item:hover {
	background-color: rgba(0, 0, 0, 0.04);
}

.domain-item:active {
	background-color: rgba(0, 0, 0, 0.08);
}

/* Match ClassOutline scrollbar styling */
.domain-selector-list::-webkit-scrollbar {
	width: 6px;
}

.domain-selector-list::-webkit-scrollbar-track {
	background: #f1f1f1;
}

.domain-selector-list::-webkit-scrollbar-thumb {
	background: #888;
	border-radius: 3px;
}

.domain-selector-list::-webkit-scrollbar-thumb:hover {
	background: #555;
}
</style>