class ProxySettings extends Addon {
	constructor(...args) {
		super(...args);

		this.inject('settings');
		this.inject('i18n');
	}

	onEnable() {
		this.settings.add('addon.reyohoho-emotes-proxy.enabled', {
			default: true,
			ui: {
				sort: 0,
				path: 'Add-Ons > ReYohoho Emotes Proxy',
				title: 'Enable Proxy',
				description: 'Enable proxy for 7TV and other services',
				component: 'setting-check-box'
			}
		});

		this.settings.add('addon.reyohoho-emotes-proxy.proxy-url', {
			default: 'https://starege.rhhhhhhh.live/',
			ui: {
				sort: 1,
				path: 'Add-Ons > ReYohoho Emotes Proxy',
				title: 'Proxy URL',
				description: 'Base URL for the proxy service',
				component: 'setting-text-box',
				placeholder: 'https://your-proxy.com/'
			}
		});

		this.settings.add('addon.reyohoho-emotes-proxy.7tv-enabled', {
			default: true,
			ui: {
				sort: 2,
				path: 'Add-Ons > ReYohoho Emotes Proxy',
				title: '7TV Emotes',
				description: 'Use proxy for 7TV emotes',
				component: 'setting-check-box'
			}
		});

		this.settings.add('addon.reyohoho-emotes-proxy.bttv-enabled', {
			default: false,
			ui: {
				sort: 3,
				path: 'Add-Ons > ReYohoho Emotes Proxy',
				title: 'BTTV Emotes (TODO)',
				description: 'Use proxy for BTTV emotes - Coming soon',
				component: 'setting-check-box',
				disabled: true
			}
		});

		this.settings.add('addon.reyohoho-emotes-proxy.ffz-enabled', {
			default: false,
			ui: {
				sort: 4,
				path: 'Add-Ons > ReYohoho Emotes Proxy',
				title: 'FFZ Emotes (TODO)',
				description: 'Use proxy for FFZ emotes - Coming soon',
				component: 'setting-check-box',
				disabled: true
			}
		});

		this.log.info('Proxy Settings addon enabled');
	}

	getProxyUrl() {
		if (!this.settings.get('addon.reyohoho-emotes-proxy.enabled')) {
			return null;
		}
		return this.settings.get('addon.reyohoho-emotes-proxy.proxy-url');
	}

	isServiceEnabled(service) {
		switch (service) {
			case '7tv':
				return this.settings.get('addon.reyohoho-emotes-proxy.7tv-enabled');
			case 'bttv':
				return this.settings.get('addon.reyohoho-emotes-proxy.bttv-enabled');
			case 'ffz':
				return this.settings.get('addon.reyohoho-emotes-proxy.ffz-enabled');
			default:
				return false;
		}
	}

	applyProxy(url, service = '7tv') {
		if (!this.getProxyUrl() || !this.isServiceEnabled(service)) {
			return url;
		}

		const proxyUrl = this.getProxyUrl();
		
		if (url.startsWith('//')) {
			return `${proxyUrl}https:${url}`;
		}
		
		return url.replace(/^https?:\/\//, proxyUrl);
	}
}

ProxySettings.register(); 