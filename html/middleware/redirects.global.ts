import { useLoginStore } from '@/stores/loginStore';

export default defineNuxtRouteMiddleware((to, from) => {
  // Get the login store
  const loginStore = useLoginStore();
  
  // If user is going to the root route without a login or logout query parameter, redirect to welcome page
  if (to.path === '/' && !to.query.login && !to.query.logout) {
    return navigateTo('/welcomePage');
  }
  
  // If user is not logged in and tries to access NA Model page, redirect to login
  if (to.path === '/namodel' && !loginStore.validUser) {
    return navigateTo('/?login=true');
  }
  
  // If user is not logged in and tries to access profile, redirect to login
  if (to.path === '/utility' && to.query.purpose === 'profile' && !loginStore.validUser) {
    return navigateTo('/?login=true');
  }
})