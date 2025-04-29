import { BUTTON_CLASS } from '../../utils/constants/css-classes';
import { FILE_UPLOAD_BUTTON } from '../../components/file-upload-button';
import { openFileSelector, addEntryToList, updateEntryCount } from '../../utils/entries-list.js';
import GET_RECENT_FOLLOWERS from '../../utils/graphql/recent-followers.gql';

const { createElement } = FrankerFaceZ.utilities.dom;

export class MassBanTool {
    constructor( MMU ) {
        this.MMU      = MMU;
        this.toolName = 'ban';
    }

    buildToolContent() {
        const fileUploadButton = FILE_UPLOAD_BUTTON.cloneNode( true ),
              recentFollowersImport = {
                  five:       ( <button type="button" class={BUTTON_CLASS + ' ffz-mmu-mass-ban-tool-5-followers-import'} onClick={ () => this.importRecentFollowers( 5 ) }><span class="tw-button__text">5</span></button> ),
                  ten:        ( <button type="button" class={BUTTON_CLASS + ' ffz-mmu-mass-ban-tool-10-followers-import'} onClick={ () => this.importRecentFollowers( 10 ) }><span class="tw-button__text">10</span></button> ),
                  twentyFive: ( <button type="button" class={BUTTON_CLASS + ' ffz-mmu-mass-ban-tool-25-followers-import'} onClick={ () => this.importRecentFollowers( 25 ) }><span class="tw-button__text">25</span></button> ),
                  oneHundred: ( <button type="button" class={BUTTON_CLASS + ' ffz-mmu-mass-ban-tool-100-followers-import'} onClick={ () => this.importRecentFollowers( 100 ) }><span class="tw-button__text">100</span></button> ),
                  custom:     ( <span class="tw-border-l tw-mg-l-1 tw-pd-l-1">
                      <input type="number" id="ffz-mmu-mass-ban-tool-followers-import-custom-amount" name="ffz-mmu-mass-ban-tool-followers-import-custom-amount" class="tw-border-radius-medium tw-font-size-6 tw-pd-x-1 tw-pd-y-05 tw-mg-05 ffz-input ffz-mmu-mass-ban-tool-followers-import-custom-amount" min="1" max="100" placeholder="Custom" onKeyUp={ ( event ) => {
                                    if ( event.key === 'Enter' ) {
                                        const value = parseInt( document.getElementById( 'ffz-mmu-mass-ban-tool-followers-import-custom-amount' ).value );

                                        if ( ! isNaN( value ) ) {
                                            this.importCustomFollowersAmount( value );
                                        }
                                    }
                                } }/>
        
                      <button type="button" id="ffz-mmu-mass-ban-tool-custom-followers-import" class={BUTTON_CLASS + ' ffz-mmu-mass-ban-tool-custom-followers-import'} onClick={ () => this.importCustomFollowersAmount( parseInt( document.getElementById( 'ffz-mmu-mass-ban-tool-followers-import-custom-amount' ).value ) ) }>
                                <span class="tw-button__text">Import</span>
                      </button>
                  </span> )
                      };
        
                this.toolContent = (
                    <div id="ffz-mmu-mass-ban-tool" class="ffz--menu-page" data-mmu-tool-name="ban">
                        <div class="tw-mg-y-05">
                            <div class="ffz--widget ffz--text-box default">
                                <div class="tw-flex tw-align-items-center">
                                    <label for="ffz-mmu-mass-ban-tool-entries-list">Users List<br /><span class="ffz-mmu-entry-count-label">(Current User Count: <span id="ffz-mmu-mass-ban-tool-entry-count" class="ffz-mmu-mass-ban-tool-entry-count ffz-mmu-entry-count" >0</span>)</span></label>

                                    <textarea id="ffz-mmu-mass-ban-tool-entries-list" class="tw-border-radius-medium tw-font-size-6 tw-pd-x-1 tw-pd-y-05 tw-mg-05 ffz-input ffz-mmu-mass-ban-tool-entries-list ffz-mmu-entries-list" placeholder="Username1&#10;Username2&#10;Username3&#10;Etc." rows="10" onKeyUp={ () => updateEntryCount( this.MMU, this ) }></textarea>
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
                                <div class="tw-flex tw-align-items-start ffz-mmu-mass-ban-tool-upload-field">
                                    <label class="tw-mg-y-05" for="ffz-mmu-mass-ban-tool-upload-file">Upload Users List File</label>
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
                                <div id="ffz-mmu-mass-ban-tool-recent-followers-field" class="tw-flex tw-align-items-start ffz-mmu-mass-ban-tool-recent-followers-field">
                                    <label class="tw-mg-y-05" for="ffz-mmu-mass-ban-tool-recent-followers-import">Recent Followers</label>

                                    <div class="tw-flex tw-align-items-start ffz-mmu-mass-ban-tool-recent-followers-inputs"></div>

                                    <div class="tw-flex tw-align-items-start tw-pd-y-05 tw-mg-y-05 ffz-mmu-mass-ban-tool-recent-followers-loading">
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
                                    <label class="tw-mg-y-05 action-label" for="ffz-mmu-mass-ban-tool-unban-action">Action To Take</label>

                                    <select id="ffz-mmu-mass-ban-tool-unban-action" class="tw-border-radius-medium tw-font-size-6 ffz-select tw-pd-l-1 tw-pd-r-3 tw-pd-y-05 tw-mg-05 ffz-mmu-mass-ban-tool-action" onChange={ ( event ) => this.toggleBanReasonField( event ) }>
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
                                    <label for="ffz-mmu-mass-ban-tool-ban-reason">Reason for Ban</label>

                                    <input id="ffz-mmu-mass-ban-tool-ban-reason" class="tw-border-radius-medium tw-font-size-6 tw-pd-x-1 tw-pd-y-05 tw-mg-05 ffz-input ffz-mmu-mass-ban-tool-ban-reason" type="text" placeholder="Being a troll" />
                                </div>

                                <section class="tw-c-text-alt-2">
                                    <div>
                                        <p>An optional reason for the ban which will be applied to every ban. Not applicable when unbanning.</p>
                                    </div>
                                </section>
                            </div>
                        </div>
                    </div>
                );

                fileUploadButton.addEventListener( 'click', () => { openFileSelector( this ) } );

                this.toolContent.querySelector( '.ffz-mmu-mass-ban-tool-upload-field' ).append( fileUploadButton );
        
                for ( const importCount in recentFollowersImport ) {
                    this.toolContent.querySelector( '.ffz-mmu-mass-ban-tool-recent-followers-inputs' ).append( recentFollowersImport[ importCount ] );
                }
                
                this.entriesListTextArea = this.toolContent.querySelector( '.ffz-mmu-mass-ban-tool-entries-list' );

                return this.toolContent;
    }

