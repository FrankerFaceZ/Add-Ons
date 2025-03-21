'use strict';

import CSS_URL from './style.scss';
import GET_RECENT_FOLLOWERS from './utils/graphql/recent-followers.gql';

const { openFile, createElement } = FrankerFaceZ.utilities.dom,
	  { sleep }                   = FrankerFaceZ.utilities.object;

class MassBanTool extends Addon {
	constructor( ...args ) {
		super( ...args );

		this.massBanToolCSS = document.createElement( 'link' );

		this.massBanToolCSS.rel  = 'stylesheet';
		this.massBanToolCSS.id   = 'ffz-mass-ban-tool-css';
		this.massBanToolCSS.href = CSS_URL;

		this.toolIsRunning = false;

		this.inject( 'site.apollo' );
		this.inject( 'site.chat' );
		this.inject( 'site.fine' );

		this.channelName = this.chat.router.match[1];
	}

	buildMassBanToolModal() {
		const modalCloseBtn        = ( <button type="button" class="tw-button-icon tw-mg-x-05" onClick={ () => this.removeMassBanToolModal() }>
				<span class="tw-button-icon__icon">
					<figure class="ffz-i-window-close" />
				</span>
			</button> ),
			  buttonClass          = 'tw-pd-x-1 tw-pd-y-05 tw-mg-y-05 tw-mg-r-05 tw-border-bottom-left-radius-medium tw-border-bottom-right-radius-medium tw-button',
			  fileUploadBtn        = ( <button type="button" class={buttonClass + ' ffz-mass-ban-tool-file-upload'} onClick={ () => this.openFileSelector() }>
					<span class="tw-button__icon tw-button__icon--left ffz-i-upload"></span>
					<span class="tw-button__text">Select File</span>
				</button> ),
			  recentFollowersImport = {
				  five:       ( <button type="button" class={buttonClass + ' ffz-mass-ban-tool-5-followers-import'} onClick={ () => this.importRecentFollowers( 5 ) }><span class="tw-button__text">5</span></button> ),
				  ten:        ( <button type="button" class={buttonClass + ' ffz-mass-ban-tool-10-followers-import'} onClick={ () => this.importRecentFollowers( 10 ) }><span class="tw-button__text">10</span></button> ),
				  twentyFive: ( <button type="button" class={buttonClass + ' ffz-mass-ban-tool-25-followers-import'} onClick={ () => this.importRecentFollowers( 25 ) }><span class="tw-button__text">25</span></button> ),
				  oneHundred: ( <button type="button" class={buttonClass + ' ffz-mass-ban-tool-100-followers-import'} onClick={ () => this.importRecentFollowers( 100 ) }><span class="tw-button__text">100</span></button> ),
				  custom:     ( <span class="tw-border-l tw-mg-l-1 tw-pd-l-1">
					  <input type="number" id="ffz-mass-ban-tool-followers-import-custom-amount" name="ffz-mass-ban-tool-followers-import-custom-amount" class="tw-border-radius-medium tw-font-size-6 tw-pd-x-1 tw-pd-y-05 tw-mg-05 ffz-input ffz-mass-ban-tool-followers-import-custom-amount" min="0" max="100" placeholder="Custom" onKeyUp={ ( e ) => {
							if ( e.key === 'Enter' ) {
								this.importCustomFollowersAmount( parseInt( document.getElementById( 'ffz-mass-ban-tool-followers-import-custom-amount' ).value ) );
							}
						} }/>

					  <button type="button" id="ffz-mass-ban-tool-custom-followers-import" class={buttonClass + ' ffz-mass-ban-tool-custom-followers-import'} onClick={ () => this.importCustomFollowersAmount( parseInt( document.getElementById( 'ffz-mass-ban-tool-followers-import-custom-amount' ).value ) ) }>
						<span class="tw-button__text">Import</span>
					  </button>
				  </span> )
			  };

		this.massBanToolModal = ( <div id="ffz-mass-ban-tool-modal" class="ffz-dialog tw-elevation-3 tw-c-background-alt tw-c-text-base tw-border tw-flex tw-flex-nowrap tw-flex-column">
			<header class="tw-c-background-base tw-full-width tw-align-items-center tw-flex tw-flex-nowrap">
				<h3 class="ffz-i-mass-ban-tool ffz-i-pd-1"><i class="ffz-i-block"></i> Mass Ban Tool</h3>

				<div class="tw-flex-grow-1 tw-pd-x-2"></div>
			</header>

			<section class="tw-border-t tw-full-height tw-full-width tw-flex tw-flex-nowrap tw-overflow-hidden">
				<div class="scrollable-area tw-flex-grow-1" data-simplebar-auto-hide="true" data-simplebar-scrollbar-min-size="10" data-simplebar="init">
					<form id="ffz-mass-ban-tool-form" class="ffz-mass-ban-tool-form">
						<div class="ffz--menu-page">
							<div class="tw-mg-y-05">
								<div class="ffz--widget ffz--text-box default">
									<div class="tw-flex tw-align-items-center">
										<label for="ffz-mass-ban-tool-users-list">Users List<br /><span class="ffz-mass-ban-tool-user-count-label">(Current User Count: <span id="ffz-mass-ban-tool-user-count" class="ffz-mass-ban-tool-user-count" >0</span>)</span></label>

										<textarea id="ffz-mass-ban-tool-users-list" class="tw-border-radius-medium tw-font-size-6 tw-pd-x-1 tw-pd-y-05 tw-mg-05 ffz-input ffz-mass-ban-tool-users-list" placeholder="Username1&#10;Username2&#10;Username3&#10;Etc." rows="10" onKeyUp={ () => this.updateUserCount() }></textarea>
									</div>

									<section class="tw-c-text-alt-2">
										<div>
											<p>The list of users you wish to action. List one username per line.</p>
										</div>
									</section>
								</div>
							</div>

							<div class="tw-mg-y-05">
								<div class="ffz--widget ffz--select-box">
									<div class="tw-flex tw-align-items-start ffz-mass-ban-tool-upload-field">
										<label class="tw-mg-y-05" for="ffz-mass-ban-tool-upload-file">Upload Users List File</label>
									</div>

									<section class="tw-c-text-alt-2">
										<div>
											<p>Optionally you can upload a <code>.txt</code> file here to populate the Users List. Make sure your list consists of one username per line.</p>
										</div>
									</section>
								</div>
							</div>

							<div class="tw-mg-y-05">
								<div class="ffz--widget ffz--select-box">
									<div id="ffz-mass-ban-tool-recent-followers-field" class="tw-flex tw-align-items-start ffz-mass-ban-tool-recent-followers-field">
										<label class="tw-mg-y-05" for="ffz-mass-ban-tool-recent-followers-import">Recent Followers</label>

										<div class="tw-flex tw-align-items-start ffz-mass-ban-tool-recent-followers-inputs"></div>

										<div class="tw-flex tw-align-items-start tw-pd-y-05 tw-mg-y-05 ffz-mass-ban-tool-recent-followers-loading">
										<figure class="ffz-i-t-reset loading tw-mg-r-05"></figure> Retrieving recent followers&hellip;
										</div>
									</div>

									<section class="tw-c-text-alt-2">
										<div>
											<p>Optionally you can automatically import a specific number of the most recent followers of the channel, up to 100.</p>
										</div>
									</section>
								</div>
							</div>

							<div class="tw-mg-y-05">
								<div class="ffz--widget ffz--select-box default">
									<div class="tw-flex tw-align-items-center">
										<label class="tw-mg-y-05 action-label" for="ffz-mass-ban-tool-unban-action-cb">Action To Take</label>

										<select id="ffz-mass-ban-tool-unban-action-cb" class="tw-border-radius-medium tw-font-size-6 ffz-select tw-pd-l-1 tw-pd-r-3 tw-pd-y-05 tw-mg-05 ffz-mass-ban-tool-action" size="0">
											<option value="ban">Ban</option>

											<option value="unban">Unban</option>
										</select>
									</div>

									<section class="tw-c-text-alt-2">
										<div>
											<p>Select whether to ban or unban the listed users.</p>
										</div>
									</section>
								</div>
							</div>

							<div class="tw-mg-y-05">
								<div class="ffz--widget ffz--text-box default">
									<div class="tw-flex tw-align-items-center">
										<label for="ffz-mass-ban-tool-ban-reason">Reason for Ban</label>

										<input id="ffz-mass-ban-tool-ban-reason" class="tw-border-radius-medium tw-font-size-6 tw-pd-x-1 tw-pd-y-05 tw-mg-05 ffz-input ffz-mass-ban-tool-ban-reason" type="text" placeholder="Being a troll" />
									</div>

									<section class="tw-c-text-alt-2">
										<div>
											<p>An optional reason for the ban which will be applied to every ban. Not applicable when unbanning.</p>
										</div>
									</section>
								</div>
							</div>

							<div class="tw-mg-y-05">
								<div class="ffz--widget ffz-mass-ban-tool-run-btn default">
									<div class="tw-flex-shrink-0">
										<button class="tw-button" type="button">
											<span class="tw-button__text">Run Tool</span>
										</button>
									</div>
								</div>
							</div>
						</div>
					</form>
				</div>
			</section>
		</div> );

		/**
		 * Disable "Ban Reason" field when action is set to "Unban"
		 */
		this.massBanToolModal.getElementsByClassName( 'ffz-mass-ban-tool-action' )[0].addEventListener( 'change', ( event ) => {
			this.toggleBanReasonField( event );
		} );

		/**
		 * Add confirmation and run events to "Run Tool" button
		 */
		this.massBanToolModal.getElementsByClassName( 'ffz-mass-ban-tool-run-btn' )[0].getElementsByClassName( 'tw-button' )[0].addEventListener( 'click', () => {
			if ( this.toolIsRunning ) {
				window.alert( 'The tool is currently running. Please wait until it is finished to run it again.' );
			} else if ( window.confirm( 'Are you absolutely sure you want to run this tool? The process cannot be stopped once started.' ) ) {
				this.runTool(
					this.massBanToolModal.getElementsByClassName( 'ffz-mass-ban-tool-users-list' )[0].value,
					this.massBanToolModal.getElementsByClassName( 'ffz-mass-ban-tool-action' )[0].value,
					this.massBanToolModal.getElementsByClassName( 'ffz-mass-ban-tool-ban-reason' )[0].value
				);

				this.removeMassBanToolModal();
			}
		} );

		this.massBanToolModal.getElementsByTagName( 'header' )[0].append( modalCloseBtn );

		for ( const importCount in recentFollowersImport ) {
			this.massBanToolModal.getElementsByClassName( 'ffz-mass-ban-tool-recent-followers-inputs' )[0].append( recentFollowersImport[ importCount ] );
		}

		this.massBanToolModal.getElementsByClassName( 'ffz-mass-ban-tool-upload-field' )[0].append( fileUploadBtn );

		this.usersListTextarea = this.massBanToolModal.getElementsByClassName( 'ffz-mass-ban-tool-users-list' )[0];
	}

