<script setup>
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
			v-else-if="workingData"
			class="w-100 h-100 overflow-auto content-container"
		>
			<!-- Data will be displayed here -->
			<v-expansion-panels density="compact" class="mt-0 pt-0">
				<RecursivePanel :data="workingData" />
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
</style>
