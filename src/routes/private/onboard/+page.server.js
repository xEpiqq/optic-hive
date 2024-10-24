import { supabase } from '../../../lib/supabaseClient';

export async function load() {

    const { data: teams } = await supabase
      .from("teams")
      .select("id, name")
  
    const teamsWithUsers = await Promise.all(
      teams.map(async (team) => {
        const { data: users } = await supabase
          .from("profiles")
          .select("*")
          .eq("team", team.id);
  
        return {
          ...team,
          users: users || [],
        };
      })
    );

    console.log(teams)
  
    return {
      teams: teamsWithUsers,
    };
  };