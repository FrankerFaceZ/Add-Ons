import displace from 'displacejs';
import STYLE_URL from './styles.scss';

const {createElement, ManagedStyle} = FrankerFaceZ.utilities.dom;
const Color = FrankerFaceZ.utilities.color.Color;

const STYLE_VALIDATOR = <span />,
	SUPPORTS_BLUR = window.CSS?.supports?.('backdrop-filter:blur(1px)');

const BAD_SHORTCUTS = [
	'f',
	'space',
	'k',
	'shift+up',
	'shift+down',
	'esc',
	'm',
	'?',
	'alt+t',
	'alt+x'
];

function isValidShortcut(key) {
	if ( ! key )
		return false;

	key = key.toLowerCase().trim();
	return ! BAD_SHORTCUTS.includes(key);
}

class FSChat extends Addon {
	constructor(...args) {
		super(...args);

		this.inject('site.fine');
		this.inject('site.player');
		this.inject('site.web_munch');

		this.onFSChange = this.onFSChange.bind(this);
		this.onShortcut = this.onShortcut.bind(this);

		this.settings.addFilter('fschat', {
			createTest(config) {
				return ctx => ctx.fschat === config
			},

			title: 'Using FS Chat',
			i18n: 'addon.fs-chat.using',

			default: true,
			editor: this.settings.getFilterBasicEditor()
		});

		this.settings.add('addon.fs-chat.shortcut', {
			default: 'alt+c',
			ui: {
				path: 'Add-Ons > FS Chat >> Behavior',
				title: 'Shortcut Key',
				description: 'This key sequence can be used to toggle FS Chat when in fullscreen.',
				component: 'setting-hotkey'
			},
			changed: () => {
				this.updateShortcut();
				this.updateButtons();
			}
		});

		this.settings.add('addon.fs-chat.automatic', {
			default: false,
			ui: {
				path: 'Add-Ons > FS Chat >> Behavior',
				title: 'Automatically open FS Chat when entering fullscreen.',
				component: 'setting-check-box'
			}
		});

		this.settings.add('addon.fs-chat.bg.color', {
			default: 'rgba(0,0,0,0.50)',
			ui: {
				path: 'Add-Ons > FS Chat >> Appearance',
				title: 'Background Color',
				component: 'setting-color-box',
				alpha: true
			},
			changed: () => this.updateCSS()
		})

		if ( SUPPORTS_BLUR )
			this.settings.add('addon.fs-chat.bg.blur', {
				default: 5,
				ui: {
					path: 'Add-Ons > FS Chat >> Appearance',
					title: 'Background Blur',
					description: '**Note:** Blur may cause performance issues depending on your browser and PC specs.',
					component: 'setting-select-box',
					data: [
						{value: 0, title: 'Disabled'},
						{value: 2, title: 'Minor (2px)'},
						{value: 5, title: 'Normal (5px)'},
						{value: 10, title: 'Large (10px)'},
						{value: 50, title: 'Extreme (50px)'}
					]
				},
				changed: () => this.updateCSS()
			});

		this.settings.add('addon.fs-chat.height', {
			default: null,
			ui: {
				path: 'Add-Ons > FS Chat >> Size and Position',
				title: 'Height',
				description: 'How tall FS Chat should be, in pixels. If you know CSS, you can enter a different unit.',
				component: 'setting-text-box'
			},
			changed: () => this.updateCSS()
		});

		this.settings.add('addon.fs-chat.width', {
			default: null,
			requires: ['chat.width'],
			process(ctx, val) {
				if ( ! val )
					return ctx.get('chat.width');

				return val;
			},
			ui: {
				path: 'Add-Ons > FS Chat >> Size and Position',
				title: 'Width',
				description: 'How wide FS Chat should be, in pixels. Defaults to normal chat width. If you know CSS, you can enter a different unit.',
				component: 'setting-text-box'
			},
			changed: () => this.updateCSS()
		});

		this.settings.add('addon.fs-chat.minimal', {
			default: true,
			ui: {
				path: 'Add-Ons > FS Chat >> Appearance',
				sort: 999,
				title: 'Minimal Mode',
				component: 'setting-check-box',
				description: 'This hides the chat header and input buttons when FS Chat is open.'
			},
			changed: val => this.chat && this.chat.classList.toggle('minimal', val)
		});

		this.settings.add('addon.fs-chat.no-input', {
			default: false,
			ui: {
				path: 'Add-Ons > FS Chat >> Appearance',
				sort: 1000,
				title: 'Do not display chat input.',
				component: 'setting-check-box'
			},
			changed: val => this.chat && this.chat.classList.toggle('no-input', val)
		});

		this.settings.add('addon.fs-chat.round', {
			default: true,
			ui: {
				path: 'Add-Ons > FS Chat >> Appearance',
				title: 'Use rounded corners.',
				component: 'setting-check-box'
			},
			changed: val => this.chat && this.chat.classList.toggle('no-rounding', ! val)
		});

		this.settings.add('addon.fs-chat.metadata', {
			default: 2,
			ui: {
				path: 'Add-Ons > FS Chat >> Appearance',
				title: 'Metadata Position',
				component: 'setting-select-box',
				data: [
					{value: 0, title: 'Disabled'},
					{value: 1, title: 'Above Chat'},
					{value: 2, title: 'Below Chat'}
				]
			},
			changed: () => {
				if ( this.chat ) {
					this.turnOff();
					this.turnOn();
				}
			}
		});

		this.chat = null;
		this.handle_right = false;
		this.style = new ManagedStyle;
		this.style_link = null;
	}

