'use strict';

import CSS_URL from './style.scss';

const { openFile } = FrankerFaceZ.utilities.dom;

class MassBanTool extends Addon {
	constructor( ...args ) {
		super( ...args );

		this.massBanToolCSS = document.createElement( 'link' );

		this.massBanToolCSS.rel  = 'stylesheet';
		this.massBanToolCSS.id   = 'ffz-mass-ban-tool-css';
		this.massBanToolCSS.href = CSS_URL;

		this.inject( 'site.chat' );
	}

	buildMassBanToolModal() {
		const modalCloseBtn = document.createElement( 'button' ),
			  fileUploadBtn = document.createElement( 'button' );

		this.massBanToolModal = document.createElement( 'div' );

		/**
		 * Construct modal close button
		 */
		modalCloseBtn.classList.add( 'tw-button-icon', 'tw-mg-x-05' );

		modalCloseBtn.innerHTML = `<span class="tw-button-icon__icon">
			<figure class="ffz-i-window-close"></figure>
		</span>`;

		modalCloseBtn.addEventListener( 'click', () => {
			this.removeMassBanToolModal();
		} );

		/**
		 * Construct upload button
		 */
		fileUploadBtn.classList.add( 'tw-pd-l-1', 'tw-pd-r-3', 'tw-pd-y-05', 'tw-border-bottom-left-radius-medium', 'tw-border-bottom-right-radius-medium', 'tw-button' );

		fileUploadBtn.innerHTML = `<span class="tw-button__icon tw-button__icon--left ffz-i-upload"></span>

			<span class="tw-button__text">Select File</span>`;
		fileUploadBtn.type      = 'button';

		fileUploadBtn.addEventListener( 'click', () => {
			this.openFileSelector();
		} );

		/** 
		 * Construct mass ban modal
		 */
		this.massBanToolModal.id = 'ffz-mass-ban-tool-modal';

		this.massBanToolModal.classList.add( 'ffz-dialog', 'tw-elevation-3', 'tw-c-background-alt', 'tw-c-text-base', 'tw-border', 'tw-flex', 'tw-flex-nowrap', 'tw-flex-column' );

		this.massBanToolModal.innerHTML = `<header class="tw-c-background-base tw-full-width tw-align-items-center tw-flex tw-flex-nowrap">
			<h3 class="ffz-i-mass-ban-tool ffz-i-pd-1"><i class="ffz-fa fa-ban"></i> Mass Ban Tool</h3>

			<div class="tw-flex-grow-1 tw-pd-x-2"></div>
		</header>

		<section class="tw-border-t tw-full-height tw-full-width tw-flex tw-flex-nowrap tw-overflow-hidden">
			<div class="scrollable-area tw-flex-grow-1" data-simplebar-auto-hide="true" data-simplebar-scrollbar-min-size="10" data-simplebar="init">
				<form id="ffz-mass-ban-tool-form" class="ffz-mass-ban-tool-form">
					<div class="ffz--menu-page">
						<div>
							<div class="ffz--widget ffz--text-box default">
								<div class="tw-flex tw-align-items-center">
									<label for="ffz-mass-ban-tool-users-list">Users List</label>

									<textarea id="ffz-mass-ban-tool-users-list" class="tw-border-radius-medium tw-font-size-6 tw-pd-x-1 tw-pd-y-05 tw-mg-05 ffz-input ffz-mass-ban-tool-users-list" placeholder="Username1\nUsername2\nUsername3\nEtc." rows="10"></textarea>
								</div>

								<section class="tw-c-text-alt-2">
									<div>
										<p>The list of users you wish to action. List one username per line.</p>
									</div>
								</section>
							</div>
						</div>

						<div>
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

						<div>
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

						<div>
							<div class="ffz--widget ffz--text-box default">
								<div class="tw-flex tw-align-items-center">
									<label for="ffz-mass-ban-tool-ban-reason">Reason for Ban</label>

									<input id="ffz-mass-ban-tool-ban-reason" class="tw-border-radius-medium tw-font-size-6 tw-pd-x-1 tw-pd-y-05 tw-mg-05 ffz-input ffz-mass-ban-tool-ban-reason" type="text" placeholder="Being a troll.">
								</div>
							</div>

							<section class="tw-c-text-alt-2">
								<div>
									<p>An optional reason for the ban. Not applicable when unbanning.</p>
								</div>
							</section>
						</div>

						<div>
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
		</section>`;

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
			if ( window.confirm( 'Are you absolutely sure you want to run this tool? The process cannot be stopped once started.' ) ) {
				this.runTool(
					this.massBanToolModal.getElementsByClassName( 'ffz-mass-ban-tool-users-list' )[0].value,
					this.massBanToolModal.getElementsByClassName( 'ffz-mass-ban-tool-action' )[0].value,
					this.massBanToolModal.getElementsByClassName( 'ffz-mass-ban-tool-ban-reason' )[0].value
				);

				this.removeMassBanToolModal();
			}
		} );


		this.massBanToolModal.getElementsByTagName( 'header' )[0].append( modalCloseBtn );
		this.massBanToolModal.getElementsByClassName( 'ffz-mass-ban-tool-upload-field' )[0].append( fileUploadBtn );
	}

	insertmassBanToolModal() {
		document.body.append( this.massBanToolModal );
	}

	removeMassBanToolModal() {
		this.massBanToolModal.getElementsByClassName( 'ffz-mass-ban-tool-form' )[0].reset();

		this.toggleBanReasonField( { target: { value: 'ban' } } );

		if ( document.body.contains( this.massBanToolModal ) ) {
			document.body.removeChild( this.massBanToolModal );
		}
	}

	checkForModView() {
		this.modViewContainer = document.querySelector( '.modview-dock > div:last-child' );

		if ( this.modViewContainer ) {
			return true;	
		}

		return false;
	}

	insertCSS() {
		document.head.append( this.massBanToolCSS );
	}

	removeCSS() {
		if ( document.head.contains( this.massBanToolCSS ) ) {
			document.head.removeChild( this.massBanToolCSS );
		}
	}

	insertModViewButton() {
		this.modViewBtn  = document.createElement( 'div' );

		/**
		 * Construct mod view button
		 */
		this.modViewBtn.classList.add( 'tw-relative', 'tw-mg-b-1' );

		this.modViewBtn.innerHTML = `<div id="ffz-mass-ban-tool-btn" class="tw-inline-flex tw-relative ffz-il-tooltip__container">
			<button class="tw-align-items-center tw-align-middle tw-border-bottom-left-radius-medium tw-border-bottom-right-radius-medium tw-border-top-left-radius-medium tw-border-top-right-radius-medium tw-button-icon ffz-core-button ffz-core-button--border tw-inline-flex tw-interactive tw-justify-content-center tw-overflow-hidden tw-relative">
					<div class="tw-align-items-center tw-flex tw-flex-grow-0">
						<span class="tw-button-icon__icon">
							<figure class="ffz-i-block"></figure>
						</span>
					</div>
				</span>
			</button>

			<div class="ffz-il-tooltip ffz-il-tooltip--up ffz-il-tooltip--align-left">Mass Ban Tool</div>
		</div>`;

		this.modViewBtn.addEventListener( 'click', () => {
			this.insertmassBanToolModal();
		} );

		// Insert mod view button
		this.modViewContainer.insertBefore( this.modViewBtn, document.getElementsByClassName( 'ffz-mod-view-button' )[0].nextElementSibling );
	}

	removeModViewButton() {
		if ( this.modViewContainer.contains( this.modViewBtn ) ) {
			this.modViewContainer.removeChild( this.modViewBtn );
		}
	}

	async openFileSelector() {
		const usersListFile     = await openFile( 'text/plain', false ),
			  usersListTextarea = document.getElementById( 'ffz-mass-ban-tool-users-list' );

		if ( usersListFile.type === 'text/plain' ) {
			usersListFile.text()
				.then( ( contents ) => {
					const usersListArray = contents.replace( /\r\n/gm, '\n' ).match( /^.*$/gm );

					for ( const user of usersListArray ) {
						if ( usersListTextarea.value[0] !== usersListTextarea.value[ usersListTextarea.value.length - 1 ] && usersListTextarea.value[ usersListTextarea.value.length - 1 ] !== '\n' ) {
							usersListTextarea.value += '\n';
						}

						usersListTextarea.value += user;
					}

					usersListTextarea.value += '\n';
				} );
		}
	}

	toggleBanReasonField( event ) {
		const massBanToolBanReason = this.massBanToolModal.getElementsByClassName( 'ffz-mass-ban-tool-ban-reason' )[0];

		if ( event.target.value === 'unban' ) {
			massBanToolBanReason.disabled = true;
		} else {
			massBanToolBanReason.disabled = false;
		}
	}

	runTool( users, action, reason ) {
		const usersArray = users.trim().match( /^.*$/gm );
		
		for ( const user of usersArray ) {
			this.actionUser( user, action, reason );
		}
	}

	async actionUser( user, action, reason ) {
		const delay = ( ms ) => {
			new Promise( ( resolve ) => {
				setTimeout( resolve, ms );
			} );
		};

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
		await delay( 350 );
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
		}

		this.log.info( 'Mass Ban Tool add-on successfully enabled.' );
	}
}

MassBanTool.register();
