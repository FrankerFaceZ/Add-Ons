<!--
	Shortcut List Editor

	FFZ has no built-in editor for name → text pairs, so this renders a simple row editor.
	Shortcuts are global: stored directly on the settings provider, not per-profile.
-->
<template>
	<section class="ffz--widget tw-border-t tw-pd-y-1">
		<div class="tw-c-text-alt-2 tw-font-size-6 tw-pd-b-1">
			{{ t('addon.chat-shortcuts.editor.hint', 'Type the prefix plus a name (e.g. {example}) then Space or Tab to expand. Press Backspace right after to undo.', { example: `${prefix}gg` }) }}
		</div>

		<div
			v-for="(row, idx) in rows"
			:key="row.key"
			class="tw-mg-b-1"
		>
			<div class="tw-flex tw-align-items-center">
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

			<div
				v-if="problems[idx]"
				class="tw-font-size-7 tw-mg-t-05"
				style="color: var(--color-text-error, #eb0400)"
			>
				{{ problems[idx] }}
			</div>
			<div
				v-else-if="row.text"
				class="tw-font-size-6 tw-c-text-alt-2 tw-mg-t-05 tw-ellipsis"
			>
				<span class="tw-semibold tw-mg-r-1">{{ prefix }}{{ row.name.trim() }}</span>
				<template v-for="(seg, sidx) in preview(row.text)">
					<img
						v-if="seg.emote"
						:key="sidx"
						:srcset="seg.srcSet"
						:alt="seg.emote"
						:title="seg.emote"
						style="height: 2rem; vertical-align: middle"
					>
					<span v-else :key="sidx">{{ seg.text }}</span>
				</template>
			</div>
		</div>

		<button class="tw-button tw-mg-t-05" @click="add">
			<span class="tw-button__text ffz-i-plus">
				{{ t('addon.chat-shortcuts.editor.add', 'Add Shortcut') }}
			</span>
		</button>
	</section>
</template>

<script>
import { validateShortcuts } from './matcher.js';
import { buildPreview } from './preview.js';

const KEY = 'addon.chat-shortcuts.list';

let next_key = 0;

export default {
	props: ['item', 'context'],

	data() {
		const stored = this.context.provider.get(KEY),
			addon = this.context.getFFZ().resolve('addon.chat-shortcuts');

		return {
			// Snapshot of the emotes available in the open chat, if any.
			lookup: addon?.getPreviewLookup?.() ?? null,
			prefix: addon?.prefix ?? ';',
			rows: (Array.isArray(stored) ? stored : []).map(s => ({
				key: next_key++,
				name: s?.name ?? '',
				text: s?.text ?? ''
			}))
		};
	},

	computed: {
		problems() {
			return validateShortcuts(this.rows, this.prefix);
		}
	},

	methods: {
		preview(text) {
			return buildPreview(text, this.lookup);
		},

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
