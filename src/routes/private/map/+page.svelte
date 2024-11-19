<!-- +page.svelte -->
<script>
  import { onMount, onDestroy } from 'svelte';
  import CollapsibleSidebar from '../../../lib/components/sidebar.svelte';
  import TerritoryModal from '../../../lib/components/territory.svelte';
  import AssignLeadsModal from '../../../lib/components/AssignLeadsModal.svelte';
  import Toolbar from '../../../lib/components/toolbar.svelte';
  import { supabase } from '../../../lib/supabaseClient';
  import lodashPkg from 'lodash';
  const { debounce } = lodashPkg;

  export let data;
  export let territories = data.territories || [];
  let polygons = [];

  const apiKey = import.meta.env.VITE_GOOGLE_MAPS_API_KEY;
  let mapElement;
  let map;
  let clusterMarkers = [];
  let drawingManager;
  let effectiveZoomLevel;
  const clustersCache = new Map();
  let sidebarExpanded = true;
  let territoryModalExpanded = false;
  let isLoading = false;
  let errorMessage = null;

  let individualMarkers = [];

  const ZOOM_THRESHOLD = 12;

  // State variables for Assign Leads Modal
  let assignLeadsModalExpanded = false;
  let selectedPolygon = null;
  let isAssignLeadsFlow = false;
  let isAssignLeadsMode = false;

  // InfoWindow for displaying assigned user info
  let infoWindow = null;

  // Reactive variable for Toolbar's isDrawingMode
  let isDrawingMode = false;
  let selectedColor = '#FF0000';
  let previewPolygon = null;

  const handleColorChange = (event) => {
    selectedColor = event.detail;
    if (previewPolygon) {
      previewPolygon.setOptions({ fillColor: selectedColor, strokeColor: selectedColor });
    }
  };

  $: if (drawingManager && typeof google !== 'undefined') {
  drawingManager.setOptions({
    polygonOptions: {
      ...drawingManager.get('polygonOptions'),
      fillColor: selectedColor,
      strokeColor: selectedColor,
    }
  });
}


  // Flags and cache for individual markers
  let isDisplayingIndividualMarkers = false;
  const individualMarkersCache = [];

  onMount(async () => {
    try {
      await loadGoogleMaps(apiKey);
      initializeMap();
      setupDrawingManager();

      // Render existing territories
      renderExistingTerritories();

      // Initial fetch based on the initial zoom level
      if (data.initialZoomLevel >= ZOOM_THRESHOLD) {
        await fetchIndividualMarkers();
        isDisplayingIndividualMarkers = true;
      } else {
        await fetchClusters(getMappedZoomLevel(data.initialZoomLevel));
      }

    } catch (error) {
      console.error('Error loading Google Maps:', error);
      errorMessage = 'Failed to load Google Maps. Please try again later.';
    }
  });

  // Reactive statement to update isDrawingMode whenever drawingManager changes
  $: if (drawingManager && typeof google !== 'undefined') {
    isDrawingMode = drawingManager.getDrawingMode() === google.maps.drawing.OverlayType.POLYGON;
  }

  /**
   * Dynamically loads the Google Maps script.
   */
  const loadGoogleMaps = (key) =>
    new Promise((resolve, reject) => {
      if (typeof window === 'undefined') {
        reject(new Error('Window is undefined'));
        return;
      }

      if (window.google && window.google.maps) {
        console.log('Google Maps already loaded.');
        resolve();
        return;
      }

      const script = document.createElement('script');
      script.src = `https://maps.googleapis.com/maps/api/js?key=${key}&libraries=drawing,geometry`;
      script.async = true;
      script.defer = true;
      script.onload = () => {
        console.log('Google Maps script loaded successfully.');
        resolve();
      };
      script.onerror = (e) => {
        console.error('Error loading Google Maps script:', e);
        reject(e);
      };
      document.head.appendChild(script);
    });

  /**
   * Renders existing territories on the map.
   */
  const renderExistingTerritories = () => {
    territories.forEach((territory) => {
      const geom = territory.geom;
      const color = territory.color || '#FF0000';

      if (!geom || geom.type !== 'Polygon') {
        console.error(`Invalid geometry for territory ID: ${territory.id}`);
        return;
      }

      const path = geom.coordinates[0].map(coord => {
        const lat = parseFloat(coord[1]);
        const lng = parseFloat(coord[0]);
        if (isNaN(lat) || isNaN(lng)) {
          console.error(`Invalid coordinates for territory ID: ${territory.id}`);
          return null;
        }
        return new google.maps.LatLng(lat, lng);
      }).filter(coord => coord !== null); // Filter out invalid coordinates

      if (path.length === 0) {
        console.error(`No valid coordinates for territory ID: ${territory.id}`);
        return;
      }

      const polygon = new google.maps.Polygon({
        paths: path,
        strokeColor: color,
        strokeOpacity: 0.8,
        strokeWeight: 2,
        fillColor: color,
        fillOpacity: 0.35,
      });

      polygon.setMap(map);
      polygons.push(polygon);
    });

    console.log(`${polygons.length} existing territories rendered on the map.`);
  };

  const getMappedZoomLevel = (zoom) => {
    if (zoom >= 11) return 9;
    if (zoom >= 10) return 8;
    if (zoom >= 8) return 6;
    if (zoom >= 3) return 5;
    return Math.round(zoom);
  };

  const generateCacheKey = (zoomLevel, bounds) => {
    if (!bounds) return `zoom_${zoomLevel}_all`;
    const sw = bounds.getSouthWest();
    const ne = bounds.getNorthEast();
    return `zoom_${zoomLevel}_sw_${sw.lat().toFixed(4)}_${sw.lng().toFixed(4)}_ne_${ne.lat().toFixed(4)}_${ne.lng().toFixed(4)}`;
  };

  const expandBounds = (bounds, factor) => {
    const ne = bounds.getNorthEast();
    const sw = bounds.getSouthWest();
    const latSpan = ne.lat() - sw.lat();
    const lngSpan = ne.lng() - sw.lng();
    const expandedNE = new google.maps.LatLng(ne.lat() + latSpan * (factor - 1), ne.lng() + lngSpan * (factor - 1));
    const expandedSW = new google.maps.LatLng(sw.lat() - latSpan * (factor - 1), sw.lng() - lngSpan * (factor - 1));
    return new google.maps.LatLngBounds(expandedSW, expandedNE);
  };

  const fetchClusters = async (zoomLevel) => {
    let clusters = []; 
    const bounds = map.getBounds();
    if (!bounds) {
      console.error('Map bounds are undefined.');
      errorMessage = 'Map bounds are undefined. Please try again.';
      return;
    }

    const expansionFactor = 2;
    const expandedBounds = expandBounds(bounds, expansionFactor);
    const isZoomLevel5 = zoomLevel === 5;
    const cacheKey = isZoomLevel5
      ? generateCacheKey(zoomLevel, null)
      : generateCacheKey(zoomLevel, expandedBounds);

    if (clustersCache.has(cacheKey)) {
      console.log(`Using cached clusters for key: ${cacheKey}`);
      clusters = clustersCache.get(cacheKey);
      addClusterMarkers(clusters);
      return;
    }

    const { min_lat, min_lon, max_lat, max_lon } = isZoomLevel5
      ? { min_lat: null, min_lon: null, max_lat: null, max_lon: null }
      : {
          min_lat: expandedBounds.getSouthWest().lat(),
          min_lon: expandedBounds.getSouthWest().lng(),
          max_lat: expandedBounds.getNorthEast().lat(),
          max_lon: expandedBounds.getNorthEast().lng(),
        };

    try {
      isLoading = true;
      console.log(`Fetching clusters for zoom level ${zoomLevel} with cache key ${cacheKey}`);
      const { data: fetchedClusters, error } = await supabase.rpc('get_cached_clusters', {
        p_zoom_level: zoomLevel,
        p_min_lat: min_lat,
        p_min_lon: min_lon,
        p_max_lat: max_lat,
        p_max_lon: max_lon,
      });

      if (error) {
        throw error;
      }

      clusters = fetchedClusters ?? []; 
      clustersCache.set(cacheKey, clusters);
      console.log(`Fetched ${clusters.length} clusters.`);
      addClusterMarkers(clusters);
      errorMessage = null;
    } catch (error) {
      console.error(`Error fetching clusters for zoom level ${zoomLevel}:`, error);
      errorMessage = 'Failed to load clusters. Please try again.';
    } finally {
      isLoading = false;
    }
  };

  /**
   * Function to save the territory data from the modal.
   */
  const handleSaveTerritory = async (event) => {
    const { name, color, polygon, user_id } = event.detail;
    previewPolygon = null; // Clear preview polygon after save

    // Extract coordinates from the polygon
    const path = polygon.getPath().getArray().map(latLng => ({
      lat: parseFloat(latLng.lat().toFixed(6)),
      lng: parseFloat(latLng.lng().toFixed(6))
    }));

    // Ensure the polygon is closed
    if (
      path.length < 4 ||
      path[0].lat !== path[path.length - 1].lat ||
      path[0].lng !== path[path.length - 1].lng
    ) {
      path.push({ ...path[0] });
    }

    // Validate all coordinates
    for (let point of path) {
      if (
        typeof point.lat !== 'number' ||
        typeof point.lng !== 'number' ||
        isNaN(point.lat) ||
        isNaN(point.lng)
      ) {
        errorMessage = 'Invalid coordinate detected in the polygon.';
        console.error('Invalid coordinate detected:', point);
        // Remove the polygon from the map
        polygon.setMap(null);
        territoryModalExpanded = false;
        return;
      }
    }

    const polygonGeoJSON = {
      type: 'Polygon',
      coordinates: [
        path.map(point => [point.lng, point.lat]),
      ],
    };

    const payload = {
      name,
      color,
      coordinates: path,
      user_id
    };

    try {
      isLoading = true;
      errorMessage = null;
      
      const response = await fetch('/api/saveTerritory', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(payload)
      });

      const result = await response.json();

      if (!response.ok) {
        throw new Error(result.message || 'Failed to save territory.');
      }

      // Add the new territory to the map
      addTerritoryToMap(name, color, path);

      // Optionally, update the territories list
      territories = [...territories, result.territory];

      // Close the modal
      territoryModalExpanded = false;
      selectedPolygon = null;
      console.log('Territory saved and modal closed.');
    } catch (error) {
      console.error('Error saving territory:', error);
      alert(`Error: ${error.message}`);
      errorMessage = error.message;

      // Remove the polygon if save failed
      if (polygon) {
        polygon.setMap(null);
        selectedPolygon = null;
      }
    } finally {
      isLoading = false;
    }
  };


  /**
   * Function to handle cancellation from the territory modal.
   */


  const handleCancelTerritory = () => {
  if (previewPolygon) {
    previewPolygon.setMap(null);
    previewPolygon = null;
  }
  selectedPolygon = null;
  territoryModalExpanded = false;
};

  /**
   * Function to add the newly saved territory to the map
   */
  const addTerritoryToMap = (name, color, path) => {
    const googlePath = path.map(coord => new google.maps.LatLng(coord.lat, coord.lng));

    const polygon = new google.maps.Polygon({
      paths: googlePath,
      strokeColor: color,
      strokeOpacity: 0.8,
      strokeWeight: 2,
      fillColor: color,
      fillOpacity: 0.35,
    });

    polygon.setMap(map);
    polygons.push(polygon);

    console.log(`Added new territory "${name}" to the map with color ${color}.`);
  };

  const addClusterMarkers = (clusters) => {
    clearClusterMarkers();
    const newMarkers = clusters.map(cluster => {
      const lat = parseFloat(cluster.latitude);
      const lng = parseFloat(cluster.longitude);

      if (isNaN(lat) || isNaN(lng)) {
        console.error(`Invalid coordinates for cluster: lat=${cluster.latitude}, lng=${cluster.longitude}`);
        return null;
      }

      const marker = new google.maps.Marker({
        position: { lat, lng },
        map,
        title: `Cluster of ${cluster.count} restaurants`,
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
          scale: calculateMarkerScale(cluster.count),
          strokeColor: '#fff',
          strokeWeight: 1,
        },
      });
      marker.addListener('click', () => {
        console.log(`Cluster with ${cluster.count} markers clicked.`);
        map.setZoom(map.getZoom() + 2);
        map.setCenter(marker.getPosition());
      });
      return marker;
    }).filter(marker => marker !== null);

    clusterMarkers = newMarkers;
    console.log(`Added ${clusterMarkers.length} cluster markers to the map.`);
  };

  const calculateMarkerScale = (count) => {
    const minScale = 20;
    const maxScale = 50;
    const minCount = 1;
    const maxCount = 1000;
    const normalized = (count - minCount) / (maxCount - minCount);
    const clamped = Math.max(0, Math.min(1, normalized));
    return minScale + clamped * (maxScale - minScale);
  };

  const clearClusterMarkers = () => {
    clusterMarkers.forEach(marker => marker.setMap(null));
    clusterMarkers = [];
    console.log('All cluster markers cleared from the map.');
  };

  async function fetchIndividualMarkers() {
    if (!map) {
      console.error('Map not initialized');
      return;
    }

    const bounds = map.getBounds();
    if (!bounds) {
      console.error('Map bounds are undefined.');
      return;
    }
    const expandedBounds = expandBounds(bounds, 3);  // Expanding bounds 3x

    const min_lat = parseFloat(expandedBounds.getSouthWest().lat());
    const min_lon = parseFloat(expandedBounds.getSouthWest().lng());
    const max_lat = parseFloat(expandedBounds.getNorthEast().lat());
    const max_lon = parseFloat(expandedBounds.getNorthEast().lng());

    if ([min_lat, min_lon, max_lat, max_lon].some(coord => isNaN(coord))) {
      console.error(`Invalid bounds: min_lat=${min_lat}, min_lon=${min_lon}, max_lat=${max_lat}, max_lon=${max_lon}`);
      errorMessage = 'Map bounds are invalid. Please try again.';
      return;
    }

    // Check if the current bounds are already within the cached bounds
    if (isWithinCachedBounds(bounds)) {
      console.log('Individual markers for these bounds are already loaded.');
      isDisplayingIndividualMarkers = true;
      return;
    }

    try {
      isLoading = true;
      console.log(`Fetching individual markers within bounds: ${min_lat}, ${min_lon}, ${max_lat}, ${max_lon}`);
      const response = await fetch(`/api/restaurants?min_lat=${min_lat}&min_lon=${min_lon}&max_lat=${max_lat}&max_lon=${max_lon}`);
      if (!response.ok) {
        throw new Error('Failed to fetch individual markers.');
      }

      const { restaurants } = await response.json();

      // Clear current individual markers
      clearIndividualMarkers();

      // Create a single InfoWindow instance
      if (!infoWindow) {
        infoWindow = new google.maps.InfoWindow();
      }

      // Create markers for each restaurant
      individualMarkers = restaurants.map((restaurant) => {
        const lat = parseFloat(restaurant.latitude);
        const lng = parseFloat(restaurant.longitude);

        if (isNaN(lat) || isNaN(lng)) {
          console.error(`Invalid coordinates for restaurant: id=${restaurant.id}, lat=${restaurant.latitude}, lng=${restaurant.longitude}`);
          return null;
        }

        // Determine if the marker is assigned
        const isAssigned = restaurant.restaurant_user_id !== null && restaurant.restaurant_user_id !== undefined;

        // Define marker icon based on assignment
        const markerIcon = isAssigned
          ? {
              path: google.maps.SymbolPath.CIRCLE,
              fillColor: '#0000FF',
              fillOpacity: 0.8,
              scale: 8,
              strokeColor: '#FFFFFF',
              strokeWeight: 2,
            }
          : null;

        const marker = new google.maps.Marker({
          position: { lat, lng },
          map,
          title: String(restaurant.id),
          icon: markerIcon,
        });

        if (isAssignLeadsMode && isAssigned) {
          marker.addListener('click', () => {
            const contentString = `
              <div>
                <h3>Restaurant ID: ${restaurant.id}</h3>
                <p>Assigned to: ${restaurant.restaurant_user_id}</p>
              </div>
            `;
            infoWindow.setContent(contentString);
            infoWindow.open(map, marker);
          });
        }

        return marker;
      }).filter(marker => marker !== null);

      console.log(`${individualMarkers.length} individual markers added to the map.`);
      addToCache(bounds);
      isDisplayingIndividualMarkers = true;
      errorMessage = null;
    } catch (error) {
      console.error('Error fetching individual markers:', error);
      errorMessage = 'Failed to load individual markers. Please try again.';
    } finally {
      isLoading = false;
    }
  }

  const clearIndividualMarkers = () => {
    individualMarkers.forEach(marker => marker.setMap(null));
    individualMarkers = [];
    console.log('All individual markers cleared from the map.');
  };

  // Spatial cache helper functions
  const isWithinCachedBounds = (currentBounds) => {
    // Check if both SW and NE of currentBounds are within any cachedBounds
    return individualMarkersCache.some(cachedBounds => 
      cachedBounds.contains(currentBounds.getSouthWest()) && 
      cachedBounds.contains(currentBounds.getNorthEast())
    );
  };

  const addToCache = (newBounds) => {
    individualMarkersCache.push(newBounds);
    // Optional: Implement logic to merge overlapping bounds or limit cache size
  };

  const handleMapIdle = debounce(async () => {
    if (!map) {
      console.warn('Map is not initialized yet.');
      return;
    }
    const newZoomLevel = map.getZoom();
    console.log(`Handle map idle: New zoom level is ${newZoomLevel}`);

    if (newZoomLevel >= ZOOM_THRESHOLD) {
      const bounds = map.getBounds();
      if (!bounds) {
        console.error('Map bounds are undefined.');
        return;
      }

      if (isWithinCachedBounds(bounds)) {
        console.log('Individual markers for these bounds are already loaded.');
        isDisplayingIndividualMarkers = true;
        return;
      }

      if (!isDisplayingIndividualMarkers) {
        console.log('Displaying individual markers.');
        await fetchIndividualMarkers();
        clearClusterMarkers();
      } else {
        console.log('Individual markers are already displayed. No need to refetch.');
      }
    } else {
      const newEffectiveZoomLevel = getMappedZoomLevel(newZoomLevel);
      if (effectiveZoomLevel !== newEffectiveZoomLevel) {
        console.log(`Effective zoom level changed to ${newEffectiveZoomLevel}. Displaying clusters.`);
        await fetchClusters(newEffectiveZoomLevel);
        effectiveZoomLevel = newEffectiveZoomLevel;
        isDisplayingIndividualMarkers = false;
        clearIndividualMarkers();

        // Clear the individualMarkersCache to allow fresh fetching
        individualMarkersCache.length = 0;
        console.log('Cleared individual markers cache.');
      } else {
        console.log('Effective zoom level unchanged.');
      }
    }
  }, 500);

  const initializeMap = () => {
    if (typeof google === 'undefined') {
      console.error('Google Maps is not loaded.');
      errorMessage = 'Google Maps failed to load. Please try again later.';
      return;
    }

    const options = {
      center: { lat: 39.50, lng: -98.35 },
      zoom: data.initialZoomLevel,
      mapTypeControl: false,
      streetViewControl: false,
      fullscreenControl: false,
      zoomControl: false,
    };
    map = new google.maps.Map(mapElement, options);
    console.log('Google Map initialized.');
    map.addListener('idle', handleMapIdle);
    console.log('Added "idle" event listener for zoom and pan changes.');
    google.maps.event.addListenerOnce(map, 'tilesloaded', () => {
      console.log('Map tiles loaded.');
      if (data.initialZoomLevel >= ZOOM_THRESHOLD) {
        fetchIndividualMarkers();
        isDisplayingIndividualMarkers = true;
      } else {
        fetchClusters(getMappedZoomLevel(data.initialZoomLevel));
      }
    });
  };

  const setupDrawingManager = () => {
    if (typeof google === 'undefined') {
      console.error('Google Maps is not loaded. Cannot set up Drawing Manager.');
      return;
    }

    drawingManager = new google.maps.drawing.DrawingManager({
      drawingMode: null,
      drawingControl: false,
      polygonOptions: {
        fillColor: selectedColor, // Use selectedColor
        fillOpacity: 0.35,
        strokeColor: selectedColor, // Use selectedColor
        strokeOpacity: 0.8,
        strokeWeight: 2,
        clickable: false,
        editable: false,
        zIndex: 1,
      },
    });

    drawingManager.setMap(map);
    console.log('Drawing Manager set up.');

    google.maps.event.addListener(drawingManager, 'polygoncomplete', (polygon) => {
      console.log('Polygon drawn:', polygon.getPath().getArray());
      selectedPolygon = polygon;
      previewPolygon = polygon; // Store reference to the preview polygon

      // Apply the selected color to the preview polygon
      polygon.setOptions({
        fillColor: selectedColor,
        strokeColor: selectedColor,
      });

      if (isAssignLeadsFlow) {
        assignLeadsModalExpanded = true;
        isAssignLeadsFlow = false;
        isAssignLeadsMode = true;
        drawingManager.setDrawingMode(null);
      } else {
        // Handle territory drawing
        territoryModalExpanded = true;
        drawingManager.setDrawingMode(null);
      }

      // Add listener to dynamically update the color of the preview polygon
      $: if (previewPolygon) {
        previewPolygon.setOptions({
          fillColor: selectedColor,
          strokeColor: selectedColor,
        });
      }
    });
  };


  const toggleTerritoryMode = () => {
    if (drawingManager.getDrawingMode()) {
      drawingManager.setDrawingMode(null);
      territoryModalExpanded = false;
      console.log('Territory drawing mode disabled.');
    } else {
      drawingManager.setDrawingMode(google.maps.drawing.OverlayType.POLYGON);
      territoryModalExpanded = true;
      console.log('Territory drawing mode enabled.');
    }
  };

  const handleTerritoryToggle = (event) => {
  const isExpanded = event.detail;
  territoryModalExpanded = isExpanded;
  if (!territoryModalExpanded && drawingManager.getDrawingMode()) {
    drawingManager.setDrawingMode(null);
    console.log('Territory modal closed and drawing mode disabled.');
  }
};

  

  const handleSidebarToggle = (isExpanded) => {
    sidebarExpanded = isExpanded;
    console.log(`Sidebar is now ${sidebarExpanded ? 'expanded' : 'collapsed'}.`);
  };

  const handlePan = () => {
    map.setOptions({ draggable: true });
    console.log('Pan mode enabled.');
  };

  const handleFilterLeads = () => {
    console.log('Filter Leads clicked');
    // Implement filter leads functionality here
  };

  const handleToggleTerritoryMode = () => {
  territoryModalExpanded = true;
};


  const handleAssignLeads = () => {
    console.log('Assign Leads clicked');
    errorMessage = null;

    if (drawingManager) {
      drawingManager.setDrawingMode(google.maps.drawing.OverlayType.POLYGON);
      console.log('Territory drawing mode enabled for Assign Leads.');
    } else {
      console.error('Drawing Manager is not initialized.');
      errorMessage = 'Drawing tool is not available. Please try again.';
      return;
    }

    isAssignLeadsFlow = true;
  };

  const handleCreateLead = () => {
    console.log('Create Lead clicked');
    // Implement create lead functionality here
  };

  // Handle events emitted from AssignLeadsModal
  const handleAssignLeadsToggle = (event) => {
    assignLeadsModalExpanded = event.detail;
    if (!assignLeadsModalExpanded) {
      isAssignLeadsMode = false;
      fetchIndividualMarkers();
    }
  };

  const handleAssignSuccess = () => {
    console.log('Leads assigned successfully. Refreshing markers...');
    if (selectedPolygon) {
      selectedPolygon.setMap(null);
      selectedPolygon = null;
    }
    if (map.getZoom() >= ZOOM_THRESHOLD) {
      fetchIndividualMarkers();
    } else {
      fetchClusters(getMappedZoomLevel(map.getZoom()));
    }
    isAssignLeadsMode = false;
  };

  /**
   * Handle starting the drawing mode from the territory modal.
   */
   const handleStartDrawing = () => {
    if (drawingManager) {
      drawingManager.setDrawingMode(google.maps.drawing.OverlayType.POLYGON);
      console.log('Drawing mode activated.');
    } else {
      console.error('Drawing Manager is not initialized.');
      errorMessage = 'Drawing tool is not available. Please try again.';
    }
  };

  /**
   * Handle jumping to a specific territory on the map.
   * This function receives the territory data and adjusts the map accordingly.
   */
   const handleJumpToTerritory = (event) => {
  const territory = event.detail;
  if (!territory || !territory.geom || territory.geom.type !== 'Polygon') return;

  const coordinates = territory.geom.coordinates[0].map(coord => new google.maps.LatLng(parseFloat(coord[1]), parseFloat(coord[0])));
  if (coordinates.length === 0) return;

  const bounds = new google.maps.LatLngBounds();
  coordinates.forEach(coord => bounds.extend(coord));

  // Fit the map to the territory bounds
  map.fitBounds(bounds);

  // Clear any cached clusters and individual markers for accurate re-fetching
  clearClusterMarkers();
  clearIndividualMarkers();
  individualMarkersCache.length = 0;
  isDisplayingIndividualMarkers = false;

  // Add a one-time 'idle' listener to fetch markers after the map has moved
  const idleListener = map.addListener('idle', async () => {
    const currentZoom = map.getZoom();
    if (currentZoom >= ZOOM_THRESHOLD) {
      await fetchIndividualMarkers();
      clearClusterMarkers();
    } else {
      const mappedZoomLevel = getMappedZoomLevel(currentZoom);
      await fetchClusters(mappedZoomLevel);
      clearIndividualMarkers();
    }
    // Remove the listener to prevent multiple triggers
    google.maps.event.removeListener(idleListener);
  });
};






  onDestroy(() => {
    clearClusterMarkers();
    clearIndividualMarkers();
    if (drawingManager) {
      drawingManager.setMap(null);
      console.log('Drawing Manager removed.');
    }
    if (infoWindow) {
      infoWindow.close();
      console.log('InfoWindow closed.');
    }
    polygons.forEach(polygon => polygon.setMap(null));
    polygons = [];
  });
