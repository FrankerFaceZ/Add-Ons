export const API_BASE = 'https://starlit.gg';

const REFRESH_MS = 2 * 60 * 1000;
const PIPELINE = /^\/assets\/[a-f0-9]{16}\/[1-4]x\.(webp|avif)$/;

function absolute(url) {
	if (/^https?:/.test(url)) return url;
	return `${API_BASE}${url.startsWith('/') ? url : `/${url}`}`;
}

export function badgeUrls(url) {
	if (typeof url !== 'string' || !url) return null;
	if (!PIPELINE.test(url)) {
		const one = absolute(url);
		return { 1: one, 2: one, 4: one };
	}
	const base = url.replace(/[1-4]x\.(webp|avif)$/, '');
	return {
		1: absolute(`${base}1x.avif`),
		2: absolute(`${base}2x.avif`),
		4: absolute(`${base}4x.avif`),
	};
}

export class Api extends FrankerFaceZ.utilities.module.Module {
	constructor(...args) {
		super(...args);

		this.users = new Map();
		this.badgeCatalog = [];
		this.keyframes = '';
		this.etag = null;
		this.timer = null;
	}

	onEnable() {
		this.loadBadgeCatalog().then(() => this.refresh());
		this.timer = setInterval(() => this.refresh(), REFRESH_MS);
	}

	onDisable() {
		if (this.timer) clearInterval(this.timer);
		this.timer = null;
		this.users.clear();
		this.emit(':update');
	}

	getUser(platformId) {
		return this.users.get(String(platformId)) ?? null;
	}

	async loadBadgeCatalog() {
		try {
			const response = await fetch(`${API_BASE}/v1/public/cosmetics/templates?type=badge`);
			if (!response.ok) return;
			const json = await response.json();
			const rows = Array.isArray(json?.data) ? json.data : [];
			this.badgeCatalog = rows
				.map(r => ({ id: r.id, title: r.name, rarity: r.rarity ?? null, urls: badgeUrls(r.data?.image_url), origin: r.origin ?? null }))
				.filter(b => b.urls);
		} catch (err) {
			this.log.error('Could not load the Starlit badge list', err);
		}
	}

	async refresh() {
		try {
			const headers = this.etag ? { 'If-None-Match': this.etag } : {};
			const response = await fetch(`${API_BASE}/v1/public/cosmetics/clients`, { headers });
			if (response.status === 304) return;
			if (!response.ok) return;

			const json = await response.json();
			const data = json?.data;
			if (!data || !Array.isArray(data.users)) return;

			this.etag = response.headers.get('ETag');
			this.keyframes = typeof data.keyframes_css === 'string' ? data.keyframes_css : '';
			this.users = new Map(data.users.map(u => [String(u.platform_id), u]));
			this.emit(':update');
		} catch (err) {
			this.log.error('Could not load Starlit cosmetics', err);
		}
	}
}
