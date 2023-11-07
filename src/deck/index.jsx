'use strict';

const Dialog = FrankerFaceZ.utilities.dialog.Dialog;
const {deep_copy} = FrankerFaceZ.utilities.object;
const {createElement} = FrankerFaceZ.utilities.dom;

import {getLoader} from './data';
import STYLE_URL from './styles.scss';

class BrowseDeck extends Addon {
	constructor(...args) {
		super(...args);

		this.inject('settings');
		this.inject('site');
		this.inject('tooltips');
		this.inject('site.fine');
		this.inject('site.apollo');
		this.inject('site.router');
		this.inject('site.twitch_data');
		this.inject('site.menu_button');

		this.settings.add('deck.link', {
			default: true,
			ui: {
				path: 'Add-Ons > Deck >> Appearance',
				title: 'Add a Deck link to the top of Twitch.',
				component: 'setting-check-box'
			},
			changed: () => this.updateNavigation()
		});

		this.settings.add('deck.auto-settings', {
			default: true,
			ui: {
				path: 'Add-Ons > Deck >> Behavior',
				title: 'Automatically open settings when creating a new column.',
				component: 'setting-check-box'
			}
		});

		this.settings.add('deck.video-preview', {
			default: false,
			ui: {
				path: 'Add-Ons > Deck >> Behavior',
				title: 'Display video previews of live content.',
				component: 'setting-check-box',
				description: 'When this is enabled, the embedded player will be used in some situations to display previews of live channels. This is used primarily in tool-tips for the custom sidebar, but also works when hovering the mouse over a stream thumbnail.'
			}
		});

		this.dialog = new Dialog(() => this.buildDialog());
		this.dialog.exclusive = false;
		this.dialog.maximized = true;

		this.sidebar = new Dialog(
			() => this.buildSidebar(),
			{
				prepend: true,
				selectors: {
					maximized: '.side-bar-contents>div>div,.side-bar-contents>nav>div'
				}
			}
		);
		this.sidebar.exclusive = false;
		this.sidebar.maximized = true;

		this.vue = this.vue_promise = null;
	}

	async onEnable() {
		this.NavBar = this.fine.define('nav-bar');

		document.head.appendChild(createElement('link', {
			href: STYLE_URL,
			rel: 'stylesheet',
			type: 'text/css',
			crossOrigin: 'anonymous'
		}));

		this.router.route('addons.deck', '/_deck/:tab?');
		this.router.routeName('addons.deck', 'Deck');

		const card_tip = (target, tip) => {
			const shelf = target.__vue__?.$parent;
			if ( ! shelf )
				return null;

			return shelf.renderTooltip(target, tip);
		};

		this.tooltips.define('bd-sidebar-card', card_tip);

		let card_tip_open = 0;

		card_tip.delayShow = () => card_tip_open > 0 ? 0 : 500;
		card_tip.onShow = () => card_tip_open++;
		card_tip.onHide = () => setTimeout(() => card_tip_open--, 250);

		this.NavBar.ready(() => this.updateNavigation());
		this.NavBar.on('mount', this.updateNavigation, this);
		this.NavBar.on('update', this.updateNavigation, this);
		this.router.on(':route', this.onNavigate, this);
		this.on('i18n:update', this.updateNavigation, this);

		//this.on('settings:changed:directory.show-channel-avatars', val => this.updateSetting('show_avatars', val));
		this.on('settings:changed:directory.hide-vodcasts', val => this.updateSetting('hide_reruns', val));
		this.on('settings:changed:directory.uptime', val => this.updateSetting('uptime', val));
		//this.on('settings:changed:directory.following.group-hosts', val => this.updateSetting('group_hosts', val));
		//this.on('settings:changed:directory.following.host-menus', val => this.updateSetting('host_menus', val));
		this.on('settings:changed:directory.hide-live', val => this.updateSetting('hide_live', val));
		this.on('settings:changed:deck.auto-settings', val => this.updateSetting('open_settings', val));
		this.on('settings:changed:layout.swap-sidebars', val => this.updateSetting('swap_sidebars', val));
		this.on('settings:changed:directory.blocked-tags', val => this.updateSetting('blocked_tags', deep_copy(val || [])));
		this.on('settings:changed:deck.video-preview', val => this.updateSetting('video_preview', val));

		this.on('site.subpump:pubsub-message', this.onPubSub, this);

		this.settings.provider.on('changed', this.onProviderChange, this);

		this.settings.addClearable('DeckTabs', {
			label: 'Deck Tabs',
			keys: [
				'deck-tabs'
			]
		});

		this.sidebar.on('hide', this.destroySidebar, this);
		this.dialog.on('hide', this.destroyDialog, this);

		await this.site.awaitElement(Dialog.EXCLUSIVE);

		this.onNavigate();
		this.checkSidebar();
	}

