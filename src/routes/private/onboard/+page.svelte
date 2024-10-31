<script>
    import { createEventDispatcher } from 'svelte';
    import { supabase } from '../../../lib/supabaseClient';
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

    async function fetchTeamsWithUsers() {
        const { data: teams } = await supabase.from("teams").select("id, name");
        const teamsWithUsers = await Promise.all(
            teams.map(async (team) => {
                const { data: users } = await supabase
                    .from("profiles")
                    .select("*")
                    .eq("team", team.id);
                return { ...team, users: users || [] };
            })
        );
        return teamsWithUsers;
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
                    closeModal();
                    teams = await fetchTeamsWithUsers();
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

    function handleKeydown(event) {
        if (event.key === 'Enter') {
            addUser();
        }
    }
</script>

<div class="min-h-screen bg-gray-900 text-gray-300 p-8">
    <!-- Top Section -->
    <div class="flex items-center justify-between mb-6">
        <h2 class="text-lg font-semibold text-gray-100">Teams</h2>
        <button on:click={openModal} class="rounded-md bg-blue-600 px-3 py-2 text-sm font-semibold text-white hover:bg-blue-500 focus:outline-none">
            Add user
        </button>
    </div>

    <div class="flex items-center gap-4 mb-8">
        <button on:click={() => selectedTeam = 'all'}
                class={`px-4 py-2 rounded-full ${selectedTeam === 'all' ? 'bg-blue-600 text-white' : 'bg-gray-800 text-gray-300'}`}>
            All Teams
        </button>
        {#each teams as team}
            <button on:click={() => selectedTeam = team.name}
                    class={`px-4 py-2 rounded-full ${selectedTeam === team.name ? 'bg-blue-600 text-white' : 'bg-gray-800 text-gray-300'}`}>
                {team.name}
            </button>
        {/each}
        <button on:click={openTeamModal} class="px-4 py-2 rounded-full bg-gray-700 text-gray-300 hover:bg-blue-500">
            Add Team
        </button>
    </div>

    <!-- User Table -->
    <div class="bg-gray-800 rounded-lg overflow-hidden shadow-md">
        <table class="min-w-full divide-y divide-gray-700">
            <thead>
                <tr>
                    <th class="px-6 py-3 text-left text-sm font-semibold text-gray-300">Name</th>
                    <th class="px-6 py-3 text-left text-sm font-semibold text-gray-300">Phone</th>
                    <th class="px-6 py-3 text-left text-sm font-semibold text-gray-300">Role</th>
                    <th class="px-6 py-3 text-left text-sm font-semibold text-gray-300">Status</th>
                </tr>
            </thead>
            <tbody class="divide-y divide-gray-700 bg-gray-900">
                {#each sortedUsers as user}
                    <tr>
                        <td class="px-6 py-4 whitespace-nowrap text-sm text-gray-300">{user.first_name} {user.last_name}</td>
                        <td class="px-6 py-4 whitespace-nowrap text-sm text-gray-300">{user.phone}</td>
                        <td class="px-6 py-4 whitespace-nowrap text-sm text-gray-300">
                            {user.user_type === 'super_user' ? 'Super User' : 'User'}
                        </td>
                        <td class="px-6 py-4 whitespace-nowrap text-sm text-green-500">Active</td>
                    </tr>
                {/each}
            </tbody>
        </table>
    </div>

    <!-- User Modal -->
    {#if showModal}
        <div class="fixed inset-0 bg-gray-800 bg-opacity-75 flex justify-center items-center" transition:fade={{duration: 200}}>
            <div class="bg-gray-900 rounded-lg p-8 shadow-lg max-w-md w-full" transition:fly="{{ y: 200, duration: 300 }}">
                <h3 class="text-lg font-semibold text-gray-100 mb-4">Add New User</h3>
                <input type="text" bind:value={newUser.firstName} placeholder="First Name" class="w-full mb-4 p-2 bg-gray-800 rounded text-gray-200"/>
                <input type="text" bind:value={newUser.lastName} placeholder="Last Name" class="w-full mb-4 p-2 bg-gray-800 rounded text-gray-200"/>
                <input type="email" bind:value={newUser.email} placeholder="Email" class="w-full mb-4 p-2 bg-gray-800 rounded text-gray-200"/>
                <input type="tel" bind:value={newUser.phone} placeholder="Phone" class="w-full mb-4 p-2 bg-gray-800 rounded text-gray-200"/>
                
                <select bind:value={newUser.team} class="w-full mb-4 p-2 bg-gray-800 rounded text-gray-200">
                    <option value="">Select Team</option>
                    {#each teams as team}
                        <option value={team.id}>{team.name}</option>
                    {/each}
                </select>

                <select bind:value={newUser.role} class="w-full mb-4 p-2 bg-gray-800 rounded text-gray-200">
                    <option value="user">User</option>
                    <option value="super_user">Super User</option>
                </select>
                <button on:click={addUser} class="w-full bg-blue-600 text-white rounded p-2">Add User</button>
                <button on:click={closeModal} class="w-full bg-gray-700 text-gray-300 rounded p-2 mt-2">Cancel</button>
            </div>
        </div>
    {/if}

    <!-- Add Team Modal -->
    {#if showTeamModal}
        <div class="fixed inset-0 bg-gray-800 bg-opacity-75 flex justify-center items-center" transition:fade={{duration: 200}} on:keydown={handleKeydown}>
            <div class="bg-gray-900 rounded-lg p-8 shadow-lg max-w-md w-full relative" transition:fly="{{ y: 200, duration: 300 }}">
                <!-- Close button -->
                <button class="absolute top-4 right-4 text-gray-400 hover:text-gray-300" on:click={closeTeamModal}>
                    <svg class="h-6 w-6" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12" />
                    </svg>
                </button>
                
                <h3 class="text-lg font-semibold text-gray-100 mb-4">Add New Team</h3>
                <input 
                    type="text" 
                    placeholder="Team Name" 
                    bind:value={newTeam.name}
                    class="w-full mb-4 p-2 bg-gray-800 rounded text-gray-200 border border-gray-700 focus:border-blue-500 focus:ring-1 focus:ring-blue-500"
                />
                
                <div class="flex gap-3">
                    <button 
                        on:click={addTeam}
                        class="flex-1 bg-blue-600 text-white rounded p-2 hover:bg-blue-700 transition-colors"
                    >
                        Add Team
                    </button>
                    <button 
                        on:click={closeTeamModal}
                        class="flex-1 bg-gray-700 text-gray-300 rounded p-2 hover:bg-gray-600 transition-colors"
                    >
                        Cancel
                    </button>
                </div>
            </div>
        </div>
    {/if}
</div>