	onEnable() {
		if ( ! this.style_link )
			document.head.appendChild(this.style_link = createElement('link', {
				href: STYLE_URL,
				rel: 'stylesheet',
				type: 'text/css',
				crossOrigin: 'anonymous'
			}));

		this.updateCSS();

		window.addEventListener('fullscreenchange', this.onFSChange);
		this.on('site.player:update-gui', this.updateButton, this);

		if ( this.settings.get('addon.fs-chat.automatic') )
			this.turnOn();

		this.updateButtons();
		this.updateShortcut();
	}

	updateShortcut() {
		const Mousetrap = this.Mousetrap = this.Mousetrap || this.web_munch.getModule('mousetrap') || window.Mousetrap;
		if ( ! Mousetrap || ! Mousetrap.bind )
			return;

		if ( this._shortcut_bound ) {
			Mousetrap.unbind(this._shortcut_bound);
			this._shortcut_bound = null;
		}

		const key = this.settings.get('addon.fs-chat.shortcut');
		if ( key && isValidShortcut(key) ) {
			Mousetrap.bind(key, this.onShortcut);
			this._shortcut_bound = key;
		}
	}

	onShortcut() {
		if ( ! document.fullscreenElement )
			return;

		if ( this.chat )
			this.turnOff();
		else
			this.turnOn();

		this.updateButtons();
	}

	updateCSS() {
		const blur = SUPPORTS_BLUR ? this.settings.get('addon.fs-chat.bg.blur') : 0;
		if ( blur > 0 )
			this.style.set('blur', `.ffz--fschat .ffz--meta-tray,.ffz--fschat .channel-root__right-column > div { backdrop-filter: blur(${blur}px); }`);
		else
			this.style.delete('blur');

		STYLE_VALIDATOR.style.width = '';
		STYLE_VALIDATOR.style.height = '';

		let height = this.settings.get('addon.fs-chat.height') || '',
			width = this.settings.get('addon.fs-chat.width') || '340';

		if ( /^\d+$/.test(height) )
			height = `${height}px`;

		if ( /^\d+$/.test(width) )
			width = `${width}px`;

		STYLE_VALIDATOR.style.width = width;
		STYLE_VALIDATOR.style.height = height;

		width = STYLE_VALIDATOR.style.width || '340px';
		height = STYLE_VALIDATOR.style.height || '50vh';

		this.style.set('size', `.ffz--fschat {
	width: ${width};
	height: ${height};
}`)

		let bg = Color.RGBA.fromCSS(this.settings.get('addon.fs-chat.bg.color'));
		if ( ! bg )
			bg = Color.RGBA.fromCSS('rgba(0,0,0,0.75)');

		const hsla = bg.toHSLA(),
			luma = hsla.l;

		this.dark = luma < 0.5;
		if ( this.chat ) {
			this.settings.updateContext({'force-theme': this.dark});
			this.chat.classList.toggle('tw-root--theme-dark', this.dark);
			this.chat.classList.toggle('tw-root--theme-light', ! this.dark);
		}

		this.style.set('color', `.ffz--fschat {
	--fschat-bg-color: ${bg.toCSS()};
}`);
	}