    async importRecentFollowers( count ) {
        if ( count !== 0 && ! count ) {
            return;
        }

		if ( count >= 1 && count <= 100 ) {
			this.toggleLoadingFollowers();

			try {
				if ( ! this.MMU.apollo ) {
                    this.toggleLoadingFollowers();
                    return;
				}

				const followers = await this.MMU.apollo.client.query( {
						query: GET_RECENT_FOLLOWERS,
						variables: {
							login: this.MMU.channelName,
							first: count
						}
				} )

				for ( const follower of followers?.data?.user?.followers?.edges ) {
					addEntryToList( this, follower.node.displayName );
				}
			} catch {
                this.toggleLoadingFollowers();
                return;
            }

			this.toggleLoadingFollowers();
		} else {
			alert( 'Number of recent followers to import must be between 1 and 100.' );
		}
	}

    importCustomFollowersAmount( count ) {
		document.getElementById( 'ffz-mmu-mass-ban-tool-followers-import-custom-amount' ).value = '';

		this.importRecentFollowers( count );
	}

    toggleLoadingFollowers() {
		document.getElementById( 'ffz-mmu-mass-ban-tool-recent-followers-field' ).classList.toggle( 'loading' );
	}

    toggleBanReasonField( event ) {
		const banReason = this.toolContent.querySelector( '.ffz-mmu-mass-ban-tool-ban-reason' );

		if ( event.target.value === 'unban' ) {
			banReason.disabled = true;
		} else {
			banReason.disabled = false;
		}
	}
}
