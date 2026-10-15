<!--
	Shortcut List Editor

	FFZ has no built-in editor for name → text pairs, so this renders a simple row editor.
	Shortcuts are global: stored directly on the settings provider, not per-profile.
-->
<template>
	<section class="ffz--widget tw-border-t tw-pd-y-1">
		<div class="tw-c-text-alt-2 tw-font-size-6 tw-pd-b-1">
			{{ t('addon.chat-shortcuts.editor.hint', 'Type the prefix plus a name (e.g. ;gg) then Space or Tab to expand. Names cannot contain spaces.') }}
		</div>

		<div
			v-for="(row, idx) in rows"
			:key="row.key"
			class="tw-flex tw-align-items-center tw-mg-b-05"
		>
			<input
				v-model="row.name"
				type="text"
				class="tw-border-radius-medium tw-font-size-6 tw-pd-x-1 tw-pd-y-05 tw-mg-r-05 ffz-input"
				style="width: 12rem"
				:placeholder="t('addon.chat-shortcuts.editor.name', 'name')"
				@change="save"
			>
			<input
				v-model="row.text"
				type="text"
				class="tw-flex-grow-1 tw-border-radius-medium tw-font-size-6 tw-pd-x-1 tw-pd-y-05 tw-mg-r-05 ffz-input"
				:placeholder="t('addon.chat-shortcuts.editor.text', 'text to insert')"
				@change="save"
			>
			<button
				class="tw-button tw-button--text ffz-il-tooltip__container"
				@click="remove(idx)"
			>
				<span class="tw-button__text ffz-i-trash" />
				<div class="ffz-il-tooltip ffz-il-tooltip--down ffz-il-tooltip--align-right">
					{{ t('addon.chat-shortcuts.editor.remove', 'Remove') }}
				</div>
			</button>
		</div>

		<button class="tw-button tw-mg-t-05" @click="add">
			<span class="tw-button__text ffz-i-plus">
				{{ t('addon.chat-shortcuts.editor.add', 'Add Shortcut') }}
			</span>
		</button>
	</section>
</template>

<script>
const KEY = 'addon.chat-shortcuts.list';

let next_key = 0;

export default {
	props: ['item', 'context'],

	data() {
		const stored = this.context.provider.get(KEY);
		return {
			rows: (Array.isArray(stored) ? stored : []).map(s => ({
				key: next_key++,
				name: s?.name ?? '',
				text: s?.text ?? ''
			}))
		};
	},

	methods: {
		add() {
			this.rows.push({ key: next_key++, name: '', text: '' });
		},

		remove(idx) {
			this.rows.splice(idx, 1);
			this.save();
		},

		save() {
			const value = this.rows
				.filter(r => r.name.trim() || r.text)
				.map(r => ({ name: r.name.trim(), text: r.text }));

			this.context.provider.set(KEY, value);
		}
	}
};
</script>