	turnOn() {
		if ( document.fullscreenElement && ! this.chat ) {
			this.chat_pane = document.querySelector('.channel-root__right-column');
			if ( ! this.chat_pane )
				return;

			this.old_parent = this.chat_pane.parentNode;
			this.chat_pane.remove();

			let meta = this.settings.get('addon.fs-chat.metadata');
			if ( meta !== 0 ) {
				this.meta_pane = document.querySelector('.ffz--meta-tray');
				if ( this.meta_pane ) {
					this.meta_parent = this.meta_pane.parentNode;
					this.meta_pane.remove();
				} else
					meta = 0;
			}

			let handle;

			this.chat = (<div class={`ffz--fschat meta-${meta}${this.settings.get('addon.fs-chat.round') ? '' : ' no-rounding'} ${this.settings.get('addon.fs-chat.no-input') ? ' no-input' : ''}${this.settings.get('addon.fs-chat.minimal') ? ' minimal' : ''} ${this.dark ? 'tw-root--theme-dark' : 'tw-root--theme-light'} tw-c-text-base ${this.handle_right ? 'handle--right' : ''}`}>
				{handle = <div class="handle ffz-i-move" />}
				{this.chat_pane}
				{this.meta_pane}
			</div>);

			this.chat.addEventListener('mouseout', () => this.checkHandle());

			if ( this.settings.provider.has('fschat.top') ) {
				this.chat.style.position = 'absolute';
				this.chat.style.top = this.settings.provider.get('fschat.top');
				this.chat.style.left = this.settings.provider.get('fschat.left');

				this.checkConstraints();
				this.checkHandle();
			}

			document.fullscreenElement.appendChild(this.chat);

			const savePos = () => {
				const top = this.chat.style.top,
					left = this.chat.style.left;

				this.settings.provider.set('fschat.top', top);
				this.settings.provider.set('fschat.left', left);
			}

			this.chat_mover = displace(this.chat, {
				handle,
				constrain: true,
				onMouseUp: savePos,
				onTouchStop: savePos
			});

			this.settings.updateContext({
				fschat: true,
				'force-theme': this.dark
			});

			if ( ! this.scroll_frame )
				this.scroll_frame = requestAnimationFrame(() => {
					this.scroll_frame = null;
					const scroller = this.chat && this.chat.querySelector('.simplebar-scroll-content');
					if ( scroller )
						scroller.scrollTop = scroller.scrollHeight;
				});
		}
	}

	checkConstraints() {
		if ( this._checker )
			cancelAnimationFrame(this._checker);

		this._checker = requestAnimationFrame(() => {
			this._checker = null;
			if ( ! this.chat || ! document.fullscreenElement )
				return;

			const boundary = document.fullscreenElement.getBoundingClientRect(),
				area = this.chat.getBoundingClientRect();

			if ( area.right > boundary.right ) {
				this.chat.style.left = `${boundary.right - area.width}px`;
				this.checkHandle();
			}

			if ( area.bottom > boundary.bottom )
				this.chat.style.top = `${boundary.bottom - area.height}px`;

			if ( area.left < 0 ) {
				this.chat.style.left = '0px';
				this.checkHandle();
			}

			if ( area.top < 0 )
				this.chat.style.top = '0px';
		})
	}

	checkHandle() {
		if ( this._handle_checker )
			cancelAnimationFrame(this._handle_checker);

		this._handle_checker = requestAnimationFrame(() => {
			this._handle_checker = null;
			if ( ! this.chat || ! document.fullscreenElement )
				return;

			const boundary = document.fullscreenElement.getBoundingClientRect(),
				area = this.chat.getBoundingClientRect();

			if ( this.handle_right && area.right >= (boundary.right - 40) )
				this.handle_right = false;
			else if ( ! this.handle_right && area.left <= (boundary.left + 40) )
				this.handle_right = true;

			this.chat.classList.toggle('handle--right', this.handle_right);
		});
	}


