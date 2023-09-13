<template functional>
	<div :class="data.staticClass" class="bd--tag-list tw-font-size-7 tw-c-text-base">
		<div
			v-for="tag in props.tags"
			:key="tag"
			:class="[props.noMargin ? '' : 'tw-mg-t-05']"
			class="tw-border-radius-rounded tw-semibold tw-inline-block ffz-tag tw-mg-r-05"
		>
			<react-link
				class="tw-block tw-border-radius-rounded ffz-interactable ffz-interactable--alpha ffz-interactable--hover-enabled tw-interactive"
				:href="`/directory/all/tags/${tag}`"
			>
				<div
					class="ffz-tag__content"
				>
					{{ tag }}
				</div>
			</react-link>
		</div>
	</div>
</template>