import { json } from '@sveltejs/kit';
import { supabase } from '../../../lib/supabaseClient';

export async function POST({ request }) {

    try {
        const { name } = await request.json();

        const { data: newTeam, error: insertError } = await supabase
            .from("teams")
            .insert({ name })
            .select()
            .single();

        if (insertError) {
            console.error('Error inserting team:', insertError);
            return json({ error: 'Failed to add team' }, { status: 500 });
        }

        return json(newTeam);
    } catch (error) {
        console.error('Unexpected error:', error);
        return json({ error: 'An unexpected error occurred' }, { status: 500 });
    }
}