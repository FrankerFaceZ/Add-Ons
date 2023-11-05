<template>
	<div class="tw-flex tw-align-items-start tw-mg-y-05">
		<label :for="'lang$' + id">
			{{ t('addon.deck.edit.lang', 'Language:') }}
		</label>
		<div class="tw-flex tw-flex-column tw-full-width tw-align-items-start">
			<select
				ref="lang"
				:id="'lang$' + id"
				class="tw-full-width tw-border-radius-medium tw-font-size-6 tw-pd-x-1 tw-pd-y-05 ffz-select"
				multiple
				@change="onLangChange"
			>
				<option
					v-for="(label, id) in languages"
					:key="id"
					:value="id"
					:selected="langs.includes(id)"
				>
					{{ label }}
				</option>
			</select>
			<button
				class="tw-button tw-button--text ffz-il-tooltip__container tw-mg-t-05"
				@click="clearSelection"
			>
				<span class="tw-button__text">
					{{ t('addon.deck.reset', 'Reset') }}
				</span>
			</button>
		</div>
	</div>
</template>

<script>

import { Languages } from '../data';

let last_id = 0;

export default {
	props: ['value'],
	
	data() {
		return {
			id: last_id++,
			languages: Languages
		}
	},
	
	computed: {
		langs() {
			return this.value ?? []
		}
	},
	
	methods: {
		clearSelection() {
			this.$refs.lang.selectedIndex = -1;
			this.onLangChange();
		},

		onLangChange() {
			const langs = [...this.$refs.lang.selectedOptions].map(opt => opt.value);
			
			this.$emit('input', langs);
		}
	}
	
}

</script>