<script>
    export let data
    const countries = data.countries

    const user_email = data.user.email
	$: ({ supabase } = data);

	$: logout = async () => {
		const { error } = await supabase.auth.signOut();
		if (error) {
			console.error(error);
		}
	};


    let errorMessage = '';
    async function handleCheckout() {
      try {
        const response = await fetch('/api/create-checkout-session', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
        });
  
        const { url, error } = await response.json();
        if (error) {
          errorMessage = error;
        } else {
          window.location.href = url;
        }
      } catch (error) {
        errorMessage = 'An unexpected error occurred.';
      }
    }

</script>

<h1>Hello There {user_email}</h1>
<button on:click={logout}>Logout</button>

{#each countries as country}
    <h1 class="text-red-500 text-lg">{country.name}</h1>
{/each}

<section>
    <div class="product">
      <h3>Starter Plan</h3>
      <h5>$20.00 / month</h5>
    </div>
    <button on:click={handleCheckout}>Checkout</button>
    {#if errorMessage}
      <p class="error">{errorMessage}</p>
    {/if}
</section>

