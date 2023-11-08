<template lang="html">
	<div class="ffz--widget ffz--select-box">
		<div class="tw-flex tw-align-items-center">
			<label :for="item.full_key">{{ t(item.i18n_key, item.title) }}</label>
			<select
				:id="item.full_key" ref="control"
				class="tw-border-radius-medium tw-font-size-6 tw-select tw-pd-l-1 tw-pd-r-3 tw-pd-y-05 tw-mg-05"
				@change="onChange"
			>
				<template v-for="i in nested_data">
					<optgroup
						v-if="i.entries" :key="i.key" :disabled="i.disabled"
						:label="i.i18n_key ? t(i.i18n_key, i.title, i) : i.title"
					>
						<option v-for="j in i.entries" :key="j.value" :selected="j.value === value" :value="j.v">
							{{ j.i18n_key ? t(j.i18n_key, j.title, j) : j.title }}
						</option>
					</optgroup>
					<option v-else :key="i.value" :selected="i.value === value" :value="i.v">
						{{ i.i18n_key ? t(i.i18n_key, i.title, i) : i.title }}
					</option>
				</template>
			</select>
		</div>
		<section
			v-if="item.description"
			class="tw-c-text-alt-2"
		>
			<markdown :source="t(item.desc_i18n_key || `${item.i18n_key}.description`, item.description)" />
		</section>
	</div>
</template>

<script>

export default {
	props: ['item', 'context'],

	data() {
		return {
			presets: this.item.value
		};
	},

	computed: {
		data() {
			const data = this.item.data;
			if (typeof data === 'function')
				return data(this.profile, this.value);

			return data;
		},

		nested_data() {
			const out         = [];
			let current_group = null;
			let i             = 0;
			for (const entry of this.data) {
				if (entry.separator) {
					current_group = {
						key     : entry.key ?? i,
						entries : [],
						i18n_key: entry.i18n_key,
						title   : entry.title,
						disabled: entry.disabled
					};
					out.push(current_group);
				} else if (current_group != null)
					current_group.entries.push(Object.assign({v: i}, entry));
				else
					out.push(Object.assign({v: i}, entry));
				i++;
			}
			return out;
		}
	},

	methods: {
		onChange() {
			let value = this.$refs.control.value;
			if (!value || value === 0) return;

			if (this.item.getPreset) {
				value = this.item.getPreset(value).css;
				this.context.currentProfile.set(this.item.full_key.split(':')[1], value);
				document.getElementById('brcm-css-text-area').value = value;
				this.item.onChange();
			}
		}
	}
};

</script>
