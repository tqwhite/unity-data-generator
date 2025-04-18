import { defineStore } from 'pinia';
import { toType, qtPutSurePath } from '@/plugins/qtools-functional-library';

export const useCedsStore = defineStore('ceds', {
	state: () => ({
		nameList: [],
		listOfProperties: null,
		combinedObject: null,
		isLoading: false,
		error: null,
		isLoadingSemanticDistance: false,
		semanticDistanceError: null,
		semanticDistanceResults: {},
		ontologyClasses: null,
		isLoadingOntologyClasses: false,
		ontologyClassesError: null,
	}),

	actions: {
		async fetchNameList() {
			this.isLoading = true;
			this.error = null;

			// Import LoginStore to get auth token
			const { useLoginStore } = await import('@/stores/loginStore');
			const LoginStore = useLoginStore();

			// Get the auth token header if user is logged in, otherwise empty object
			// CEDS endpoints are marked as public so we don't need a token
			const authHeader = LoginStore.validUser ? LoginStore.getAuthTokenProperty : {};

			try {
				const response = await fetch('/api/ceds/fetchNameList', {
					headers: authHeader,
				});

				if (!response.ok) {
					throw new Error(
						`Failed to fetch CEDS name list: ${response.statusText}`,
					);
				}

				const data = await response.json();
				this.nameList = data;
			} catch (err) {
				this.error = err.message;
				console.error('Error fetching CEDS name list:', err);
			} finally {
				this.isLoading = false;
			}
		},

		async fetchData(refId) {
			if (!refId) {
				console.error('No refId provided to fetchData');
				return;
			}

			// Import LoginStore to get auth token
			const { useLoginStore } = await import('@/stores/loginStore');
			const LoginStore = useLoginStore();

			// Get the auth token header if user is logged in, otherwise empty object
			// CEDS endpoints are marked as public so we don't need a token
			const authHeader = LoginStore.validUser ? LoginStore.getAuthTokenProperty : {};

			this.isLoading = true;
			this.error = null;
			try {
				const response = await fetch(
					`/api/ceds/fetchData?refId=${encodeURIComponent(refId)}`,
					{
						headers: authHeader,
					},
				);

				if (!response.ok) {
					throw new Error(`Failed to fetch CEDS data: ${response.statusText}`);
				}

				const data = await response.json();

				// Create the structured object from the flat list of properties
				const listOfProperties = [];
				Object.keys(data).map((name) => {
					listOfProperties.push(data[name]);
				});

				// Store both representations for different use cases
				this.listOfProperties = listOfProperties;
				this.combinedObject = data;
			} catch (err) {
				this.error = err.message;
				console.error('Error fetching CEDS data:', err);
			} finally {
				this.isLoading = false;
			}
		},

		async saveData(data) {
			if (!data || !data.refId) {
				console.error('Invalid data or missing refId');
				return;
			}

			// Import LoginStore to get auth token
			const { useLoginStore } = await import('@/stores/loginStore');
			const LoginStore = useLoginStore();

			// For save operations, we require authentication - this is not public
			if (!LoginStore.validUser) {
				this.error = "Authentication required for saving data";
				console.error('Authentication required for saving data');
				return;
			}

			// Get the auth token property - this should include the token since we've verified validUser
			const authHeader = LoginStore.getAuthTokenProperty;

			this.isLoading = true;
			this.error = null;
			try {
				const response = await fetch('/api/ceds/saveData', {
					method: 'POST',
					headers: {
						'Content-Type': 'application/json',
						...authHeader,
					},
					body: JSON.stringify(data),
				});

				if (!response.ok) {
					throw new Error(`Failed to save CEDS data: ${response.statusText}`);
				}

				const responseData = await response.json();

				// Create the structured object from the flat list of properties
				const structuredObject = {};
				responseData.map((item) => {
					const path =
						item.XPath || item.path || `element.${item.id || item.name}`;
					qtPutSurePath(structuredObject, path.replace(/\//g, '.'), item);
				});

				// Store both representations
				this.listOfProperties = responseData;
				this.combinedObject = structuredObject;

				// Update name in the nameList if it exists
				const nameIndex = this.nameList.findIndex(
					(item) => item.refId === data.refId,
				);
				if (nameIndex !== -1) {
					this.nameList[nameIndex] = {
						refId: data.refId,
						name: data.name || data.title || data.refId,
					};
				}

				return responseData;
			} catch (err) {
				this.error = err.message;
				console.error('Error saving CEDS data:', err);
				throw err;
			} finally {
				this.isLoading = false;
			}
		},

		clearCurrentData() {
			this.listOfProperties = null;
			this.combinedObject = null;
		},
		
		async fetchSemanticDistance(searchId, queryString) {
			this.isLoadingSemanticDistance = true;
			this.semanticDistanceError = null;

			// Import LoginStore to get auth token
			const { useLoginStore } = await import('@/stores/loginStore');
			const LoginStore = useLoginStore();

			// Get the auth token header if user is logged in, otherwise empty object
			// CEDS endpoints are marked as public so we don't need a token
			const authHeader = LoginStore.validUser ? LoginStore.getAuthTokenProperty : {};

			// Process the query string for better search results
			const processedQueryString = queryString.trim();

			try {
				const response = await fetch(
					`/api/ceds/semanticDistance?queryString=${encodeURIComponent(processedQueryString)}`,
					{
						headers: authHeader,
					},
				);

				if (!response.ok) {
					throw new Error(
						`Failed to fetch semantic distance data: ${response.statusText}`,
					);
				}

				const data = await response.json();

				// Store the response in our state, keyed by searchId for this specific query
				const resultItem = {
					queryString: processedQueryString,
					originalQuery: queryString,
					timestamp: new Date().toISOString(),
					resultSet: data,
				};

				// Initialize array for this searchId if it doesn't exist
				if (!this.semanticDistanceResults[searchId]) {
					this.semanticDistanceResults[searchId] = [];
				}

				// Add new result
				this.semanticDistanceResults[searchId].push(resultItem);

				// Limit to last 5 queries per searchId
				if (this.semanticDistanceResults[searchId].length > 5) {
					this.semanticDistanceResults[searchId] = this.semanticDistanceResults[searchId].slice(-5);
				}

				return data;
			} catch (err) {
				this.semanticDistanceError = err.message;
				console.error('Error fetching semantic distance data:', err);
			} finally {
				this.isLoadingSemanticDistance = false;
			}
		},
		
		// Get semantic distance results for a specific search ID
		getSemanticDistanceResults(searchId) {
			return this.semanticDistanceResults[searchId] || [];
		},
		
		// Fetch CEDS ontology classes from the server
		async fetchOntologyClasses() {
			this.isLoadingOntologyClasses = true;
			this.ontologyClassesError = null;

			// Import LoginStore to get auth token
			const { useLoginStore } = await import('@/stores/loginStore');
			const LoginStore = useLoginStore();

			// Get the auth token header if user is logged in, otherwise empty object
			// CEDS endpoints are marked as public so we don't need a token
			const authHeader = LoginStore.validUser ? LoginStore.getAuthTokenProperty : {};

			try {
				const response = await fetch('/api/ceds/fetchOntologyClasses', {
					headers: authHeader,
				});

				if (!response.ok) {
					throw new Error(
						`Failed to fetch CEDS ontology classes: ${response.statusText}`,
					);
				}

				const data = await response.json();
				this.ontologyClasses = data;
				return data;
			} catch (err) {
				this.ontologyClassesError = err.message;
				console.error('Error fetching CEDS ontology classes:', err);
			} finally {
				this.isLoadingOntologyClasses = false;
			}
		},
	},

	getters: {
		isDataLoaded: (state) => !!state.listOfProperties,
		hasNameList: (state) => state.nameList.length > 0,
		hasOntologyClasses: (state) => !!state.ontologyClasses,
	},
});