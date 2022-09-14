class UnreadMentionsCounter extends Addon {
	constructor(...args) {
		super(...args);

		this.settingsNamespace    = 'addon.unread-mentions-counter';
		this.mentionCounterRegExp = /\(@[0-9]*\)/;
		this.titleObserver        = new MutationObserver( this.monitorTitle );
		this.counterLocation      = this.settings.get( this.settingsNamespace + '.counter-location' ) || 'icon';
		this.favicon              = {
			element:  {
				16: document.querySelector( 'link[rel="icon"][sizes="16x16"]' ),
				32: document.querySelector( 'link[rel="icon"][sizes="32x32"]' )
			},
			original: {
				16: null,
				32: null
			}
	  	};

		this.favicon.original[16] = this.favicon.element[16].href;
		this.favicon.original[32] = this.favicon.element[32].href;

		this.inject( 'chat' );

		this.settings.add( this.settingsNamespace + '.counter-location', {
			default: 'icon',
			ui: {
				path:        'Add-Ons > Unread Mentions Counter >> Behavior',
				title:       'Counter Location',
				description: 'Will not take effect until counter changes or page is refreshed.',
				component:   'setting-select-box',
				data:        [
					{ value: 'icon',      title: 'Icon' },
					{ value: 'tab-title', title: 'Tab Title' },
					{ value: 'both',      title: 'Icon + Tab Title' }
				]
			}
		} );

		this.settings.add( this.settingsNamespace + '.icon.bg-color', {
			default: 'rgba(255, 0, 0, 1.0)',
			ui:      {
				path:        'Add-Ons > Unread Mentions Counter >> Icon Counter Appearance',
				title:       'Background Color',
				description: 'This is the color of the icon counter\'s circular background.',
				component:   'setting-color-box',
				alpha:       true
			},
			changed:         () => { this.insertIconCounter(); }
		} );

		this.settings.add( this.settingsNamespace + '.icon.text-color', {
			default: 'rgba(255, 255, 255, 1.0)',
			ui:      {
				path:        'Add-Ons > Unread Mentions Counter >> Icon Counter Appearance',
				title:       'Text Color',
				description: 'This is the color of the icon counter\'s text (i.e. the number of unread mentions/pings).',
				component:  'setting-color-box',
				alpha:       true
			},
			changed:         () => { this.insertIconCounter(); }
		} );
	}

	/**
	 * Monitor new messages and detect user mentions/pings
	 */
	countMentions( event ) {
		const msg = event.message;

		// Only count if the chat/browser window are inactive and the chat message is new, active, and actually contains a mention/ping of the user
		if ( ( document.visibilityState === 'visible' && document.hasFocus() ) || msg.deleted || msg.isHistorical || msg.ffz_removed || ! msg.mentioned ) {
			return;
		}

		if ( msg.mentioned ) {
			this.mentionCount++;

			this.insertCounters();
		}
	}

	createIcon() {
		for ( let size of [ 16, 32 ] ) {
			const 	canvas = document.createElement( 'canvas' ),
					img   = new Image();

			let context;

			canvas.width  = size;
			canvas.height = size;

			context = canvas.getContext( '2d' );

			img.crossOrigin = 'anonymous';

			img.onload = () => {
				const interFont = new FontFace( 'Inter', 'url(https://static.twitchcdn.net/assets/inter-latin-variable-wghtOnly-normal-a05a0d687a088c4efed3.woff2)' );

				interFont.load().then( () => {
					context.drawImage( img, 0, 0, size, size );

					// Icon Counter Background
					context.beginPath();
					context.arc( canvas.width - size / 3, size / 3, size / 3, 0, 2 * Math.PI );
					context.fillStyle = this.settings.get( this.settingsNamespace + '.icon.bg-color' );
					context.fill();

					// Icon Counter Text
					context.font         = Math.ceil( size / 1.78 ) + 'px Inter, "Helvetica Neue", Helvetica, Arial, sans-serif';
					context.textAlign    = 'center';
					context.textBaseline = 'middle';
					context.fillStyle    = this.settings.get( this.settingsNamespace + '.icon.text-color' );
					context.fillText( this.mentionCount, canvas.width - size / 3, size / 2.75 );

					this.favicon.element[ size ].href = canvas.toDataURL();
				} );
			};

			img.src = '/favicon.ico';
		}
	}

	insertCounters() {
		this.insertIconCounter();

		this.insertTitleCounter();
	}

	insertIconCounter() {

		if ( this.mentionCount > 0 && [ 'both', 'icon' ].includes( this.counterLocation ) ) {
			this.createIcon();
		} else {
			this.resetIcon();
		}
	}

	insertTitleCounter() {
		if ( this.mentionCount === 0 || ! [ 'both', 'tab-title' ].includes( this.counterLocation ) ) {
			this.resetTitle();

			return;
		}

		if ( document.title.match( this.mentionCounterRegExp ) ) {
			document.title = document.title.replace( this.mentionCounterRegExp, '(@' + this.mentionCount + ')' );
		} else {
			document.title = '(@' + this.mentionCount + ') ' + document.title;
		}
	}

	/**
	 * Try to monitor when Twitch changes the title (e.g. adding a "(1)", etc. when receiving a gift sub or similar event) and re-add counter if it existed before the change
	 */
	monitorTitle( mutations ) {
		if ( ! mutations[0].target.textContent.match( this.mentionCounterRegExp ) && this.mentionCount > 0 ) {
			this.insertTitleCounter();
		}
	}

	onDisable() {
		this.stopCounting();
	}

	onEnable() {
		this.mentionCount = 0;

		this.toggleCounting( this );

		// Detect if tab/browser window is active or inactive and start/stop counter accordingly
		document.addEventListener( 'visibilitychange', () => { this.toggleCounting( this ); }, false );
		window.addEventListener( 'blur', () => { this.toggleCounting( this ); }, false );
		window.addEventListener( 'focus', () => { this.toggleCounting( this ); }, false );

		this.log.info( 'Unread Mentions Counter add-on successfully enabled.' );
	}

	resetIcon() {
		this.favicon.element[16].href = this.favicon.original[16];
		this.favicon.element[32].href = this.favicon.original[32];
	}

	resetTitle() {
		document.title = document.title.replace( this.mentionCounterRegExp, '' ).trim();
	}

	stopCounting() {
		this.mentionCount   = 0;
		this.observingTitle = false;

		this.resetTitle();

		this.resetIcon();

		this.titleObserver.disconnect();

		this.off( 'chat:buffer-message', this.countMentions, this );
	}

	/**
	 * 
	 * @param {UnreadMentionsCounter} umcClass The UnreadMentionCounter class itself normally assigned to `this`
	 */
	toggleCounting( umcClass ) {
		if ( document.visibilityState === 'hidden' || ( document.visibilityState === 'visible' && ! document.hasFocus() ) ) {
			if ( this.observingTitle ) {
				return;
			}

			this.titleObserver.observe( document.getElementsByTagName( 'title' )[0], { subtree: true,characterData: true, childList: true } );

			this.observingTitle = true;

			umcClass.on( 'chat:buffer-message', umcClass.countMentions, umcClass );
		} else {
			umcClass.stopCounting();
		}
	}
}

UnreadMentionsCounter.register();
