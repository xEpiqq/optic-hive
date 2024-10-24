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

  // Fetch users when the modal is expanded
  onMount(() => {
    if (isExpanded) {
      fetchUsers();
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

    dispatch('save', { name: territoryName, color, polygon, user_id: selectedUserId });
  }

  // Function to handle cancellation
  function cancelTerritory() {
    dispatch('cancel');
  }

  // Function to handle assigning users to existing territories
  async function assignUserToExistingTerritory(existingTerritoryId, userId) {
    if (!userId) {
      assignError = 'Please select a user to assign.';
      return;
    }

    try {
      const { data, error } = await supabase
        .from('territories')
        .update({ assigned_user_id: userId }) // Assuming you have this column
        .eq('id', existingTerritoryId);

      if (error) {
        throw error;
      }

      assignSuccess = `Successfully assigned user to territory.`;
      dispatch('assignSuccess');

      // Optionally, you can emit an event to refresh territories in the main component
    } catch (error) {
      console.error('Error assigning user to territory:', error);
      assignError = 'Failed to assign user. Please try again.';
    }
  }
</script>

<div
  class="fixed z-50 right-4 top-4 bg-gray-900 text-white rounded-lg shadow-lg transition-all duration-300 overflow-hidden"
  class:w-80={isExpanded}
  class:w-0={!isExpanded}
>
  {#if isExpanded}
    <!-- Expanded modal content -->
    <div class="flex items-center justify-between p-4">
      <h2 class="text-lg font-semibold">Territory Management</h2>
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
    <div class="p-4">
      {#if polygon}
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
          />
        </div>
        <div class="mb-4">
          <label for="assignUser" class="block text-sm font-medium text-gray-300">Assign to User</label>
          <select
            id="assignUser"
            bind:value={selectedUserId}
            class="mt-1 block w-full px-3 py-2 bg-gray-800 text-white border border-gray-700 rounded-md focus:outline-none focus:ring focus:border-blue-500"
          >
            <option value="" disabled selected>Select a user</option>
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
      {:else}
        <!-- Initial state with "Draw Territory" and "Assign to User" -->
        <div class="mb-4">
          <button
            on:click={drawTerritory}
            class="w-full py-2 bg-blue-600 text-white rounded hover:bg-blue-500 flex items-center justify-center"
          >
            Start Draw
          </button>
        </div>
        <div class="mb-6">
          <label for="assignExistingTerritory" class="block text-sm font-medium text-gray-300">Assign to Existing Territory</label>
          <select
            id="assignExistingTerritory"
            class="mt-1 block w-full px-3 py-2 bg-gray-800 text-white border border-gray-700 rounded-md focus:outline-none focus:ring focus:border-blue-500"
            on:change={(e) => {
              const territoryId = e.target.value;
              if (territoryId) {
                // Optionally, you can open a separate modal or handle assignment here
                const userId = prompt('Enter User ID to assign:'); // Replace with a better UI for selecting user
                if (userId) {
                  assignUserToExistingTerritory(territoryId, userId);
                }
              }
            }}
          >
            <option value="" disabled selected>Select a territory</option>
            {#each territories as territory}
              <option value={territory.id}>{territory.name}</option>
            {/each}
          </select>
        </div>
        {#if assignError}
          <p class="text-red-500 text-xs mb-2">{assignError}</p>
        {/if}
        {#if assignSuccess}
          <p class="text-green-500 text-xs mb-2">{assignSuccess}</p>
        {/if}
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
