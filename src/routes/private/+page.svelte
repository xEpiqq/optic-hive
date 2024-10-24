<script>
    export let data

    const user_email = data.user.email
    const supabase_anon_key = data.profile.supabase_anon_key
    const supabase_url = data.profile.supabase_url

    console.log(supabase_anon_key)
    $: ({ supabase } = data);

    $: logout = async () => {
      const { error } = await supabase.auth.signOut();
      if (error) {
        console.error(error);
      }
    };

</script>

<h1>Hello There {user_email}</h1>
<h1>Supabase Anon Key: {supabase_anon_key}</h1>
<h1>Supabase URL: {supabase_url}</h1>
<button on:click={logout}>Logout</button>