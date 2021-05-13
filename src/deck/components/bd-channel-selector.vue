<template>
	<div class="bd--channel-selector tw-flex-column tw-flex-no-wrap" data-a-target="channel-dropdown">
		<autocomplete
			v-slot="slot"
			:inputId="inputId"
			:items="getItems"
			:suggestOnFocus="true"
			:clearOnSelect="true"
			:allow-filter="false"
			:placeholder="t('addon.deck.search-users', 'Search Users')"
			icon="ffz-i-search"
			@selected="addUser"
		>
			<autocomplete-user :user="slot.item" />
		</autocomplete>

		<div class="bd--channel-selector__list tw-flex tw-flex-wrap tw-c-background-base tw-pd-x-05 tw-pd-b-05 tw-border-l tw-border-b tw-border-r tw-border-radius-medium">
			<div
				v-if="! showUsers || ! showUsers.length"
				class="tw-mg-t-05 tw-c-text-alt-2"
			>
				{{ t('addon.deck.no-users', 'no users') }}
				&nbsp;
			</div>
			<div
				v-for="user of showUsers"
				:key="user.id"
				class="tw-inline-block tw-mg-t-05 tw-mg-r-05"
			>
				<button
					class="tw-border-radius-rounded tw-inline-flex tw-interactive tw-semibold ffz-tag"
					:title="isI18n(user) ? `${user.displayName} (${user.login})` : user.displayName"
					@click="removeUser(user.id)"
				>
					<div class="tw-align-items-center tw-flex tw-font-size-7 ffz-tag__content">
						<div class="ffz-card-img ffz-card-img--size-105 tw-mg-r-05 tw-flex-shrink-0 tw-overflow-hidden tw-avatar">
							<aspect :ratio="1">
								<img
									:alt="user.displayName"
									:src="user.profileImageURL"
									class="tw-image tw-image-avatar tw-border-radius-rounded"
								>
							</aspect>
						</div>
						{{ user.displayName || user.login }}
						<figure class="ffz-i-cancel" />
					</div>
				</button>
			</div>
		</div>
	</div>
</template>

<script>

import {getLoader} from '../data';

const {deep_copy} = FrankerFaceZ.utilities.object;

export default {
	props: {
		value: Array,
		inputId: {
			type: String,
			required: false
		}
	},

	data() {
		const ids = Array.isArray(this.value) ? this.value.slice(0) : [],
			users = {};

		for(const id of ids)
			users[id] = {id, loading: true};

		return {
			loader: 0,
			ids,
			users
		}
	},

	computed: {
		showUsers() {
			return this.ids.map(id => this.users[id] = this.users[id] || {id});
		}
	},

	watch: {
		ids() {
			this.$emit('input', this.ids)
		}
	},

	created() {
		const loader = getLoader();

		for(const id of this.ids)
			loader.getUserBasic(id).then(user => {
				this.users[id] = user ?? {id, login: `invalid user`}
			});
	},

	methods: {
		isI18n(item) {
			if ( ! item || ! item.login || ! item.displayName )
				return false;

			return item.login.trim() !== item.displayName.trim().toLowerCase();
		},

		removeUser(id) {
			// Make sure we weren't accidentally handed a user object.
			if ( id && id.id )
				id = id.id;

			for(let i=0; i < this.ids.length; i++) {
				if ( id === this.ids[i] ) {
					this.ids.splice(i, 1);
					break;
				}
			}
		},

		addUser(user) {
			if ( ! user || ! user.id )
				return;

			if ( this.ids.includes(user.id) )
				return;

			this.ids.push(user.id);
			this.users[user.id] = user;
		},

		async getItems(query) {
			if ( ! query )
				return [];

			const out = await getLoader().getMatchingUsers(query, 30),
				users = out?.items;

			if ( ! users || ! users.length )
				return [];

			return deep_copy(users);
		}
	}
}

</script>