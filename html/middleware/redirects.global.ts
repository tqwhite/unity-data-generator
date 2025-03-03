export default defineNuxtRouteMiddleware((to, from) => {
  // Redirect /work to /ceds for backward compatibility
  if (to.path === '/work' || to.path === '/work/') {
    return navigateTo('/ceds', { redirectCode: 301 })
  }
})