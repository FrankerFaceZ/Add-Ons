'use strict';

import CSS_URL from './style.scss';
import { MassBanTool } from './features/ban-tool/';
import { MassTermBlocker } from './features/term-blocker/';
import { updateEntryCount } from './utils/entries-list';
import BLOCK_TERMS from './utils/graphql/block-terms.gql';

const { createElement }    = FrankerFaceZ.utilities.dom,
	  { sleep }            = FrankerFaceZ.utilities.object;

class MassModerationUtilities extends Addon {
	constructor( ...args ) {
		super( ...args );

		this.BanTool     = new MassBanTool( this ),
		this.TermBlocker = new MassTermBlocker( this );

		this.massBanToolCSS = document.createElement( 'link' );

		this.massBanToolCSS.rel  = 'stylesheet';
		this.massBanToolCSS.id   = 'ffz-mmu-css';
		this.massBanToolCSS.href = CSS_URL;

		this.toolIsRunning = false;

		this.inject( 'site.apollo' );
		this.inject( 'site.chat' );
		this.inject( 'site.fine' );
	}

	getChannelName() {
		this.channelName = this.chat.router.match[1];
	}

	getChannelID() {
        this.channelID = Object.keys( this.chat.chat.room_ids )[0];
    }

	buildModal() {
		this.modal = (
			<div id="ffz-mmu-modal" class="ffz-dialog tw-elevation-3 tw-c-background-alt tw-c-text-base tw-border tw-flex tw-flex-nowrap tw-flex-column ffz-mmu-modal">
				<header class="tw-c-background-base tw-full-width tw-align-items-center tw-flex tw-flex-nowrap">
					<h3 class="ffz-i-mass-ban-tool ffz-i-pd-1"><i class="ffz-i-block"></i> Mass Moderation Utilities</h3>

					<div class="tw-flex-grow-1 tw-pd-x-2"></div>

					<button type="button" class="tw-button-icon tw-mg-x-05" onClick={ () => this.removeModal() }>
						<span class="tw-button-icon__icon">
							<figure class="ffz-i-window-close" />
						</span>
					</button>
				</header>

				<nav id="ffz-mmu-nav" class="tw-c-background-alt tw-full-width ffz-mmu-nav">
					<menu id="ffz-mmu-nav-menu" class="tw-align-items-center tw-flex tw-flex-norwap ffz-mmu-nav-menu">
						<li class="ffz-mmu-nav-menu-item">
							<button id="ffz-mmu-menu-mass-ban-tool" class="ffz-mmu-nav-menu-btn ffz-mmu-nav-menu-mass-ban-tool" onClick={ () => this.toggleTool( 'ban' ) }>Ban/Unban</button>
						</li>

						<li class="tw-border-l ffz-mmu-nav-menu-item">
							<button id="ffz-mmu-menu-mass-term-blocker-tool" class="ffz-mmu-nav-menu-btn ffz-mmu-nav-menu-mass-term-blocker-tool" onClick={ () => this.toggleTool( 'term-blocker' ) }>Term Blocker</button>
						</li>
					</menu>
				</nav>

				<section class="tw-border-t tw-full-height tw-full-width tw-flex tw-flex-nowrap tw-overflow-hidden">
					<div class="scrollable-area tw-flex-grow-1" data-simplebar-auto-hide="true" data-simplebar-scrollbar-min-size="10" data-simplebar="init">
						<form id="ffz-mmu-tool-form" class="ffz-mmu-tool-form">
							<div id="ffz-mmu-tabs" class="ffz-mmu-tabs">
								{this.BanTool.buildToolContent()}

								{this.TermBlocker.buildToolContent()}
							</div>
						</form>
					</div>
				</section>

				<footer class="tw-c-background-base tw-full-width tw-align-items-center tw-justify-content-end tw-flex tw-flex-nowrap">
					<div class="tw-mg-y-05">
						<div class="ffz--widget ffz-mmu-run-tool-btn default">
							<div class="tw-flex-shrink-0">
								<button class="tw-button" type="button" onClick={ () => this.runToolConfirmation() }>
									<span class="tw-button__text">Run Tool</span>
								</button>
							</div>
						</div>
					</div>
				</footer>
			</div>
		);
	}

	toggleTool( toolName ) {
		this.removeActiveToolClassName();

		this.addActiveToolClassName( toolName );
	}

