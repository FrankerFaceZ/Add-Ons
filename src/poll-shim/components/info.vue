<template lang="html">
	<div>
		<div v-if="! shouldBeActive">
			{{ t('addon.poll-shim.inactive', `Poll-Shim is currently inactive. Poll-Shim only runs on the dashboard or your own pop-out chat. Alternatively, if you have set a channel override, Poll-Shim will only run on that channel's dashboard or pop-out chat.`) }}
		</div>
		<div v-else class="tw-flex">
			<div class="tw-flex tw-flex-column tw-justify-content-center tw-pd-x-1 tw-pd-y-05 tw-c-background-base tw-border-radius-large tw-mg-r-1 tw-mg-b-1">
				<p class="tw-c-text-base tw-font-size-4">
					{{ isActive }}
				</p>
				<p class="tw-c-text-alt-2 tw-font-size-6">
					{{ t('addon.poll-shim.active', 'Active') }}
				</p>
			</div>
			<div class="tw-flex tw-flex-column tw-justify-content-center tw-pd-x-1 tw-pd-y-05 tw-c-background-base tw-border-radius-large tw-mg-r-1 tw-mg-b-1">
				<p class="tw-c-text-base tw-font-size-4">
					{{ channel ? channel.displayName : 'null' }}
				</p>
				<p class="tw-c-text-alt-2 tw-font-size-6">
					{{ t('addon.poll-shim.channel', 'Channel') }}
				</p>
			</div>
			<div class="tw-flex tw-flex-column tw-justify-content-center tw-pd-x-1 tw-pd-y-05 tw-c-background-base tw-border-radius-large tw-mg-r-1 tw-mg-b-1">
				<p class="tw-c-text-base tw-font-size-4">
					{{ hasPubSub ? t('addon.poll-shim.connected', 'Connected') : t('addon.poll-shim.disconnected', 'Disconnected') }}
				</p>
				<p class="tw-c-text-alt-2 tw-font-size-6">
					{{ t('addon.poll-shim.pubsub', 'PubSub') }}
				</p>
			</div>
			<div class="tw-flex tw-flex-column tw-justify-content-center tw-pd-x-1 tw-pd-y-05 tw-c-background-base tw-border-radius-large tw-mg-r-1 tw-mg-b-1">
				<p class="tw-c-text-base tw-font-size-4">
					{{ isAuthed ? t('addon.poll-shim.authed', 'Authorized') : hasWS ? t('addon.poll-shim.connected', 'Connected') : t('addon.poll-shim.disconnected', 'Disconnected') }}
				</p>
				<p class="tw-c-text-alt-2 tw-font-size-6">
					{{ t('addon.poll-shim.ws', 'WebSocket') }}
				</p>
			</div>
			<div class="tw-flex tw-flex-column tw-justify-content-center tw-pd-x-1 tw-pd-y-05 tw-c-background-base tw-border-radius-large tw-mg-r-1 tw-mg-b-1">
				<p class="tw-c-text-base tw-font-size-4">
					{{ polls.length }}
				</p>
				<p class="tw-c-text-alt-2 tw-font-size-6">
					{{ t('addon.poll-shim.polls', 'Active Polls') }}
				</p>
			</div>
		</div>
		<div v-if="shouldBeActive && ! hasPoll" class="tw-background-alt-2 tw-border tw-c-border-error tw-pd-1">
			{{ t('addon.poll-shim.no-poll', 'The channel is not an affiliate or partner and cannot run polls.') }}
		</div>
		<div v-else-if="shouldBeActive && self && ! canPoll" class="tw-background-alt-2 tw-border tw-pd-1">
			{{ t('addon.poll-shim.cannot-poll', 'You are not a moderator of this channel and cannot create polls.') }}
		</div>
	</div>
</template>

<script>

export default {
	props: ['item', 'context'],

	data() {
		return {
			channel: null,
			self: null,
			shouldBeActive: false,
			isActive: false,
			hasPubSub: false,
			hasWS: false,
			isAuthed: false,
			polls: []
		}
	},

	computed: {
		hasPoll() {
			const roles = this.channel?.roles || {};
			return roles.isAffiliate || roles.isPartner;
		},

		canPoll() {
			return this.hasPoll && this.self?.isModerator;
		}
	},

	created() {
		this.item.on(':update', this.handleUpdate, this);
		this.handleUpdate();
	},

	destroyed() {
		this.item.off(':update', this.handleUpdate, this);
	},

	methods: {
		handleUpdate() {
			this.shouldBeActive = this.item.shouldBeActive();
			this.isActive = this.item.isActive();
			this.hasPubSub = this.item.hasPubSub();
			this.hasWS = this.item.hasWS();
			this.isAuthed = this.item.isAuthed();
			this.polls = Array.from(this.item.getPolls());

			this.item.getChannel().then(user => this.channel = user);
			this.item.getSelf().then(self => this.self = self);
		}
	}
}
</script>