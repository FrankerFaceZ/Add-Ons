<template>
	<bd-card
		:link="`/${item.login}`"
		:title="title"
		:image="image"
		:tags="tags"
		:class="klass"

		:avatar="settings.show_avatars ? item.profileImageURL : null"
		:avatarTitle="item.displayName"

		:bottomLeft="settings.hide_viewers ? null : t('addon.deck.viewers', '{viewers,number} viewer{viewers,en_plural}', {viewers: item.stream.viewersCount})"

		:click="openMenu"
	>
		<template #top-left>
			<bd-stream-indicator type="host" />
		</template>

		<template #top-right>
			<div v-if="uptime" class="ffz-il-tooltip__container">
				<div class="preview-card-stat tw-align-items-center tw-border-radius-small tw-c-background-overlay tw-c-text-overlay tw-flex tw-font-size-6 tw-justify-content-center">
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
			<p class="tw-c-text-alt tw-ellipsis">
				<template v-if="game">
					<t-list phrase="directory.user-playing" default="{user} playing {game}">
						<template #user>
							<react-link class="tw-interactive ffz-link ffz-link--inherit" :href="`/${item.login}/videos`">{{ item.displayName }}</react-link>
						</template>
						<template #game>
							<react-link class="tw-interactive ffz-link ffz-link--inherit" :href="`/directory/game/${game.name}`">{{ game.displayName }}</react-link>
						</template>
					</t-list>
				</template>
				<template v-else>
					<react-link class="tw-interactive ffz-link ffz-link--inherit" :href="`/${item.login}/videos`">{{ item.displayName }}</react-link>
				</template>
			</p>
			<p class="tw-c-text-alt tw-ellipsis">
				<template v-if="item.hosts.length > 1">
					{{ t('directory.hosted.by-many', 'Hosted by {count,number} channel{count,en_plural}', item.hosts.length) }}
				</template>
				<t-list v-else phrase='directory.hosted.by-one' default='Hosted by {user}'>
					<template #user>
						<react-link
							class="tw-interactive ffz-link ffz-link--inherit"
							:href="`/${item.hosts[0].login}`"
						>
							{{ item.hosts[0].displayName }}
						</react-link>
					</template>
				</t-list>
			</p>
		</template>
	</bd-card>
</template>

<script>

import { reduceTags } from '../data';
import {createMenu, makeReference} from '../host-menu.jsx';

const {get} = FrankerFaceZ.utilities.object;
const Popper = FrankerFaceZ.utilities.popper;
const {duration_to_string} = FrankerFaceZ.utilities.time;

export default {
	props: ['item', 'settings', 'inst'],

	data() {
		return {
			show_menu: false,
			popper_data: {
				placement: 'bottom-start',
				modifiers: {
					flip: {
						enabled: false
					},
					offset: {
						offset: '0,0'
					}
				}
			},
			now: Date.now()
		}
	},

	computed: {
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
		this.menu_listener = this.menuClickOutside.bind(this);
		window.addEventListener('click', this.menu_listener);

		this.clock = setInterval(() => this.now = Date.now(), 1000);
	},

	destroyed() {
		if ( this.menu_listener ) {
			window.removeEventListener('click', this.menu_listener);
			this.menu_listener = null;
		}

		this.closeMenu();
		clearInterval(this.clock);
	},

	methods: {
		menuClickOutside(event) {
			if ( ! event || ! this.menu )
				return;

			const target = event.target;
			if ( target && ! this.menu.contains(target) && Date.now() - this.menu_time > 50 )
				this.closeMenu();
		},

		closeMenu() {
			if ( this.menu_popper ) {
				this.menu_popper.destroy();
				this.menu_popper = null;
			}

			if ( this.menu ) {
				this.menu.remove();
				this.menu = null;
			}
		},

		navigate(...args) {
			this.closeMenu();
			return this.reactNavigate(...args);
		},

		showMenu(event) {
			this.closeMenu();

			this.menu = createMenu(this.item, this.navigate);
			const parent = document.querySelector('#root > div') || document.body;
			parent.appendChild(this.menu);

			this.menu_time = Date.now();
			this.menu_popper = new Popper(
				makeReference(event.clientX - 60, event.clientY - 60),
				this.menu,
				{
					placement: 'bottom-start',
					modifiers: {
						flip: {
							enabled: false
						}
					}
				}
			);
		},

		openMenu(event) {
			const setting = this.settings.host_menus;
			if ( setting === 0 || (setting === 1 && this.item.hosts.length < 2) )
				return;

			this.showMenu(event);
			event.preventDefault();
		}
	}

}

</script>