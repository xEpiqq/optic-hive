// src/routes/+page.server.js

import { supabase } from '../../../lib/supabaseClient';

/**
 * Loads initial cluster data for zoom level 5 and existing territories.
 */
export async function load() {
  const initialZoomLevel = 5;

  // Fetch clusters for the initial zoom level without geographical bounds
  const { data: clusters, error: clustersError } = await supabase.rpc('get_cached_clusters', {
    p_zoom_level: initialZoomLevel,
    p_min_lat: null,
    p_min_lon: null,
    p_max_lat: null,
    p_max_lon: null,
  });

  if (clustersError) {
    console.error(`Error fetching clusters for zoom level ${initialZoomLevel}:`, clustersError);
    throw new Error('Failed to fetch initial clusters. Please try again later.');
  }

  // Fetch existing territories
  const { data: territories, error: territoriesError } = await supabase
    .from('territories')
    .select('id, name, color, geom');

  if (territoriesError) {
    console.error('Error fetching territories:', territoriesError);
    throw new Error('Failed to fetch territories. Please try again later.');
  }


  return {
    initialClusters: clusters ?? [],
    initialZoomLevel, // Pass the initial zoom level to the client
    territories: territories ?? [], // Pass territories to the client
  };
}
