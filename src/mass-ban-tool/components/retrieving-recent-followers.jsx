const { createElement } = FrankerFaceZ.utilities.dom;

export function retrievingRecentFollowers( fieldType ) {
    let additionalInfo;

    if ( fieldType === 'count' ) {
        additionalInfo = (
            <span id={`ffz-mmu-mass-ban-tool-recent-followers-retrieving-${fieldType}-stats`} class={`tw-border-l tw-mg-l-05 tw-pd-l-05 ffz-mmu-mass-ban-tool-recent-followers-retrieving-${fieldType}-stats`}>
                (<span id={`ffz-mmu-mass-ban-tool-recent-followers-retrieving-${fieldType}-current`} class={`ffz-mmu-mass-ban-tool-recent-followers-retrieving-${fieldType} ffz-mmu-mass-ban-tool-recent-followers-retrieving-${fieldType}-current`}></span> of <span id={`ffz-mmu-mass-ban-tool-recent-followers-retrieving-${fieldType}-max`} class={`ffz-mmu-mass-ban-tool-recent-followers-retrieving-${fieldType} ffz-mmu-mass-ban-tool-recent-followers-retrieving-${fieldType}-max`}></span> completed)
            </span>
        );
    } else {
        additionalInfo = (
            <span id={`ffz-mmu-mass-ban-tool-recent-followers-retrieving-${fieldType}-stats`} class={`ffz-mmu-mass-ban-tool-recent-followers-retrieving-${fieldType}-stats`}>
                <span id={`ffz-mmu-mass-ban-tool-recent-followers-retrieving-${fieldType}-stat-label-after`} class={`tw-border-l tw-mg-l-05 tw-pd-l-05 ffz-mmu-mass-ban-tool-recent-followers-retrieving-${fieldType}-stat-label ffz-mmu-mass-ban-tool-recent-followers-retrieving-${fieldType}-stat-label-after`}>After: <span id={`ffz-mmu-mass-ban-tool-recent-followers-retrieving-${fieldType}-stat-after`} class={`ffz-mmu-mass-ban-tool-recent-followers-retrieving-${fieldType}-stat ffz-mmu-mass-ban-tool-recent-followers-retrieving-${fieldType}-stat-after`}></span>
                </span>
                
                <span id="ffz-mmu-mass-ban-tool-comma" class="ffz-mmu-mass-ban-tool-comma">, </span>
                
                <span id={`ffz-mmu-mass-ban-tool-recent-followers-retrieving-${fieldType}-stat-label-before`} class={`ffz-mmu-mass-ban-tool-recent-followers-retrieving-${fieldType}-stat-label ffz-mmu-mass-ban-tool-recent-followers-retrieving-${fieldType}-stat-label-before`}>Before: <span id={`ffz-mmu-mass-ban-tool-recent-followers-retrieving-${fieldType}-stat-before`} class={`ffz-mmu-mass-ban-tool-recent-followers-retrieving-${fieldType}-stat ffz-mmu-mass-ban-tool-recent-followers-retrieving-${fieldType}-stat-before`}></span>
                </span>
            </span>
        );
    }

    return (
         <div class="tw-flex tw-align-items-start tw-pd-y-05 tw-mg-y-05 ffz-mmu-mass-ban-tool-recent-followers-loading">
            <figure class="ffz-i-t-reset loading tw-mg-r-05"></figure>
            Retrieving recent followers…
            {
                additionalInfo
            }
        </div>
    );
}
