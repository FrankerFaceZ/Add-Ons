<template functional>
	<div :id="data.attrs && data.attrs.id" class="preview-card" :class="data.class" v-on="listeners">
		<div class="tw-relative">
			<react-link
				class="tw-interactive ffz-link"
				:href="props.link"
				:state="props.state"
				data-a-target="preview-card-image-link"
				v-on="props.clickCard || props.click ? {click: props.clickCard || props.click} : {}"
			>
				<div class="tw-border-radius-medium tw-c-background-alt-2 tw-overflow-hidden">
					<aspect :ratio="16/9">
						<div class="preview-card-thumbnail__image">
							<iframe
								v-if="props.embed"
								class="tw-full-width"
								:src="props.embed"
								allowfullscreen="false"
								allow="accelerometer; autoplay; encrypted-media; gyroscope"
								frameborder="0"
							/>
							<img
								v-else
								class="tw-image tw-full-width"
								:alt="props.cardTitle || props.title"
								:src="props.image"
							/>
						</div>
					</aspect>
				</div>
				<div class="preview-card-overlay tw-absolute tw-full-height tw-full-width tw-left-0 tw-top-0">
					<slot name="preview-extra" />
					<div data-test-selector="top-left-selector" class="tw-absolute tw-left-0 tw-mg-1 tw-top-0">
						<slot name="top-left" />
						<div v-if="props.topLeft" class="preview-card-stat tw-align-items-center tw-border-radius-small tw-c-background-overlay tw-c-text-overlay tw-flex tw-font-size-6 tw-justify-content-center tw-pd-x-05">
							<figure v-if="props.topLeftIcon" :class="props.topLeftIcon" />
							<p>{{ props.topLeft }}</p>
						</div>
					</div>
					<div data-test-selector="top-right-selector" class="tw-absolute tw-mg-1 tw-right-0 tw-top-0">
						<slot name="top-right" />
						<div v-if="props.topRight" class="preview-card-stat tw-align-items-center tw-border-radius-small tw-c-background-overlay tw-c-text-overlay tw-flex tw-font-size-6 tw-justify-content-center tw-pd-x-05">
							<figure v-if="props.topRightIcon" :class="props.topRightIcon" />
							<p>{{ props.topRight }}</p>
						</div>
					</div>
					<div data-test-selector="bottom-left-selector" class="tw-absolute tw-bottom-0 tw-left-0 tw-mg-x-1 tw-mg-y-1">
						<slot name="bottom-left" />
						<div v-if="props.bottomLeft" class="preview-card-stat tw-align-items-center tw-border-radius-small tw-c-background-overlay tw-c-text-overlay tw-flex tw-font-size-6 tw-justify-content-center tw-pd-x-05">
							<figure v-if="props.bottomLeftIcon" :class="props.bottomLeftIcon" />
							<p>{{ props.bottomLeft }}</p>
						</div>
					</div>
					<div data-test-selector="bottom-right-selector" class="tw-absolute tw-bottom-0 tw-mg-x-1 tw-mg-y-1 tw-right-0">
						<slot name="bottom-right" />
						<div v-if="props.bottomRight" class="preview-card-stat tw-align-items-center tw-border-radius-small tw-c-background-overlay tw-c-text-overlay tw-flex tw-font-size-6 tw-justify-content-center tw-pd-x-05">
							<figure v-if="props.bottomRightIcon" :class="props.bottomRightIcon" />
							<p>{{ props.bottomRight }}</p>
						</div>
					</div>
				</div>
			</react-link>
		</div>
		<div class="tw-flex tw-flex-nowrap tw-mg-t-1">
			<div v-if="!!props.avatar || !!props.boxart || !!$scopedSlots['iconic']" class="tw-flex-grow-0 tw-flex-shrink-0 tw-mg-r-1">
				<slot name="iconic" />
				<react-link v-if="props.avatar" class="tw-interactive ffz-link" :href="props.avatarLink || props.link" v-on="props.clickAvatar || props.click ? {click: props.clickAvatar || props.click} : {}">
					<div class="deck-card-iconic-image__wrapper tw-border-radius-small tw-overflow-hidden">
						<aspect>
							<figure class="ffz-avatar ffz-avatar--size-40">
								<div class="tw-border-radius-rounded tw-overflow-hidden">
									<img class="ffz-avatar__img tw-image" :alt="props.avatarTitle || props.title" :src="props.avatar">
								</div>
							</figure>
						</aspect>
					</div>
				</react-link>
				<react-link v-else-if="props.boxart" class="tw-interactive ffz-link" :href="props.boxartLink || props.link" v-on="props.clickBoxart || props.click ? {click: props.clickBoxart || props.click} : {}">
					<div class="deck-card-iconic-image__wrapper tw-border-radius-small tw-overflow-hidden">
						<aspect align="center" :ratio="0.75">
							<img
								class="tw-image"
								:alt="props.boxartTitle || props.title" :src="props.boxart"
							>
						</aspect>
					</div>
				</react-link>
			</div>
			<div class="deck-card__titles-wrapper tw-flex-grow-1 tw-flex-shrink-1 tw-full-width">
				<div>
					<span class="tw-c-text-alt">
						<react-link class="tw-interactive ffz-link ffz-link--hover-underline-none ffz-link--inherit" :href="props.titleLink || props.link" v-on="props.clickTitle || props.click ? {click: props.clickTitle || props.click} : {}">
							<h3 class="tw-ellipsis tw-font-size-5" :title="props.title">{{ props.title }}</h3>
						</react-link>
					</span>
					<div v-if="!!$scopedSlots['subtitles']" class="deck-card-titles__subtitle-wrapper">
						<slot name="subtitles" />
					</div>
				</div>
				<bd-tag-list v-if="Array.isArray(props.tags) && props.tags.length > 0" :tags="props.tags" />
			</div>
		</div>
	</div>
</template>