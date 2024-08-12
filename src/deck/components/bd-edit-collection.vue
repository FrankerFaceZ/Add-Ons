<template>
	<div :class="{'tw-form-required': ! hasSlug}">
		<div class="tw-flex tw-align-items-center tw-mg-y-05">
			<label :for="'slug$' + value.id">
				{{ t('addon.deck.edit.slug', 'Slug:') }}
			</label>
			<input
				:id="'slug$' + value.id"
				v-model.trim="value.settings.slug"
				class="tw-flex-grow-1 tw-border-radius-medium tw-font-size-6 tw-pd-x-1 tw-pd-y-05 ffz-input"
			>
		</div>
		<section class="tw-c-text-alt-2 bd--half-width-max">
			<t-list
				phrase="addon.deck.collection.find-slugs"
				default="To find valid slugs, visit Twitch's {homelink} and look for sections that link to pages with {collection} in the URL. As an example, a collection of all live channels with active hype trains has the slug: {hype-train}"
			>
				<template #homelink>
					<react-link
						class="ffz-link"
						:href="getReactURL('front-page')"
					>{{ 
						t('addon.deck.collection.visit-home', 'home page')
						}}</react-link>
				</template>
				<template #collection>
					<code>/collection/</code>
				</template>
				<template #hype-train>
					<code>hype-train</code>
				</template>
			</t-list>
		</section>
	</div>
</template>

<script>

export default {
	props: ['value', 'type', 'settings', 'inst'],

	computed: {
		hasSlug() {
			return this.value.settings.slug && this.value.settings.slug.length > 0
		}
	}
}

</script>