	insertMassBanToolModal() {
		document.body.append( this.massBanToolModal );
	}

	removeMassBanToolModal() {
		this.massBanToolModal.getElementsByClassName( 'ffz-mass-ban-tool-form' )[0].reset();

		this.updateUserCount();

		this.toggleBanReasonField( { target: { value: 'ban' } } );

		if ( document.body.contains( this.massBanToolModal ) ) {
			document.body.removeChild( this.massBanToolModal );
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

			this.modViewBtn  = ( <div class="tw-relative tw-mg-b-1" onClick={ () => this.insertMassBanToolModal() }>
				<div id="ffz-mass-ban-tool-btn" class="tw-inline-flex tw-relative ffz-il-tooltip__container">
					<button class="tw-align-items-center tw-align-middle tw-border-bottom-left-radius-medium tw-border-bottom-right-radius-medium tw-border-top-left-radius-medium tw-border-top-right-radius-medium tw-button-icon ffz-core-button ffz-core-button--border tw-inline-flex tw-interactive tw-justify-content-center tw-overflow-hidden tw-relative">
							<div class="tw-align-items-center tw-flex tw-flex-grow-0">
								<span class="tw-button-icon__icon">
									<figure class="ffz-i-block"></figure>
								</span>
							</div>
					</button>

					<div class="ffz-il-tooltip ffz-il-tooltip--up ffz-il-tooltip--align-left">Mass Ban Tool</div>
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

	async openFileSelector() {
		const usersListFile     = await openFile( 'text/plain', false );

		if ( usersListFile.type === 'text/plain' ) {
			usersListFile.text()
				.then( ( contents ) => {
					const usersListArray = contents.replace( /\r\n/gm, '\n' ).match( /^.*$/gm );

					for ( const user of usersListArray ) {
						this.addUserToList( user );
					}
				} );
		}
	}

	addUserToList( user ) {
		if ( this.usersListTextarea.value[0] !== this.usersListTextarea.value[ this.usersListTextarea.value.length - 1 ] && this.usersListTextarea.value[ this.usersListTextarea.value.length - 1 ] !== '\n' ) {
			this.usersListTextarea.value += '\n';
		}

		this.usersListTextarea.value += user.trim();

		if ( this.usersListTextarea.value[ this.usersListTextarea.value.length - 1 ] !== '\n' ) {
			this.usersListTextarea.value += '\n';
		}

		this.usersListTextarea.scrollTop = this.usersListTextarea.scrollHeight;

		this.updateUserCount();
	}

	async importRecentFollowers( count ) {
		if ( count >= 1 && count <= 100 ) {
			this.toggleLoadingFollowers();

			try {
				if ( ! this.apollo ) {
					this.log.error( 'Apollo client not resolved.' );

					return;
				}

				const followers = await this.apollo.client.query( {
						query: GET_RECENT_FOLLOWERS,
						variables: {
							login: this.channelName,
							first: count
						}
				} )

				for ( const follower of followers?.data?.user?.followers?.edges ) {
					this.addUserToList( follower.node.displayName );
				}
			} catch ( error ) {
				this.log.error( 'Error retrieving recent followers.', error );
			}

			this.toggleLoadingFollowers();
		} else {
			alert( 'Number of recent followers to import must be between 1 and 100.' );
		}
	}

	importCustomFollowersAmount( count ) {
		document.getElementById( 'ffz-mass-ban-tool-followers-import-custom-amount' ).value = '';

		this.importRecentFollowers( count );
	}

	toggleLoadingFollowers() {
		document.getElementById( 'ffz-mass-ban-tool-recent-followers-field' ).classList.toggle( 'loading' );
	}

	updateUserCount() {
		document.getElementById( 'ffz-mass-ban-tool-user-count' ).textContent = document.getElementById( 'ffz-mass-ban-tool-user-count' ).textContent = this.usersListTextarea.value.trim().split( /[\r\n|\r|\n]/ ).filter( Boolean ).length;
	}

	toggleBanReasonField( event ) {
		const massBanToolBanReason = this.massBanToolModal.getElementsByClassName( 'ffz-mass-ban-tool-ban-reason' )[0];

		if ( event.target.value === 'unban' ) {
			massBanToolBanReason.disabled = true;
		} else {
			massBanToolBanReason.disabled = false;
		}
	}

	async runTool( users, action, reason ) {
		const usersArray = users.trim().match( /^.*$/gm );

		this.toolIsRunning = true;
		
		for ( const user of usersArray ) {
			await this.actionUser( user, action, reason );
		}

		this.toolIsRunning = false;
	}

	async actionUser( user, action, reason ) {
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

	onDisable() {
		this.removeCSS();

		this.removeMassBanToolModal();

		this.removeModViewButton();

		this.log.info( 'Mass Ban Tool add-on successfully disabled.' );
	}

	onEnable() {
		if ( this.checkForModView() ) {
			this.channelName = this.chat.router.match[1];

			this.insertCSS();

			this.insertModViewButton();

			this.buildMassBanToolModal();

			this.log.info( 'Mass Ban Tool add-on successfully enabled.' );
		} else {
			this.log.info( 'Mass Ban Tool not enabled: Not currently in mod view.' );
		}
	}
}

MassBanTool.register();
