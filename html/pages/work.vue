<script setup>
	import { useLoginStore } from '@/stores/loginStore';
	const LoginStore = useLoginStore();
	import { useRouter } from 'vue-router';
	const router = useRouter();

	if (router?.currentRoute.value.query.logout) {
		LoginStore.logout();
	}

	const message = 'CEDS Search and Vector Tools';

	import { ref, computed } from 'vue';

</script>

<template>
	<v-app>
		<generalNavSub />
		<v-main>
		<v-container>
		
{{message}}

		</v-container>
		</v-main>
	</v-app>
</template>

<style scoped>

</style>