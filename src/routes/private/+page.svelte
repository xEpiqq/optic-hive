<script>
    export let data

    const user_email = data.user.email
    $: ({ supabase } = data);

    $: logout = async () => {
      const { error } = await supabase.auth.signOut();
      if (error) {
        console.error(error);
      }
    };

</script>

<h1>Hello There {user_email}</h1>
<button on:click={logout}>Logout</button>