export const load = async ({ locals: { supabase } }) => {
    const { data } = await supabase
    .from('countries')
    .select();

    return {
        countries: data
    };
};
  