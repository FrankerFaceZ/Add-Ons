<template>
	<bd-shelf-card
		:link="url"
		:title="title"
		:subtitle="item.broadcaster.displayName"
		:avatar="settings.show_avatars ? avatar : null"
		:avatar-title="item.broadcaster.displayName"
		:avatar-link="getReactURL('user', item.broadcaster.login)"
		:views="settings.hide_viewers ? null : tNumber(item.viewCount)"
		:tooltip-side="settings.swap_sidebars ? 'left' : 'right'"
	/>
</template>

<!-- eslint-disable no-unused-vars -->

<script>
import ColumnBase from '../column-base';
import { reduceTags } from '../data';
import { createCard, createStreamIndicator, createSubtitles } from '../tooltips';

const {get} = FrankerFaceZ.utilities.object;
const {duration_to_string} = FrankerFaceZ.utilities.time;

export default {
	props: ['item', 'settings', 'inst', 'now'],

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
				return this.item.broadcaster.profileImageURL;
			return null;
		},

		boxart() {
			if ( this.iconic_type === ColumnBase.ICONIC_TYPES.BOXART )
				return this.item.game && this.item.game.avatarURL;
			return null;
		},

		duration() {
			return duration_to_string(this.item.durationSeconds, false, false, true, false);
		},

		published() {
			return this.item.createdAt && new Date(this.item.createdAt);
		},

		title() {
			return this.item.title
		},

		game() {
			return this.item.game
		},

		curator() {
			return this.item.curator
		},

		url() {
			return this.getReactURL('user-clip', {
				userName: this.item.broadcaster.login,
				clipID: this.item.slug
			});
		},

		hideThumbnails() {
			return this.game && this.settings.hidden_thumbnails.includes(this.game.name)
		},

		image() {
			let template = 'https://static-cdn.jtvnw.net/ttv-static/404_preview-{width}x{height}.jpg';
			//if ( ! this.hideThumbnails )
			template = this.item.thumbnailURL || template;

			let width = this.settings.previewWidth,
				height = this.settings.previewHeight;

			if ( width > 260 )
				width = 480;
			else if ( width > 86 )
				width = 260;
			else
				width = 86;

			if ( height > 147 )
				height = 272;
			else if ( height > 45 )
				height = 147;
			else
				height = 45;

			return template.replace(/{([^}]+)}/g, (match, key) => {
				if ( key === 'height' )
					return height;
				if ( key === 'width' )
					return width;
				return match;
			});
		}
	},

	methods: {
		renderTooltip(target, tip) {
			tip.add_class = [
				'ffz-rich-tip',
				'tw-align-left'
			];

			return createCard({
				link: this.url,
				title: this.title,
				image: this.image,

				avatar: this.settings.show_avatars ? this.avatar : null,
				avatarTitle: this.item.broadcaster.displayName,
				avatarLink: this.getReactURL('user', this.item.broadcaster.login),
				avatarState: {channelView: 'Watch'},

				boxart: this.settings.show_avatars ? this.boxart : null,
				boxartTitle: this.game ? this.game.displayName : null,
				boxartLink: this.game ? this.getReactURL('dir-game-index', this.game.name) : null,

				topLeft: this.duration,
				topLeftIcon: 'ffz-i-clip',

				bottomLeft: this.settings.hide_viewers ? null :
					this.t('addon.deck.views', '{count, plural, one {# view} other {# views}}', this.item.viewCount),

				bottomRight: this.published ? this.t(
					'addon.deck.published-human',
					'{published,humantime,1}', {
						published: this.published
					}
				) : null
			}, {
				subtitles: createSubtitles([
					this.user_line ? {
						content: this.item.broadcaster.displayName
					} : null,
					this.game_line ? {
						content: this.game.displayName
					} : null,
					this.curator ? {
						content: this.t('addon.deck.clipped-by', 'Clipped by {user}', {
							user: this.curator.displayName
						})
					} : null
				])

			}, {
				class: this.hideThumbnails ? 'ffz-hide-thumbnail' : ''
			})
		}
	}

}

</script>
