<template functional>
	<div
		:id="data.attrs && data.attrs.id"
		class="side-nav-card tw-relative"
		:class="data.class"
		v-on="listeners"
	>
		<react-link
			class="tw-pd-y-05 tw-pd-x-1 tw-flex tw-align-items-center tw-flex-nowrap tw-full-width side-nav-card__link tw-link ffz-tooltip ffz-tooltip--no-mouse"
			:href="props.link"
			:state="props.state"
			data-tooltip-type="bd-sidebar-card"
			:data-tooltip-side="props.tooltipSide || 'right'"
			v-on="props.clickCard || props.click ? {click: props.clickCard || props.click} : {}"
		>
			<div v-if="props.avatar" class="tw-flex-shrink-0 side-nav-card__avatar tw-mg-r-1">
				<figure
					class="tw-relative ffz-avatar ffz-avatar--size-30"
					:aria-label="props.avatarTitle"
				>
					<div class="tw-border-radius-rounded tw-overflow-hidden">
						<img
							class="ffz-avatar__img tw-image"
							:alt="props.avatarTitle"
							:src="props.avatar"
						>
					</div>
				</figure>
			</div>
			<div class="tw-flex tw-ellipsis tw-full-width tw-justify-content-between">
				<div
					class="tw-ellipsis tw-full-width"
					data-a-target="side-nav-card-metadata"
				>
					<div class="tw-flex tw-align-items-center side-nav-card__title">
						<slot name="title" />
						<p
							v-if="props.title"
							class="tw-flex-grow-1 tw-ellipsis tw-semibold tw-c-text-alt tw-font-size-5 tw-line-height-heading"
							:title="props.title"
						>
							{{ props.title }}
						</p>
					</div>
					<div class="side-nav-card__metadata">
						<slot name="subtitle" />
						<p
							v-if="props.subtitle"
							class="tw-c-text-alt-2 tw-font-size-6 tw-line-height-heading tw-ellipsis"
							:title="props.subtitle"
						>
							{{ props.subtitle }}
						</p>
					</div>
					<div class="side-nav-card__metadata">
						<slot name="subsubtitle" />
						<p
							v-if="props.subsubtitle"
							class="tw-c-text-alt-2 tw-font-size-6 tw-line-height-heading tw-ellipsis"
							:title="props.subsubtitle"
						>
							{{ props.subsubtitle }}
						</p>
					</div>
				</div>
				<div
					class="tw-flex-shrink-0 tw-mg-l-05"
					data-a-target="side-nav-live-status"
				>
					<slot name="status" />
					<div
						v-if="props.viewers"
						class="tw-flex tw-align-items-center tw-justify-content-end"
					>
						<div class="bd-shelf-status-indicator" />
						<div class="tw-mg-l-05 tw-c-text-alt tw-font-size-6 tw-line-height-heading">
							{{ props.viewers }}
						</div>
					</div>
					<div
						v-if="props.views"
						class="tw-flex tw-align-items-center tw-justify-content-end"
					>
						<div class="tw-mg-l-05 tw-c-text-alt tw-font-size-6 tw-line-height-heading">
							{{ props.views }}
						</div>
					</div>
					<div class="side-nav-uptime">
						<slot name="substatus" />
						<p
							v-if="props.substatus"
							class="ffz-i-clock tw-c-text-alt-2 tw-font-size-6 tw-line-height-heading tw-align-right"
						>{{ props.substatus }}</p>
					</div>
				</div>
			</div>
		</react-link>
	</div>
</template>