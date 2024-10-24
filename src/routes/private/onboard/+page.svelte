<script>
    import { createEventDispatcher } from 'svelte';
    import { fade, fly } from 'svelte/transition';
    export let data;
    const dispatch = createEventDispatcher();
    let emailInput;
    let selectedTeam = 'all';
    let showModal = false;
    let showTeamModal = false;
    let newUser = { email: '', team: selectedTeam, role: 'user', firstName: '', lastName: '', phone: '' };
    let newTeam = { name: '' };

    let teams = data.teams;

    $: filteredUsers = selectedTeam === 'all' 
        ? teams.flatMap(team => team.users)
        : teams.find(team => team.name === selectedTeam)?.users || [];

    $: sortedUsers = filteredUsers.sort((a, b) => {
        if (a.user_type === 'super_user' && b.user_type !== 'super_user') return -1;
        if (a.user_type !== 'super_user' && b.user_type === 'super_user') return 1;
        return 0;
    });

    $: {
        if (selectedTeam !== 'all') {
            newUser.team = selectedTeam;
        }
    }

    function openModal() {
        showModal = true;
    }

    function closeModal() {
        showModal = false;
        newUser = { email: '', team: selectedTeam, role: 'user', firstName: '', lastName: '', phone: '' };
    }

    async function addUser() {
        if (newUser.email && newUser.team) {
            try {
                const response = await fetch('/api/adduser', {
                    method: 'POST',
                    headers: {
                        'Content-Type': 'application/json',
                    },
                    body: JSON.stringify(newUser),
                });

                if (response.ok) {
                    const addedUser = await response.json();
                    const team = teams.find(t => t.name === newUser.team);
                    if (team) {
                        team.users = [...team.users, addedUser];
                        teams = teams; // Trigger reactivity
                    }
                    closeModal();
                } else {
                    const errorData = await response.json();
                    console.error('Failed to add user:', errorData.error);
                }
            } catch (error) {
                console.error('Error adding user:', error);
            }
        }
    }

    function openTeamModal() {
        showTeamModal = true;
    }

    function closeTeamModal() {
        showTeamModal = false;
        newTeam = { name: '' };
    }

    async function addTeam() {
        if (newTeam.name) {
            try {
                const response = await fetch('/api/addteam', {
                    method: 'POST',
                    headers: {
                        'Content-Type': 'application/json',
                    },
                    body: JSON.stringify({ name: newTeam.name }),
                });

                if (response.ok) {
                    const addedTeam = await response.json();
                    teams = [...teams, addedTeam];
                    closeTeamModal();
                } else {
                    console.error('Failed to add team');
                }
            } catch (error) {
                console.error('Error adding team:', error);
            }
        }
    }

    function focusEmailInput(node) {
        if (showModal) {
            node.focus();
        }
    }

    $: if (showModal && emailInput) {
        emailInput.focus();
    }

    function handleKeydown(event) {
        if (event.key === 'Enter') {
            addUser();
        }
    }
</script>

