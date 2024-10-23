# Svelte-supa-stripe

Alright, so you've gotta add the .env.local for these, also consider putting stripe in there.

>PUBLIC_SUPABASE_URL=
>PUBLIC_SUPABASE_ANON_KEY=

Also find a way to verify stripe credentials on the client side, so probably

>create profiles table in supabase
>add user to profiles table upon creation
>have field in profiles table to determine if user is premium
>check for premium on load of private route or something
