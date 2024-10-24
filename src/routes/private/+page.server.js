export const load = async ({ locals: { supabase, session } }) => {
    const userId = session?.user?.id;

    if (!userId) {
        return {
            profile: null
        };
    }

    const { data } = await supabase
        .from('profiles')
        .select()
        .eq('id', userId)
        .single();

    return {
        profile: data
    };
};
