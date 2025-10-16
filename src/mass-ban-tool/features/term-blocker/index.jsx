import { FILE_UPLOAD_BUTTON } from '../../components/file-upload-button';
import { EXPORT_BUTTONS } from '../../components/export-buttons';
import { openFileSelector, updateEntryCount } from '../../utils/entries-list.js';
import { padDateString } from '../../utils/date.js';
import GET_BLOCKED_TERMS from '../../utils/graphql/get-blocked-terms.gql';

const { createElement } = FrankerFaceZ.utilities.dom;

export class MassTermBlocker {
    constructor( MMU ) {
        this.MMU      = MMU;
        this.toolName = 'term-blocker';
    }
    
    buildToolContent() {
        const fileUploadButton = FILE_UPLOAD_BUTTON.cloneNode( true ),
              exportButtons    = {
                csv: EXPORT_BUTTONS.csv.cloneNode( true ),
                txt: EXPORT_BUTTONS.txt.cloneNode( true )
              };
        
        this.toolContent = (
            <div id="ffz-mmu-mass-term-blocker-tool" class="ffz--menu-page" data-mmu-tool-name="term-blocker">
                <div class="tw-mg-y-05">
                    <div class="ffz--widget ffz--text-box default">
                        <div class="tw-flex tw-align-items-center">
                            <label for="ffz-mmu-mass-term-blocker-tool-entries-list">Terms List<br /><span class="ffz-mmu-entry-count-label">(Count: <span id="ffz-mmu-mass-term-blocker-tool-entry-count" class="ffz-mmu-mass-term-blocker-tool-entry-count ffz-mmu-entry-count" >0</span>)</span></label>

                            <textarea id="ffz-mmu-mass-term-blocker-tool-entries-list" class="tw-border-radius-medium tw-font-size-6 tw-pd-x-1 tw-pd-y-05 tw-mg-05 ffz-input ffz-mmu-mass-term-blocker-tool-entries-list ffz-mmu-entries-list" placeholder="Term1&#10;Term2&#10;Term3&#10;Etc." rows="10" onKeyUp={ () => updateEntryCount( this.MMU, this ) }></textarea>
                        </div>

                        <section class="tw-c-text-alt-2">
                            <div>
                                <p>The list of terms/phrases you wish to block. List one term per line.</p>
                            </div>
                        </section>
                    </div>
                </div>

                <div class="tw-mg-y-05">
                    <div class="ffz--widget ffz--select-box">
                        <div class="tw-flex tw-align-items-center ffz-mmu-mass-term-blocker-tool-upload-field">
                            <label class="tw-mg-y-05" for="ffz-mmu-mass-term-blocker-tool-upload-file">Upload Terms List File</label>
                        </div>

                        <section class="tw-c-text-alt-2">
                            <div>
                                <p>Optionally you can upload a <code>.csv</code> or <code>.txt</code> file here to populate the Terms List. Make sure your list consists of one term/phrase per line/row.</p>
                            </div>
                        </section>
                    </div>
                </div>

                <div class="tw-mg-y-05">
                    <div class="ffz--widget ffz--select-box">
                        <div class="tw-flex tw-align-items-center ffz-mmu-mass-term-blocker-tool-export-field">
                            <label class="tw-mg-y-05" for="ffz-mmu-mass-term-blocker-tool-export-button">Export Currently Blocked Terms</label>
                        </div>

                        <section class="tw-c-text-alt-2">
                            <div>
                                <p>You can use these buttons to export MMU-compatible <code>.csv</code> or <code>.txt</code> files of your public blocked terms. I plan on expanding this feature in the future to allow for more granularity and also to be accessible from the creator dashboard but for now it is simply a complete list of your <strong>Public</strong> blocked terms so please be sure to double-check the list before sharing it with anyone to ensure that anything you wouldn't want out in public doesn't get leaked.</p>
                            </div>
                        </section>
                    </div>
                </div>

                <div class="tw-mg-y-05">
                    <div class="ffz--widget ffz--select-box default">
                        <div class="tw-flex tw-align-items-center">
                            <label class="tw-mg-y-05 action-label" for="ffz-mmu-mass-term-blocker-tool-privacy">Privacy</label>

                            <select id="ffz-mmu-mass-term-blocker-tool-privacy" class="tw-border-radius-medium tw-font-size-6 ffz-select tw-pd-l-1 tw-pd-r-3 tw-pd-y-05 tw-mg-05 ffz-mmu-mass-term-blocker-tool-privacy">
                                <option value="public">Public</option>

                                <option value="private">Private</option>
                            </select>
                        </div>

                        <section class="tw-c-text-alt-2">
                            <div>
                                <p>Select the privacy of the blocked term(s). This setting only applies if you are the streamer/channel owner; moderators are only able to create public blocked terms and setting this to "Private" will cause the mass term blocking to fail if you are not the owner of the channel you are running the tool in.</p>

                                <p><b>NOTE:</b> Due to the nature of private term/phrase blocking, privately-blocked terms/phrases will not display any kind of confirmation of successful blocking such as a toast notification on the page or an entry in the Mod Actions log. You will need to check your <a href="https://dashboard.twitch.tv/settings/moderation/blocked-terms">Blocked Terms And Phrases</a> in your creator dashboard if you wish to confirm that they have been successfully blocked.</p>
                            </div>
                        </section>
                    </div>
                </div>
            </div>
        );

        fileUploadButton.addEventListener( 'click', () => { openFileSelector( this.MMU, this ) } );

        this.toolContent.querySelector( '.ffz-mmu-mass-term-blocker-tool-upload-field' ).append( fileUploadButton );

        exportButtons.csv.addEventListener( 'click', () => { this.exportTerms( 'csv' ) } );
        exportButtons.txt.addEventListener( 'click', () => { this.exportTerms( 'plain' ) } );

        this.toolContent.querySelector( '.ffz-mmu-mass-term-blocker-tool-export-field' ).append( exportButtons.csv );
        this.toolContent.querySelector( '.ffz-mmu-mass-term-blocker-tool-export-field' ).append( exportButtons.txt );

        this.entriesListTextArea = this.toolContent.querySelector( '.ffz-mmu-mass-term-blocker-tool-entries-list' );

        return this.toolContent;
    }

