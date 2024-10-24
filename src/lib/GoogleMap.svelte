<script>
  import { onMount, onDestroy } from 'svelte';
  export let clusters = []; // Receive clusters as a prop

  // Import Google Maps API key from environment variables
  const apiKey = import.meta.env.VITE_GOOGLE_MAPS_API_KEY;

  let map;
  let markers = [];

  /**
   * Dynamically load the Google Maps JavaScript API.
   */
  function loadGoogleMaps(apiKey) {
    return new Promise((resolve, reject) => {
      if (typeof window === 'undefined') {
        reject(new Error('Window is undefined'));
        return;
      }

      if (window.google && window.google.maps) {
        resolve();
        return;
      }

      const script = document.createElement('script');
      script.src = `https://maps.googleapis.com/maps/api/js?key=${apiKey}`;
      script.async = true;
      script.defer = true;
      script.onload = () => resolve();
      script.onerror = (e) => reject(e);
      document.head.appendChild(script);
    });
  }

  /**
   * Clear all existing markers from the map.
   */
  function clearMarkers() {
    markers.forEach(marker => marker.setMap(null));
    markers = [];
  }

  /**
   * Add new markers to the map based on cluster data.
   */
  function addMarkers(clusterData) {
    clusterData.forEach(cluster => {
      const marker = new google.maps.Marker({
        position: { lat: cluster.latitude, lng: cluster.longitude },
        map: map,
        label: {
          text: String(cluster.count),
          color: 'white',
          fontSize: '12px',
          fontWeight: 'bold',
        },
        icon: {
          path: google.maps.SymbolPath.CIRCLE,
          fillColor: '#007bff',
          fillOpacity: 0.6,
          scale: Math.max(20, Math.min(cluster.count / 100, 50)), // Scale marker size based on count
          strokeColor: '#fff',
          strokeWeight: 1,
        },
      });

      // Optional: Add click listener to zoom into the cluster
      marker.addListener('click', () => {
        map.setZoom(map.getZoom() + 2);
        map.setCenter(marker.getPosition());
      });

      markers.push(marker);
    });
  }

  onMount(async () => {
    try {
      // Load Google Maps API
      await loadGoogleMaps(apiKey);

      // Define map options to center the US and set appropriate zoom
      const mapOptions = {
        center: { lat: 39.50, lng: -98.35 }, // Geographic center of the US
        zoom: 4, // Adjust based on the initial zoom level
        mapTypeControl: false, // Remove the "Map/Satellite" toggle
        streetViewControl: false, // Remove the Street View pegman
        fullscreenControl: false, // Remove the fullscreen button
        zoomControl: false, // Remove the zoom buttons
      };

      // Initialize the map
      const mapElement = document.getElementById('map');
      map = new google.maps.Map(mapElement, mapOptions);

      // Add initial clusters to the map
      addMarkers(clusters);
    } catch (error) {
      console.error('Error loading Google Maps:', error);
    }
  });

  onDestroy(() => {
    // Clear markers when the component is destroyed
    clearMarkers();
  });
</script>

<style>
  #map {
    width: 100%;
    height: 100vh; /* Full viewport height */
  }
</style>

<div id="map"></div>
