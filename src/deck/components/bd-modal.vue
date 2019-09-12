<template functional>
	<div
		:id="data.attrs && data.attrs.id"
		:class="data.staticClass"
		class="bd-modal tw-mg-5 tw-border-radius-medium tw-elevation-3 tw-c-background-alt tw-c-text-base tw-border tw-flex-column tw-flex-nowrap"
	>
		<header class="tw-c-background-base tw-flex tw-flex-nowrap tw-align-items-center tw-pd-1">
			<slot name="heading">
				<slot name="title" />
				<div class="tw-flex-grow-1 tw-mg-r-1" />
				<button
					v-if="listeners.close"
					class="tw-button tw-button--text tw-mg-x-05"
					@click="listeners.close"
				>
					<figure class="tw-button__text ffz-i-window-close" />
				</button>
			</slot>
		</header>
		<section class="tw-border-t tw-flex-column">
			<slot />
		</section>
	</div>
</template>