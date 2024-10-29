<!-- AssignLeadsModal.svelte -->
<script>
  import { createEventDispatcher, onMount } from 'svelte';
  import { supabase } from '../supabaseClient';

  export let isExpanded = true;
  export let polygon = null; // The drawn polygon

  const dispatch = createEventDispatcher();

  let users = [];
  let selectedUserId = null;
  let isAssigning = false;
  let assignError = null;
  let assignSuccess = null;

  onMount(async () => {
    await fetchUsers();
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

  const toggleModal = () => {
    dispatch('toggle', false);
  };

  const handleAssign = async () => {
    if (!selectedUserId) {
      assignError = 'Please select a user to assign.';
      return;
    }

    if (!polygon) {
      assignError = 'No polygon defined.';
      return;
    }

    isAssigning = true;
    assignError = null;
    assignSuccess = null;

    try {
      // Extract the path from the polygon
      const path = polygon.getPath().getArray().map(latlng => ({
        latitude: parseFloat(latlng.lat().toFixed(7)),
        longitude: parseFloat(latlng.lng().toFixed(7)),
      }));

      // Ensure the polygon is closed
      if (
        path.length < 4 ||
        path[0].latitude !== path[path.length - 1].latitude ||
        path[0].longitude !== path[path.length - 1].longitude
      ) {
        path.push({ ...path[0] });
      }

      // Validate all coordinates
      for (let point of path) {
        if (
          typeof point.latitude !== 'number' ||
          typeof point.longitude !== 'number' ||
          isNaN(point.latitude) ||
          isNaN(point.longitude)
        ) {
          throw new Error('Invalid coordinate detected in the polygon.');
        }
      }

      const polygonGeoJSON = {
        type: 'Polygon',
        coordinates: [
          path.map(point => [point.longitude, point.latitude]),
        ],
      };

      // Call the RPC function to assign restaurants
      const { data, error } = await supabase.rpc('assign_restaurants_within_polygon', {
        p_polygon: polygonGeoJSON,
        p_user_id: selectedUserId,
      });

      if (error) {
        throw error;
      }

      assignSuccess = `Successfully assigned restaurants to user. ${data} restaurants updated.`;
      dispatch('assignSuccess');

      // Remove the polygon from the map
      polygon.setMap(null);
      selectedPolygon = null;

      // Close the modal after a short delay
      setTimeout(() => {
        toggleModal();
      }, 2000);
    } catch (error) {
      console.error('Error assigning restaurants:', error);
      assignError = error.message || 'Failed to assign restaurants. Please try again.';
    } finally {
      isAssigning = false;
    }
  };
</script>

<div class="fixed z-50 right-4 top-4 bg-gray-900 text-white rounded-lg shadow-lg transition-all duration-300 {isExpanded ? 'w-80' : 'w-0'} overflow-hidden">
{#if isExpanded}
  <!-- Expanded modal content -->
  <div class="flex items-center justify-between p-4">
    <h1 class="text-lg font-semibold">Assign Restaurants</h1>
    <button on:click={toggleModal} class="p-1 hover:bg-gray-700 rounded">
      <svg xmlns="http://www.w3.org/2000/svg" class="h-5 w-5" viewBox="0 0 20 20" fill="currentColor">
        <path fill-rule="evenodd" d="M10 8.586L15.95 2.636l1.414 1.414L11.414 10l5.95 5.95-1.414 1.414L10 11.414l-5.95 5.95-1.414-1.414L8.586 10 2.636 4.05l1.414-1.414L10 8.586z" clip-rule="evenodd" />
      </svg>
    </button>
  </div>
  <div class="border-t border-gray-700"></div>
  <div class="p-4">
    <!-- Assign Restaurants Form -->
    {#if assignError}
      <div class="mb-2 text-red-500">{assignError}</div>
    {/if}
    {#if assignSuccess}
      <div class="mb-2 text-green-500">{assignSuccess}</div>
    {/if}
    <label class="block mb-2 text-sm">
      Select User to Assign Restaurants:
      <select bind:value={selectedUserId} class="w-full mt-1 p-2 bg-gray-800 text-white rounded">
        <option value="" disabled selected>Select a user</option>
        {#each users as user}
          <option value={user.user_id}>{user.first_name} {user.last_name}</option>
        {/each}
      </select>
    </label>
    <button
      on:click={handleAssign}
      class="w-full mt-4 bg-blue-600 hover:bg-blue-700 text-white py-2 rounded disabled:opacity-50"
      disabled={isAssigning}>
      {isAssigning ? 'Assigning...' : 'Assign'}
    </button>
  </div>
{:else}
  <!-- Collapsed modal content -->
  <div class="flex items-center p-4 hover:bg-gray-800 cursor-pointer" on:click={toggleModal}>
    <svg xmlns="http://www.w3.org/2000/svg" class="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
      <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M4 6h16M4 12h16M4 18h16" />
    </svg>
    <span class="ml-2 text-sm">Assign Restaurants</span>
  </div>
{/if}
</div>

<style>
/* Add any additional styles here if needed */
</style>
