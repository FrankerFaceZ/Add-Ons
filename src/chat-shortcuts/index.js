'use strict';

import { parseShortcuts, findMatches, expandAt } from './matcher.js';
import { buildPreview } from './preview.js';
import { buildEmoteIndex } from './emotes.js';

const KeyHandler = Symbol('ChatShortcutsKeyHandler');
const OriginalMatches = Symbol('ChatShortcutsOriginalMatches');
const FFZCacheKey = Symbol('ChatShortcutsFFZCacheKey');
const LastExpansion = Symbol('ChatShortcutsLastExpansion');

const MODIFIER_KEYS = new Set(['Shift', 'Control', 'Alt', 'Meta', 'CapsLock']);

const DEFAULT_PREFIX = ';';

class ChatShortcuts extends Addon {
	constructor(...args) {
		super(...args);

		this.inject('settings');
		this.inject('site');
		this.inject('site.fine');
		this.inject('site.chat.input');

		this._raw_list = undefined;
		this._shortcuts = [];

		this.settings.add('addon.chat-shortcuts.prefix', {
			default: DEFAULT_PREFIX,
			ui: {
				path: 'Add-Ons > Chat Shortcuts >> General',
				title: 'Prefix',
				description: 'Typed before a shortcut name, e.g. `;gg`. Must not contain spaces.',
				component: 'setting-text-box'
			}
		});

		// Written by shortcut-list-editor.vue directly on the provider (global, not
		// per-profile), so it must be read with provider.get(), not settings.get().
		this.settings.add('addon.chat-shortcuts.list', {
			default: []
		});

		this.settings.addUI('addon.chat-shortcuts.list-editor', {
			path: 'Add-Ons > Chat Shortcuts >> Shortcuts',
			component: () => import(/* webpackChunkName: 'chat-shortcuts' */ './shortcut-list-editor.vue')
		});
	}

	onEnable() {
		this.input.ChatInput.on('mount', this.install, this);
		this.input.ChatInput.on('update', this.install, this);
		this.input.ChatInput.ready((cls, instances) => {
			for(const inst of instances)
				this.install(inst);
		});
	}

	onDisable() {
		this.input.ChatInput.off('mount', this.install, this);
		this.input.ChatInput.off('update', this.install, this);

		for(const inst of this.input.ChatInput.instances)
			this.uninstall(inst);
	}

	// The provider only emits 'changed' for other tabs, so read on demand and
	// re-parse only when the stored array changes.
	get shortcuts() {
		const raw = this.settings.provider.get('addon.chat-shortcuts.list');
		if ( raw !== this._raw_list ) {
			this._raw_list = raw;
			this._shortcuts = parseShortcuts(raw);
		}

		return this._shortcuts;
	}

	get prefix() {
		const value = this.settings.get('addon.chat-shortcuts.prefix');
		return typeof value === 'string' && value.trim() && ! /\s/.test(value.trim())
			? value.trim()
			: DEFAULT_PREFIX;
	}

	getElement(inst) {
		if ( inst.chatInputRef instanceof Element )
			return inst.chatInputRef;

		return this.fine.getChildNode(inst)?.querySelector('.chat-wysiwyg-input__editor');
	}

	// Installation

	install(inst) {
		try {
			this.installKeyHandler(inst);
			this.installProvider(inst);
		} catch(err) {
			this.log.error('Unable to install chat shortcuts.', err);
		}
	}

	uninstall(inst) {
		try {
			const handler = inst[KeyHandler];
			if ( handler ) {
				handler.el.removeEventListener('keydown', handler);
				inst[KeyHandler] = null;
			}

			inst[LastExpansion] = null;

			const provider = this.getEmoteProvider(inst);
			if ( provider?.[OriginalMatches] ) {
				provider.getMatches = provider[OriginalMatches];
				provider[OriginalMatches] = null;
			}
		} catch(err) {
			this.log.error('Unable to uninstall chat shortcuts.', err);
		}
	}

	installKeyHandler(inst) {
		const el = this.getElement(inst);
		if ( ! el )
			return;

		// Twitch can swap the editor element on update; move the listener if so.
		const existing = inst[KeyHandler];
		if ( existing?.el === el )
			return;
		if ( existing )
			existing.el.removeEventListener('keydown', existing);

		const handler = event => this.handleKey(inst, event);
		handler.el = el;
		inst[KeyHandler] = handler;
		el.addEventListener('keydown', handler);
	}

	getEmoteProvider(inst) {
		const providers = inst.autocompleteInputRef?.providers;
		if ( ! providers )
			return null;

		for(const provider of providers)
			if ( provider?.autocompleteType === 'emote' && typeof provider.getMatches === 'function' )
				return provider;

		return null;
	}

	installProvider(inst) {
		const provider = this.getEmoteProvider(inst);
		if ( ! provider || provider[OriginalMatches] )
			return;

		const original = provider[OriginalMatches] = provider.getMatches;
		const t = this;

		provider.getMatches = function(input, ...rest) {
			try {
				const items = t.getSuggestions(input, this);
				if ( items )
					return items;
			} catch(err) {
				t.log.error('Error building shortcut suggestions.', err);
			}

			return original.call(this, input, ...rest);
		}
	}

	// Inline expansion

