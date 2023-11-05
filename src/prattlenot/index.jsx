'use strict';

const {createElement, on, off} = FrankerFaceZ.utilities.dom;
const {has, deep_copy} = FrankerFaceZ.utilities.object;
const {Color} = FrankerFaceZ.utilities.color;

import STYLE_URL from './styles.scss';

/*import { UNICODE_SCRIPTS, UNICODE_CATEGORIES } from './constants';

let invalid = [];
for(const [key,val] of Object.entries(UNICODE_CATEGORIES)) {
	try {
		new RegExp(`\\p{${key}}`, 'u');
	} catch {
		invalid.push(val);
	}
}
if ( invalid.length )
	console.log('Invalid Categories: ', invalid.join(', '));

invalid = [];
for(const script of UNICODE_SCRIPTS) {
	try {
		new RegExp(`\\p{Script=${script}}`, 'u');
	} catch {
		invalid.push(script);
	}
}
if ( invalid.length )
	console.log('Invalid scripts: ', invalid.join(', '));*/

import * as RULES from './rules';
import Logic from './logic';

class PrattleNot extends Addon {
	constructor(...args) {
		super(...args);

		this.toggleEnabled = this.toggleEnabled.bind(this);

		this.inject('chat');
		this.inject('settings');
		this.inject('i18n');
		this.inject('site.fine');
		
		this.register('logic', Logic, true);

		const positions = [
			{value: 0, i18n_key: 'pn.position.top', title: 'Top'},
			{value: 1, i18n_key: 'pn.position.bottom', title: 'Bottom'},
			{value: 2, i18n_key: 'pn.position.left', title: 'Left'},
			{value: 3, i18n_key: 'pn.position.right', title: 'Right'}
		];

		const sizes = [];
		for(let i = 0; i <= 100; i += 5)
			sizes.push({value: i, i18n_key: 'pn.size.entry', title: `{value,number}%`});

		this.settings.add('pn.enabled', {
			default: false,
			ui: {
				path: 'Add-Ons > PrattleNot >> Behavior',
				title: 'Enable by Default',
				description: 'When this is enabled, PrattleNot will be enabled by default. Otherwise, you will need to manually enable it as desired.',
				component: 'setting-check-box'
			}
		});

		this.settings.add('pn.scrollback', {
			default: 20,
			ui: {
				path: 'Add-Ons > PrattleNot >> Behavior',
				title: 'Scrollback Length',
				description: 'Keep up to this many lines in Prattle. Setting this too high will create lag.',
				component: 'setting-text-box',
				process: 'to_int',
				bounds: [1]
			}
		});

		this.settings.add('pn.position', {
			default: 0,
			ui: {
				path: 'Add-Ons > PrattleNot >> Position',
				title: 'Position',
				component: 'setting-select-box',
				data: positions
			}
		});

		this.settings.add('pn.size', {
			default: 30,
			ui: {
				path: 'Add-Ons > PrattleNot >> Position',
				title: 'Size',
				component: 'setting-select-box',
				data:  sizes
			}
		});

		this.settings.add('pn.portrait-position', {
			default: 2,
			ui: {
				path: 'Add-Ons > PrattleNot >> Position (Portrait Mode)',
				title: 'Position',
				component: 'setting-select-box',
				data: positions
			}
		});

		this.settings.add('pn.portrait-size', {
			default: 30,
			ui: {
				path: 'Add-Ons > PrattleNot >> Position (Portrait Mode)',
				title: 'Size',
				component: 'setting-select-box',
				data:  sizes
			}
		});

		this.settings.add('pn.active-size', {
			requires: ['layout.use-portrait', 'pn.portrait-size', 'pn.size'],
			process(ctx) {
				if (ctx.get('layout.use-portrait'))
					return ctx.get('pn.portrait-size');
				return ctx.get('pn.size');
			}
		});

		this.settings.add('pn.active-position', {
			requires: ['layout.use-portrait', 'pn.portrait-position', 'pn.position'],
			process(ctx) {
				if (ctx.get('layout.use-portrait'))
					return ctx.get('pn.portrait-position');
				return ctx.get('pn.position');
			}
		});

		this.settings.add('pn.background', {
			default: null,
			ui: {
				path: 'Add-Ons > PrattleNot >> Appearance',
				title: 'Background Color',
				description: 'An optional, simple background color to use for the prattle log to better differentiate it from normal chat.',
				component: 'setting-color-box'
			}
		});

		this.settings.add('pn.show-reason', {
			default: false,
			ui: {
				path: 'Add-Ons > PrattleNot >> Appearance',
				title: 'Show Matching Filters',
				description: 'When this is enabled, the rules that match a given chat message are logged and displayed to help you tweak your rules.',
				component: 'setting-check-box'
			}
		});

		this.settings.add('pn.show-badges', {
			default: true,
			ui: {
				path: 'Add-Ons > PrattleNot >> Appearance',
				title: 'Show Badges',
				component: 'setting-check-box'
			}
		});

		this.settings.add('pn.timestamps', {
			default: null,
			requires: ['context.chat.showTimestamps'],
			process(ctx, val) {
				if ( val === null )
					return ctx.get('context.chat.showTimestamps')
				return val;
			},
			ui: {
				path: 'Add-Ons > PrattleNot >> Appearance',
				title: 'Show Timestamps',
				component: 'setting-check-box'
			}
		});

		this.settings.add('pn.threshold', {
			default: 1,
			ui: {
				path: 'Add-Ons > PrattleNot >> Behavior',
				title: 'Threshold',
				description: 'A score higher than this value will cause a message to be flagged.',
				component: 'setting-text-box',
				process: 'to_int'
			}
		});

		this.settings.add('pn.rules', {
			default: [
				{v: {type: 'badges', data:{
					critical: true,
					score: -100,
					badges: [
						'broadcaster',
						'moderator',
						'admin',
						'vip',
						'extension',
						'twitchbot',
						'global_mod'
					]
				}}},
				{v: {type: 'cheer', data:{
					critical: false,
					score: -100,
					min_bits: 1
				}}},
				{v: {type: 'emote_only', data: {
					score: 100,
					critical: false,
					max_emotes: 5
				}}},
				{v: {type: 'uppercase', data: {
					score: 10,
					critical: false,
					threshold: 0.3
				}}},
				{v: {type: 'spam', data: {
					score: 20,
					critical: false
				}}},
				{v: {type: 'unicode', data: {
					score: 3,
					critical: false,
					threshold: 0.3,
					terms: [
						{t: 'cat', v: 'Letter'},
						{t: 'cat', v: 'Number'},
						{t: 'cat', v: 'Punctuation'},
						{t: 'cat', v: 'Separator'}
					]
				}}},
				{v: {type: 'splitting', data: {
					score: 10,
					critical: false,
					limit: 5
				}}},
				{v: {type: 'repeated_message', data: {
					score: 100,
					critical: false,
					hash_count: 50,
					leven_count: 100,
					leven_score: 0.3
				}}},
				{v: {type: 'repeated_words', data: {
					score: 3,
					critical: false
				}}}
			],

			type: 'array_merge',
			inherit_default: true,

			ui: {
				path: 'Add-Ons > PrattleNot >> Rules @{"description": "Rules allow you to define a series of conditions under which PrattleNot will flag a message as prattle, or spam, and display it separately from more valuable chat messages."}',
				component: 'setting-filter-editor',
				data: () => deep_copy(this.rules),
				test_context: () => ({
					source: {
						bits: 0,
						badges: {},
						text: 'This is a test.'
					}
				})
			}
		});

		this.rules = {};
		for(const key in RULES)
			if ( has(RULES, key) )
				this.rules[key] = RULES[key];

		this.set_enabled = null;

		this.ChatInput = this.fine.define('chat-input');

		this.logic.on(':enabled', this.updateButtons, this);
		this.logic.on(':disabled', this.updateButtons, this);
	}

