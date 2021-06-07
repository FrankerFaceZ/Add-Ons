'use strict';

const { KEYS } = FrankerFaceZ.utilities.constants;
const Installed = Symbol('KeyHandler');
const Focus = Symbol('FocusHandler');

class InlineTab extends Addon {
	constructor(...args) {
		super(...args);

		this.inject('i18n');
		this.inject('settings');
		this.inject('site.chat.input');

		this.settings.add('addon.inlinetab.no_commands', {
			default: true,
			ui: {
				path: 'Add-Ons > Inline Tab >> General',
				title: 'Do not include commands in inline tab-completion.',
				component: 'setting-check-box'
			},
			changed: () => this.updateProviders()
		});

		this.settings.add('addon.inlinetab.no_mentions', {
			default: false,
			ui: {
				path: 'Add-Ons > Inline Tab >> General @{"description": "Please note that the built-in Twitch tab-completion will be used for content that is not included in inline tab-completion."}',
				title: 'Do not include users in inline tab-completion.',
				component: 'setting-check-box'
			},
			changed: () => this.updateProviders()
		});
	}

	onEnable() {
		this.input.ChatInput.on('mount', this.installInputHandler, this);

		this.input.ChatInput.ready((cls, instances) => {
			for(const inst of instances)
				this.installInputHandler(inst);
		});
	}

	onDisable() {
		this.input.ChatInput.off('mount', this.installInputHandler, this);

		for(const inst of this.input.ChatInput.instances) {
			this.uninstallInputHandler(inst);
		}
	}

	updateProviders(inst) {
		if ( ! inst ) {
			for(const inst of this.input.ChatInput.instances)
				this.updateProviders(inst);
			return;
		}

		const enabled = this.enabled || this.enabling;

		for(const provider of inst.autocompleteInputRef.providers) {
			let should_fix = enabled;
			if ( enabled ) {
				const type = provider.autocompleteType;
				if ( type === 'command' && this.settings.get('addon.inlinetab.no_commands') )
					should_fix = false;
				if ( type === 'mention' && this.settings.get('addon.inlinetab.no_mentions') )
					should_fix = false;
			}

			if ( should_fix ) {
				if ( ! provider.orig_getMatches )
					provider.orig_getMatches = provider.getMatches;

				provider.getMatches = () => null;

			} else {
				if ( provider.orig_getMatches )
					provider.getMatches = provider.orig_getMatches;
			}
		}
	}

	uninstallInputHandler(inst) {
		if ( ! inst[Installed] )
			return;

		inst.chatInputRef.removeEventListener('keydown', inst[Installed]);
		inst[Installed] = null;

		inst.chatInputRef.removeEventListener('focus', inst[Focus]);

		inst.ffztc_position = -1;
		inst.ffztc_parts = inst.ffztc_suggestions = null;

		this.updateProviders(inst);
	}

	installInputHandler(inst) {
		if ( ! (this.enabled || this.enabling) || inst[Installed] )
			return;

		const handler = inst[Installed] = this.handleKey.bind(this, inst);
		inst.chatInputRef.addEventListener('keydown', handler);

		const focus = inst[Focus] = this.handleFocus.bind(this, inst);
		inst.chatInputRef.addEventListener('focus', focus);

		inst.ffztc_position = -1;
		inst.ffztc_parts = inst.ffztc_suggestions = null;

		this.updateProviders(inst);
	}

	handleFocus(inst) {
		inst.ffztc_position = -1;
		inst.ffztc_parts = inst.ffztc_suggestions = null;
	}

