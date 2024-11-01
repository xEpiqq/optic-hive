<script>
  import { createEventDispatcher } from 'svelte';
  const dispatch = createEventDispatcher();
  export let isDrawingMode = false;

  const buttons = [
    {
      icon: "/pan.png",
      alt: "Pan",
      tooltip: "Pan",
      event: "pan",
      class: "w-10 h-10 bg-blue-600",
    },
    {
      icon: "/filter.png",
      alt: "Filter Leads",
      tooltip: "Filter Leads",
      event: "filterLeads",
      class: "w-8 h-8 bg-gray-600",
    },
    {
      icon: "/territory.png",
      alt: "Territory",
      tooltip: "Territory",
      event: "toggleTerritoryMode", // Updated event
      class: "w-8 h-8 bg-gray-600",
    },
    {
      icon: "/assign.png",
      alt: "Assign Leads",
      tooltip: "Assign Leads",
      event: "assignLeads",
      class: "w-8 h-8 bg-gray-600",
    },
    {
      icon: "/newpin.png",
      alt: "Create Lead",
      tooltip: "Create Lead",
      event: "createLead",
      class: "w-8 h-8 bg-gray-600",
    },
  ];

  let hoverIndex = null;
  let tooltipTimer;

  const showTooltip = (index) => {
    tooltipTimer = setTimeout(() => {
      hoverIndex = index;
    }, 700);
  };

  const hideTooltip = () => {
    clearTimeout(tooltipTimer);
    hoverIndex = null;
  };

  const handleClick = (event) => {
    dispatch(event);
  };
</script>

<div class="fixed bottom-20 left-1/2 transform -translate-x-1/2 bg-gray-800 text-white flex items-center justify-between w-[400px] h-12 rounded-full shadow-lg px-4">
  {#each buttons as button, index}
    <div class="relative">
      <button
        class={`flex items-center justify-center ${button.class} rounded-full focus:outline-none`}
        on:click={() => handleClick(button.event)}
        on:mouseenter={() => showTooltip(index)}
        on:mouseleave={hideTooltip}>
        <img src={button.icon} alt={button.alt} class={`${button.icon === "/pan.png" ? "h-6 w-6" : "h-4 w-4"}`} />
      </button>
      {#if hoverIndex === index}
        <div class="absolute bottom-12 left-1/2 transform -translate-x-1/2 bg-gray-700 text-white text-sm py-1 px-2 rounded-lg">
          {typeof button.tooltip === 'function' ? button.tooltip(isDrawingMode) : button.tooltip}
        </div>
      {/if}
    </div>
  {/each}
</div>

<style>
  /* Add any additional styles here if needed */
</style>