<div class="px-4 sm:px-6 lg:px-8 w-full">
    <!-- Top Section with Teams and Add User Button -->
    <div class="sm:flex sm:items-center sm:justify-between mb-6">
        <div class="sm:flex-auto">
            <h2 class="text-base font-semibold leading-6 text-gray-900">Teams</h2>
            <div class="flex space-x-4 mt-4">
                <!-- All Teams Option -->
                <button 
                    on:click={() => selectedTeam = 'all'}
                    class="flex items-center justify-center px-4 py-2 rounded-full focus:outline-none {selectedTeam === 'all' ? 'ring-2 ring-indigo-600' : 'bg-gray-200 text-gray-800'}">
                    <span>All Teams</span>
                </button>
                <!-- Team Divs -->
                {#each teams as team}
                    <button 
                        on:click={() => selectedTeam = team.name}
                        class="flex items-center justify-center px-4 py-2 rounded-full focus:outline-none {selectedTeam === team.name ? 'ring-2 ring-indigo-600' : 'bg-gray-200 text-gray-800'}">
                        <span>{team.name}</span>
                    </button>
                {/each}
                <!-- Add Team Button -->
                <button 
                    on:click={openTeamModal}
                    class="flex items-center justify-center px-4 py-2 rounded-full bg-zinc-500 text-white focus:outline-none">
                    <span>Add Team</span>
                </button>
            </div>
        </div>

        <!-- Add User Button -->
        <div class="mt-4 sm:ml-16 sm:mt-0 sm:flex-none">
            <button on:click={openModal} type="button" class="block rounded-md bg-indigo-600 px-3 py-2 text-center text-sm font-semibold text-white shadow-sm hover:bg-indigo-500 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-indigo-600">Add user</button>
        </div>
    </div>

    <!-- Table Section -->
    <div class="mt-8 flow-root">
        <div class="-mx-4 -my-2 overflow-x-auto sm:-mx-6 lg:-mx-8">
            <div class="inline-block min-w-full py-2 align-middle sm:px-6 lg:px-8">
                <table class="min-w-full divide-y divide-gray-300">
                    <thead>
                        <tr>
                            <th scope="col" class="py-3.5 pl-4 pr-3 text-left text-sm font-semibold text-gray-900 sm:pl-0">Name</th>
                            <th scope="col" class="px-3 py-3.5 text-left text-sm font-semibold text-gray-900">Phone</th>
                            <th scope="col" class="px-3 py-3.5 text-left text-sm font-semibold text-gray-900">Role</th>
                            <th scope="col" class="px-3 py-3.5 text-left text-sm font-semibold text-gray-900">Status</th>
                            <th scope="col" class="relative py-3.5 pl-3 pr-4 sm:pr-0">
                                <span class="sr-only">Edit</span>
                            </th>
                        </tr>
                    </thead>
                    <tbody class="divide-y divide-gray-200 bg-white">
                        {#each sortedUsers as user}
                            <tr>
                                <td class="whitespace-nowrap py-5 pl-4 pr-3 text-sm sm:pl-0">
                                    <div class="flex items-center">
                                        <div class="h-11 w-11 flex-shrink-0">
                                            <img class="h-11 w-11 rounded-full" src={user.profile_picture_url} alt={`${user.first_name} ${user.last_name}`}>
                                        </div>
                                        <div class="ml-4">
                                            <div class="font-medium text-gray-900">{user.first_name} {user.last_name}</div>
                                            <div class="mt-1 text-gray-500">{user.email}</div>
                                        </div>
                                    </div>
                                </td>
                                <td class="whitespace-nowrap px-3 py-5 text-sm text-gray-500">
                                    <div class="text-gray-900">{user.phone}</div>
                                </td>
                                
                                <td class="whitespace-nowrap px-3 py-5 text-sm text-gray-500">
                                    {#if user.user_type === 'super_user'}
                                        <span class="inline-flex items-center rounded-md bg-blue-50 px-2 py-1 text-xs font-medium text-blue-700 ring-1 ring-inset ring-blue-700/10">
                                            Super User
                                        </span>
                                    {:else}
                                        User
                                    {/if}
                                </td>

                                <td class="whitespace-nowrap px-3 py-5 text-sm">
                                    <span class="inline-flex items-center rounded-md bg-green-50 px-2 py-1 text-xs font-medium text-green-700 ring-1 ring-inset ring-green-600/20">
                                        Active
                                    </span>
                                </td>

                                <td class="relative whitespace-nowrap py-5 pl-3 pr-4 text-right text-sm font-medium sm:pr-0">
                                    <a href="#" class="text-indigo-600 hover:text-indigo-900">Edit<span class="sr-only">, {user.first_name} {user.last_name}</span></a>
                                </td>
                            </tr>
                        {/each}
                    </tbody>
                </table>
            </div>
        </div>
    </div>
</div>

<!-- Add User Modal -->
{#if showModal}
<div class="fixed inset-0 z-50 overflow-y-auto" aria-labelledby="modal-title" role="dialog" aria-modal="true">
    <div class="flex items-end justify-center min-h-screen pt-4 px-4 pb-20 text-center sm:block sm:p-0">
        <div class="fixed inset-0 bg-gray-500 bg-opacity-75 transition-opacity" aria-hidden="true" on:click={closeModal} transition:fade={{duration: 200}}></div>

        <div class="inline-block align-bottom bg-white rounded-lg px-4 pt-5 pb-4 text-left overflow-hidden shadow-xl transform transition-all sm:my-8 sm:align-middle sm:max-w-lg sm:w-full sm:p-6"
             transition:fly="{{ y: 200, duration: 300 }}">
            <div class="sm:flex sm:items-start">
                <div class="mt-3 text-center sm:mt-0 sm:ml-4 sm:text-left w-full">
                    <h3 class="text-lg leading-6 font-medium text-gray-900" id="modal-title">
                        Add New User
                    </h3>
                    <div class="mt-2 space-y-2">
                        <input type="text" placeholder="First Name" bind:value={newUser.firstName}
                               class="px-3 py-2 bg-white border shadow-sm border-slate-300 placeholder-slate-400 focus:outline-none focus:border-indigo-500 focus:ring-indigo-500 block w-full rounded-md sm:text-sm focus:ring-1">
                        <input type="text" placeholder="Last Name" bind:value={newUser.lastName}
                               class="px-3 py-2 bg-white border shadow-sm border-slate-300 placeholder-slate-400 focus:outline-none focus:border-indigo-500 focus:ring-indigo-500 block w-full rounded-md sm:text-sm focus:ring-1">
                        <input type="email" placeholder="Email" bind:value={newUser.email}
                               class="px-3 py-2 bg-white border shadow-sm border-slate-300 placeholder-slate-400 focus:outline-none focus:border-indigo-500 focus:ring-indigo-500 block w-full rounded-md sm:text-sm focus:ring-1"
                               bind:this={emailInput}>
                        <input type="tel" placeholder="Phone" bind:value={newUser.phone}
                               class="px-3 py-2 bg-white border shadow-sm border-slate-300 placeholder-slate-400 focus:outline-none focus:border-indigo-500 focus:ring-indigo-500 block w-full rounded-md sm:text-sm focus:ring-1">
                        <select bind:value={newUser.team}
                                class="px-3 py-2 bg-white border shadow-sm border-slate-300 placeholder-slate-400 focus:outline-none focus:border-indigo-500 focus:ring-indigo-500 block w-full rounded-md sm:text-sm focus:ring-1">
                            {#each teams as team}
                                <option value={team.id}>{team.name}</option>
                            {/each}
                        </select>
                        <select bind:value={newUser.role}
                                class="px-3 py-2 bg-white border shadow-sm border-slate-300 placeholder-slate-400 focus:outline-none focus:border-indigo-500 focus:ring-indigo-500 block w-full rounded-md sm:text-sm focus:ring-1">
                            <option value="user">User</option>
                            <option value="super_user">Super User</option>
                        </select>
                    </div>
                </div>
            </div>
            <div class="mt-5 sm:mt-4 sm:flex sm:flex-row-reverse">
                <button type="button" on:click={addUser}
                        class="w-full inline-flex justify-center rounded-md border border-transparent shadow-sm px-4 py-2 bg-indigo-600 text-base font-medium text-white hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500 sm:ml-3 sm:w-auto sm:text-sm">
                    Add User
                </button>
                <button type="button" on:click={closeModal}
                        class="mt-3 w-full inline-flex justify-center rounded-md border border-gray-300 shadow-sm px-4 py-2 bg-white text-base font-medium text-gray-700 hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500 sm:mt-0 sm:w-auto sm:text-sm">
                    Cancel
                </button>
            </div>
        </div>
    </div>
</div>
{/if}

<!-- Add Team Modal -->
{#if showTeamModal}
<div class="fixed inset-0 z-50 overflow-y-auto" aria-labelledby="modal-title" role="dialog" aria-modal="true" on:keydown={handleKeydown}>
    <div class="flex items-end justify-center min-h-screen pt-4 px-4 pb-20 text-center sm:block sm:p-0">
        <div class="fixed inset-0 bg-gray-500 bg-opacity-75 transition-opacity" aria-hidden="true" on:click={closeTeamModal} transition:fade={{duration: 200}}></div>

        <div class="inline-block align-bottom bg-white rounded-lg px-4 pt-5 pb-4 text-left overflow-hidden shadow-xl transform transition-all sm:my-56 sm:align-middle sm:max-w-lg sm:w-full sm:p-6"
             transition:fly="{{ y: 200, duration: 300 }}">
            <div class="absolute top-0 right-0 pt-4 pr-4">
                <button type="button" class="bg-white rounded-md text-gray-400 hover:text-gray-500 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500" on:click={closeTeamModal}>
                    <span class="sr-only">Close</span>
                    <svg class="h-6 w-6" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke="currentColor" aria-hidden="true">
                        <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12" />
                    </svg>
                </button>
            </div>
            <div class="sm:flex sm:items-start">
                <div class="mt-3 text-center sm:mt-0 sm:ml-4 sm:text-left w-full">
                    <h3 class="text-lg leading-6 font-medium text-gray-900" id="modal-title">
                        Add New Team
                    </h3>
                    <div class="mt-2">
                        <input type="text" placeholder="Team Name" bind:value={newTeam.name}
                        class="mt-2 px-3 py-2 bg-white border shadow-sm border-slate-300 placeholder-slate-400 focus:outline-none focus:border-indigo-500 focus:ring-indigo-500 block w-full rounded-md sm:text-sm focus:ring-1">
                    </div>
                </div>
            </div>
            <div class="mt-5 sm:mt-4 sm:flex sm:flex-row-reverse">
                <button type="button" on:click={addTeam}
                        class="w-full inline-flex justify-center rounded-md border border-transparent shadow-sm px-4 py-2 bg-blue-600 text-base font-medium text-white hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 sm:ml-3 sm:w-auto sm:text-sm">
                    Add Team
                </button>
                <button type="button" on:click={closeTeamModal}
                        class="mt-3 w-full inline-flex justify-center rounded-md border border-gray-300 shadow-sm px-4 py-2 bg-white text-base font-medium text-gray-700 hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500 sm:mt-0 sm:w-auto sm:text-sm">
                    Cancel
                </button>
            </div>
        </div>
    </div>
</div>
{/if}
