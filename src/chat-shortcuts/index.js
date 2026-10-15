'use strict';

import { parseShortcuts, findExact, findMatches } from './matcher.js';

const KeyHandler = Symbol('ChatShortcutsKeyHandler');
const OriginalMatches = Symbol('ChatShortcutsOriginalMatches');

const DEFAULT_PREFIX = ';';
const PREVIEW_LENGTH = 60;

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
				const items = t.getSuggestions(input);
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
			const is_space = event.key === ' ',
				is_tab = event.key === 'Tab';

			if ( ! (is_space || is_tab) || event.ctrlKey || event.altKey || event.metaKey || (is_tab && event.shiftKey) )
				return;

			const value = inst.ffzGetValue?.();
			const [start, end] = inst.ffzGetSelection?.() ?? [];
			if ( typeof value !== 'string' || start !== end || start == null )
				return;

			const before = value.slice(0, start),
				after = value.slice(start),
				word = /\S+$/.exec(before);

			if ( ! word )
				return;

			const prefix = this.prefix;
			if ( ! word[0].startsWith(prefix) )
				return;

			const text = findExact(this.shortcuts, word[0].slice(prefix.length));
			if ( text == null )
				return;

			const pad = is_space && ! /^\s/.test(after) ? ' ' : '',
				head = before.slice(0, word.index) + text + pad;

			event.preventDefault();
			event.stopPropagation();

			inst.autocompleteInputRef.setValue(head + after);
			inst.ffzSetSelection?.(head.length, head.length);

		} catch(err) {
			this.log.error('Error expanding shortcut.', err);
		}
	}

	// Autocomplete menu

	getSuggestions(input) {
		const prefix = this.prefix;
		if ( typeof input !== 'string' || ! input.startsWith(prefix) || input.length <= prefix.length )
			return null;

		const matches = findMatches(this.shortcuts, input.slice(prefix.length));
		if ( ! matches.length )
			return null;

		return matches.map(match => ({
			current: input,
			replacement: match.text,
			element: this.renderSuggestion(prefix + match.name, match.text)
		}));
	}

	renderSuggestion(token, text) {
		const createElement = this.site.getReact()?.createElement;
		if ( ! createElement )
			return token;

		const preview = text.length > PREVIEW_LENGTH
			? `${text.slice(0, PREVIEW_LENGTH - 1)}…`
			: text;

		const name = createElement('span', { className: 'tw-semibold tw-flex-shrink-0 tw-mg-r-1' }, token),
			body = createElement('span', { className: 'tw-c-text-alt-2 tw-ellipsis' }, preview);

		return createElement('div', {
			className: 'tw-ellipsis tw-flex tw-align-items-center tw-pd-05',
			title: text
		}, name, body);
	}
}

ChatShortcuts.register();
