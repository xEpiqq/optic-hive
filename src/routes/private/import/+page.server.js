// src/routes/import/+page.server.js
import { supabase } from '../../../lib/supabaseClient';

export async function load() {
  // Call the SQL function to get the column names of the "restaurants" table
  const { data, error } = await supabase.rpc('get_restaurant_columns');

  if (error) {
    console.error('Error fetching restaurant table columns:', error);
    return {
      tableColumns: [],
      error: 'Failed to load columns'
    };
  }
  // Return the column names to the page
  return {
    tableColumns: data.map(item => item.column_name)
  };
}
