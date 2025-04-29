import { FILE_UPLOAD_BUTTON } from '../../components/file-upload-button';
import { openFileSelector, updateEntryCount } from '../../utils/entries-list.js';

const { createElement } = FrankerFaceZ.utilities.dom;

export class MassTermBlocker {
    constructor( MMU ) {
        this.MMU      = MMU;
        this.toolName = 'term-blocker';
    }
    
    buildToolContent() {
        const fileUploadButton = FILE_UPLOAD_BUTTON.cloneNode( true );
        
        this.toolContent = (
            <div id="ffz-mmu-mass-term-blocker-tool" class="ffz--menu-page" data-mmu-tool-name="term-blocker">
                <div class="tw-mg-y-05">
                    <div class="ffz--widget ffz--text-box default">
                        <div class="tw-flex tw-align-items-center">
                            <label for="ffz-mmu-mass-term-blocker-tool-entries-list">Terms List<br /><span class="ffz-mmu-entry-count-label">(Current Term Count: <span id="ffz-mmu-mass-term-blocker-tool-entry-count" class="ffz-mmu-mass-term-blocker-tool-entry-count ffz-mmu-entry-count" >0</span>)</span></label>

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
                        <div class="tw-flex tw-align-items-start ffz-mmu-mass-term-blocker-tool-upload-field">
                            <label class="tw-mg-y-05" for="ffz-mmu-mass-term-blocker-tool-upload-file">Upload Terms List File</label>
                        </div>

                        <section class="tw-c-text-alt-2">
                            <div>
                                <p>Optionally you can upload a <code>.txt</code> file here to populate the Terms List. Make sure your list consists of one term/phrase per line.</p>
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
                                <p>Select the privacy of the blocked term(s). This setting only applies if you are the streamer/channel owner; moderators are only able to create public blocked terms and setting this to "Private" will cause the mass term blocking to fail.</p>

                                <p><b>NOTE:</b> Due to the nature of private term/phrase blocking, privately-blocked terms/phrases will not display any kind of confirmation of successful blocking such as a toast notification on the page or and entry in the Mod Actions log. You will need to check your <a href="https://dashboard.twitch.tv/settings/moderation/blocked-terms">Blocked Terms And Phrases</a> in your creator dashboard if you wish to confirm that they have been successfully blocked.</p>
                            </div>
                        </section>
                    </div>
                </div>
            </div>
        );

        fileUploadButton.addEventListener( 'click', () => { openFileSelector( this ) } );

        this.toolContent.querySelector( '.ffz-mmu-mass-term-blocker-tool-upload-field' ).append( fileUploadButton );

        this.entriesListTextArea = this.toolContent.querySelector( '.ffz-mmu-mass-term-blocker-tool-entries-list' );

        return this.toolContent;
    }
}
