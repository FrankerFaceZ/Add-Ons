<template>
	<div
		ref="root"
		:class="{'collapsed': is_collapsed}"
		class="bd--discover-column"
	>

	</div>
</template>

<script>

export default {
	props: ['data', 'type', 'settings', 'collapsed']
}

</script>