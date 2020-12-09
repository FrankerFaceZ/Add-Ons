'use strict';

const Dialog = FrankerFaceZ.utilities.dialog.Dialog;
const {deep_copy} = FrankerFaceZ.utilities.object;
const {createElement} = FrankerFaceZ.utilities.dom;

import {getLoader} from './data';
import STYLE_URL from './styles.scss';

class BrowseDeck extends Addon {
	constructor(...args) {
		super(...args);

		this.inject('i18n');
		this.inject('settings');
		this.inject('site');
		this.inject('tooltips');
		this.inject('site.fine');
		this.inject('site.apollo');
		this.inject('site.router');
		this.inject('site.twitch_data');

		this.dialog = new Dialog(() => this.buildDialog());
		this.dialog.exclusive = false;
		this.dialog.maximized = true;

		this.vue_loaded = false;
		this.vue_loading = null;

		this.NavBar = this.fine.define('nav-bar');
	}

	async onEnable() {
		document.head.appendChild(createElement('link', {
			href: STYLE_URL,
			rel: 'stylesheet',
			type: 'text/css',
			crossOrigin: 'anonymous'
		}));

		this.router.route('addons.deck', '/_deck/:tab?');
		this.router.routeName('addons.deck', 'Deck');

		await this.site.awaitElement(Dialog.EXCLUSIVE);

		const tip_handler = this.tooltips.types['twitch-tag'] = (target, tip) => {
			const tag_id = target.dataset.tagId,
				data = getLoader().getTagImmediate(tag_id, tip.rerender, true);

			if ( data && data.description )
				return data.description;
			else if ( ! data || data.description === undefined )
				return this.i18n.t('addon.deck.loading', 'Loading...');
		}

		tip_handler.delayShow = 500;

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

		this.settings.provider.on('changed', this.onProviderChange, this);

		this.settings.addClearable('DeckTabs', {
			label: 'Deck Tabs',
			keys: [
				'deck-tabs'
			]
		});

		this.dialog.on('hide', this.destroyDialog, this);
		this.onNavigate();
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

	onProviderChange(key, value) {
		if ( ! this._vue )
			return;

		if ( key === 'deck-tabs' )
			this._vue.$children[0].tabs = deep_copy(value || []);

		else if ( key === 'directory.game.hidden-thumbnails')
			this.updateSetting('hidden_thumbnails', deep_copy(value || []));

		else if ( key === 'directory.game.blocked-games' )
			this.updateSetting('blocked_games', deep_copy(value || []));
	}

	loadVue() {
		if ( this.vue_loaded )
			return Promise.resolve();

		if ( this.vue_loading )
			return new Promise(s => this.vue_loading.push(s));

		const loading = this.vue_loading = [];

		return new Promise(async s => {
			loading.push(s);

			const vue = this.resolve('vue');
			await vue.enable();

			vue.component((await import('./components.js')).default);
			this.vue_loaded = true;
			this.vue_loading = null;

			for(const fn of loading)
				fn();
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

	destroyDialog() {
		this._vue = null;
		this._dialog = null;
	}

	buildData() {
		const t = this,
			tabs = this.settings.provider.get('deck-tabs', []);

		return {
			settings: {
				show_avatars: true, // this.settings.get('directory.show-channel-avatars'),
				hide_live: this.settings.get('directory.hide-live'),
				hide_reruns: this.settings.get('directory.hide-vodcasts'),
				uptime: this.settings.get('directory.uptime'),
				group_hosts: true, //this.settings.get('directory.following.group-hosts'),
				host_menus: true, //this.settings.get('directory.following.host-menus'),
				hidden_thumbnails: deep_copy(this.settings.provider.get('directory.game.hidden-thumbnails', [])),
				blocked_games: deep_copy(this.settings.provider.get('directory.game.blocked-games', []))
			},

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
			},

			types: require('./types'),
			tabs: deep_copy(tabs)
		}
	}

	updateSetting(name, val) {
		if ( ! this._vue )
			return;

		this._vue.$children[0].settings[name] = val;
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

		const label = this.i18n.t('addon.deck.title', 'Deck');

		let button = root.querySelector('.bd--browse-deck-link'), indicator;
		if ( ! button ) {
			let peer = root.querySelector('[data-a-target="browse-link"]');
			if ( peer )
				peer = peer.parentElement.parentElement;
			if ( ! peer )
				return;

			button = (<a
				class="bd--browse-deck-link navigation-link tw-interactive"
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

			peer.parentElement.insertBefore(<div class="tw-flex tw-flex-column tw-full-height tw-pd-x-1 tw-xl-pd-x-2">
				<div class="tw-align-self-center tw-flex tw-full-height">
					{button}
				</div>
				{indicator = <div class="bd--indicator navigation-link__indicator-container" />}
			</div>, peer.nextElementSibling);

		} else {
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