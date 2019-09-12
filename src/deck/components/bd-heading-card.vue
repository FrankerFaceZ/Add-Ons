<template>
	<div
		:class="[textColor, fontSize, upcase, strong]"
		class="bd--width"
	>
		{{ title }}
	</div>
</template>

<script>

export default {
	props: ['item', 'settings', 'inst'],

	computed: {
		strong() {
			if ( this.item.strong )
				return 'tw-strong'
		},

		upcase() {
			if ( this.item.upcase )
				return 'tw-upcase';
		},

		textColor() {
			if ( this.item.color )
				return this.item.color;
		},

		fontSize() {
			if ( this.item.size )
				return `tw-font-size-${this.item.size}`;
		},

		title() {
			if ( this.item.i18n )
				return this.t(this.item.i18n, this.item.text, this.item);

			return this.item.text;
		}
	}
}

</script>