	get isActive() {
		return this.router.current_name === 'addons.deck';
	}

	get currentTab() {
		if ( ! this.isActive )
			return 0;

		const value = this.router.match && this.router.match[1];
		if ( ! value )
			return 0;

		try {
			return parseInt(value, 10);
		} catch(err) { /* no-op */ }

		return 0;
	}

	onPubSub(event) {
		if ( event.prefix !== 'stream-change-v1' )
			return;

		//if ( this._vue )
		//	this._vue.$children[0].onStreamChange(event.message.type, event.message.channel_id);

		if ( this._side_vue )
			this._side_vue.$children[0].onStreamChange(event.message.type, event.message.channel_id);
	}

	onProviderChange(key, value) {
		if ( key === 'deck-tabs' ) {
			this.checkSidebar();

			if ( this._side_vue )
				this._side_vue.$children[0].tabs = deep_copy(value || []);

			if ( this._vue )
				this._vue.$children[0].tabs = deep_copy(value || []);
		}

		if ( this._side_vue || this._vue ) {
			if ( key === 'directory.game.hidden-thumbnails')
				this.updateSetting('hidden_thumbnails', deep_copy(value || []));

			else if ( key === 'directory.game.blocked-games' )
				this.updateSetting('blocked_games', deep_copy(value || []));
		}
	}

	loadSideVue() {
		if (this.side_vue )
			return Promise.resolve(this.side_vue);

		if (this.side_vue_promise)
			return Promise.resolve(this.side_vue_promise);

		return this.side_vue_promise = (async () => {
			const vue = await this.resolve('vue', true);
			if ( ! vue.enabled )
				await vue.enable();

			vue.component((await import(/* webpackChunkName: "deck/side-components" */ './side-components.js')).default);
			this.side_vue = vue;
			this.side_vue_promise = null;
			return vue;
		})().catch(err => {
			this.side_vue_promise = null;
			throw err;
		});
	}

	loadVue() {
		if ( this.vue )
			return Promise.resolve(this.vue);

		if ( this.vue_promise )
			return Promise.resolve(this.vue_promise);

		return this.vue_promise = (async () => {
			const vue = await this.resolve('vue', true);
			if ( ! vue.enabled )
				await vue.enable();

			vue.component((await import(/* webpackChunkName: "deck/components" */ './components.js')).default);
			this.vue = vue;
			this.vue_promise = null;
			return this.vue;
		})().catch(err => {
			this.vue_promise = null;
			throw err;
		});
	}

	onNavigate() {
		this.updateNavigation();

		if ( this.isActive ) {
			const core = this.site.getCore();
			if ( core && core.setPageTitle )
				core.setPageTitle(this.i18n.t('addon.deck.title', 'Deck'));
			this.dialog.show();

			if ( this._vue )
				this._vue.$children[0].tab_index = this.currentTab;
		} else
			this.dialog.hide();
	}

	destroySidebar() {
		this._side_vue = null;
		this._sidebar = null;
	}

	destroyDialog() {
		this._vue = null;
		this._dialog = null;
	}

	buildData(is_side_vue = false) {
		const t = this,
			tabs = this.settings.provider.get('deck-tabs', []);

		return {
			settings: {
				open_setting: this.settings.get('deck.auto-settings'),
				swap_sidebars: this.settings.get('layout.swap-sidebars'),
				video_preview: this.settings.get('deck.video-preview'),
				show_avatars: true, // this.settings.get('directory.show-channel-avatars'),
				hide_live: this.settings.get('directory.hide-live'),
				hide_reruns: this.settings.get('directory.hide-vodcasts'),
				uptime: this.settings.get('directory.uptime'),
				group_hosts: true, //this.settings.get('directory.following.group-hosts'),
				host_menus: true, //this.settings.get('directory.following.host-menus'),
				hidden_thumbnails: deep_copy(this.settings.provider.get('directory.game.hidden-thumbnails', [])),
				blocked_games: deep_copy(this.settings.provider.get('directory.game.blocked-games', [])),
				blocked_tags: deep_copy(this.settings.get('directory.blocked-tags', []))
			},

			getFFZ: () => this,

			tab_index: this.currentTab,

			navigateToTab(index) {
				// We want to replace state so that the URL updates.
				// We don't want to let React do this because it would update
				// the React app and be slow.
				history.replaceState(history.state, window.title,
					t.router.getURL('addons.deck', {tab: index}));
			},

			saveTabs(data) {
				t.settings.provider.set('deck-tabs', deep_copy(data));

				//t.log.info('save-tabs', data, is_side_vue, t._side_vue);

				t.checkSidebar();

				//t.log.info('--', t._side_vue);

				if ( ! is_side_vue && t._side_vue )
					t._side_vue.$children[0].tabs = deep_copy(data);
				else if ( is_side_vue && t._vue )
					t._vue.$children[0].tabs = deep_copy(data);
			},

			types: require('./types'),
			tabs: deep_copy(tabs)
		}
	}

