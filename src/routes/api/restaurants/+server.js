// File: src/routes/api/restaurants/+server.js

import { json } from '@sveltejs/kit';
import { supabase } from '../../../lib/supabaseClient';

export async function GET({ url }) {
  console.log("FETCHING RESTAURANTS WITHIN BOUNDS");

  const min_lat = parseFloat(url.searchParams.get('min_lat'));
  const min_lon = parseFloat(url.searchParams.get('min_lon'));
  const max_lat = parseFloat(url.searchParams.get('max_lat'));
  const max_lon = parseFloat(url.searchParams.get('max_lon'));

  // Validate parameters
  if (
    isNaN(min_lat) ||
    isNaN(min_lon) ||
    isNaN(max_lat) ||
    isNaN(max_lon)
  ) {
    return json(
      { error: 'Invalid or missing query parameters.' },
      { status: 400 }
    );
  }

  try {
    const { data, error } = await supabase.rpc('get_restaurants_in_bounds', {
      p_min_lat: min_lat,
      p_min_lon: min_lon,
      p_max_lat: max_lat,
      p_max_lon: max_lon,
    });

    if (error) {
      console.error('Error fetching restaurants:', error);
      return json(
        { error: 'Failed to fetch restaurants.' },
        { status: 500 }
      );
    }

    // Optionally map the data to include only required fields
    const restaurants = data.map(restaurant => ({
      id: restaurant.id,
      address: restaurant.address,
      latitude: restaurant.latitude,
      longitude: restaurant.longitude
    }));

    return json({ restaurants });
  } catch (err) {
    console.error('Unexpected error:', err);
    return json(
      { error: 'An unexpected error occurred.' },
      { status: 500 }
    );
  }
}
