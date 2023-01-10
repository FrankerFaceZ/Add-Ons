<template>
    <div id="ffz-clip-confirm-modal" class="ReactModal__Overlay ReactModal__Overlay--after-open modal__backdrop js-modal-backdrop">
		<div id="ffz-clip-confirm-modal-inner" class="tw-modal">
			<header class="tw-full-width tw-align-items-center tw-flex tw-flex-nowrap">
				<h6 id="ffz-clip-confirm-modal-title">{{ t( 'addon.clip-confirm.modal-title', 'Confirm Clip Creation' ) }}</h6>
			</header>
			
			<section id="ffz-clip-confirm-modal-content">
				<p>{{ t('addon.clip-confirm.create-new', 'Create a new') }} <b>{{ t( 'addon.clip-confirm.channel-name', channelName ) }}</b> {{ t( 'addon.clip-confirm.clip', 'clip' ) }}?</p>
			</section>

			<section id="ffz-clip-confirm-modal-buttons">
				<button id="ffz-clip-confirm-modal-cancel-button" class="ffz-clip-confirm-modal-button">No, cancel</button>

				<button id="ffz-clip-confirm-modal-confirm-button" class="ffz-clip-confirm-modal-button">Yes, create clip</button>

				<button id="ffz-clip-confirm-modal-close-button" class="ffz-clip-confirm-modal-button modal__close-button modal__close-button--inset">
					<svg class="ffz-clip-confirm-svg-icon" width="100%" height="100%" version="1.1" viewBox="0 0 20 20" x="0px" y="0px">
						<g>
							<path d="M8.5 10L4 5.5 5.5 4 10 8.5 14.5 4 16 5.5 11.5 10l4.5 4.5-1.5 1.5-4.5-4.5L5.5 16 4 14.5 8.5 10z"></path>
						</g>
					</svg>
				</button>
			</section>
		</div>
	</div>
</template>

<script>
export default {
	data() {
		return {
			channelName: document.getElementsByClassName( 'channel-info-content' )[0] ? document.getElementsByClassName( 'channel-info-content' )[0].getElementsByTagName( 'h1' )[0].textContent.trim() : document.querySelector( '[data-test-selector="stream-info-card-component__title-link"]' ).textContent.trim()
		}
	}
}
</script>
