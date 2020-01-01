<template lang="html">
	<div>
		<div v-if="! shouldBeActive">
			{{ t('addon.poll-shim.inactive', 'The Poll-Shim is currently inactive. It only runs on your own pop-out chat or dashboard.') }}
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
	</div>
</template>

<script>

export default {
	props: ['item', 'context'],

	data() {
		return {
			shouldBeActive: false,
			isActive: false,
			hasPubSub: false,
			hasWS: false,
			isAuthed: false,
			polls: []
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
		}
	}
}
</script>