	handleKey(inst, event) {
		if ( event.ctrlKey || event.altKey || ! inst.chatInputRef )
			return;

		const code = event.charCode || event.keyCode,
			current = inst.chatInputRef.value;

		if ( code === KEYS.Tab && current?.length > 0 ) {
			event.preventDefault();
			event.stopPropagation();
			event.stopImmediatePropagation();

			let pos = inst.ffztc_position,
				suggestions = inst.ffztc_suggestions;

			if ( pos === -1 ) {
				// First tab. Create initial state.

				// We need to isolate the word at the current
				// cursor location. Scanning forward and back
				// from the caret, find as much non-whitespace
				// as we can.
				const caret = inst.chatInputRef.selectionStart;
				if ( inst.chatInputRef.selectionEnd !== caret )
					return;

				// Technically we should probably check for a few
				// specific characters, including some punctuation,
				// but splitting by whitespace is much simpler.
				const start = /\S+$/.exec(current.slice(0, caret))?.index ?? caret,
					end = caret + (/^\S+/.exec(current.slice(caret))?.[0]?.length ?? 0);

				inst.ffztc_caret = caret;
				inst.ffztc_parts = [
					current.slice(0, start),
					current.slice(start, end),
					current.slice(end)
				];

				if ( ! inst.ffztc_parts[1] )
					return;

				inst.ffztc_suggestions = suggestions = [];

				for(const provider of inst.autocompleteInputRef.providers) {
					let token = inst.ffztc_parts[1];
					let prefix = '';

					const type = provider.autocompleteType;

					if ( type === 'command' && this.settings.get('addon.inlinetab.no_commands') )
						continue;

					if ( type === 'mention' ) {
						if ( this.settings.get('addon.inlinetab.no_mentions') )
							continue;

						// Only include an automatic prefix if not
						// entering a command.
						if ( inst.ffztc_parts[0][0] !== '/' || token[0] === '@' )
							prefix = '@';

						// The mention handler doesn't allow input to start with
						// an @ symbol when using tab.
						if ( token[0] === '@' )
							token = token.slice(1);
					}

					const out = provider.orig_getMatches(token, true, start);
					if ( Array.isArray(out) )
						for(const item of out) {
							const text = item.replacement;
							let idx = -1, length = 0;
							if ( item.selection ) {
								idx = text.indexOf(item.selection);
								if ( idx !== -1 )
									length = item.selection.length;
							}

							if ( idx !== -1 )
								idx += prefix.length;

							suggestions.push({
								t: prefix + text,
								s: idx === -1 ? null : [idx, length]
							});
						}
				}
			}

			if ( suggestions.length > 0 ) {
				pos += event.shiftKey ? -1 : 1;
				if ( pos >= suggestions.length )
					pos = 0;
				else if ( pos < 0 )
					pos = suggestions.length - 1;

				inst.ffztc_position = pos;

				const suggestion = suggestions[pos];
				if ( suggestion ) {
					const parts = inst.ffztc_parts,
						empty = parts[2].trim() === '';

					// If the completion includes a specific
					// selection, we select that. Otherwise
					// we just put the caret after our
					// tab-completion.
					let caret = parts[0].length;
					let end;

					if ( suggestion.s ) {
						caret += suggestion.s[0];
						end = caret + suggestion.s[1];
					} else {
						caret += suggestion.t.length + (empty ? 1 : 0);
						end = caret;
					}

					inst.autocompleteInputRef.setValue(parts[0] + suggestion.t + (empty && ! suggestion.s ? ' ' :  parts[2]));
					inst.chatInputRef.setSelectionRange(caret, end);
				}
			}

			return;

		} else if ( code === KEYS.Escape && inst.ffztc_position !== -1 ) {
			// Cancel tab-completion. Restore original input.
			// Delete our state.
			inst.autocompleteInputRef.setValue(inst.ffztc_parts.join(''));
			inst.chatInputRef.setSelectionRange(inst.ffztc_caret, inst.ffztc_caret);
			inst.ffztc_position = -1;
			inst.ffztc_parts = inst.ffztc_suggestions = null;

			event.preventDefault();
			event.stopPropagation();
			event.stopImmediatePropagation();
			return;
		}

		if ( code !== KEYS.Shift ) {
			// Any other key press means we accept tab-completion
			// and move on. Delete our state.
			inst.ffztc_position = -1;
			inst.ffztc_parts = inst.ffztc_suggestions = null;
		}
	}
}

InlineTab.register();
