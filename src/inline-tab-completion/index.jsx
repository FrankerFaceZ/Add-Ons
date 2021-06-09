'use strict';

const { createElement, setChildren } = FrankerFaceZ.utilities.dom;
const { KEYS } = FrankerFaceZ.utilities.constants;
const { Tooltip } = FrankerFaceZ.utilities.tooltip;

import STYLE_URL from './styles.scss';

const TYPES = {
	mention: 'Mention',
	emoji: 'Emoji',
	emote: 'Emote',
	command: 'Command'
};

const Installed = Symbol('KeyHandler');
const Focus = Symbol('FocusHandler');

class InlineTab extends Addon {
	constructor(...args) {
		super(...args);

		this.inject('i18n');
		this.inject('settings');
		this.inject('site.chat.input');
		this.inject('tooltips');
		this.inject('chat.emoji');

		this.settings.add('addon.inlinetab.tips', {
			default: true,
			ui: {
				path: 'Add-Ons > Inline Tab >> Appearance',
				title: 'Display a tooltip when using tab-completion.',
				component: 'setting-check-box'
			},
			changed: val => {
				if ( val )
					this.createTooltip();
				else
					this.destroyTooltip();
			}
		});

		this.settings.add('addon.inlinetab.tip-count', {
			default: false,
			ui: {
				path: 'Add-Ons > Inline Tab >> Appearance',
				title: 'Display multiple entries in the tab-completion tooltip.',
				component: 'setting-check-box'
			}
		});

		this.settings.add('addon.inlinetab.no_commands', {
			default: true,
			ui: {
				path: 'Add-Ons > Inline Tab >> Content @{"description": "Please note that the built-in Twitch tab-completion will be used for content that is not included in inline tab-completion."}',
				title: 'Do not include commands in inline tab-completion.',
				component: 'setting-check-box'
			},
			changed: () => this.updateProviders()
		});

		this.settings.add('addon.inlinetab.no_mentions', {
			default: false,
			ui: {
				path: 'Add-Ons > Inline Tab >> Content',
				title: 'Do not include users in inline tab-completion.',
				component: 'setting-check-box'
			},
			changed: () => this.updateProviders()
		});

		this.settings.add('addon.inlinetab.mention_prefix', {
			default: true,
			ui: {
				path: 'Add-Ons > Inline Tab >> General',
				title: 'Always prefix mentions with `@` signs.',
				component: 'setting-check-box'
			}
		});
	}

	onEnable() {
		this.input.ChatInput.on('mount', this.installInputHandler, this);

		this.input.ChatInput.ready((cls, instances) => {
			for(const inst of instances)
				this.installInputHandler(inst);
		});

		this.createStyle();
		this.createTooltip();
	}

	onDisable() {
		this.input.ChatInput.off('mount', this.installInputHandler, this);

		for(const inst of this.input.ChatInput.instances) {
			this.uninstallInputHandler(inst);
		}

		this.destroyStyle();
		this.destroyTooltip();
	}

	destroyStyle() {
		if ( this.style ) {
			this.style.remove();
			this.style = null;
		}
	}

	createStyle() {
		if ( this.style )
			return;

		this.style = createElement('link', {
			href: STYLE_URL,
			rel: 'stylesheet',
			type: 'text/css',
			crossOrigin: 'anonymous'
		});

		document.head.appendChild(this.style);
	}

	destroyTooltip() {
		if ( this.tt ) {
			this.tt.destroy();
			this.tt = null;
		}
	}

	createTooltip() {
		if ( this.tt )
			this.destroyTooltip();

		if ( ! this.settings.get('addon.inlinetab.tips') )
			return;

		const container = this.tooltips.getRoot();
		if ( ! container )
			return;

		this.tt = new Tooltip(
			container, [], {
				logger: this.log,
				i18n: this.i18n,
				manual: true,
				live: false,
				html: true,

				tooltipClass: 'ffz-action-balloon ffz-balloon tw-block tw-border tw-elevation-1 tw-border-radius-small tw-c-background-base',
				arrowClass: 'ffz-balloon__tail tw-overflow-hidden tw-absolute',
				arrowInner: 'ffz-balloon__tail-symbol tw-border-t tw-border-r tw-border-b tw-border-l tw-border-radius-small tw-c-background-base tw-absolute',
				innerClass: '',

				popper: {
					placement: 'top-start',
					modifiers: {
						preventOverflow: {
							boundariesElement: container
						},
						flip: {
							behavior: ['top', 'bottom', 'left', 'right']
						}
					}
				},

				content: (el, tip) => this.renderTooltip(el._ffz_inst, tip)
			}
		);
	}