	turnOff() {
		if ( this.chat_mover ) {
			this.chat_mover.destroy();
			this.chat_mover = null;
		}

		if ( this.meta_pane ) {
			this.meta_pane.remove();
			this.meta_parent.appendChild(this.meta_pane);
			this.meta_pane = this.meta_parent = null;
		}

		if ( this.chat ) {
			this.chat.remove();
			this.chat_pane.remove();
			this.old_parent.appendChild(this.chat_pane);
			this.old_parent = this.chat = this.chat_pane = null;
		}

		this.settings.updateContext({
			fschat: false,
			'force-theme': null
		});
	}

	onFSChange() {
		if ( ! document.fullscreenElement ) {
			this.was_active = !! this.chat;
			this.turnOff();
		} else if ( this.was_active || this.settings.get('addon.fs-chat.automatic') )
			this.turnOn();

		this.updateButtons();
	}

	updateButtons() {
		for(const inst of this.player.Player.instances)
			this.updateButton(inst);
	}

	updateButton(inst) {
		const outer = inst.props.containerRef || this.fine.getChildNode(inst),
			is_fs = (this.enabled || this.enabling) && document.fullscreenElement?.contains?.(outer),
			container = outer?.querySelector?.('.player-controls__right-control-group');

		if ( ! container )
			return;

		const can_chat = this.chat || document.querySelector('.channel-root__right-column') != null;

		let icon, tip, btn, cont = container.querySelector('.ffz--player-fschat');
		if ( ! is_fs || ! can_chat ) {
			if ( cont )
				cont.remove();
			return;
		}

		if ( ! cont ) {
			cont = (<div class="ffz--player-fschat tw-inline-flex tw-relative ffz-il-tooltip__container">
				{btn = (<button
					class="tw-align-items-center tw-align-middle tw-border-bottom-left-radius-medium tw-border-bottom-right-radius-medium tw-border-top-left-radius-medium tw-border-top-right-radius-medium tw-button-icon tw-button-icon--overlay ffz-core-button ffz-core-button--border ffz-core-button--overlay tw-inline-flex tw-interactive tw-justify-content-center tw-overflow-hidden tw-relative"
					type="button"
					data-a-target="ffz-player-fschat-button"
					onClick={this.onButtonClick.bind(this, inst)} // eslint-disable-line react/jsx-no-bind
				>
					<div class="tw-align-items-center tw-flex tw-flex-grow-0">
						<div class="tw-button-icon__icon">
							{icon = (<figure class="ffz-player-icon" />)}
						</div>
					</div>
				</button>)}
				{tip = (<div class="ffz-il-tooltip ffz-il-tooltip--align-right ffz-il-tooltip--up" role="tooltip" />)}
			</div>);

			const thing = container.querySelector('button[data-a-target="player-fullscreen-button"]');
			if ( thing ) {
				container.insertBefore(cont, thing.parentElement);
			} else
				container.appendChild(cont);

		} else {
			icon = cont.querySelector('figure');
			btn = cont.querySelector('button');
			tip = cont.querySelector('.ffz-il-tooltip');
		}

		const active = this.chat != null;
		let label = active ?
			this.i18n.t('addon.fs-chat.button.active', 'Disable FS Chat') :
			this.i18n.t('addon.fs-chat.button.inactive', 'FS Chat');

		const key = this.settings.get('addon.fs-chat.shortcut');
		if ( key && isValidShortcut(key) )
			label = `${label} (${key})`;

		icon.classList.toggle('ffz-i-chat-empty', ! active);
		icon.classList.toggle('ffz-i-chat', active);

		btn.setAttribute('aria-label', label);
		tip.textContent = label;
	}

	onButtonClick(inst, e) {
		if ( this.chat )
			this.turnOff();
		else
			this.turnOn();

		this.updateButton(inst);
	}

}

FSChat.register();