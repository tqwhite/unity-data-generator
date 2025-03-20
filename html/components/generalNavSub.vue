<script setup>
	import { useLoginStore } from '@/stores/loginStore';
	import { computed } from 'vue';
	import { useRouter } from 'vue-router';
	
	const LoginStore = useLoginStore();
	const router = useRouter();

	if (router?.currentRoute.value.query.logout) {
		LoginStore.logout();
	}

	// Check if we're on the tool pages
	const isCedsPage = computed(() => {
		return router.currentRoute.value.path === '/ceds' || 
		       router.currentRoute.value.path === '/ceds/';
	});
	
	const isNaModelPage = computed(() => {
		return router.currentRoute.value.path === '/namodel' || 
		       router.currentRoute.value.path === '/namodel/';
	});
	
	const isAboutPage = computed(() => {
		return router.currentRoute.value.path === '/about' || 
		       router.currentRoute.value.path === '/about/';
	});
	
	const isUtilityExamplesPage = computed(() => {
		return router.currentRoute.value.path === '/utility-examples' || 
		       router.currentRoute.value.path === '/utility-examples/';
	});
	
	const isWelcomePage = computed(() => {
		return router.currentRoute.value.path === '/' || 
		       router.currentRoute.value.path === '/welcomePage' ||
		       router.currentRoute.value.path === '/welcomePage/';
	});

	const reloadPage = () => {
		window.location.href = window.location.href.replace(
			/^(https?:\/\/[^\/]+).*/,
			'$1',
		);
	};
</script>

<template>
	<!-- Top banner (not an app bar) -->
	<div class="banner justify-center align-center">
		<h1 class="banner-title">A4L Unity CEDS Project</h1>
	</div>

	<!-- Navigation bar -->
	<v-app-bar app elevation="0" class="border-bottom border-1">
		<v-app-bar-title class="titleOrange">
			<template v-if="isCedsPage">CEDS Search and Browse</template>
			<template v-else-if="isNaModelPage">NA Data Model Tools</template>
			<template v-else-if="isAboutPage">About</template>
			<template v-else></template>
		</v-app-bar-title>

		<v-spacer></v-spacer>
		
		<!-- CEDS button (always visible) -->
		<v-btn
			v-if="!isCedsPage"
			prepend-icon="mdi-database-search"
			title="CEDS Tools"
			:to="{ path: 'ceds' }"
		>
			CEDS
		</v-btn>
		
		<!-- NA Model button (always visible) -->
		<v-btn
			v-if="!isNaModelPage"
			prepend-icon="mdi-database-search"
			title="NA Model Tools"
			:to="{ path: 'namodel' }"
		>
			NA Model
		</v-btn>
		
		<!-- Login button (visible when not logged in) -->
		<v-btn
			v-if="!LoginStore.validUser"
			prepend-icon="mdi-login"
			title="Login"
			:to="{ path: '/', query: { login: true, returnTo: router.currentRoute.value.path } }"
		>
			Login
		</v-btn>

		<!-- Profile button (visible only when logged in) -->
		<v-btn
			v-if="LoginStore.validUser"
			prepend-icon="mdi-account"
			title="Profile"
			:to="{ path: 'utility', query: { purpose: 'profile' } }"
		>
			<span v-if="LoginStore.loggedInUser.last">
				{{ LoginStore.loggedInUser.first }} {{ LoginStore.loggedInUser.last }}
			</span>
			<span v-else>{{ LoginStore.loggedInUser.username }}</span>
		</v-btn>

		<!-- Logout button (visible only when logged in) -->
		<v-btn 
			v-if="LoginStore.validUser"
			prepend-icon="mdi-logout" 
			title="Logout" 
			@click="reloadPage"
		>
			Logout
		</v-btn>
		
		<!-- About button (always visible, right-aligned) -->
		<v-btn
			v-if="!isAboutPage"
			prepend-icon="mdi-information-outline"
			title="About"
			:to="{ path: 'about' }"
		>
		</v-btn>
	</v-app-bar>
</template>

<style scoped>
	/* Banner styling */
	.banner {
		background: #ffc425;
		padding: 0.1rem;
		text-align: center;
	}

	.banner-title {
		margin: 0;
		color: #fff;
		font-family: 'Roboto', sans-serif;
		font-size: 1.5rem;
	}
	.titleOrange {
		color: #ffc425;
		font-weight: bold;
		padding-left: 5px;
	}
	.v-app-bar {
		margin-top: 2.5rem;
	}
	/* Toolbar title alignment fixes */
	.v-app-bar-title {
		margin-inline-start: 0 !important;
	}
</style>