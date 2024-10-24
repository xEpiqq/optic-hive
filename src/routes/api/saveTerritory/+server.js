// src/routes/api/saveTerritory/+server.js

import { json } from '@sveltejs/kit';
import { supabase } from '../../../lib/supabaseClient';

/**
 * POST /api/saveTerritory
 * Body: { name: string, color: string, coordinates: Array<{lat: number, lng: number}> }
 */
export async function POST({ request }) {
  try {
    const { name, color, coordinates } = await request.json();

    // Validate input
    if (
      !name ||
      !color ||
      !coordinates ||
      !Array.isArray(coordinates) ||
      coordinates.length < 3
    ) {
      return json({ message: 'Invalid input data.' }, { status: 400 });
    }

    // Convert coordinates to GeoJSON Polygon format
    const geoJson = {
      type: 'Polygon',
      coordinates: [
        coordinates.map(coord => [coord.lng, coord.lat]) // GeoJSON uses [lng, lat]
      ]
    };

    // Ensure the polygon is closed (first and last coordinates must be the same)
    const firstCoord = geoJson.coordinates[0][0];
    const lastCoord = geoJson.coordinates[0][geoJson.coordinates[0].length - 1];
    if (
      firstCoord[0] !== lastCoord[0] ||
      firstCoord[1] !== lastCoord[1]
    ) {
      geoJson.coordinates[0].push(firstCoord);
    }

    // Insert into Supabase
    const { data, error } = await supabase
      .from('territories')
      .insert([
        {
          name,
          color,      // Save the color
          geom: geoJson // Ensure this matches your table's geometry column
        }
      ]);

    if (error) {
      console.error('Supabase insert error:', error);
      return json({ message: 'Failed to save territory.', details: error.message }, { status: 500 });
    }

    return json({ message: 'Territory saved successfully.', data }, { status: 200 });
  } catch (error) {
    console.error('Error in saveTerritory API:', error);
    return json({ message: 'Internal server error.', details: error.message }, { status: 500 });
  }
}