	onEnable() {
		if ( ! this.style_link )
			document.head.appendChild(this.style_link = createElement('link', {
				href: STYLE_URL,
				rel: 'stylesheet',
				type: 'text/css',
				crossOrigin: 'anonymous'
			}));

		this.chat.context.on('changed:pn.enabled', this.checkEnabled, this);
		this.checkEnabled();

		this.ChatInput.on('mount', this.updateButton, this);
		this.ChatInput.on('update', this.updateButton, this);

		this.updateButtons();
	}

	async onDisable() {
		await this.logic.disable();

		if ( this.style_link ) {
			this.style_link.remove();
			this.style_link = null;
		}

		for(const inst of this.ChatInput.instances)
			this.removeButton(inst);

		this.ChatInput.off('mount', this.updateButton, this);
		this.ChatInput.off('update', this.updateButton, this);
	}

	checkEnabled() {
		const enabled = this.set_enabled ?? this.chat.context.get('pn.enabled');

		if (enabled && ! this.logic.enabled )
			this.logic.enable();
		else if (!enabled && this.logic.enabled )
			this.logic.disable();
	}

	updateButtons() {
		if ( this.ChatInput ) {
			if ( this.enabling || this.enabled ) {
				for(const inst of this.ChatInput.instances)
					this.updateButton(inst);
			}
		}
	}

	toggleEnabled() {
		this.set_enabled = ! this.logic.enabled;
		this.checkEnabled();
	}
	
	updateButton(inst) {
		const node = this.fine.getHostNode(inst);
		if ( ! node )
			return;

		if ( ! inst._ffz_pn_button ) {
			inst._ffz_pn_button = (<div
				class="tw-relative ffz-il-tooltip__container"
			>
				<button
					class={`tw-border-radius-medium tw-button-icon--primary ffz-core-button tw-inline-flex tw-interactive tw-justify-content-center tw-overflow-hidden tw-relative tw-button-icon`}
					onclick={this.toggleEnabled}
				>
					<span class="tw-button-icon__icon">
						{inst._ffz_pn_icon = (<figure class="ffz-i-zreknarf" />)}
					</span>
				</button>
				<div class="ffz-il-tooltip ffz-il-tooltip--up ffz-il-tooltip--align-right">
					{this.i18n.t('addon.pn.button.title', 'Toggle PrattleNot')}
					{inst._ffz_pn_enabled_tip = (<div></div>)}
				</div>
			</div>);
		}

		if ( ! node.contains(inst._ffz_pn_button) ) {
			const container = node.querySelector('.chat-input__buttons-container > div:last-child');
			if (container)
				container.insertBefore(inst._ffz_pn_button, container.firstChild);
		}

		inst._ffz_pn_icon.className = this.logic.enabled
			? 'ffz-i-chat'
			: 'ffz-i-chat-empty';

		inst._ffz_pn_enabled_tip.classList.toggle('tw-mg-t-1', this.logic.enabled);
		inst._ffz_pn_enabled_tip.textContent = this.logic.enabled
			? this.i18n.t('addon.pn.button.enabled', 'PrattleNot is currently enabled. Click to disable.')
			: null;
	}

	removeButton(inst) {
		if ( inst._ffz_pn_button ) {
			inst._ffz_pn_button.remove();
			inst._ffz_pn_button = null;
			inst._ffz_pn_enabled_tip = null;
		}
	}

}

PrattleNot.register();