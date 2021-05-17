<template lang="html">
	<div
		:class="{inherits: isInherited, default: isDefault}"
		class="ffz--widget ffz--text-box"
	>
		<div class="tw-flex tw-align-items-center">
			<label :for="item.full_key">
				{{ t(item.i18n_key, item.title) }}
				<span v-if="unseen" class="tw-pill">{{ t('setting.new', 'New') }}</span>
			</label>

			<div class="ffz--search-avatar tw-mg-r-05">
				<figure class="ffz-avatar ffz-avatar--size-30">
					<div class="tw-border-radius-rounded tw-overflow-hidden">
						<img
							v-if="current"
							:alt="current.displayName"
							:src="current.profileImageURL"
							class="ffz-avatar__img tw-image"
						>
					</div>
				</figure>
			</div>

			<autocomplete
				v-slot="slot"
				:input-id="item.full_key"
				:items="fetchUsers"
				:value="search"
				:placeholder="search"
				:suggest-on-focus="true"
				:escape-to-clear="false"
				@selected="onSelected"
			>
				<div class="tw-pd-x-1 tw-pd-y-05">
					<div class="tw-card tw-relative">
						<div class="tw-align-items-center tw-flex tw-flex-nowrap tw-flex-row">
							<div class="ffz-card-img ffz-card-img--size-3 tw-flex-shrink-0 tw-overflow-hidden">
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

			<button
				v-if="source && source !== profile"
				class="tw-mg-l-05 tw-button tw-button--text"
				@click="context.currentProfile = source"
			>
				<span class="tw-button__text ffz-i-right-dir">
					{{ sourceDisplay }}
				</span>
			</button>

			<button v-if="has_value" class="tw-mg-l-05 tw-button tw-button--text ffz-il-tooltip__container" @click="clear">
				<span class="tw-button__text ffz-i-cancel" />
				<div class="ffz-il-tooltip ffz-il-tooltip--down ffz-il-tooltip--align-right">
					{{ t('setting.reset', 'Reset to Default') }}
				</div>
			</button>
		</div>

		<section
			v-if="item.description"
			class="tw-c-text-alt-2"
		>
			<markdown :source="t(item.desc_i18n_key || `${item.i18n_key}.description`, item.description)" />
		</section>
		<section v-if="item.extra">
			<component :is="item.extra.component" :context="context" :item="item" />
		</section>
	</div>
</template>

<script>

const {debounce, deep_copy} = FrankerFaceZ.utilities.object;
const SettingMixin = FrankerFaceZ.get().resolve('main_menu').SettingMixin;

export default {
	mixins: [SettingMixin],
	props: ['item', 'context'],

	data() {
		return {
			current: null,
			loaded_id: null
		}
	},

	computed: {
		search() {
			return this.current && this.current.displayName;
		},

		hasChannel() {
			return this.current != null
		}
	},

	watch: {
		value() {
			this.cacheUser()
		}
	},

	created() {
		this.td = this.context.getFFZ().resolve('site.twitch_data');
		this.cacheUser = debounce(this.cacheUser, 50);
	},

	beforeDestroy() {
		this.td = null;
		this.cacheUser = null;
	},

	mounted() {
		this.cacheUser();
	},

	methods: {
		async cacheUser() {
			if ( this.loaded_id === this.value )
				return;

			this.current = null;
			this.loaded_id = this.value;

			if ( ! this.loaded_id )
				return;

			const data = await this.td.getUser(this.loaded_id);
			if ( data )
				this.current = deep_copy(data);
			else
				this.current = null;
		},

		async fetchUsers(query) {
			const data = await this.td.getMatchingUsers(query);
			if ( ! data || ! data.items )
				return [];

			return deep_copy(data.items);
		},

		onSelected(item) {
			this.current = item;
			const value = item && item.id;
			this.set(value);
		}
	}
}
</script>