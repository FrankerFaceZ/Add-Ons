<!--
	Shortcut List Editor

	FFZ has no built-in editor for name → text pairs, so this renders a simple row editor.
	Shortcuts are global: stored directly on the settings provider, not per-profile.

	The text field has its own emote autocomplete (Twitch's chat suggestion menu can't be
	reused here) that follows the user's FFZ tab-completion settings.
-->
<template>
	<section class="ffz--widget tw-border-t tw-pd-y-1">
		<div class="tw-c-text-alt-2 tw-font-size-6 tw-pd-b-1">
			{{ t('addon.chat-shortcuts.editor.hint', 'Type the prefix plus a name (e.g. {example}) then Space or Tab to expand. Press Backspace right after to undo. Type : in the text to autocomplete emotes.', { example: `${prefix}gg` }) }}
			<div v-if="! hasTwitch" class="tw-mg-t-05">
				{{ t('addon.chat-shortcuts.editor.no-chat', 'Open a channel\'s chat to include your Twitch and channel emotes.') }}
			</div>
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
				<div class="tw-flex-grow-1 tw-relative tw-mg-r-05">
					<input
						ref="text"
						v-model="row.text"
						type="text"
						class="tw-full-width tw-border-radius-medium tw-font-size-6 tw-pd-x-1 tw-pd-y-05 ffz-input"
						:placeholder="t('addon.chat-shortcuts.editor.text', 'text to insert')"
						@input="onTextInput(idx, $event)"
						@keydown="onTextKey(idx, $event)"
						@blur="closeComplete(); save()"
					>
					<div
						v-if="complete && complete.row === idx"
						class="tw-absolute tw-full-width tw-c-background-base tw-border tw-border-radius-medium tw-elevation-2"
						style="top: 100%; left: 0; z-index: 10; max-height: 24rem; overflow-y: auto"
					>
						<div
							v-for="(emote, iidx) in complete.items"
							:key="emote.token"
							class="tw-flex tw-align-items-center tw-pd-x-1 tw-pd-y-05"
							:class="{ 'tw-c-background-alt-2': iidx === complete.sel }"
							style="cursor: pointer"
							@mousedown.prevent="pick(iidx)"
							@mouseenter="complete.sel = iidx"
						>
							<img
								:srcset="emote.srcSet"
								:alt="emote.token"
								style="height: 2.4rem; min-width: 2.4rem; object-fit: contain"
								class="tw-mg-r-1"
							>
							<span class="tw-flex-grow-1 tw-ellipsis">{{ emote.token }}</span>
							<span class="tw-c-text-alt-2 tw-font-size-7 tw-mg-l-1">{{ sourceLabel(emote) }}</span>
						</div>
					</div>
				</div>
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
import { findEmotes, emoteQuery } from './emotes.js';

const KEY = 'addon.chat-shortcuts.list';

let next_key = 0;

function isTwitch(entry) {
	return typeof entry.source === 'string' && entry.source.startsWith('twitch');
}

export default {
	props: ['item', 'context'],

	data() {
		const stored = this.context.provider.get(KEY),
			addon = this.context.getFFZ().resolve('addon.chat-shortcuts'),
			emotes = addon?.getEditorEmotes?.() ?? null;

		return {
			// Snapshot of available emotes when the settings page was opened.
			lookup: emotes?.lookup ?? null,
			entries: emotes?.entries ?? [],
			options: addon?.getEmoteCompletionOptions?.() ?? {},
			prefix: addon?.prefix ?? ';',
			complete: null,
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
		},

		hasTwitch() {
			return this.entries.some(isTwitch);
		},

		// Entries allowed by the user's emote / tab-completion settings.
		completable() {
			const { twitch = true, ffz = true } = this.options;
			return this.entries.filter(e => isTwitch(e) ? twitch : ffz);
		}
	},

	methods: {
		preview(text) {
			return buildPreview(text, this.lookup);
		},

		sourceLabel(item) {
			if ( isTwitch(item) )
				return 'Twitch';
			return item.source === 'ffz' ? 'FFZ' : item.source;
		},

		// Emote autocomplete

		openComplete(idx, el, pressedTab) {
			const caret = el.selectionStart,
				query = emoteQuery(el.value, caret, { withoutColon: this.options.withoutColon, pressedTab });

			const items = query ? findEmotes(this.completable, query.term, this.options) : [];
			if ( ! items.length ) {
				this.complete = null;
				return false;
			}

			this.complete = { row: idx, items, sel: 0, start: query.start, end: caret };
			return true;
		},

		closeComplete() {
			this.complete = null;
		},

		onTextInput(idx, event) {
			this.openComplete(idx, event.target, false);
		},

		onTextKey(idx, event) {
			const c = this.complete && this.complete.row === idx ? this.complete : null;

			if ( ! c ) {
				// No-colon emote completion only triggers on Tab, like chat.
				if ( event.key === 'Tab' && ! event.shiftKey && this.options.withoutColon && this.openComplete(idx, event.target, true) )
					event.preventDefault();
				return;
			}

			if ( event.key === 'ArrowDown' || event.key === 'ArrowUp' ) {
				const n = c.items.length;
				c.sel = (c.sel + (event.key === 'ArrowDown' ? 1 : n - 1)) % n;
				event.preventDefault();

			} else if ( event.key === 'Tab' || event.key === 'Enter' ) {
				this.pick(c.sel);
				event.preventDefault();

			} else if ( event.key === 'Escape' ) {
				this.closeComplete();
				event.preventDefault();
				event.stopPropagation();
			}
		},

		pick(iidx) {
			const c = this.complete,
				item = c?.items[iidx];
			if ( ! item )
				return;

			const row = this.rows[c.row],
				before = row.text.slice(0, c.start) + item.token,
				after = row.text.slice(c.end),
				pad = /^\s/.test(after) ? '' : ' ';

			row.text = before + pad + after;
			this.complete = null;
			this.save();

			const el = this.$refs.text?.[c.row];
			this.$nextTick(() => {
				if ( el ) {
					el.focus();
					el.setSelectionRange(before.length + 1, before.length + 1);
				}
			});
		},

		// Rows

		add() {
			this.rows.push({ key: next_key++, name: '', text: '' });
		},

		remove(idx) {
			this.rows.splice(idx, 1);
			this.complete = null;
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
