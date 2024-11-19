<script>
  import { createEventDispatcher } from 'svelte';
  import { page } from '$app/stores'; // Import page store for route detection
  
  export let isExpanded = false;
  
  const dispatch = createEventDispatcher();

  const menuItems = [
    { name: 'Map', route: '/private/map' },
    { name: 'Import', route: '/private/import' },
    { name: 'Onboard', route: '/private/onboard' },
    { name: 'View Reports', route: '/private/reports' }
  ];

  function toggleSidebar() {
    isExpanded = !isExpanded;
    dispatch('toggle', isExpanded);
  }
</script>

<div class="fixed z-50 left-4 top-4 bg-gray-900 text-white rounded-lg shadow-lg transition-all duration-300 {isExpanded ? 'w-64' : 'w-auto'} overflow-hidden">
  {#if isExpanded}
    <!-- Expanded sidebar content -->
    <div class="flex items-center justify-between p-2">
      <h1 class="text-sm font-semibold">Navigation</h1>
      <button on:click={toggleSidebar} class="p-1 hover:bg-gray-700 rounded">
        <svg xmlns="http://www.w3.org/2000/svg" class="h-4 w-4" viewBox="0 0 20 20" fill="currentColor">
          <path fill-rule="evenodd" d="M12.707 5.293a1 1 0 010 1.414L9.414 10l3.293 3.293a1 1 0 01-1.414 1.414l-4-4a1 1 0 010-1.414l4-4a1 1 0 011.414 0z" clip-rule="evenodd" />
        </svg>
      </button>
    </div>
    <div class="border-t border-gray-700 mt-1"></div>
    <div class="max-h-32 overflow-y-auto">
      {#each menuItems.filter(item => item.route !== $page.url.pathname) as item}
        <div class="flex items-center p-2 hover:bg-gray-800 cursor-pointer text-sm">
          <a href={item.route} class="w-full text-white">{item.name}</a> <!-- Actual link -->
        </div>
      {/each}
    </div>
  {:else}
    <!-- Collapsed sidebar content -->
    <div class="flex items-center p-2 hover:bg-gray-800 cursor-pointer" on:click={toggleSidebar}>
      <svg xmlns="http://www.w3.org/2000/svg" class="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
        <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M4 6h16M4 12h16M4 18h16" />
      </svg>
      <span class="ml-2 text-sm">Navigation</span>
    </div>
  {/if}
</div>

<style>
  /* Add any additional styles here if needed */
  a {
    text-decoration: none;
  }
</style>
