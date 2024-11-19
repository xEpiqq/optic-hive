<!-- territory.svelte -->
<script>
  import { createEventDispatcher, onMount } from 'svelte';
  import { supabase } from '../supabaseClient';
  
  export let isExpanded = true;
  export let polygon = null; // The drawn polygon passed from the parent component
  export let territories = []; // List of existing territories passed from the parent

  const dispatch = createEventDispatcher();

  // States for creating a new territory
  let territoryName = '';
  let color = '#FF0000';
  let isSaving = false;
  let saveError = '';

  // States for assigning users
  let users = [];
  let selectedUserId = null;
  let assignError = '';
  let assignSuccess = '';

  // View mode: 'list' or 'add'
  let viewMode = 'list';

  // State for selected territory to view details
  let selectedTerritory = null;

  // Search query
  let searchQuery = '';

  // Initialize with dummy territories if none are provided
  onMount(() => {
    if (isExpanded) {
      fetchUsers();
      if (territories.length === 0) {
        territories = [
          { id: 1, name: 'Territory Alpha', color: '#FF5733', assigned_user_id: 101, geom: {/* Geometry data */} },
          { id: 2, name: 'Territory Beta', color: '#33FF57', assigned_user_id: 102, geom: {/* Geometry data */} },
          { id: 3, name: 'Territory Gamma', color: '#3357FF', assigned_user_id: 103, geom: {/* Geometry data */} }
        ];
      }
    }
  });

  const fetchUsers = async () => {
    try {
      const { data, error } = await supabase
        .from('profiles')
        .select('user_id, first_name, last_name')
        .order('first_name', { ascending: true });

      if (error) {
        throw error;
      }

      users = data;
    } catch (error) {
      console.error('Error fetching users:', error);
      assignError = 'Failed to load users. Please try again.';
    }
  };

  // Function to handle starting the drawing
  function drawTerritory() {
    dispatch('startDrawing');
  }

  // Function to handle saving the territory
  async function saveTerritory() {
    if (!territoryName.trim()) {
      saveError = 'Territory name is required.';
      return;
    }

    if (!polygon) {
      saveError = 'No territory drawn.';
      return;
    }

    if (!selectedUserId) {
      saveError = 'Please select a user to assign the territory.';
      return;
    }

    saveError = '';
    isSaving = true;

    // Dispatch the save event with the new territory data
    dispatch('save', { name: territoryName, color, polygon, user_id: selectedUserId });
  }

  // Function to handle cancellation
  function cancelTerritory() {
    // Reset form fields
    territoryName = '';
    color = '#FF0000';
    selectedUserId = null;
    saveError = '';
    viewMode = 'list';
    selectedTerritory = null;
    dispatch('cancel');
  }

  // Handler for the "Add" button
  function handleAdd() {
    viewMode = 'add';
    // Dispatch an event to initiate drawing on the map
    dispatch('startDrawing');
  }

  // Handler for clicking on an existing territory
  function handleTerritoryClick(territory) {
    dispatch('jumpToTerritory', territory);
    selectedTerritory = territory;
  }

  // Handler for going back to the list view
  function handleBackToList() {
    selectedTerritory = null;
  }

  // Watch for color changes and dispatch event
  $: dispatch('colorChange', color);

  // Reactive variable to filter territories based on search query
  $: filteredTerritories = territories.filter(territory =>
    territory.name.toLowerCase().includes(searchQuery.toLowerCase())
  );
</script>

<div
  class="fixed z-50 right-4 top-4 bg-gray-900 text-white rounded-lg shadow-lg transition-all duration-300 overflow-hidden flex flex-col"
  class:w-80={isExpanded}
  class:w-0={!isExpanded}
  style="height: 90vh;"
