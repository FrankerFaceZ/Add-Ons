<template>
	<bd-card
		:link="getReactURL('user', item.login)"
		:title="title"
		:image="image"
		:tags="tags"
		:class="klass"

		:avatar="settings.show_avatars ? avatar : null"
		:avatarTitle="item.displayName"
		:avatarLink="getReactURL('user', item.login)"

		:boxart="settings.show_avatars ? boxart : null"
		:boxartTitle="game && game.displayName"
		:boxartLink="game && getReactURL('dir-game-index', game.name)"

		:bottomLeft="settings.hide_viewers ? null : t('addon.deck.viewers', '{viewers,number} viewer{viewers,en_plural}', {viewers: item.stream.viewersCount})"
	>
		<template #top-left>
			<bd-stream-indicator v-if="! settings.hide_live" :type="item.stream.type" />
		</template>

		<template #top-right>
			<div v-if="uptime" class="ffz-il-tooltip__container">
				<div class="preview-card-stat tw-align-items-center tw-border-radius-small tw-c-background-overlay tw-c-text-overlay tw-flex tw-font-size-6 tw-justify-content-center tw-pd-x-05">
					<figure class="tw-c-text-live ffz-i-clock" />
					<p>{{ upString }}</p>
				</div>
				<div class="ffz-il-tooltip ffz-il-tooltip--down ffz-il-tooltip--align-right">
					{{ t('metadata.uptime.tooltip', 'Stream Uptime') }}
					<div class="tw-pd-t-05">
						{{ t(
							'metadata.uptime.since',
							'(since {since,datetime})',
							{since: startTime}
						) }}
					</div>
				</div>
			</div>
		</template>

		<template #subtitles>
			<p v-if="user_line" class="tw-c-text-alt tw-ellipsis">
				<react-link class="tw-interactive ffz-link ffz-link--inherit" :href="`/${item.login}/videos`">{{ item.displayName }}</react-link>
			</p>
			<p v-if="game_line" class="tw-c-text-alt tw-ellipsis">
				<react-link class="tw-interactive ffz-link ffz-link--inherit" :href="`/directory/game/${game.name}`">{{ game.displayName }}</react-link>
			</p>
		</template>
	</bd-card>
</template>

<script>

import ColumnBase from '../column-base';
import { reduceTags } from '../data';

const {get} = FrankerFaceZ.utilities.object;
const {duration_to_string} = FrankerFaceZ.utilities.time;

export default {
	props: ['item', 'settings', 'inst'],

	data() {
		return {
			now: Date.now()
		}
	},

	computed: {
		user_line() {
			return this.inst && this.inst.showUserLine(this.item)
		},

		game_line() {
			return this.game && this.inst && this.inst.showGameLine(this.item)
		},

		iconic_type() {
			return this.inst && this.inst.getIconicType(this.item);
		},

		avatar() {
			if ( this.iconic_type === ColumnBase.ICONIC_TYPES.AVATAR )
				return this.item.profileImageURL;

			return null;
		},

		boxart() {
			if ( this.iconic_type === ColumnBase.ICONIC_TYPES.BOXART )
				return this.game && this.game.avatarURL;

			return null;
		},

		tags() {
			return reduceTags(this.item.stream.tags, this.settings.max_tags, this.inst.required_tags);
		},

		klass() {
			if ( this.game && this.settings.hidden_thumbnails.includes(this.game.name) )
				return 'ffz-hide-thumbnail';

			return '';
		},

		image() {
			let template = 'https://static-cdn.jtvnw.net/ttv-static/404_preview-{width}x{height}.jpg';
			/*if ( ! this.game || ! this.settings.hidden_thumbnails.includes(this.game.name) )*/
			template = get('stream.previewImageURL', this.item) || template;

			// This particular URL is not responsive.
			if ( template.includes('404_processing') )
				return 'https://vod-secure.twitch.tv/_404/404_processing_320x180.png';

			return template.replace(/{([^}]+)}/g, (match, key) => {
				if ( key === 'height' )
					return this.settings.previewHeight;
				if ( key === 'width' )
					return this.settings.previewWidth;
				return match;
			});
		},

		game() {
			return get('broadcastSettings.game', this.item);
		},

		startTime() {
			const created_at = get('stream.createdAt', this.item);
			return created_at && new Date(created_at);
		},

		uptime() {
			return this.settings.uptime === 0 ? 0 : this.startTime && Math.floor((this.now - this.startTime) / 1000) || 0;
		},

		upString() {
			if ( this.uptime )
				return duration_to_string(this.uptime, false, false, false, this.settings.uptime === 1);

			return '';
		},

		title() {
			return get('broadcastSettings.title', this.item);
		}
	},

	created() {
		this.clock = setInterval(() => this.now = Date.now(), 1000);
	},

	destroyed() {
		clearInterval(this.clock);
	}

}

</script>