    getBlockedTerms( channelName ) {
        return this.MMU.apollo.client.query( {
                query: GET_BLOCKED_TERMS,
                variables: {
                    login: channelName
                }
        } )
    }

    compileTermsForExport( blockedTerms ) {
        let exportedTerms = '';

        this.MMU.log.info( blockedTerms );
        this.MMU.log.info( exportedTerms );

        for ( const term of blockedTerms ) {
            if ( term.isModEditable ) {
                exportedTerms += term.phrases[0] + "\r\n";
            }
        }

        return exportedTerms;
    }

    async exportTerms( type ) {
        const blockedTermsQuery = await this.getBlockedTerms( this.MMU.channelName ),
              blockedTerms      = blockedTermsQuery.data.user.blockedTerms,
              exportLink        = document.createElement( 'a' ),
              currentDate       = new Date(),
              fullDatetime     = {
                year:    currentDate.getFullYear(),
                month:   String( currentDate.getMonth() ),
                date:    String( currentDate.getDate() ),
                hours:   String( currentDate.getHours() ),
                minutes: String( currentDate.getMinutes() ),
                seconds: String( currentDate.getSeconds() )
              };

        let fileContents, filetype;

        if ( type === 'csv' ) {
            filetype = 'csv';
        } else {
            filetype = 'txt';
        }

        fileContents = this.compileTermsForExport( blockedTerms );

        const file = new Blob( [ fileContents ], { type: 'text/' + type } );

        exportLink.download = 'blocked-terms_' + this.MMU.channelName
            + '_' + fullDatetime.year
            + '-' + padDateString( fullDatetime.month )
            + '-' + padDateString( fullDatetime.date )
            + '_'
            + padDateString( fullDatetime.hours )
            + '-' + padDateString( fullDatetime.minutes )
            + '-' + padDateString( fullDatetime.seconds )
            + '.' + filetype;

        exportLink.href = URL.createObjectURL( file );

        exportLink.click();

        URL.revokeObjectURL( exportLink.href );
    }
}