	updateSetting(name, val) {
		if ( this._side_vue )
			this._side_vue.$children[0].settings[name] = val;

		if ( this._vue )
			this._vue.$children[0].settings[name] = val;
	}

	checkSidebar() {
		const tabs = this.settings.provider.get('deck-tabs', []);
		let sidebar_tab;

		for(let i=0; i < tabs.length; i++) {
			const tab = tabs[i];
			if ( tab && tab.sidebar ) {
				sidebar_tab = i;
				break;
			}
		}

		if ( sidebar_tab == null ) {
			if ( this._side_vue )
				this.sidebar.hide();

		} else if ( ! this._side_vue )
			this.sidebar.show();
	}

	buildSidebar() {
		const sidebar = this._sidebar = (<div class="tw-full-width">
			<div class="tw-align-center tw-c-text-alt-2 tw-mg-y-2">
				<h1 class="ffz-i-zreknarf loading" />
				<div>
					{this.i18n.t('addon.deck.loading', 'Loading...')}
				</div>
			</div>
		</div>);

		this.loadSideVue().then(() => {
			const vue = this.resolve('vue');
			this._side_vue = new vue.Vue({
				el: sidebar,
				render: h => h('bd-sidebar', this.buildData(true))
			})
		});

		return (<div class="maximized ffz-dialog">
			{this._sidebar}
		</div>);
	}

	buildDialog() {
		const dialog = this._dialog = (<div class="tw-full-width tw-flex tw-justify-content-center tw-align-items-center">
			<div class="tw-align-center tw-c-text-alt-2">
				<h1 class="ffz-i-zreknarf loading" />
				<div>
					{this.i18n.t('addon.deck.loading', 'Loading...')}
				</div>
			</div>
		</div>);

		this.loadVue().then(() => {
			const vue = this.resolve('vue');
			this._vue = new vue.Vue({
				el: dialog,
				render: h => h('browse-deck', this.buildData())
			})
		});

		return (<div class="maximized ffz-dialog tw-c-background-alt-2 tw-c-text-base tw-flex tw-flex-nowrap">
			{this._dialog}
		</div>);
	}

	updateNavigation() {
		for(const inst of this.NavBar.instances)
			this.updateNavButton(inst);
	}

	updateNavButton(inst) {
		const root = this.fine.getChildNode(inst);
		if ( ! root )
			return;

		const label = this.i18n.t('addon.deck.title', 'Deck'),
			setting = this.settings.get('deck.link');

		let cont = root.querySelector('.bd--browse-deck-link'), button, indicator;
		if ( ! cont ) {
			if ( ! setting )
				return;

			let peer = root.querySelector('[data-a-target="browse-link"]');
			if ( peer )
				peer = peer.parentElement.parentElement;
			if ( ! peer )
				return;

			button = (<a
				class="navigation-link tw-interactive"
				href={this.router.getURL('addons.deck')}
				onClick={e => { // eslint-disable-line react/jsx-no-bind
					e.preventDefault();
					e.stopPropagation();
					this.router.navigate('addons.deck');
				}}
			>
				<div class="tw-flex-column tw-hide tw-sm-flex">
					<div class="tw-hide tw-xl-flex">
						<p class="tw-font-size-4 tw-line-height-heading tw-semibold tw-title">
							{label}
						</p>
					</div>
					<div class="tw-flex tw-xl-hide">
						<p class="tw-font-size-5 tw-line-height-heading tw-semibold tw-title tw-title--inherit">
							{label}
						</p>
					</div>
				</div>
			</a>);

			peer.parentElement.insertBefore(cont = (<div class="bd--browse-deck-link tw-flex tw-flex-column tw-full-height tw-pd-x-1 tw-xl-pd-x-2">
				<div class="tw-align-self-center tw-flex tw-full-height">
					{button}
				</div>
				{indicator = <div class="bd--indicator navigation-link__indicator-container" />}
			</div>), peer.nextElementSibling);

		} else if ( ! setting ) {
			cont.remove();
			return;

		} else {
			button = cont.querySelector('a');
			indicator = root.querySelector('.bd--indicator');
			for(const element of button.querySelectorAll('p'))
				element.innerText = label;
		}

		const active_indicator = indicator.querySelector('.navigation-link__active-indicator');
		if ( this.isActive && ! active_indicator )
			indicator.appendChild(<div class="navigation-link__active-indicator" />);
		else if ( ! this.isActive && active_indicator )
			active_indicator.remove();

		button.classList.toggle('active', this.isActive);
	}

}

BrowseDeck.register();