>
  {#if isExpanded}
    <!-- Expanded modal content -->
    <div class="flex items-center justify-between p-4">
      <h2 class="text-lg font-semibold">
        {#if selectedTerritory}
          {selectedTerritory.name}
        {:else}
          Territory Management
        {/if}
      </h2>
      <button on:click={() => dispatch('toggle', false)} class="p-1 hover:bg-gray-700 rounded">
        <svg xmlns="http://www.w3.org/2000/svg" class="h-5 w-5" viewBox="0 0 20 20" fill="currentColor">
          <path
            fill-rule="evenodd"
            d="M10 8.586L15.95 2.636l1.414 1.414L11.414 10l5.95 5.95-1.414 1.414L10 11.414l-5.95 5.95-1.414-1.414L8.586 10 2.636 4.05l1.414-1.414L10 8.586z"
            clip-rule="evenodd"
          />
        </svg>
      </button>
    </div>
    <div class="border-t border-gray-700"></div>
    <div class="p-4 flex-1 overflow-y-auto scroll-container">
      {#if selectedTerritory}
        <!-- Detail view for selected territory -->
        <div class="space-y-4">
          <!-- Back Arrow -->
          <button on:click={handleBackToList} class="flex items-center text-gray-300 hover:text-white">
            <svg xmlns="http://www.w3.org/2000/svg" class="h-5 w-5 mr-2" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M15 19l-7-7 7-7" />
            </svg>
            Back to List
          </button>
          
          <!-- Territory Details (Placeholder for future stats) -->
          <div>
            <h3 class="text-md font-medium">Details for {selectedTerritory.name}</h3>
            <!-- Future stats can be added here -->
            <p class="text-sm text-gray-400">Stats and other information will appear here.</p>
          </div>
        </div>
      {:else if viewMode === 'list'}
        <!-- List of pre-existing territories with Search Function -->
        <div class="flex flex-col space-y-4">
          <!-- Header with Add Button -->
          <div class="flex justify-between items-center mb-4">
            <h3 class="text-md font-medium">Existing Territories</h3>
            <button
              on:click={handleAdd}
              class="px-2 py-1 bg-green-500 text-white rounded hover:bg-green-400 text-sm"
            >
              Add
            </button>
          </div>

          <!-- Search Bar -->
          <div>
            <input
              type="text"
              bind:value={searchQuery}
              placeholder="Search territories..."
              class="w-full px-3 py-2 bg-gray-800 text-white border border-gray-700 rounded-md focus:outline-none focus:ring focus:border-blue-500"
              aria-label="Search Territories"
            />
          </div>

          <!-- Territories List -->
          {#if filteredTerritories.length > 0}
            <ul class="space-y-3">
              {#each filteredTerritories as territory}
                <li
                  class="flex items-center justify-between p-2 bg-gray-800 rounded cursor-pointer hover:bg-gray-700 transition-colors"
                  on:click={() => handleTerritoryClick(territory)}
                >
                  <div class="flex items-center">
                    <span
                      class="w-4 h-4 rounded-full mr-2"
                      style="background-color: {territory.color};"
                    ></span>
                    <span>{territory.name}</span>
                  </div>
                  <!-- Removed the dropdown for assigning users -->
                </li>
              {/each}
            </ul>
          {:else}
            <p class="text-gray-400 text-sm">No territories found.</p>
          {/if}
        </div>
      {:else if viewMode === 'add'}
        <!-- Territory Naming and Color Form -->
        <div class="mb-4">
          <label for="territoryName" class="block text-sm font-medium text-gray-300">Territory Name</label>
          <input
            id="territoryName"
            type="text"
            bind:value={territoryName}
            class="mt-1 block w-full px-3 py-2 bg-gray-800 text-white border border-gray-700 rounded-md focus:outline-none focus:ring focus:border-blue-500"
            placeholder="Enter territory name"
          />
        </div>
        <div class="mb-4">
          <label for="territoryColor" class="block text-sm font-medium text-gray-300">Territory Color</label>
          <input
            id="territoryColor"
            type="color"
            bind:value={color}
            class="mt-1 block w-full h-10 p-0 border-0"
            on:input={() => dispatch('colorChange', color)}
          />
        </div>
        <div class="mb-4">
          <label for="assignUser" class="block text-sm font-medium text-gray-300">Assign to User</label>
          <select
            id="assignUser"
            bind:value={selectedUserId}
            class="mt-1 block w-full px-3 py-2 bg-gray-800 text-white border border-gray-700 rounded-md focus:outline-none focus:ring focus:border-blue-500"
          >
            <option value="" disabled>Select a user</option>
            {#each users as user}
              <option value={user.user_id}>{user.first_name} {user.last_name}</option>
            {/each}
          </select>
          {#if saveError && !selectedUserId}
            <p class="text-red-500 text-xs mt-1">{saveError}</p>
          {/if}
        </div>
        {#if saveError}
          <p class="text-red-500 text-xs mb-2">{saveError}</p>
        {/if}
        <div class="flex justify-end space-x-2">
          <button
            on:click={cancelTerritory}
            class="px-3 py-1 bg-gray-700 text-white rounded hover:bg-gray-600"
            disabled={isSaving}
          >
            Cancel
          </button>
          <button
            on:click={saveTerritory}
            class="px-3 py-1 bg-blue-600 text-white rounded hover:bg-blue-500 flex items-center"
            disabled={isSaving}
          >
            {isSaving ? 'Saving...' : 'Save'}
          </button>
        </div>
      {/if}
    </div>
  {:else}
    <!-- Collapsed modal content -->
    <div class="flex items-center p-4 hover:bg-gray-800 cursor-pointer" on:click={() => dispatch('toggle', true)}>
      <svg xmlns="http://www.w3.org/2000/svg" class="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
        <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M4 6h16M4 12h16M4 18h16" />
      </svg>
      <span class="ml-2 text-sm">Territory</span>
    </div>
  {/if}
</div>

<style>
  /* Ensure the modal takes up most of the viewport height */
  div.fixed {
    height: 90vh; /* Adjust as needed */
  }

  /* Custom Scrollbar Styles */

  /* For Webkit Browsers (Chrome, Safari, Edge) */
  .scroll-container::-webkit-scrollbar {
    width: 6px; /* Width of the scrollbar */
  }

  .scroll-container::-webkit-scrollbar-track {
    background: transparent; /* Background of the scrollbar track */
  }

  .scroll-container::-webkit-scrollbar-thumb {
    background-color: rgba(255, 255, 255, 0.2); /* Color of the scrollbar thumb */
    border-radius: 3px; /* Rounded corners of the thumb */
  }

  .scroll-container::-webkit-scrollbar-thumb:hover {
    background-color: rgba(255, 255, 255, 0.3); /* Thumb color on hover */
  }

  /* For Firefox */
  .scroll-container {
    scrollbar-width: thin; /* Makes the scrollbar thin */
    scrollbar-color: rgba(255, 255, 255, 0.2) transparent; /* Thumb and track colors */
  }

  /* Optional: Hide scrollbar for IE and Edge (non-Webkit) */
  /* Note: IE scrollbar styling is limited and deprecated */
  @media all and (-ms-high-contrast: none), (-ms-high-contrast: active) {
    .scroll-container {
      -ms-overflow-style: none;
    }
  }

  /* Add any additional styles here if needed */
  .error-overlay {
    position: absolute;
  }

  @keyframes fadeIn {
    from { opacity: 0; }
    to { opacity: 1; }
  }

  .loader {
    border: 8px solid #f3f3f3;
    border-top: 8px solid #007bff;
    border-radius: 50%;
    width: 60px;
    height: 60px;
    animation: spin 1s linear infinite;
  }

  @keyframes spin {
    0% { transform: rotate(0deg); }
    100% { transform: rotate(360deg); }
  }

  #map {
    width: 100%;
    height: 100%;
  }

  .loader,
  .error-overlay {
    z-index: 1000;
  }
</style>