	/**
	 * Add confirmation and run events to "Run Tool" button
	 */
	runToolConfirmation() {
		if ( this.toolIsRunning ) {
			window.alert( 'The tool is currently running. Please wait until it is finished to run it again.' );
		} else if ( window.confirm( 'Are you absolutely sure you want to run this tool? The process cannot be stopped once started.' ) ) {
			switch( this.modal.querySelector( '.ffz--menu-page.active-tool' ).dataset.mmuToolName ) {
				case 'ban':
					this.runBanTool(
						this.modal.querySelector( '.ffz-mmu-mass-ban-tool-entries-list' ).value,
						this.modal.querySelector( '.ffz-mmu-mass-ban-tool-action' ).value,
						this.modal.querySelector( '.ffz-mmu-mass-ban-tool-ban-reason' ).value
					);
					break;
				
				case 'term-blocker':
					this.runTermBlockerTool(
						this.modal.querySelector( '.ffz-mmu-mass-term-blocker-tool-entries-list' ).value,
						this.modal.querySelector( '.ffz-mmu-mass-term-blocker-tool-privacy' ).value
					);
					break;
			}

			this.removeModal();
		}
	}

	addChatNotice( channelName, message ) {
		this.chat.addNotice( channelName, {
			message: message,
			icon:    new URL( 'https://cdn2.frankerfacez.com/static/addons/mass-ban-tool/logo.png' )
		} );
	}

	entriesToArray( entries ) {
		return entries.trim().match( /^.*$/gm );
	}

	entriesProvided( array ) {
		return array.length > 0 && array[0] !== '';
	}

	async runBanTool( users, action, reason ) {
		const usersArray = this.entriesToArray( users ),
			  toolActionCap = action.charAt( 0 ).toUpperCase() + action.slice( 1 );

		if ( this.entriesProvided( usersArray ) ) {
			this.toolIsRunning = true;

			this.addChatNotice( this.channelName, 'Mass ' + toolActionCap + ' tool has started running.' );
			
			for ( const user of usersArray ) {
				await this.actionUser( user, action, reason );
			}

			this.toolIsRunning = false;

			await sleep( 1000 );

			this.addChatNotice( this.channelName, 'Mass ' + toolActionCap + ' tool has completed its run.' );
		} else {
			this.log.info( 'Aborting run: no usernames were provided.' );
		}
	}

	async runTermBlockerTool( terms, privacy ) {
		const termsArray = this.entriesToArray( terms );

		if ( this.entriesProvided( termsArray ) ) {
			let isModEditable = true;

			if ( ! this.channelID ) {
				this.getChannelID();
			}

			if ( privacy === 'private' ) {
				isModEditable = false;
			}

			this.toolIsRunning = true;

			this.addChatNotice( this.channelName, 'Mass Term Blocker tool has started running.' );

			for ( const term of termsArray ) {
				await this.actionTerm( term, isModEditable );
			}

			this.toolIsRunning = false;

			await sleep( 1000 );

			this.addChatNotice( this.channelName, 'Mass Term Blocker tool has completed its run.' );
		} else {
			this.log.info( 'Aborting run: no terms/phrases were provided.' );
		}
	}

	addActiveToolClassName( toolName ) {
		this.modal.querySelector( `#ffz-mmu-mass-${toolName}-tool` ).classList.add( 'active-tool' );
		this.modal.querySelector( `.ffz-mmu-nav-menu-mass-${toolName}-tool` ).classList.add( 'active-tool' );
	}

	removeActiveToolClassName() {
		this.modal.querySelectorAll( '.active-tool' ).forEach( ( el, _i ) => {
			el.classList.remove( 'active-tool' );
		} );
	}

	insertModal( toolName ) {
		this.addActiveToolClassName( toolName );

		document.body.append( this.modal );
	}

	removeModal() {
		this.modal.querySelector( '.ffz-mmu-tool-form' ).reset();

		updateEntryCount( this, this.BanTool );
		updateEntryCount( this, this.TermBlocker );

		this.BanTool.toggleBanReasonField( { target: { value: 'ban' } } );

		if ( document.body.contains( this.modal ) ) {
			document.body.removeChild( this.modal );

			this.removeActiveToolClassName();
		}
	}

	checkForModView() {
		if ( this.chat.router.current_name === 'mod-view' ) {
			this.modBar = this.fine.define( 'mod-view-bar' );

			if ( this.modBar ) {
				this.reactModBar();

				return true;	
			}
		} else {
			return false;
		}
	}

