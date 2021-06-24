<template>
	<bd-card
		:link="url"
		:title="title"
		:image="image"
		:class="[hideThumbnails ? 'ffz-hide-thumbnail' : '']"

		:avatar="settings.show_avatars ? avatar : null"
		:avatarTitle="item.broadcaster.displayName"
		:avatarLink="getReactURL('user', item.broadcaster.login)"

		:boxart="settings.show_avatars ? boxart : null"
		:boxartTitle="game && game.displayName"
		:boxartLink="game && getReactURL('dir-game-index', game.name)"

		:topLeft="duration"
		topLeftIcon="ffz-i-clip"

		:bottomLeft="settings.hide_viewers ? null : t('addon.deck.views', '{count,number} view{count,en_plural}', item.viewCount)"
	>
		<template #bottom-right>
			<div v-if="published" class="ffz-il-tooltip__container">
				<div class="preview-card-stat tw-align-items-center tw-border-radius-small tw-c-background-overlay tw-c-text-overlay tw-flex tw-font-size-6 tw-justify-content-center tw-pd-x-05">
					<p>{{ t('addon.deck.published-human', '{published,humantime,1}', {published}) }}</p>
				</div>
				<div class="ffz-il-tooltip ffz-il-tooltip--up ffz-il-tooltip--align-right">
					{{ t('addon.deck.published', 'Published on {published,date} at {published,time}', {published}) }}
				</div>
			</div>
		</template>

		<template #subtitles>
			<p v-if="user_line" class="tw-c-text-alt tw-ellipsis">
				<react-link class="tw-interactive ffz-link ffz-link--inherit" :href="getReactURL('user-clips', item.broadcaster.login)">{{ item.broadcaster.displayName }}</react-link>
			</p>
			<p v-if="game_line" class="tw-c-text-alt tw-ellipsis">
				<react-link class="tw-interactive ffz-link ffz-link--inherit" :href="getReactURL('dir-game-index', game.name)">{{ game.displayName }}</react-link>
			</p>
			<p v-if="curator" class="tw-c-text-alt tw-ellipsis">
				<t-list
					phrase="addon.deck.clipped-by"
					default="Clipped by {user}"
				>
					<template #user>
						<react-link class="tw-interactive ffz-link ffz-link--inherit" :href="getReactURL('user', curator.login)">{{ curator.displayName }}</react-link>
					</template>
				</t-list>
			</p>
		</template>
	</bd-card>
</template>

<script>

import ColumnBase from '../column-base';

const {duration_to_string} = FrankerFaceZ.utilities.time;

export default {
	props: ['item', 'settings', 'inst'],

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
	}
}

</script>