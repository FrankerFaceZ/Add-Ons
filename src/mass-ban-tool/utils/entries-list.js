const { openFile } = FrankerFaceZ.utilities.dom;

export async function openFileSelector( MMU, tool ) {
    const entriesListFile = await openFile( 'text/plain', false );

    if ( entriesListFile.type === 'text/plain' ) {
        entriesListFile.text()
            .then( ( contents ) => {
                const entriesListArray = contents.replace( /\r\n/gm, '\n' ).match( /^.*$/gm );

                for ( const entry of entriesListArray ) {
                    addEntryToList( MMU, tool, entry );
                }
            } );
    }
}

export function addEntryToList( MMU, tool, user ) {
    if ( tool.entriesListTextArea.value[0] !== tool.entriesListTextArea.value[ tool.entriesListTextArea.value.length - 1 ] && tool.entriesListTextArea.value[ tool.entriesListTextArea.value.length - 1 ] !== '\n' ) {
        tool.entriesListTextArea.value += '\n';
    }

    tool.entriesListTextArea.value += user.trim();

    if ( tool.entriesListTextArea.value[ tool.entriesListTextArea.value.length - 1 ] !== '\n' ) {
        tool.entriesListTextArea.value += '\n';
    }

    tool.entriesListTextArea.scrollTop = tool.entriesListTextArea.scrollHeight;

    updateEntryCount( MMU, tool );
}

export function updateEntryCount( MMU, tool ) {
    MMU.modal.querySelector( `#ffz-mmu-mass-${tool.toolName}-tool-entry-count` ).textContent = tool.entriesListTextArea.value.trim().split( /[\r\n|\r|\n]/ ).filter( Boolean ).length;
}
