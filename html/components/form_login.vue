<script setup>
	import { useLoginStore } from '@/stores/loginStore';
	const LoginStore = useLoginStore();

	const router = useRouter();

	const username = ref('');
	const password = ref('');

	const usernameRules = [
		(value) => {
			if (value?.length > 0) return true;
			return 'User Name is required.';
		},
	];

	const passwordRules = [
		(value) => {
			if (value?.length > 0) return true;
			return 'User Name is required.';
		},
	];

	const submitButton = async () => {
		LoginStore.loggedInUser.username = username;
		LoginStore.loggedInUser.password = password;

		const tmp = await LoginStore.login()
			.then((validLogin) => {
				if (LoginStore.validUser) {
					// Check if there's a returnTo parameter in the URL
					const returnTo = router.currentRoute.value.query.returnTo;
					
					// If returnTo is present and not the root page, navigate to it
					if (returnTo && returnTo !== '/' && returnTo !== '/welcomePage') {
						router.push(returnTo);
					} 
					// If user is on ceds page, stay there
					else if (router.currentRoute.value.path === '/ceds') {
						// Stay on ceds page, no navigation needed
					}
					// Otherwise, if user is on root/login/welcome page, go to NA Model
					else if (router.currentRoute.value.path === '/' || 
					         router.currentRoute.value.path === '/welcomePage') {
						router.push('namodel');
					}
					// For other pages, stay on the current page
				}
			})
			.catch((err) => {
				LoginStore.statusMsg = err.toString();
			});
	};
</script>

<template>
	<v-container>
		<v-sheet class="pa-12" color="transparent">
			<v-sheet
				class="mx-auto pa-10"
				width="300"
				:elevation="16"
				:rounded="'xl'"
			>
				<div v-if="LoginStore.statusMsg">{{LoginStore.statusMsg}}</div>
				<v-form fast-fail @submit.prevent>
					<v-text-field
						v-model="username"
						:rules="usernameRules"
						label="User Name"
						autocompleset="username"
						@keyup.enter="submitButton"
						autofocus
					>
					</v-text-field>

					<v-text-field
						type="password"
						v-model="password"
						:rules="passwordRules"
						label="Password"
						autocompleset="password"
						@keyup.enter="submitButton"
					>
					</v-text-field>

					<v-btn class="mt-2" @click="submitButton" block>Login</v-btn>
				</v-form>
			</v-sheet>
		</v-sheet>
		<div style="font-size: 8pt; color: #aaa; text-align: center">v1.43</div>
	</v-container>
</template>