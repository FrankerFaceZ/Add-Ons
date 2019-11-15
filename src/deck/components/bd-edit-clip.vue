<template>
	<div v-if="periods" class="tw-flex tw-align-items-center tw-mg-y-05">
		<label :for="'period$' + value.id">
			{{ t('addon.deck.edit.period', 'Period:') }}
		</label>
		<select
			ref="period"
			:id="'period$' + value.id"
			class="tw-flex-grow-1 tw-border-radius-medium tw-font-size-6 tw-pd-x-1 tw-pd-y-05 tw-select"
			@change="periodChange"
		>
			<option
				v-for="(option, key) in periods"
				:key="key"
				:value="key"
				:selected="key === value.settings.period"
				v-once
			>
				{{ option.i18n ? t(option.i18n, option.title) : option.title }}
			</option>
		</select>
	</div>
</template>

<script>

const {deep_copy} = FrankerFaceZ.utilities.object;

export default {
	props: ['value', 'type', 'settings', 'inst'],

	computed: {
		periods() {
			const out = this.inst && this.inst.getPeriods();
			if ( out )
				return deep_copy(out);
		}
	},

	methods: {
		periodChange() {
			const key = this.$refs.period.value,
				raw_value = this.periods[key];

			this.value.settings.period = raw_value ? key : null;
		}
	}
}

</script>