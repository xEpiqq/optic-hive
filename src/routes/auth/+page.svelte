

		<script>
			let isLogin = true;
		  
			function toggleForm() {
			  isLogin = !isLogin;
			}
		  </script>
		  
		  <div class="h-full bg-gray-900">
			<div class="h-screen">
		  <div class="flex min-h-full flex-col justify-center px-6 py-12 lg:px-8">
			<div class="sm:mx-auto sm:w-full sm:max-w-sm">
			  <img class="mx-auto h-10 w-auto" src="https://tailwindui.com/plus/img/logos/mark.svg?color=indigo&shade=500" alt="Your Company">
			  <h2 class="mt-10 text-center text-2xl font-bold leading-9 tracking-tight text-white">
				{isLogin ? 'Sign in to your account' : 'Create a new account'}
			  </h2>
			</div>
		  
			<div class="mt-10 sm:mx-auto sm:w-full sm:max-w-sm">
			  <form method="POST" action={isLogin ? '?/login' : '?/signup'} class="space-y-6">
				<div>
				  <label for="email" class="block text-sm font-medium leading-6 text-white">Email address</label>
				  <div class="mt-2">
					<input id="email" name="email" type="email" required class="block w-full rounded-md border-0 bg-white/5 py-1.5 text-white shadow-sm ring-1 ring-inset ring-white/10 focus:ring-2 focus:ring-inset focus:ring-indigo-500 sm:text-sm sm:leading-6">
				  </div>
				</div>
		  
				<div>
				  <label for="password" class="block text-sm font-medium leading-6 text-white">Password</label>
				  <div class="mt-2">
					<input id="password" name="password" type="password" required class="block w-full rounded-md border-0 bg-white/5 py-1.5 text-white shadow-sm ring-1 ring-inset ring-white/10 focus:ring-2 focus:ring-inset focus:ring-indigo-500 sm:text-sm sm:leading-6">
				  </div>
				</div>
		  
				<div>
				  <button type="submit" class="flex w-full justify-center rounded-md bg-indigo-500 px-3 py-1.5 text-sm font-semibold leading-6 text-white shadow-sm hover:bg-indigo-400 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-indigo-500">
					{isLogin ? 'Sign in' : 'Sign up'}
				  </button>
				</div>
			  </form>
		  
			  <p class="mt-10 text-center text-sm text-gray-400">
				{isLogin ? 'Not a member?' : 'Already have an account?'}
				<a href="#" on:click|preventDefault={toggleForm} class="font-semibold leading-6 text-indigo-400 hover:text-indigo-300">
				  {isLogin ? 'Create an account' : 'Sign in'}
				</a>
			  </p>
			</div>
		  </div>
		</div>
		</div>