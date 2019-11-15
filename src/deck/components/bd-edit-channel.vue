<template>
	<div class="tw-flex tw-align-items-center tw-mg-y-05">
		<label
			:for="'channel$' + value.id"
			:class="{'tw-form-required': ! hasChannel}"
		>
			{{ t('addon.deck.edit.channel', 'Channel:') }}
		</label>

		<div class="ffz--search-avatar tw-mg-r-05">
			<figure class="tw-avatar tw-avatar--size-30">
				<div class="tw-border-radius-rounded tw-overflow-hidden">
					<img
						v-if="current"
						:alt="current.displayName"
						:src="current.profileImageURL"
						class="tw-avatar__img tw-image"
					>
				</div>
			</figure>
		</div>

		<autocomplete
			v-slot="slot"
			:input-id="'channel$' + value.id"
			:items="fetchUsers"
			:value="search"
			:suggest-on-focus="true"
			:escape-to-clear="false"
			class="tw-flex-grow-1"
			@selected="onSelected"
		>
			<div class="tw-pd-x-1 tw-pd-y-05">
				<div class="tw-card tw-relative">
					<div class="tw-align-items-center tw-flex tw-flex-nowrap tw-flex-row">
						<div class="tw-card-img tw-card-img--size-3 tw-flex-shrink-0 tw-overflow-hidden">
							<aspect :ratio="1">
								<img
									:alt="slot.item.displayName"
									:src="slot.item.profileImageURL"
									class="tw-image"
								>
							</aspect>
						</div>
						<div class="tw-card-body tw-overflow-hidden tw-relative">
							<p class="tw-pd-x-1">{{ slot.item.displayName }}</p>
						</div>
					</div>
				</div>
			</div>
		</autocomplete>
	</div>
</template>

<script>

import { getLoader } from '../data';

const {debounce, deep_copy} = FrankerFaceZ.utilities.object;

export default {
	props: ['value', 'type', 'settings', 'inst'],

	data() {
		return {
			current: null,
			loaded_id: null
		}
	},

	computed: {
		search() {
			return this.current && this.current.displayName || this.value.settings.login;
		},

		hasChannel() {
			return this.current != null;
		}
	},

	watch: {
		value: {
			handler() {
				this.cacheUser();
			},
			deep: true
		}
	},

	created() {
		this.cacheUser = debounce(this.cacheUser, 50);
	},

	beforeDestory() {
		this.cacheUser = null;
	},

	mounted() {
		this.cacheUser();
	},

	methods: {
		async cacheUser() {
			if ( this.loaded_id === this.value.settings.id )
				return;

			this.current = null;
			this.loaded_id = this.value.settings.id;

			if ( ! this.loaded_id )
				return;

			const data = await getLoader().getUser(this.loaded_id);
			if ( data )
				this.current = deep_copy(data);
			else
				this.current = null;
		},

		async fetchUsers(query) {
			const data = await getLoader().getMatchingUsers(query);
			if ( ! data || ! data.items )
				return [];

			return deep_copy(data.items);
		},

		onSelected(item) {
			this.current = item;
			this.value.settings.login = item && item.login || null;
			this.value.settings.id = item && item.id || null;
		}
	}
}

</script>