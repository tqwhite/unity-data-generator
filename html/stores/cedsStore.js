import { defineStore } from 'pinia';
import { toType, qtPutSurePath } from '@/plugins/qtools-functional-library';

export const useCedsStore = defineStore('ceds', {
	state: () => ({
		nameList: [],
		listOfProperties: null,
		combinedObject: null,
		isLoading: false,
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

			// Get the auth token header
			const authHeader = LoginStore.getAuthTokenProperty;

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

			// Get the auth token header
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
	},

	getters: {
		isDataLoaded: (state) => !!state.listOfProperties,
		hasNameList: (state) => state.nameList.length > 0,
	},
});
