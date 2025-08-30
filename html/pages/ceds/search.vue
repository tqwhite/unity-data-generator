<script setup>
import { useCedsStore } from '@/stores/cedsStore';
import CedsSearch from '@/components/tools/ceds-search.vue';

const cedsStore = useCedsStore();
</script>

<template>
	<v-container fluid class="fill-height pa-4">
		<ceds-search 
			:workingData="cedsStore.listOfProperties"
			:is-loading="cedsStore.isLoading"
			:error="cedsStore.error"
		/>
	</v-container>
</template>

<style scoped>
.fill-height {
	min-height: calc(100vh - 180px);
}
</style>