	renderTooltip(inst) {
		if ( ! inst )
			return null;

		const suggestions = inst.ffztc_suggestions,
			pos = inst.ffztc_position,
			current = suggestions?.[pos];

		if ( ! current || ! suggestions )
			return null;

		const length = suggestions.length;
		if ( ! this.settings.get('addon.inlinetab.tip-count') || length === 1 )
			return this.renderItem(current, true, false, pos + 1, length);

		const out = [];

		// We want to display a sliding window, centered around the
		// current selection.
		const extra = Math.min(4, length - 1);
		let before = Math.min(pos, Math.ceil(extra / 2));
		const after = Math.min(length - (pos + 1), extra - before);
		const remaining = extra - (before + after);
		if ( remaining > 0 )
			before += remaining;

		for(let i=0-before; i <= after; i++) {
			const idx = pos + i;
			if ( idx >= 0 && idx < length ) {
				const current = idx === pos;

				out.push(this.renderItem(
					suggestions[idx],
					current,
					idx === 0,
					current ? pos + 1 : null,
					length));
			}
		}

		return (<div class="tw-flex tw-flex-column">{ out }</div>);
	}

	renderItem(item, is_current, is_first, pos, total) {
		const type = item.type;
		let text = item.label || item.text;
		let letter = null;

		if ( type === 'command' )
			letter = '/';
		else if ( type === 'mention' )
			letter = '@';

		const sel = item.sel;
		if ( sel ) {
			const start = sel[0],
				end = sel[0] + sel[1],

				prefix = text.slice(0, start),
				middle = text.slice(start, end),
				trail = text.slice(end);

			text = [
				prefix ? <span class="tw-strong">{ prefix }</span> : null,
				middle ? <span class="tw-c-text-alt">{ middle }</span> : null,
				trail ? <span class="tw-strong">{ trail }</span> : null
			];
		}

		let source = null;
		// TODO: Something nice for emotes.
		if ( type === 'emoji' && item.source ) {
			const cat = this.emoji.categories?.[item.source];
			if ( cat )
				source = this.i18n.t('tooltip.emoji', 'Emoji - {category}', {
					category: this.i18n.t(`emoji.category.${item.source.toSnakeCase()}`, cat)
				});
		}

		if ( ! source )
			source = this.i18n.t(`addon.inlinetab.type.${type}`, TYPES[type] || type);

		return (<div class={`ffztc-preview tw-flex${is_first ? ' ffztc-preview__first' : ''}${is_current ? ' ffztc-preview__current' : ''}`}>
			<div class="tw-relative tw-flex-shrink-0 ffztc-preview__image tw-flex tw-align-items-center tw-justify-content-center tw-mg-r-05">
				{item.srcSet ?
					<img srcSet={item.srcSet} />
					: letter ?
						<figure class="tw-c-text-alt-2 tw-strong tw-font-size-3">{letter}</figure>
						: null
				}
				{item.fav && <figure class="ffz--favorite ffz-i-star" />}
			</div>
			<div class="tw-flex-grow-1 tw-overflow-hidden">
				<div class="tw-ellipsis">
					{ Array.isArray(text) ? text : <span class="tw-strong">{text}</span> }
				</div>
				<div class="tw-flex tw-c-text-alt tw-font-size-8">
					<div class="tw-flex-grow-1">
						{ source }
					</div>
					{pos && total ? <div class="tw-flex-shrink-0 tw-mg-l-1">
						{ this.i18n.t('addon.inlinetab.item', '{pos,number} of {total,number}', {
							pos,
							total
						})}
					</div> : null}
				</div>
			</div>
		</div>)

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
				if ( ! provider.ffztc_getMatches )
					provider.ffztc_getMatches = provider.getMatches;

				provider.getMatches = () => null;

			} else {
				if ( provider.ffztc_getMatches )
					provider.getMatches = provider.ffztc_getMatches;
			}
		}
	}

	uninstallInputHandler(inst) {
		if ( ! inst[Installed] )
			return;

		inst.chatInputRef.removeEventListener('keydown', inst[Installed]);
		inst[Installed] = null;

		inst.chatInputRef.removeEventListener('focus', inst[Focus]);
		//inst.chatInputRef.removeEventListener('blur', inst[Focus]);

		this.clearAutocomplete(inst);
		this.updateProviders(inst);
	}

	installInputHandler(inst) {
		if ( ! (this.enabled || this.enabling) || inst[Installed] )
			return;

		const handler = inst[Installed] = this.handleKey.bind(this, inst);
		inst.chatInputRef.addEventListener('keydown', handler);

		const focus = inst[Focus] = this.clearAutocomplete.bind(this, inst);
		inst.chatInputRef.addEventListener('focus', focus);
		//inst.chatInputRef.addEventListener('blur', focus);

		inst.ffztc_position = -1;
		inst.ffztc_parts = inst.ffztc_suggestions = null;

		this.updateProviders(inst);
	}

	clearAutocomplete(inst) {
		inst.ffztc_position = -1;
		inst.ffztc_parts = inst.ffztc_suggestions = null;

		if ( this.tt )
			this.tt._exit(inst.chatInputRef);

		inst.chatInputRef._ffz_inst = null;
	}

	buildSuggestions(providers, input, start, is_command = false) {
		const suggestions = [];

		for(const provider of providers) {
			let token = input;
			let prefix = '';
			let type = provider.autocompleteType;

			if ( type === 'command' && this.settings.get('addon.inlinetab.no_commands') )
				continue;

			if ( type === 'mention' ) {
				if ( this.settings.get('addon.inlinetab.no_mentions') )
					continue;

				// If we have a manual @ or if we want auto-prefixing, set
				// the prefix to an @.
				if ( token[0] === '@' || (! is_command && this.settings.get('addon.inlinetab.mention_prefix')) )
					prefix = '@';

				// We need to slice the @ off our input to get the mention handler
				// to work as expected.
				if ( token[0] === '@' )
					token = token.slice(1);
			}

			const out = provider.ffztc_getMatches(token, true, start);
			if ( Array.isArray(out) )
				for(const item of out) {
					const text = item.replacement;
					let label, idx = -1, length = 0;
					if ( item.selection ) {
						idx = text.indexOf(item.selection);
						if ( idx !== -1 )
							length = item.selection.length;
					}

					if ( idx !== -1 )
						idx += prefix.length;

					let srcSet = item.srcSet, source, extra;
					if ( item.emoji ) {
						type = 'emoji';
						source = item.emoji.category;
						label = item.matched || `:${item.emoji.names[0]}:`;

					} else if ( item.emote ) {
						srcSet = item.emote.srcSet;
						source = item.emote.source;
						extra = item.emote.extra;
					}

					suggestions.push({
						type,
						source,
						extra,
						label,
						text,
						sel: idx === -1 ? null : [idx, length],
						fav: item.favorite,
						srcSet
					});
				}
		}

		return suggestions;
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

				inst.ffztc_suggestions = suggestions = this.buildSuggestions(
					inst.autocompleteInputRef.providers,
					inst.ffztc_parts[1],
					start,
					inst.ffztc_parts[0][0] === '/'
				);
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

					if ( suggestion.sel ) {
						caret += suggestion.sel[0];
						end = caret + suggestion.sel[1];
					} else {
						caret += suggestion.text.length + (empty ? 1 : 0);
						end = caret;
					}

					inst.autocompleteInputRef.setValue(parts[0] + suggestion.text + (empty && ! suggestion.sel ? ' ' :  parts[2]));
					inst.chatInputRef.setSelectionRange(caret, end);

					if ( this.tt ) {
						inst.chatInputRef._ffz_inst = inst;
						const tip = inst.chatInputRef[this.tt._accessor];
						if ( tip ) {
							setChildren(tip.element, this.renderTooltip(inst, tip));
							tip.update();
						} else
							this.tt._enter(inst.chatInputRef);
					}
				}
			}

			return;

		} else if ( code === KEYS.Escape && inst.ffztc_position !== -1 ) {
			// Cancel tab-completion. Restore original input.
			// Delete our state.
			inst.autocompleteInputRef.setValue(inst.ffztc_parts.join(''));
			inst.chatInputRef.setSelectionRange(inst.ffztc_caret, inst.ffztc_caret);
			this.clearAutocomplete(inst);

			event.preventDefault();
			event.stopPropagation();
			event.stopImmediatePropagation();
			return;
		}

		if ( code !== KEYS.Shift ) {
			// Any other key press means we accept tab-completion
			// and move on. Delete our state.
			this.clearAutocomplete(inst);
		}
	}
}

InlineTab.register();
