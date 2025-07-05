import { BUTTON_CLASS } from '../../utils/constants/css-classes';
import { FILE_UPLOAD_BUTTON } from '../../components/file-upload-button';
import { retrievingRecentFollowers } from '../../components/retrieving-recent-followers';
import { isValidDate } from '../../utils/date.js';
import { openFileSelector, addEntryToList, updateEntryCount, detectEnterKey } from '../../utils/entries-list.js';
import GET_RECENT_FOLLOWERS from '../../utils/graphql/recent-followers.gql';

const { createElement } = FrankerFaceZ.utilities.dom;

export class MassBanTool {
    constructor( MMU ) {
        this.MMU      = MMU;
        this.toolName = 'ban';
    }

    buildToolContent() {
        const currentTime           = new Date(),
              fileUploadButton      = FILE_UPLOAD_BUTTON.cloneNode( true ),
              recentFollowersImport = {
                  five:       ( <button type="button" class={BUTTON_CLASS + ' ffz-mmu-mass-ban-tool-5-followers-import'} data-field-type="count" onClick={ ( e ) => this.importRecentFollowers( e, 5 ) }><span class="tw-button__text">5</span></button> ),
                  ten:        ( <button type="button" class={BUTTON_CLASS + ' ffz-mmu-mass-ban-tool-10-followers-import'} data-field-type="count" onClick={ ( e ) => this.importRecentFollowers( e, 10 ) }><span class="tw-button__text">10</span></button> ),
                  twentyFive: ( <button type="button" class={BUTTON_CLASS + ' ffz-mmu-mass-ban-tool-25-followers-import'} data-field-type="count" onClick={ ( e ) => this.importRecentFollowers( e, 25 ) }><span class="tw-button__text">25</span></button> ),
                  oneHundred: ( <button type="button" class={BUTTON_CLASS + ' ffz-mmu-mass-ban-tool-100-followers-import'} data-field-type="count" onClick={ ( e ) => this.importRecentFollowers( e, 100 ) }><span class="tw-button__text">100</span></button> ),
                  fiveHundred: ( <button type="button" class={BUTTON_CLASS + ' ffz-mmu-mass-ban-tool-500-followers-import'} data-field-type="count" onClick={ ( e ) => this.importRecentFollowers( e, 500 ) }><span class="tw-button__text">500</span></button> ),
                  oneThousand: ( <button type="button" class={BUTTON_CLASS + ' ffz-mmu-mass-ban-tool-1000-followers-import'} data-field-type="count" onClick={ ( e ) => this.importRecentFollowers( e, 1000 ) }><span class="tw-button__text">1000</span></button> ),
                  custom:     ( <span class="tw-border-l tw-mg-l-1 tw-pd-l-1">
                      <input type="number" id="ffz-mmu-mass-ban-tool-recent-followers-import-custom-amount" name="ffz-mmu-mass-ban-tool-recent-followers-import-custom-amount" class="tw-border-radius-medium tw-font-size-6 tw-pd-x-1 tw-pd-y-05 tw-mg-05 ffz-input ffz-mmu-mass-ban-tool-recent-followers-import-custom-amount" min="1" max="500" placeholder="Custom" data-field-type="count" onKeyUp={ ( e ) => detectEnterKey( this, e ) } />
        
                      <button type="button" id="ffz-mmu-mass-ban-tool-custom-recent-followers-count-import" class={BUTTON_CLASS + ' ffz-mmu-mass-ban-tool-custom-recent-followers-count-import'} data-field-type="count" onClick={ ( e ) => this.importRecentFollowers( e, parseInt( document.getElementById( 'ffz-mmu-mass-ban-tool-recent-followers-import-custom-amount' ).value ) ) }>
                                <span class="tw-button__text">Import</span>
                      </button>
                  </span> )
                      };
        
                this.toolContent = (
                    <div id="ffz-mmu-mass-ban-tool" class="ffz--menu-page" data-mmu-tool-name="ban">
                        <div class="tw-mg-y-05">
                            <div class="ffz--widget ffz--text-box default">
                                <div class="tw-flex tw-align-items-center">
                                    <label for="ffz-mmu-mass-ban-tool-entries-list">Users List<br /><span class="ffz-mmu-entry-count-label ffz-mmu-sub-label">(Count: <span id="ffz-mmu-mass-ban-tool-entry-count" class="ffz-mmu-mass-ban-tool-entry-count ffz-mmu-entry-count" >0</span>)</span></label>

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
                                <div id="ffz-mmu-mass-ban-tool-recent-followers-count-field" class="tw-flex tw-align-items-start ffz-mmu-mass-ban-tool-recent-followers-count-field">
                                    <label class="tw-mg-y-05" for="ffz-mmu-mass-ban-tool-recent-followers-count-import">Recent Followers<br /><span class="ffz-mmu-sub-label">(by count)</span></label>

                                    <div class="tw-flex tw-mg-t-2 tw-align-items-start ffz-mmu-mass-ban-tool-recent-followers-count-inputs ffz-mmu-mass-ban-tool-recent-followers-inputs"></div>

                                    { retrievingRecentFollowers( 'count' ) }
                                </div>

                                <section class="tw-c-text-alt-2">
                                    <div>
                                        <p>Optionally you can automatically import a specific number of the most recent followers of the channel, up to 1000.</p>
                                    </div>
                                </section>
                            </div>
                        </div>

                        <div class="tw-mg-y-05">
                            <div class="ffz--widget ffz--select-box">
                                <div id="ffz-mmu-mass-ban-tool-recent-followers-timestamp-field" class="tw-flex tw-align-items-start ffz-mmu-mass-ban-tool-recent-followers-timestamp-field">
                                    <label class="tw-mg-y-05">Recent Followers<br /><span class="ffz-mmu-sub-label">(by follow time)</span></label>

                                    <div class="tw-mg-t-2 ffz-mmu-mass-ban-tool-recent-followers-timestamp-inputs ffz-mmu-mass-ban-tool-recent-followers-inputs">

                                        <label class="tw-font-size-7 tw-mg-l-05" for="ffz-mmu-mass-ban-tool-recent-followers-timestamp-import-after-value">After:</label>

                                        <input id="ffz-mmu-mass-ban-tool-recent-followers-timestamp-import-after-value" class="tw-border-radius-medium tw-font-size-6 tw-pd-y-05 tw-mg-05 ffz-input ffz-mmu-mass-ban-tool-recent-followers-timestamp-import-after-value" type="datetime-local" data-field-type="timestamp" onKeyUp={ ( e ) => detectEnterKey( this, e ) } />

                                        <label class="tw-pd-l-1 tw-font-size-7" for="ffz-mmu-mass-ban-tool-recent-followers-timestamp-import-before-value" value={currentTime}>Before:</label>

                                        <input id="ffz-mmu-mass-ban-tool-recent-followers-timestamp-import-before-value" class="tw-border-radius-medium tw-font-size-6 tw-pd-y-05 tw-mg-05 ffz-input ffz-mmu-mass-ban-tool-recent-followers-timestamp-import-before-value" type="datetime-local" data-field-type="timestamp" onKeyUp={ ( e ) => detectEnterKey( this, e ) } />

                                        <button type="button" id="ffz-mmu-mass-ban-tool-recent-followers-timestamp-import-button" class="tw-pd-x-1 tw-pd-y-05 tw-mg-y-05 tw-mg-l-05 tw-border-bottom-left-radius-medium tw-border-bottom-right-radius-medium tw-button ffz-mmu-mass-ban-tool-custom-recent-followers-timestamp-import-button" data-field-type="timestamp" onClick={ ( e ) => this.importRecentFollowers( e ) }><span class="tw-button__text">Import</span></button>
                                    </div>

                                    
                                    { retrievingRecentFollowers( 'timestamp' ) }
                                </div>

                                <section class="tw-c-text-alt-2">
                                    <div>
                                        <p>Optionally you can automatically import all followers within a specific time range, up to 72 hours in the past. These times should be based on <strong>*your*</strong> timezone. The "Before" field is optional and will be ignored if invalid (not fully selected).</p>
                                    </div>
                                </section>
                            </div>
                        </div>

                        <div class="tw-mg-y-05">
                            <div class="ffz--widget ffz--select-box default">
                                <div class="tw-flex tw-align-items-center">
                                    <label class="tw-mg-y-05 action-label" for="ffz-mmu-mass-ban-tool-unban-action">Action To Take</label>

                                    <select id="ffz-mmu-mass-ban-tool-unban-action" class="tw-border-radius-medium tw-font-size-6 ffz-select tw-pd-l-1 tw-pd-r-3 tw-pd-y-05 tw-mg-05 ffz-mmu-mass-ban-tool-action" onChange={ ( e ) => this.toggleBanReasonField( e ) }>
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

                fileUploadButton.addEventListener( 'click', () => { openFileSelector( this.MMU, this ) } );

                this.toolContent.querySelector( '.ffz-mmu-mass-ban-tool-upload-field' ).append( fileUploadButton );
        
                for ( const importCount in recentFollowersImport ) {
                    this.toolContent.querySelector( '.ffz-mmu-mass-ban-tool-recent-followers-count-inputs' ).append( recentFollowersImport[ importCount ] );
                }
                
                this.entriesListTextArea = this.toolContent.querySelector( '.ffz-mmu-mass-ban-tool-entries-list' );

                return this.toolContent;
    }

    getRecentFollowers( channelName, count, cursor ) {
        return this.MMU.apollo.client.query( {
                query: GET_RECENT_FOLLOWERS,
                variables: {
                    login: channelName,
                    first: count,
                    after: cursor
                }
        } )
    }

    async importRecentFollowers( event, count ) {
        const fieldType   = event.target.dataset.fieldType,
              customCount = {
                  value:  document.getElementById( 'ffz-mmu-mass-ban-tool-recent-followers-import-custom-amount' ),
                  button: document.getElementById( 'ffz-mmu-mass-ban-tool-custom-recent-followers-count-import' )
              }

        let afterTime, beforeTime, currentDate, timeLimit, selectedTime,
            stats         = {},
            followersList = [];

        if ( fieldType === 'count' && count !== 0 && ! count ) {
            return;
        }

        if ( fieldType === 'timestamp' ) {
            afterTime  = document.getElementById( 'ffz-mmu-mass-ban-tool-recent-followers-timestamp-import-after-value' ),
            beforeTime = document.getElementById( 'ffz-mmu-mass-ban-tool-recent-followers-timestamp-import-before-value' ),
            currentDate  = new Date(),
            timeLimit    = new Date( currentDate.getTime() - 72 * 60 * 60 * 1000 ),
            selectedTime = {
                before: new Date( beforeTime.value ),
                after:  new Date( afterTime.value )
            };

            if ( ! isValidDate( selectedTime.after ) ) {
                selectedTime.after = null;
            }

            if ( ! isValidDate( selectedTime.before ) ) {
                selectedTime.before = null;
            }

            if ( selectedTime.before > currentDate ) {
                selectedTime.before.setTime( currentDate );
            }

            stats.first  = selectedTime.after.toLocaleString();
            stats.second = selectedTime.before.toLocaleString();
        }

        switch ( true ) {
            case fieldType === 'count' && ! ( count >= 1 && count <= 1000 ):
                alert( 'Number of recent followers to import must be between 1 and 1000.' );
                return;

            case fieldType === 'timestamp' && ( selectedTime.after === null && selectedTime?.before === null ):
                alert( 'At least one follow time must be selected.' );
                return;

            case fieldType === 'timestamp' && ( selectedTime?.after !== null && selectedTime?.after < timeLimit ):
                alert( '"After" follow time cannot be more than 72 hours before current time.' );
                return;

            case fieldType === 'timestamp' && ( selectedTime?.before !== null && selectedTime?.before < timeLimit ):
                alert( '"Before" follow time cannot be more than 72 hours before current time.' );
                return;

            case fieldType === 'timestamp' && ( selectedTime?.after && selectedTime?.after > currentDate ):
                alert( '"After" follow time cannot be in the future.' );
                return;

            case fieldType === 'timestamp' && ( selectedTime?.before !== null && selectedTime?.after !== null && selectedTime?.before < selectedTime?.after ):
                alert( '"Before" follow time cannot be set to a time that comes before the "After" follow time.' );
                return;
        }

        if ( fieldType === 'count' && ( event.target === customCount.value || event.target === customCount.button ) ) {
            customCount.value.value = '';
        } else if ( fieldType === 'timestamp' ) {
            afterTime.value  = '';
            beforeTime.value = '';
        }

        try {
            if ( ! this.MMU.apollo ) {
                return;
            }

            let gqlCursor, gqlCount;

            if ( fieldType === 'count' ) {
                stats.first = 0;
                stats.second = count;
            }

            this.updateStats( fieldType, stats );

            this.toggleLoadingFollowers( fieldType );

            do {
                gqlCount = count;

                if ( fieldType === 'timestamp' || count > 100 ) {
                    gqlCount = 100;
                }

                const followers = await this.getRecentFollowers( this.MMU.channelName, gqlCount, gqlCursor );

                for ( const follower of followers?.data?.user?.followers?.edges ) {
                    let followedAt = new Date ( follower.followedAt );

                    // Before time not working? Always selecting all 100
                    if ( fieldType === 'timestamp' && ( ( selectedTime.after !== null && followedAt < selectedTime.after ) || ( selectedTime.before !== null && followedAt > selectedTime.before ) ) || followersList.includes( follower.node.displayName ) ) {
                        count = gqlCount;
                        break;
                    }

                    addEntryToList( this.MMU, this, follower.node.displayName );

                    followersList.push( follower.node.displayName );

                    gqlCursor = follower.cursor;
                }

                count = count - gqlCount;

                if ( fieldType === 'count' ) {
                    stats.first += gqlCount;

                    this.updateStats( fieldType, stats )
                }
            } while ( count > 0 );
        } catch {
            this.toggleLoadingFollowers( fieldType );
            return;
        }

        this.toggleLoadingFollowers( fieldType );
	}

    updateStats( fieldType, stats ) {
        let stat1, stat2;

        const idPrefix = `ffz-mmu-mass-ban-tool-recent-followers-retrieving-${fieldType}`;

        if ( fieldType === 'count' ) {
            stat1 = document.getElementById( idPrefix + '-current' );
            stat2 = document.getElementById( idPrefix + '-max' );
        } else if ( fieldType === 'timestamp' ) {
            stat1 = document.getElementById( idPrefix + '-stat-after' );
            stat2 = document.getElementById( idPrefix + '-stat-before' );
        }

        stat1.textContent = stats.first;
        stat2.textContent = stats.second;
    }

    toggleLoadingFollowers( fieldType ) {
		document.getElementById( `ffz-mmu-mass-ban-tool-recent-followers-${fieldType}-field` ).classList.toggle( 'loading' );
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
