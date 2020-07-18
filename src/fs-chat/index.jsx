import displace from 'displacejs';
import STYLE_URL from './styles.scss';

const {createElement, ManagedStyle} = FrankerFaceZ.utilities.dom;
const Color = FrankerFaceZ.utilities.color.Color;

const STYLE_VALIDATOR = <span />;

class FSChat extends Addon {
	constructor(...args) {
		super(...args);

		this.inject('site.fine');
		this.inject('site.player');
		this.onFSChange = this.onFSChange.bind(this);

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
				path: 'Add-Ons > FS Chat >> Appearance',
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
				path: 'Add-Ons > FS Chat >> Appearance',
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

		this.chat = null;
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

		this.settings.addFilter('fschat', {
			createTest(config) {
				return ctx => ctx.fschat === config
			},

			title: 'Using FS Chat',
			i18n: 'addon.fs-chat.using',

			default: true,
			editor: this.settings.getFilterBasicEditor()
		});

		if ( this.settings.get('addon.fs-chat.automatic') )
			this.turnOn();

		this.updateButtons();
	}

	updateCSS() {
		const blur = this.settings.get('addon.fs-chat.bg.blur');
		if ( blur > 0 )
			this.style.set('blur', `.ffz--fschat .channel-root__right-column > div { backdrop-filter: blur(${blur}px); }`);
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

			let handle;

			this.chat = (<div class={`ffz--fschat${this.settings.get('addon.fs-chat.minimal') ? ' minimal' : ''} ${this.dark ? 'tw-root--theme-dark' : 'tw-root--theme-light'}`}>
				{handle = <div class="handle ffz-i-move" />}
				{this.chat_pane}
			</div>);

			if ( this.settings.provider.has('fschat.top') ) {
				this.chat.style.position = 'absolute';
				this.chat.style.top = this.settings.provider.get('fschat.top');
				this.chat.style.left = this.settings.provider.get('fschat.left');

				this.checkConstraints();
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

			if ( area.right > boundary.right )
				this.chat.style.left = `${boundary.right - area.width}px`;

			if ( area.bottom > boundary.bottom )
				this.chat.style.top = `${boundary.bottom - area.height}px`;

			if ( area.left < 0 )
				this.chat.style.left = '0px';

			if ( area.top < 0 )
				this.chat.style.top = '0px';
		})
	}

	turnOff() {
		if ( this.chat_mover ) {
			this.chat_mover.destroy();
			this.chat_mover = null;
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
		if ( ! document.fullscreenElement )
			this.turnOff();
		else if ( this.settings.get('addon.fs-chat.automatic') )
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
			cont = (<div class="ffz--player-fschat tw-inline-flex tw-relative tw-tooltip-wrapper">
				{btn = (<button
					class="tw-align-items-center tw-align-middle tw-border-bottom-left-radius-medium tw-border-bottom-right-radius-medium tw-border-top-left-radius-medium tw-border-top-right-radius-medium tw-button-icon tw-button-icon--overlay tw-core-button tw-core-button--border tw-core-button--overlay tw-inline-flex tw-interactive tw-justify-content-center tw-overflow-hidden tw-relative"
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
				{tip = (<div class="tw-tooltip tw-tooltip--align-right tw-tooltip--up" role="tooltip" />)}
			</div>);

			const thing = container.querySelector('button[data-a-target="player-fullscreen-button"]');
			if ( thing ) {
				container.insertBefore(cont, thing.parentElement);
			} else
				container.appendChild(cont);

		} else {
			icon = cont.querySelector('figure');
			btn = cont.querySelector('button');
			tip = cont.querySelector('.tw-tooltip');
		}

		const active = this.chat != null,
			label = active ?
				this.i18n.t('addon.fs-chat.button.active', 'Disable FS Chat') :
				this.i18n.t('addon.fs-chat.button.inactive', 'FS Chat');

		icon.classList.toggle('ffz-i-chat-empty', ! active);
		icon.classList.toggle('ffz-i-chat', active);

		btn.setAttribute('aria-label', label);
		tip.textContent = label;
	}

	onButtonClick(inst, e) {
		this.log.info('button-click', inst, e);

		if ( this.chat )
			this.turnOff();
		else
			this.turnOn();

		this.updateButton(inst);
	}

}

FSChat.register();