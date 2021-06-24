<template>
	<bd-card
		:link="getReactURL('video', item.id)"
		:title="title"
		:image="image"
		:tags="tags"

		:class="[hasAnimation ? 'bd--animated-card' : '', hideThumbnails ? 'ffz-hide-thumbnail' : '']"

		:avatar="settings.show_avatars ? avatar : null"
		:avatarTitle="item.owner.displayName"
		:avatarLink="getReactURL('user', item.owner.login)"

		:boxart="settings.show_avatars ? boxart : null"
		:boxartTitle="game && game.displayName"
		:boxartLink="game && getReactURL('dir-game-index', game.name)"

		:topRight="duration"
		topRightIcon="ffz-i-play"

		:bottomLeft="settings.hide_viewers ? null : t('addon.deck.views', '{count,number} view{count,en_plural}', item.viewCount)"

		@mouseenter="onHover"
		@mouseleave="onLeave"
	>
		<template #top-left>
			<bd-stream-indicator :type="type" />
		</template>

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
				<react-link class="tw-interactive ffz-link ffz-link--inherit" :href="getReactURL('user-videos', item.owner.login)">{{ item.owner.displayName }}</react-link>
			</p>
			<p v-if="game_line" class="tw-c-text-alt tw-ellipsis">
				<react-link class="tw-interactive ffz-link ffz-link--inherit" :href="getReactURL('dir-game-index', game.name)">{{ game.displayName }}</react-link>
			</p>
		</template>
	</bd-card>
</template>

<script>

import ColumnBase from '../column-base';
import { reduceTags } from '../data';

const {duration_to_string} = FrankerFaceZ.utilities.time;

export default {
	props: ['item', 'settings', 'inst'],

	data() {
		return {
			hovered: false,
			animated_loading: false,
			animated_loaded: false,
			animated_errored: false
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
				return this.item.owner.profileImageURL;
			return null;
		},

		boxart() {
			if ( this.iconic_type === ColumnBase.ICONIC_TYPES.BOXART )
				return this.game && this.game.avatarURL;
			return null;
		},

		type() {
			if ( this.item.status === 'RECORDING' )
				return 'RECORDING';

			return this.item.broadcastType
		},

		duration() {
			return duration_to_string(this.item.lengthSeconds, false, false, false, false);
		},

		published() {
			return this.item.publishedAt && new Date(this.item.publishedAt);
		},

		tags() {
			return reduceTags(this.item.contentTags, this.settings.max_tags, this.inst.required_tags);
		},

		hideThumbnails() {
			return this.game && this.settings.hidden_thumbnails.includes(this.game.name);
		},

		hasAnimation() {
			return this.hovered && this.animated_loaded; // && ! this.hideThumbnails;
		},

		image() {
			if ( this.hasAnimation )
				return this.item.animatedPreviewURL;

			let template = 'https://static-cdn.jtvnw.net/ttv-static/404_preview-{width}x{height}.jpg';
			//if ( ! this.hideThumbnails )
			template = this.item.previewThumbnailURL || template;

			return template.replace(/{([^}]+)}/g, (match, key) => {
				if ( key === 'height' )
					return this.settings.previewHeight;
				if ( key === 'width' )
					return this.settings.previewWidth;
				return match;
			});
		},

		game() {
			return this.item.game
		},

		title() {
			return this.item.title
		}
	},

	methods: {
		onHover() {
			this.hovered = true;
			this.loadAnimation();
		},

		onLeave() {
			this.hovered = false;
		},

		loadAnimation() {
			if ( this.animation_loaded || this.animation_loading || this.animation_errored )
				return;

			if ( ! this.item.animatedPreviewURL ) {
				this.animated_loading = false;
				this.animated_errored = true;
				this.animated_loaded = false;
				return;
			}

			const image = new Image;
			image.onload = () => {
				this.animated_loading = false;
				this.animated_errored = false;
				this.animated_loaded = true;
			}

			image.onerror = () => {
				this.animated_loading = false;
				this.animated_errored = true;
				this.animated_loaded = false;
			}

			image.src = this.item.animatedPreviewURL;
		}
	}
}

</script>