</script>

<style>
  .error-overlay {
    position: absolute;
    top: 20px;
    left: 50%;
    transform: translateX(-50%);
    background-color: rgba(255, 0, 0, 0.8);
    color: white;
    padding: 10px 20px;
    border-radius: 5px;
    z-index: 1001;
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

<div class="flex flex-col h-screen relative">
  <CollapsibleSidebar on:toggle={handleSidebarToggle} />
  
  <div class="flex-1 relative">
    <div id="map" bind:this={mapElement} class="w-full h-full"></div>

    {#if isLoading}
      <div class="absolute top-0 left-0 w-full h-full flex items-center justify-center bg-gray-200 bg-opacity-50">
        <div class="loader"></div>
      </div>
    {/if}

    {#if errorMessage}
      <div class="error-overlay">
        {errorMessage}
      </div>
    {/if}
  </div>

  {#if territoryModalExpanded}
    <TerritoryModal
      isExpanded={territoryModalExpanded}
      polygon={selectedPolygon}
      territories={territories}
      on:toggle={handleTerritoryToggle}
      on:save={handleSaveTerritory}
      on:cancel={handleCancelTerritory}
      on:colorChange={handleColorChange}
      on:startDrawing={handleStartDrawing}
      on:jumpToTerritory={handleJumpToTerritory}
    />
{/if}


  {#if assignLeadsModalExpanded}
    <AssignLeadsModal
      isExpanded={assignLeadsModalExpanded}
      polygon={selectedPolygon}
      on:toggle={handleAssignLeadsToggle}
      on:assignSuccess={handleAssignSuccess}
    />
  {/if}

  <Toolbar
    isDrawingMode={isDrawingMode}
    on:pan={handlePan}
    on:filterLeads={handleFilterLeads}
    on:toggleTerritoryMode={handleToggleTerritoryMode}
    on:assignLeads={handleAssignLeads}
    on:createLead={handleCreateLead}
  />

</div>
