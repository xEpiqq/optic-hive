<script>
  import Sidebar from '../../../lib/components/sidebar.svelte';
  import { supabase } from '../../../lib/supabaseClient';

  const apiKey = import.meta.env.VITE_GOOGLE_MAPS_API_KEY;
  const BATCH_SIZE = 50;
  const DELAY = 1000; // 1 second delay between batches

  let isProcessing = false;
  let file;
  let fileSelected = false;
  let uploadMessage = '';

  // Handle file selection
  function handleFileUpload(event) {
    file = event.target.files[0];
    fileSelected = !!file;
    uploadMessage = ''; // Reset any previous messages
  }

  // Start the upload process
  async function startUpload() {
    if (!file) return;
    isProcessing = true; // Show spinner
    uploadMessage = 'Processing...';

    try {
      const csv = await readFileAsText(file);
      const addresses = parseCSV(csv);
      let successCount = 0;
      let failureCount = 0;

      // Process in batches
      for (let i = 0; i < addresses.length; i += BATCH_SIZE) {
        const batch = addresses.slice(i, i + BATCH_SIZE);
        const { success, failure } = await processBatch(batch);
        successCount += success;
        failureCount += failure;
        uploadMessage = `Processed ${successCount + failureCount} records...`;
        await sleep(DELAY);
      }

      uploadMessage = `Upload completed! Successfully uploaded: ${successCount}, Failed: ${failureCount}`;
    } catch (error) {
      console.error('Error during upload:', error);
      uploadMessage = `An error occurred: ${error.message}`;
    } finally {
      isProcessing = false; // Hide spinner
    }
  }

  // Read file as text
  function readFileAsText(file) {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = (event) => resolve(event.target.result);
      reader.onerror = (error) => reject(error);
      reader.readAsText(file);
    });
  }

  // Parse CSV into address objects
  function parseCSV(csv) {
    const lines = csv.trim().split('\n');
    const headers = lines[0].split(',').map(h => h.trim().toUpperCase());

    return lines.slice(1).map(line => {
      const values = line.split(',').map(v => v.trim());
      return {
        address: values[headers.indexOf('ADDRESS')] || '',
        city: values[headers.indexOf('CITY')] || '',
        state: values[headers.indexOf('STATE')] || '',
        zip5: values[headers.indexOf('ZIP_5')] || '',
        zip9: values[headers.indexOf('ZIP_9')] || null // Set to null if empty
      };
    }).filter(entry => entry.address && entry.city && entry.state && entry.zip5); // Filter out incomplete entries
  }

  // Process a batch of addresses
  async function processBatch(batch) {
    let success = 0;
    let failure = 0;

    // Geocode all addresses in the batch
    const geocodePromises = batch.map(entry => geocodeAddress(entry));
    const geocodedResults = await Promise.all(geocodePromises);

    // Insert successfully geocoded addresses into the database
    const insertPromises = geocodedResults.map(async (result) => {
      if (result.success) {
        const { data, error } = await supabase
          .from('restaurants')
          .insert({
            address: result.data.address,
            city: result.data.city,
            state: result.data.state,
            zip5: result.data.zip5,
            zip9: result.data.zip9, // Will be null if empty
            location: {
              type: 'Point',
              coordinates: [result.data.longitude, result.data.latitude]
            },
            status: 0, // Assuming new lead status
            created_at: new Date().toISOString(),
            updated_at: new Date().toISOString()
          });

        if (error) {
          console.error('Insert Error:', error.message, 'Data:', result.data);
          failure += 1;
        } else {
          success += 1;
        }
      } else {
        failure += 1;
      }
    });

    await Promise.all(insertPromises);
    return { success, failure };
  }

  // Geocode a single address
  async function geocodeAddress({ address, city, state, zip5, zip9 }) {
    const fullAddress = `${address}, ${city}, ${state} ${zip5}, USA`;
    const url = `https://maps.googleapis.com/maps/api/geocode/json?address=${encodeURIComponent(fullAddress)}&key=${apiKey}`;

    try {
      const response = await fetch(url);
      const data = await response.json();

      if (data.status === 'OK' && data.results.length > 0) {
        const location = data.results[0].geometry.location;
        return {
          success: true,
          data: {
            address,
            city,
            state,
            zip5,
            zip9: zip9 || null, // Ensure zip9 is null if empty
            latitude: location.lat,
            longitude: location.lng
          }
        };
      } else {
        console.error('Geocoding failed for:', fullAddress, 'Status:', data.status);
        return { success: false };
      }
    } catch (error) {
      console.error('Geocoding request error for:', fullAddress, error);
      return { success: false };
    }
  }

  // Utility sleep function
  function sleep(ms) {
    return new Promise(resolve => setTimeout(resolve, ms));
  }
</script>

<!-- Main centered file upload component -->
<div class="min-h-screen flex items-center justify-center bg-gray-900">
  <Sidebar />
  <div class="text-center flex flex-col">
    <svg class="mx-auto h-12 w-12 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" aria-hidden="true">
      <path vector-effect="non-scaling-stroke" stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 13h6m-3-3v6m-9 1V7a2 2 0 012-2h6l2 2h6a2 2 0 012 2v8a2 2 0 01-2 2H5a2 2 0 01-2-2z" />
    </svg>
    <h3 class="mt-2 text-sm font-semibold text-gray-300">Import Restaurants</h3>
    <p class="mt-1 text-sm text-gray-400">Select a CSV file from your device</p>
    <div class="mt-6">
      <label for="file-upload" class="relative cursor-pointer bg-gray-800 rounded-md font-medium text-blue-400 hover:text-blue-300 focus-within:outline-none focus-within:ring-2 focus-within:ring-offset-2 focus-within:ring-blue-500">
        <span class="inline-flex items-center px-4 py-2 border border-gray-600 rounded-md shadow-sm text-sm font-medium text-gray-300 bg-gray-800 hover:bg-gray-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500">
          Choose file
        </span>
        <input id="file-upload" name="file-upload" type="file" accept=".csv" class="sr-only" on:change={handleFileUpload} />
      </label>
    </div>
    {#if fileSelected}
      <p class="mt-2 text-sm text-gray-500">{file.name}</p>
      <button 
        class="mt-6 bg-blue-600 text-white py-2 px-4 rounded flex justify-center items-center disabled:opacity-50"
        on:click={startUpload}
        disabled={isProcessing}
      >
        {#if isProcessing}
          <svg class="animate-spin h-5 w-5 mr-3" viewBox="0 0 24 24">
            <circle class="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" stroke-width="4"></circle>
            <path class="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8z"></path>
          </svg>
        {/if}
        {isProcessing ? 'Uploading...' : 'Start Upload'}
      </button>
    {/if}
    {#if uploadMessage}
      <p class="mt-4 text-sm text-gray-400">{uploadMessage}</p>
    {/if}
  </div>
</div>

<style>
  .custom-scrollbar {
    scrollbar-width: thin;
    scrollbar-color: gray transparent;
  }

  .custom-scrollbar::-webkit-scrollbar {
    width: 6px;
  }

  .custom-scrollbar::-webkit-scrollbar-track {
    background: transparent;
  }

  .custom-scrollbar::-webkit-scrollbar-thumb {
    background-color: gray;
    border-radius: 10px;
  }

  .custom-scrollbar::-webkit-scrollbar-thumb:hover {
    background-color: #888;
  }
</style>
