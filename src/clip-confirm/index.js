'use strict';

import CSS_URL from './style.css';

class ClipConfirm extends Addon {
	constructor(...args ) {
		super(...args );

		this.clipConfirmCSS = document.createElement( 'link' );

		this.clipConfirmCSS.rel  = 'stylesheet';
		this.clipConfirmCSS.id   = 'ffz-clip-confirm-css';
		this.clipConfirmCSS.href = CSS_URL;

		this.inject( 'site.player' );

		this.settingsNamespace    = 'addon.clip-confirm';
		this.rightControls        = document.querySelector( this.player.RIGHT_CONTROLS );
		this.clipConfirmed        = false;
		this.keyNames             = {
			ctrl:  'Ctrl / ⌘',
			alt:   'Alt / Option',
			shift: 'Shift'
		};
		this.hotkeyName           = '';

		/* 
		 * Since the following methods are called as event listeners using
		 * bind() I have to make new references to them here so that they
		 * can be properly removed when the add-on is disabled
		 */
		this.eventListenerCallbacks = {
			openConfirmationModal:  this.openConfirmationModal.bind( this ),
			onClipHotkey:           this.onClipHotkey.bind( this ),
			hideConfirmationModal:  this.hideConfirmationModal.bind( this ),
			fullscreenConfirmation: this.fullscreenConfirmation.bind( this ),
			confirmClip:            this.confirmClip.bind( this )
		};

		this.settings.add( `${this.settingsNamespace}.skip-hotkey`, {
			default: '',
			ui:      {
				path:        'Add-Ons > Clip Confirm >> Behavior',
				title:       '"Skip Confirmation" Hotkey',
				description: 'Hotkey for skipping the clip confirmation when attempting to clip.\n\nIf you press/hold whatever combination of hotkeys you select here when you click the clip button (or use Twitch\'s built-in "Alt + X" shortcut) you will bypass the confirmation window entirely (so basically, the default behavior when this add-on is not installed). This makes it easier to make a clip when you know for a fact that you want to make a clip and don\'t require a confirmation.\n\nIf you do not select any hotkeys, this feature will be disabled.',
				component:   'setting-select-box',
				multiple:    true,
				data:        [
					{ value: 'ctrl', title: 'Ctrl / ⌘' },
					{ value: 'alt', title: 'Alt / Option' },
					{ value: 'shift', title: 'Shift' }
				]
			},
			changed: ( val ) => { this.updateHotkey( val ); }
		} );

		this.settings.add( `${this.settingsNamespace}.skip-on-shortcut`, {
			default: false,
			ui:      {
				path:        'Add-Ons > Clip Confirm >> Behavior',
				title:       'Skip Confirmation When Using Shortcut',
				description: 'By default, Twitch allows clipping using the "Alt + X" shortcut hotkey. Enabing this setting will automatically bypass the confirmation window when using this shortcut to make clips without needing to use the "Skip Confirmation" hotkey you have set above.',
				component:   'setting-check-box'
			},
			changed: ( val ) => { this.skipOnShortcut = val; }
		} );

		this.skipHotkey     = this.settings.get( `${this.settingsNamespace}.skip-hotkey` );
		this.skipOnShortcut = this.settings.get( `${this.settingsNamespace}.skip-on-shortcut` );
	}

	addClipConfirmation() {
		if ( ! this.clipButton ) {
			this.getClipButton();
		}

		this.clipButton.dataset.ffzClipConfirmReady = 'true';

		this.clipButtonTooltipText = {
			original: this.clipButton.getAttribute( 'aria-label' ),
			new:      ''
		};

		this.updateHotkey( this.skipHotkey );

		this.clipButton.addEventListener( 'click', this.eventListenerCallbacks.openConfirmationModal );

		document.documentElement.addEventListener( 'keydown', this.eventListenerCallbacks.onClipHotkey );
	}

	async buildVue() {
		const vue = this.resolve( 'vue' );

		await vue.enable();

		const	view     = ( await import( './views/confirmation.vue' ) ).default;
		const	instance = new vue.Vue( {
					el:         document.createElement( 'div' ),
					components: {
						'confirmation-vue': view
					},
					render:     h => h( 'confirmation-vue' )
				} );

		return instance.$el;
	}

	// Consider clip action confirmed and push it through
	confirmClip() {
		this.clipConfirmed = true;

		this.clipButton.click();

		this.clipConfirmed = false;

		return;
	}

	fullscreenConfirmation() {
		let modalDestination = document.body;
	
		if ( document.fullscreenElement ) {
			modalDestination = document.fullscreenElement;
		}

		modalDestination.appendChild( this.clipConfirmationModal );
	}

	getClipButton() {
		this.clipButton = this.rightControls.querySelector( '[data-a-target="player-clip-button"]' );
	}

	hideConfirmationModal( e ) {
		if ( e.target === this.clipConfirmationModal || e.target.classList.contains( 'ffz-clip-confirm-modal-button' ) ) {
			document.body.classList.remove( 'ffz-clip-confirm-modal-active' );
		}
	}

	onClipHotkey( e ) {
		if ( e.altKey && e.key.toLowerCase() === 'x' ) {
			e.stopImmediatePropagation();

			if ( this.overridePressed( e ) || this.skipOnShortcut ) {
				this.confirmClip();
			} else {
				this.openConfirmationModal( e );
			}
		}
	}

