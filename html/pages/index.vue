<script setup>
	import { useLoginStore } from '@/stores/loginStore';
	import { useRouter } from 'vue-router';
	
	const LoginStore = useLoginStore();
	const router = useRouter();

	if (router?.currentRoute.value.query.logout) {
		LoginStore.logout();
	}
</script>

<template>
	<v-app>
		<generalNavSub />
		<v-main>
			<form_login />
		</v-main>
	</v-app>
</template>

<style scoped>
</style>
