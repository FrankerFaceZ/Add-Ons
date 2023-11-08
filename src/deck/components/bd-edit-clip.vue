<template>
	<div v-if="periods" class="tw-flex tw-align-items-center tw-mg-y-05">
		<label :for="'period$' + value.id">
			{{ t('addon.deck.edit.period', 'Period:') }}
		</label>
		<select
			:id="'period$' + value.id"
			ref="period"
			class="tw-flex-grow-1 tw-border-radius-medium tw-font-size-6 tw-pd-x-1 tw-pd-y-05 ffz-select"
			@change="periodChange"
		>
			<option
				v-for="(option, key) in periods"
				v-once
				:key="key"
				:value="key"
				:selected="key === value.settings.period"
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

			return null;
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
