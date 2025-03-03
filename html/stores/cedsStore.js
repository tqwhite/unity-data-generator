import { defineStore } from 'pinia';

export const useCedsStore = defineStore('ceds', {
  state: () => ({
    nameList: [],
    currentData: null,
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
      console.log("DEBUG: Auth header for request:", authHeader);
      
      // First call debug auth endpoint to diagnose authentication issues
      try {
        console.log("DEBUG: Making auth debug request before fetchNameList");
        const debugResponse = await fetch('/api/debug/auth', {
          headers: authHeader
        });
        if (debugResponse.ok) {
          const authInfo = await debugResponse.json();
          console.log("DEBUG: Auth info from debug endpoint:", authInfo);
        } else {
          console.error("DEBUG: Auth debug endpoint failed:", debugResponse.status, debugResponse.statusText);
        }
      } catch (debugErr) {
        console.error("DEBUG: Error calling auth debug endpoint:", debugErr);
      }
      
      // Now make the actual fetch request with auth header
      try {
        console.log("DEBUG: Making fetchNameList request with auth header");
        const response = await fetch('/api/ceds/fetchNameList', {
          headers: authHeader
        });
        
        console.log("DEBUG: fetchNameList response status:", response.status, response.statusText);
        
        if (!response.ok) {
          throw new Error(`Failed to fetch CEDS name list: ${response.statusText}`);
        }
        
        const data = await response.json();
        console.log("DEBUG: fetchNameList successful, received items:", data.length);
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
        const response = await fetch(`/api/ceds/fetchData?refId=${encodeURIComponent(refId)}`, {
          headers: authHeader
        });
        
        if (!response.ok) {
          throw new Error(`Failed to fetch CEDS data: ${response.statusText}`);
        }
        
        const data = await response.json();
        this.currentData = data;
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
            ...authHeader
          },
          body: JSON.stringify(data),
        });
        
        if (!response.ok) {
          throw new Error(`Failed to save CEDS data: ${response.statusText}`);
        }
        
        const responseData = await response.json();
        this.currentData = responseData;
        
        // Update name in the nameList if it exists
        const nameIndex = this.nameList.findIndex(item => item.refId === data.refId);
        if (nameIndex !== -1) {
          this.nameList[nameIndex] = { 
            refId: data.refId, 
            name: data.name || data.title || data.refId 
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
      this.currentData = null;
    }
  },
  
  getters: {
    isDataLoaded: (state) => !!state.currentData,
    hasNameList: (state) => state.nameList.length > 0,
  }
});