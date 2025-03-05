import { defineStore } from 'pinia';
import { toType, qtPutSurePath } from '@/plugins/qtools-functional-library';

export const useNamodelStore = defineStore('namodel', {
	state: () => ({
		nameList: [],
		listOfProperties: null,
		combinedObject: null,
		semanticDistanceResults: [],
		isLoading: false,
		isLoadingSemanticDistance: false,
		semanticDistanceError: null,
		error: null,
	}),

	actions: {
		async fetchNameList() {
			this.isLoading = true;
			this.error = null;

			// Import LoginStore to get auth token
			const { useLoginStore } = await import('@/stores/loginStore');
			const LoginStore = useLoginStore();

			// Get the auth token header
			const authHeader = LoginStore.getAuthTokenProperty;

			try {
				const response = await fetch('/api/namodel/fetchNameList', {
					headers: authHeader,
				});

				if (!response.ok) {
					throw new Error(
						`Failed to fetch NA Model name list: ${response.statusText}`,
					);
				}

				const data = await response.json();
				this.nameList = data;
			} catch (err) {
				this.error = err.message;
				console.error('Error fetching NA Model name list:', err);
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

			// Get the auth token header
			const authHeader = LoginStore.getAuthTokenProperty;

			this.isLoading = true;
			this.error = null;
			try {
				const response = await fetch(
					`/api/namodel/fetchData?refId=${encodeURIComponent(refId)}`,
					{
						headers: authHeader,
					},
				);

				if (!response.ok) {
					throw new Error(
						`Failed to fetch NA Model data: ${response.statusText}`,
					);
				}

				const data = await response.json();
				
				// Create the structured object from the flat list of properties
				const structuredObject = {};
				
				// Process each item to build the nested object structure
				data.forEach(item => {
					// Skip items with no XPath
					if (!item.XPath) return;
					
					// Remove the leading slash if it exists
					const normalizedPath = item.XPath.startsWith('/') 
						? item.XPath.substring(1) 
						: item.XPath;
					
					// Split the path into segments
					const pathSegments = normalizedPath.split('/');
					
					// Build the object path from XPath segments
					const objectPath = pathSegments.join('.');
					
					// Add the item to the structured object
					qtPutSurePath(structuredObject, objectPath, item);
				});
				
				// Store both representations for different use cases
				this.listOfProperties = data;
				this.combinedObject = structuredObject;
			} catch (err) {
				this.error = err.message;
				console.error('Error fetching NA Model data:', err);
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

			// Get the auth token header
			const authHeader = LoginStore.getAuthTokenProperty;

			this.isLoading = true;
			this.error = null;
			try {
				const response = await fetch('/api/namodel/saveData', {
					method: 'POST',
					headers: {
						'Content-Type': 'application/json',
						...authHeader,
					},
					body: JSON.stringify(data),
				});

				if (!response.ok) {
					throw new Error(
						`Failed to save NA Model data: ${response.statusText}`,
					);
				}

				const responseData = await response.json();
				
				// Create the structured object from the flat list of properties
				const structuredObject = {};
				
				// Process each item to build the nested object structure
				responseData.forEach(item => {
					// Skip items with no XPath
					if (!item.XPath) return;
					
					// Remove the leading slash if it exists
					const normalizedPath = item.XPath.startsWith('/') 
						? item.XPath.substring(1) 
						: item.XPath;
					
					// Split the path into segments
					const pathSegments = normalizedPath.split('/');
					
					// Build the object path from XPath segments
					const objectPath = pathSegments.join('.');
					
					// Add the item to the structured object
					qtPutSurePath(structuredObject, objectPath, item);
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
				console.error('Error saving NA Model data:', err);
				throw err;
			} finally {
				this.isLoading = false;
			}
		},

		clearCurrentData() {
			this.listOfProperties = null;
			this.combinedObject = null;
		},

		async fetchSemanticDistance(queryString = "family name") {
			this.isLoadingSemanticDistance = true;
			this.semanticDistanceError = null;

			// Import LoginStore to get auth token
			const { useLoginStore } = await import('@/stores/loginStore');
			const LoginStore = useLoginStore();

			// Get the auth token header
			const authHeader = LoginStore.getAuthTokenProperty;

			try {
				const response = await fetch(
					`/api/ceds/semanticDistance?queryString=${encodeURIComponent(queryString)}`,
					{
						headers: authHeader,
					}
				);

				if (!response.ok) {
					throw new Error(
						`Failed to fetch semantic distance data: ${response.statusText}`
					);
				}

				const data = await response.json();
				this.semanticDistanceResults = data;
				return data;
			} catch (err) {
				this.semanticDistanceError = err.message;
				console.error('Error fetching semantic distance data:', err);
			} finally {
				this.isLoadingSemanticDistance = false;
			}
		},
	},

	getters: {
		isDataLoaded: (state) => !!state.listOfProperties,
		hasNameList: (state) => state.nameList.length > 0,
		hasSemanticDistanceResults: (state) => state.semanticDistanceResults.length > 0,
	},
});