	onDisable() {
		this.rightControlsObserver.disconnect();
		this.tooltipObserver.disconnect();

		delete this.clipButton.dataset.ffzClipConfirmReady;

		this.clipButton.removeEventListener( 'click', this.eventListenerCallbacks.openConfirmationModal );

		document.documentElement.removeEventListener( 'keydown', this.eventListenerCallbacks.onClipHotkey );

		document.removeEventListener( 'click', this.eventListenerCallbacks.hideConfirmationModal );

		document.removeEventListener( 'fullscreenchange', this.eventListenerCallbacks.fullscreenConfirmation );

		document.getElementById( 'ffz-clip-confirm-modal-confirm-button' ).removeEventListener( 'click', this.eventListenerCallbacks.confirmClip );

		document.body.removeChild( this.clipConfirmationModal );

		document.head.removeChild( this.clipConfirmCSS );
	}

	onEnable() {
		document.head.appendChild( this.clipConfirmCSS );

		this.rightControlsObserver = new MutationObserver( this.rightControlsObserverCallback.bind( this ) );
		this.tooltipObserver       = new MutationObserver( this.tooltipObserverCallback.bind( this ) );

		if ( this.rightControls ) {
			this.buildVue().then( ( el ) => {
				document.body.appendChild( el );

				this.clipConfirmationModal = document.getElementById( 'ffz-clip-confirm-modal' );

				// Close modal if any of its buttons or background overlay are clicked
				document.addEventListener( 'click', this.eventListenerCallbacks.hideConfirmationModal );

				// Make clip if confirm/"Yes" button is clicked in the confirmation modal
				document.getElementById( 'ffz-clip-confirm-modal-confirm-button' ).addEventListener( 'click', this.eventListenerCallbacks.confirmClip );
			} );

			if ( this.rightControls.querySelector( '[data-a-target="player-clip-button"]' ) ) {
				this.addClipConfirmation();
			}

			this.rightControlsObserver.observe( this.rightControls, { childList: true, subtree: true } );

			/**
			 * Twitch sometimes uses a different kind of tooltio that gets
			 * dynamically added/removed instead of the other tooltip they
			 * use which keeps the tooltip's HTML always present on the
			 * page, so we need this observer to check for that and update
			 * it if the normal tooltip is not present on the page
			 */
			this.tooltipObserver.observe( document.body, { childList: true } );

			this.log.info( 'Clip Confirm add-on successfully enabled.' );
		}


		// Move modal into video player when fullscreen so that it can be displayed properly
		document.addEventListener( 'fullscreenchange', this.eventListenerCallbacks.fullscreenConfirmation );
	}

	openConfirmationModal( e ) {
		/*
		 * Canceled events can't be manually triggered so we use property
		 * "clipConfirmed" to determine if we have or have not already
		 * confirmed the Clip action and then reset it to false after the
		 * entire process runs
		 */
		if ( ! this.clipConfirmed ) {
			if ( this.overridePressed( e ) ) {
				return;
			}

			e.stopImmediatePropagation();

			document.body.classList.add( 'ffz-clip-confirm-modal-active' );
		}
	}

	overridePressed( e ) {
		let hotkeyPressed = false;

		for ( const hotkey of this.skipHotkey ) {
			if ( hotkey === 'ctrl' ) {
				hotkeyPressed = e.ctrlKey || e.metaKey;
			} else {
				hotkeyPressed = e[ hotkey + 'Key' ];
			}

			if ( ! hotkeyPressed ) {
				break;
			}
		}

		return hotkeyPressed;
	}

	rightControlsObserverCallback( mutations, _observer ) {
		for ( const mutation of mutations ) {
			this.getClipButton();

			if ( mutation.type === 'childList' && mutation.addedNodes.length > 0 && mutation.addedNodes[0].contains( this.clipButton ) && this.clipButton.dataset.ffzClipConfirmReady !== 'true' ) {
				this.addClipConfirmation();
			}
		}
	} 

	updateHotkey( skipHotkey ) {
		this.skipHotkey = skipHotkey;
		this.hotkeyName = '';
		
		for ( const hotkey of this.skipHotkey ) {
			if ( this.hotkeyName !== '' ) {
				this.hotkeyName += ' + ';
			}

			this.hotkeyName += this.keyNames[ hotkey ];
		}
	}

	updateTooltip() {
		this.clipButtonTooltip         = document.getElementsByClassName( 'tw-tooltip-wrapper' )[0];
		this.clipButtonTooltipText.new = this.clipButtonTooltipText.original;

		if ( this.skipHotkey ) {
			this.clipButtonTooltipText.new += ' | Hold ' + this.hotkeyName + ' to skip confirmation';
		}

		this.clipButton.setAttribute( 'aria-label', this.clipButtonTooltipText.new );

		if ( this.clipButtonTooltip ) {
			this.clipButtonTooltip.textContent = this.clipButton.getAttribute( 'aria-label' );
		}
	}

	tooltipObserverCallback( mutations, _observer ) {
		for ( const mutation of mutations ) {
			if ( mutation.addedNodes.length > 0 ) {
				const addedTooltipWrapper = mutation.addedNodes[0].nextElementSibling;

				if ( addedTooltipWrapper.classList.contains( 'tw-tooltip-layer' ) ) {
					this.clipButtonTooltip = addedTooltipWrapper.getElementsByClassName( 'tw-tooltip-wrapper' )[0];

					if ( this.clipButtonTooltip.textContent.includes( 'Clip (' ) ) {
						this.updateTooltip();
					}
				}
			}
		}
	}
}

ClipConfirm.register();
