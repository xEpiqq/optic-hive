// src/routes/api/territories/index.js

import { supabase } from '../../../lib/supabaseClient';

/**
 * GET /api/territories
 * Optional Query Parameters:
 * - min_lat, min_lon, max_lat, max_lon: to fetch territories within bounds
 */
export async function GET({ url }) {
  const min_lat = parseFloat(url.searchParams.get('min_lat'));
  const min_lon = parseFloat(url.searchParams.get('min_lon'));
  const max_lat = parseFloat(url.searchParams.get('max_lat'));
  const max_lon = parseFloat(url.searchParams.get('max_lon'));

  let query = supabase
    .from('territories')
    .select('id, name, description, geometry');

  if (
    !isNaN(min_lat) &&
    !isNaN(min_lon) &&
    !isNaN(max_lat) &&
    !isNaN(max_lon)
  ) {
    // Define the bounding box as a polygon
    const bbox = [
      [min_lon, min_lat],
      [min_lon, max_lat],
      [max_lon, max_lat],
      [max_lon, min_lat],
      [min_lon, min_lat],
    ];

    query = query.filter('ST_Within(geometry, ST_MakePolygon(ST_GeomFromText(\'POLYGON((' + bbox.map(point => point.join(' ')).join(',') + '))\', 4326)))');
  }

  const { data, error } = await query;

  if (error) {
    console.error('Error fetching territories:', error);
    return new Response(JSON.stringify({ error: 'Failed to fetch territories.' }), { status: 500 });
  }

  return new Response(JSON.stringify({ territories: data }), { status: 200 });
}

/**
 * POST /api/territories
 * Body: { name: string, description: string, geometry: GeoJSON Polygon }
 */
export async function POST({ request }) {
  try {
    const { name, description, geometry } = await request.json();

    // Convert GeoJSON to WKT for PostGIS
    const wkt = geoJSONToWKT(geometry);

    const { data, error } = await supabase
      .from('territories')
      .insert([
        {
          name,
          description,
          geometry: supabase.raw(`ST_GeomFromText('${wkt}', 4326)`),
        },
      ])
      .select();

    if (error) {
      console.error('Error creating territory:', error);
      return new Response(JSON.stringify({ error: 'Failed to create territory.' }), { status: 500 });
    }

    return new Response(JSON.stringify({ territory: data[0] }), { status: 201 });
  } catch (err) {
    console.error('Error parsing request body:', err);
    return new Response(JSON.stringify({ error: 'Invalid request body.' }), { status: 400 });
  }
}

/**
 * Utility function to convert GeoJSON Polygon to WKT
 * @param {Object} geoJSON
 * @returns {string} WKT string
 */
function geoJSONToWKT(geoJSON) {
  if (geoJSON.type !== 'Polygon') {
    throw new Error('Only Polygon type is supported.');
  }
  const coordinates = geoJSON.coordinates[0].map(coord => coord.join(' ')).join(', ');
  return `POLYGON((${coordinates}))`;
}
