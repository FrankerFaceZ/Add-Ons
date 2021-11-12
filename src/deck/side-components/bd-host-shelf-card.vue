<template>
	<bd-shelf-card
		:link="getReactURL('user', item.login)"
		:state="{channelView: 'Watch'}"
		:title="item.displayName"
		:subtitle="host_line"
		:avatar="settings.show_avatars ? avatar : null"
		:avatar-title="item.displayName"
		:viewers="settings.hide_viewers ? null : tNumber(item.stream.viewersCount)"
		:tooltip-side="settings.swap_sidebars ? 'left' : 'right'"
		:substatus="upString"
	/>
</template>

<script>

import ColumnBase from '../column-base';
import { reduceTags } from '../data';
import { createCard, createStreamIndicator, createSubtitles } from '../tooltips';

const { get } = FrankerFaceZ.utilities.object;
const { duration_to_string } = FrankerFaceZ.utilities.time;

export default {
	props: ['item', 'settings', 'inst', 'now'],

	computed: {
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
		},

		host_line() {
			const count = this.item.hosts.length;
			if ( count > 1 )
				return this.t(
					'directory.hosted.by-many',
					'Hosted by {count, plural, one {# channel} other {# channels}}',
					{count}
				);

			return this.t('directory.hosted.by-one', 'Hosted by {user}', {
				user: this.item.hosts[0].displayName
			});
		}
	},

	methods: {
		renderTooltip(target, tip) {
			tip.add_class = [
				'ffz-rich-tip',
				'tw-align-left'
			];

			let indicator;
			if ( this.item.stream.type !== 'live' || ! this.settings.hide_live )
				indicator = createStreamIndicator(this.iteam.stream.type);

			return createCard({
				link: this.getReactURL('user', this.item.login),
				state: {channelView: 'Watch'},
				title: this.title,
				image: this.image,
				tags: this.tags,

				avatar: this.settings.show_avatars ? this.avatar : null,
				avatarTitle: this.item.displayName,
				avatarLink: this.getReactURL('user', this.item.login),

				boxart: this.settings.show_avatars ? this.boxart : null,
				boxartTitle: this.game && this.game.displayName,
				boxartLink: this.game && this.getReactURL('dir-game-index', this.game.name),

				topRightIcon: 'tw-c-text-live ffz-i-clock',
				topRight: this.upString,

				bottomLeft: this.settings.hide_viewers ?
					null :
					this.t(
						'addon.deck.viewers',
						'{viewers, plural, one {# viewer} other {# viewers}}',
						{viewers: this.item.stream.viewersCount}
					)
			}, {
				topLeft: indicator || null,
				subtitles: createSubtitles([
					{
						content: this.game ? this.t(
							'directory.user-playing', '{user} playing {game}', {
								user: this.item.displayName,
								game: this.game.displayName
							}
						) : this.item.displayName
					},
					{
						content: this.host_line
					}
				])
			}, {
				class: this.klass
			});
		}
	}
}

</script>