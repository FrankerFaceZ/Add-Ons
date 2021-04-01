<template functional>
	<div :class="data.staticClass" class="bd--tag-list tw-font-size-7 tw-c-text-base">
		<div
			v-for="tag in props.tags"
			:key="tag.id"
			:class="[props.noMargin ? '' : 'tw-mg-t-05']"
			class="tw-border-radius-rounded tw-semibold tw-inline-block ffz-tag tw-mg-r-05"
		>
			<react-link
				class="tw-block tw-border-radius-rounded ffz-interactable ffz-interactable--alpha ffz-interactable--hover-enabled tw-interactive"
				:href="`/directory/all/tags/${tag.id}`"
			>
				<div
					:class="[tag.isLanguageTag || tag.is_language ? 'ffz-i-language' : '']"
					class="ffz-tooltip ffz-tag__content"
					data-tooltip-type="twitch-tag"
					:data-tag-id="tag.id"
				>
					{{ tag.localizedName || tag.label || tag.name }}
				</div>
			</react-link>
		</div>
	</div>
</template>