	handleKey(inst, event) {
		try {
			if ( MODIFIER_KEYS.has(event.key) )
				return;

			// Any key other than an immediate Backspace forgets the last expansion.
			const last = inst[LastExpansion];
			inst[LastExpansion] = null;

			const plain = ! event.ctrlKey && ! event.altKey && ! event.metaKey;
			if ( ! plain )
				return;

			const is_space = event.key === ' ',
				is_tab = event.key === 'Tab' && ! event.shiftKey,
				is_backspace = event.key === 'Backspace';

			if ( ! (is_space || is_tab || is_backspace) )
				return;

			const value = inst.ffzGetValue?.();
			const [start, end] = inst.ffzGetSelection?.() ?? [];
			if ( typeof value !== 'string' || start !== end || start == null )
				return;

			if ( is_backspace ) {
				// Undo: only if the input is still exactly what we produced.
				if ( last && value === last.to ) {
					this.applyValue(inst, event, last.from, last.from_caret);
				}
				return;
			}

			const result = expandAt(value, start, this.prefix, this.shortcuts, is_space);
			if ( ! result )
				return;

			this.applyValue(inst, event, result.value, result.caret);
			inst[LastExpansion] = { from: value, from_caret: start, to: result.value };

		} catch(err) {
			this.log.error('Error handling shortcut key.', err);
		}
	}

	applyValue(inst, event, value, caret) {
		event.preventDefault();
		event.stopPropagation();

		inst.autocompleteInputRef.setValue(value);
		inst.ffzSetSelection?.(caret, caret);
	}

	// Autocomplete menu

	getSuggestions(input, provider) {
		const prefix = this.prefix;
		if ( typeof input !== 'string' || ! input.startsWith(prefix) || input.length <= prefix.length )
			return null;

		const matches = findMatches(this.shortcuts, input.slice(prefix.length));
		if ( ! matches.length )
			return null;

		let lookup = null;
		try {
			lookup = this.getEmoteIndex(provider)?.lookup ?? null;
		} catch(err) {
			this.log.error('Unable to build emote lookup for previews.', err);
		}

		return matches.map(match => ({
			current: input,
			replacement: match.text,
			element: this.renderSuggestion(prefix + match.name, match.text, lookup)
		}));
	}

	// Emotes for the settings editor: the open chat's (Twitch + channel) if any,
	// otherwise the user's global and personal FFZ/BTTV/7TV sets. Twitch emotes are
	// only known while a chat is mounted. Returns {entries, lookup} or null.
	getEditorEmotes() {
		try {
			for(const inst of this.input.ChatInput.instances) {
				const provider = this.getEmoteProvider(inst);
				if ( provider )
					return this.getEmoteIndex(provider);
			}

			const user = this.site.getUser?.(),
				key = `${user?.id}|${user?.login}`;

			if ( ! this._global_cache || this._global_key !== key ) {
				this._global_cache = this.input.buildFFZCache(user?.id, user?.login, null, null);
				this._global_key = key;
			}

			return buildEmoteIndex([this._global_cache]);

		} catch(err) {
			this.log.error('Unable to build emotes for the editor.', err);
		}

		return null;
	}

	// The user's FFZ tab-completion settings, for the editor's emote autocomplete.
	getEmoteCompletionOptions() {
		const get = key => this.settings.get(key),
			enabled = get('chat.emotes.enabled');

		return {
			twitch: !! enabled,
			ffz: enabled > 1 && !! get('chat.tab-complete.ffz-emotes'),
			matching: get('chat.tab-complete.matching') || 1,
			limit: get('chat.tab-complete.limit-results') ? 25 : null,
			preferFavorites: !! get('chat.tab-complete.prioritize-favorites'),
			prioritizePrefix: !! get('chat.tab-complete.prioritize-prefix-matches'),
			withoutColon: !! get('chat.tab-complete.emotes-without-colon'),
			showSource: get('chat.tab-complete.show-source') || 0
		};
	}

	// Emote index ({entries, lookup}) from the tab-completion caches FFZ keeps on
	// the emote provider, building them with FFZ's own functions if FFZ hasn't yet.
	// FFZ nulls its caches when emotes change; we additionally track the channel
	// ourselves since FFZ's cache objects don't record it. Twitch emotes win name
	// clashes, as in chat.
	getEmoteIndex(provider) {
		if ( ! provider )
			return null;

		const input = this.input;

		let twitch = provider.ffz_twitch_cache;
		if ( twitch?.length !== provider.props?.emotes?.length )
			twitch = provider.ffz_twitch_cache = input.buildTwitchCache(provider.props?.emotes);

		const user = provider._ffz_user,
			channel_id = provider._ffz_channel_id,
			channel_login = provider._ffz_channel_login;

		const ffz_key = `${user?.id}|${user?.login}|${channel_id}|${channel_login}`;

		let ffz = provider.ffz_ffz_cache;
		if ( channel_login && (! ffz || provider[FFZCacheKey] !== ffz_key) ) {
			ffz = provider.ffz_ffz_cache = input.buildFFZCache(user?.id, user?.login, channel_id, channel_login);
			provider[FFZCacheKey] = ffz_key;
		}

		if ( this._index && this._index_twitch === twitch && this._index_ffz === ffz )
			return this._index;

		this._index = buildEmoteIndex([twitch, ffz]);
		this._index_twitch = twitch;
		this._index_ffz = ffz;
		return this._index;
	}

	renderSuggestion(token, text, lookup) {
		const createElement = this.site.getReact()?.createElement;
		if ( ! createElement )
			return token;

		const segments = buildPreview(text, lookup).map((seg, idx) => seg.emote
			? createElement('img', {
				key: idx,
				srcSet: seg.srcSet,
				alt: seg.emote,
				title: seg.emote,
				style: { height: '2rem', verticalAlign: 'middle' }
			})
			: createElement('span', { key: idx }, seg.text)
		);

		const name = createElement('span', { className: 'tw-semibold tw-flex-shrink-0 tw-mg-r-1' }, token),
			body = createElement('span', { className: 'tw-c-text-alt-2 tw-ellipsis' }, ...segments);

		return createElement('div', {
			className: 'tw-ellipsis tw-flex tw-align-items-center tw-pd-05',
			title: text
		}, name, body);
	}
}

ChatShortcuts.register();
