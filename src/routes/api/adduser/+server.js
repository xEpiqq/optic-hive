import { json } from '@sveltejs/kit';
import { supabaseAdmin } from '../../../lib/supabaseAdminClient';
import { supabase } from '../../../lib/supabaseClient';

export async function POST({ request }) {
  const { email, password = '123456', firstName, lastName, phone, team } = await request.json();

  console.log('Received email:', email);

  try {
    const { data: user, error: authError } = await supabaseAdmin.auth.admin.createUser({
      email,
      password,
      email_confirm: true,
    });

    if (authError) {
      console.error('Error creating user in Supabase Auth:', authError);
      return json({ error: 'Failed to create user in Auth' }, { status: 500 });
    }

    const { data: profile, error: profileError } = await supabase
        .from('profiles')
        .insert({
            user_id: user.user.id,
            email: email,
            first_name: firstName,
            last_name: lastName,
            user_type: "user",
            team: team,
            phone: phone,
        })
        .select()
        .single();

    if (profileError) {
      console.error('Error inserting user into profiles table:', profileError);
      return json({ error: 'Failed to add user to profiles table' }, { status: 500 });
    }

    return json(user);
  } catch (error) {
    console.error('Error creating user:', error);
    return json({ error: 'Something went wrong' }, { status: 500 });
  }
}