	insertCSS() {
		document.head.append( this.massBanToolCSS );
	}

	removeCSS() {
		if ( document.head.contains( this.massBanToolCSS ) ) {
			document.head.removeChild( this.massBanToolCSS );
		}
	}

	reactModBar() {
		this.modBar.ready( () => { this.update(); } );
		this.modBar.on( 'mount', this.insertModViewButton, this );
		this.modBar.on( 'update', this.insertModViewButton, this );
	}

	update() {
		requestAnimationFrame( () => {
			for ( const inst of this.modBar.instances ) {
				this.insertModViewButton( inst );
			}
		} );
	}

	insertModViewButton( inst, _container, _is_sunlight ) {
		const root = this.fine.getChildNode( inst );

		if ( inst?.childContext && ! root.contains( this.modViewBtn ) ) {
			this.modBarContainer = root && root.querySelector( '.modview-dock > div:last-child' );

			this.modViewBtn  = ( <div class="tw-relative tw-mg-b-1" onClick={ () => this.insertModal( 'ban' ) }>
				<div id="ffz-mmu-btn" class="tw-inline-flex tw-relative ffz-il-tooltip__container">
					<button class="tw-align-items-center tw-align-middle tw-border-bottom-left-radius-medium tw-border-bottom-right-radius-medium tw-border-top-left-radius-medium tw-border-top-right-radius-medium tw-button-icon ffz-core-button ffz-core-button--border tw-inline-flex tw-interactive tw-justify-content-center tw-overflow-hidden tw-relative">
							<div class="tw-align-items-center tw-flex tw-flex-grow-0">
								<span class="tw-button-icon__icon">
									<figure class="ffz-i-block"></figure>
								</span>
							</div>
					</button>

					<div class="ffz-il-tooltip ffz-il-tooltip--up ffz-il-tooltip--align-left">Mass Moderation Utilities</div>
				</div>
			</div> );

			// Insert mod view button
			this.modBarContainer.insertBefore( this.modViewBtn, this.modBarContainer.lastElementChild );
		}
	}

	removeModViewButton() {
		if ( this.modBarContainer.contains( this.modViewBtn ) ) {
			this.modBarContainer.removeChild( this.modViewBtn );
		}
	}

	async actionUser( user, action, reason ) {
		if ( ! this.channelName ) {
			this.getChannelName();
		}

		let command = '/' + action + ' ' + user;

		if ( action === 'ban' && reason.trim() !== '' ) {
			command += ' ' + reason;
		}

		this.chat.sendMessage( this.channelName, command );

		/**
		 * Twitch chat limit for mods/broadcasters is 100 messages every 30 seconds
		 * so the following delay is set slightly above the fastest possible time increment in order 
		 * to avoid hitting that limit
		 */
		await sleep( 350 );
	}

	async actionTerm( term, isModEditable ) {
		const blockTerm = await this.apollo.client.mutate( {
			  mutation:  BLOCK_TERMS,
			  variables: {
				input: {
					channelID: this.channelID,
					isModEditable: isModEditable,
					phrase: term
				}
			  }
			} ).catch( ( err ) => this.log.info( err ) );

			if ( blockTerm.data.addChannelBlockedTerm.length > 0 ) {
				this.log.info( `Term/phrase "${blockTerm.data.addChannelBlockedTerm.phrases[0]}" successfully blocked.` );

				await sleep( 350 );
			} else {
				this.log.info( `Term/phrase ${term} failed to be blocked. Did you accidentally set the Privacy to "Private" in a channel that you don't own? If so, that's most likely the cause of this issue. Moderators are only able to block terms publicly.` );
			}
	}

	onDisable() {
		this.removeCSS();

		this.removeModal();

		this.removeModViewButton();

		this.log.info( 'Mass Moderation Utilities add-on successfully disabled.' );
	}

	onEnable() {
		if ( this.checkForModView() ) {
			this.getChannelName();

			this.insertCSS();

			this.insertModViewButton();

			this.buildModal();

			this.log.info( 'Mass Moderation Utilies add-on successfully enabled.' );
		} else {
			this.log.info( 'Mass Moderation Utilities not enabled: Not currently in mod view.' );
		}
	}
}

MassModerationUtilities.register();
