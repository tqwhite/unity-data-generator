<script setup>
import { useRouter } from 'vue-router';
import { onMounted } from 'vue';

const router = useRouter();

// Redirect to ontology as the default tool
onMounted(() => {
	router.replace('/ceds/ontology');
});
</script>

<template>
	<div>
		<!-- Empty template - this page just redirects -->
	</div>
</template>