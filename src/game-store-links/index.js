const { createElement } = FrankerFaceZ.utilities.dom;

const CATEGORY_PATH = '/directory/category/';
const PROCESSED_ATTR = 'data-ffz-game-store-links';
const LINK_CLASS = 'ffz-game-store-links';
const POPUP_CLASS = 'ffz-game-store-links__popup';
const TITLE_CLASS = 'ffz-game-store-links__title-row';
const STYLE_ID = 'ffz-game-store-links-style';
const CACHE_TTL = 1000 * 60 * 60 * 24;

function normalizeGameName(name) {
	return String(name || '')
		.toLowerCase()
		.replace(/[™®©]/g, '')
		.replace(/[:'’.,!?\-_/\\()[\]{}]/g, ' ')
		.replace(/\s+/g, ' ')
		.trim();
}

function getSearchLinks(game) {
	const encoded = encodeURIComponent(game);

	return {
		steam: `https://store.steampowered.com/search/?term=${encoded}`,
		steamDB: `https://steamdb.info/search/?a=app&q=${encoded}`,
		epic: `https://store.epicgames.com/en-US/browse?q=${encoded}&sortBy=relevancy&sortDir=DESC&count=40`,
		itch: `https://itch.io/search?q=${encoded}`
	};
}

function makeStoreLink(label, href, className) {
	return createElement('a', {
		className: `ffz-game-store-links__store ${className || ''}`,
		href,
		target: '_blank',
		rel: 'noopener noreferrer'
	}, label);
}

function getAnchorGameName(anchor) {
	const text = anchor.textContent?.trim();
	if ( ! text || text.length < 2 )
		return null;

	const href = anchor.getAttribute('href') || '';
	if ( ! href.startsWith(CATEGORY_PATH) )
		return null;

	return text;
}

class GameStoreLinks extends Addon {
	constructor(...args) {
		super(...args);

		this.inject('site.router');
		this.cache = new Map;
		this.pending = new Map;
		this.handleMutations = this.handleMutations.bind(this);
		this.scan = this.scan.bind(this);
	}

	onEnable() {
		this.injectStyle();
		this.observer = new MutationObserver(this.handleMutations);
		this.observer.observe(document.body, {
			characterData: true,
			childList: true,
			subtree: true
		});

		this.on('site.router:route', this.scan, this);
		this.scan();
	}

	onDisable() {
		this.off('site.router:route', this.scan, this);

		if ( this.observer ) {
			this.observer.disconnect();
			this.observer = null;
		}

		for(const el of document.querySelectorAll(`.${LINK_CLASS}`))
			this.unwrapAnchor(el);

		for(const el of document.querySelectorAll(`.${TITLE_CLASS}`))
			el.remove();

		for(const el of document.querySelectorAll(`h1[${PROCESSED_ATTR}]`))
			el.removeAttribute(PROCESSED_ATTR);

		document.getElementById(STYLE_ID)?.remove();
	}

	handleMutations() {
		clearTimeout(this.scan_timer);
		this.scan_timer = setTimeout(this.scan, 100);
	}

	scan() {
		for(const wrapper of document.querySelectorAll(`.${LINK_CLASS}`))
			this.refreshWrapper(wrapper);

		for(const anchor of document.querySelectorAll(`a[href^="${CATEGORY_PATH}"]:not([${PROCESSED_ATTR}])`)) {
			const wrapper = anchor.closest(`.${LINK_CLASS}`);

			if ( wrapper ) {
				anchor.setAttribute(PROCESSED_ATTR, 'true');
				this.refreshWrapper(wrapper);
			} else
				this.attach(anchor);
		}

		this.attachDirectoryTitle();
	}

	attach(anchor) {
		const game = getAnchorGameName(anchor);
		if ( ! game )
			return;

		anchor.setAttribute(PROCESSED_ATTR, 'true');

		const wrapper = createElement('span', {
			className: LINK_CLASS
		});
		wrapper.dataset.game = game;

		anchor.parentNode?.insertBefore(wrapper, anchor);
		wrapper.appendChild(anchor);

		const popup = this.buildPopup(game);
		wrapper.appendChild(popup);

		wrapper.addEventListener('mouseenter', () => this.refreshWrapper(wrapper, true), { passive: true });
	}

	refreshWrapper(wrapper, populate = false) {
		const anchor = wrapper.querySelector(`a[href^="${CATEGORY_PATH}"]`);
		const game = anchor && getAnchorGameName(anchor);
		if ( ! game )
			return;

		anchor.setAttribute(PROCESSED_ATTR, 'true');

		let popup = wrapper.querySelector(`.${POPUP_CLASS}`);

		if ( wrapper.dataset.game !== game || ! popup ) {
			const nextPopup = this.buildPopup(game);
			popup?.replaceWith(nextPopup);
			popup = nextPopup;
			wrapper.dataset.game = game;
		}

		if ( populate )
			this.populatePopup(popup, game);
	}

	attachDirectoryTitle() {
		if ( ! location.pathname.startsWith(CATEGORY_PATH) )
			return;

		const heading = document.querySelector('main h1, h1');
		const game = heading?.textContent?.trim();

		if ( ! heading || ! game )
			return;

		heading.setAttribute(PROCESSED_ATTR, 'true');

		let row = heading.nextElementSibling?.classList.contains(TITLE_CLASS)
			? heading.nextElementSibling
			: null;

		if ( ! row || row.dataset.game !== game ) {
			const nextRow = this.buildTitleLinks(game);
			nextRow.dataset.game = game;

			if ( row )
				row.replaceWith(nextRow);
			else
				heading.insertAdjacentElement('afterend', nextRow);

			row = nextRow;
			this.populateTitleLinks(row, game);
		}
	}

	unwrapAnchor(wrapper) {
		const anchor = wrapper.querySelector(`a[${PROCESSED_ATTR}]`);
		if ( ! anchor || ! wrapper.parentNode )
			return;

		anchor.removeAttribute(PROCESSED_ATTR);
		wrapper.parentNode.insertBefore(anchor, wrapper);
		wrapper.remove();
	}

	buildPopup(game) {
		const search = getSearchLinks(game);

		return createElement('span', {
			className: POPUP_CLASS,
			role: 'tooltip'
		}, createElement('span', {
			className: 'ffz-game-store-links__stores'
		}, [
			makeStoreLink('Steam', search.steam, 'ffz-game-store-links__steam-search'),
			makeStoreLink('SteamDB', search.steamDB, 'ffz-game-store-links__steamdb-search'),
			makeStoreLink('Epic', search.epic),
			makeStoreLink('itch.io', search.itch)
		]));
	}

	buildTitleLinks(game) {
		const search = getSearchLinks(game);

		return createElement('div', {
			className: TITLE_CLASS
		}, createElement('span', {
			className: 'ffz-game-store-links__stores'
		}, [
			makeStoreLink('Steam', search.steam, 'ffz-game-store-links__steam-search'),
			makeStoreLink('SteamDB', search.steamDB, 'ffz-game-store-links__steamdb-search'),
			makeStoreLink('Epic', search.epic),
			makeStoreLink('itch.io', search.itch)
		]));
	}

	async populatePopup(popup, game) {
		if ( popup.dataset.loaded )
			return;

		try {
			const result = await this.findSteamGame(game);
			popup.dataset.loaded = 'true';

			if ( result )
				this.replaceSteamLinks(popup, result);
		} catch(err) {
			this.log.warn('Unable to resolve Steam links for game store links.', err);
			popup.dataset.loaded = 'true';
		}
	}

	async populateTitleLinks(row, game) {
		try {
			const result = await this.findSteamGame(game);

			if ( result )
				this.replaceSteamLinks(row, result);
		} catch(err) {
			this.log.warn('Unable to resolve Steam links for game directory links.', err);
		}
	}

	replaceSteamLinks(container, result) {
		if ( ! container?.isConnected )
			return;

		const steamSearch = container.querySelector('.ffz-game-store-links__steam-search');
		const steamDBSearch = container.querySelector('.ffz-game-store-links__steamdb-search');

		steamSearch?.replaceWith(makeStoreLink('Steam', result.url, 'ffz-game-store-links__steam'));
		steamDBSearch?.replaceWith(makeStoreLink('SteamDB', result.steamDB, 'ffz-game-store-links__steamdb'));
	}

	async findSteamGame(game) {
		const key = normalizeGameName(game);
		const cached = this.cache.get(key);

		if ( cached && Date.now() - cached.time < CACHE_TTL )
			return cached.value;

		if ( this.pending.has(key) )
			return this.pending.get(key);

		const promise = this.searchGameCatalog(game, key);
		this.pending.set(key, promise);

		try {
			const value = await promise;
			this.cache.set(key, {
				time: Date.now(),
				value
			});

			return value;
		} finally {
			this.pending.delete(key);
		}
	}

	async searchGameCatalog(game, normalized) {
		const url = `https://www.cheapshark.com/api/1.0/games?title=${encodeURIComponent(game)}&limit=10`;
		const response = await fetch(url, {
			credentials: 'omit'
		});

		if ( ! response.ok )
			throw new Error(`Game catalog search failed: ${response.status}`);

		const data = await response.json();
		const items = Array.isArray(data) ? data : [];
		const exact = items.find(item =>
			item?.steamAppID && normalizeGameName(item.external) === normalized
		);

		if ( ! exact?.steamAppID )
			return null;

		return {
			id: exact.steamAppID,
			name: exact.external,
			url: `https://store.steampowered.com/app/${exact.steamAppID}/`,
			steamDB: `https://steamdb.info/app/${exact.steamAppID}/`
		};
	}

	injectStyle() {
		if ( document.getElementById(STYLE_ID) )
			return;

		document.head.appendChild(createElement('style', {
			id: STYLE_ID
		}, `
			.${LINK_CLASS} {
				position: relative;
				display: inline-flex;
				align-items: center;
				padding: 0 0.75rem 1rem;
				margin: 0 -0.75rem -1rem;
			}

			.${TITLE_CLASS} {
				display: flex;
				align-items: center;
				flex-wrap: wrap;
				gap: 0.75rem;
				margin: 0.5rem 0 1rem;
				font-size: 1.3rem;
			}

			.${POPUP_CLASS} {
				position: absolute;
				z-index: 10000;
				top: 100%;
				left: 0;
				display: none;
				min-width: max-content;
				padding: 0.7rem;
				border-radius: 0.4rem;
				background: #18181b;
				box-shadow: 0 0.4rem 1rem rgba(0, 0, 0, 0.35);
				color: #efeff1;
				font-size: 1.2rem;
				line-height: 1.4;
				white-space: normal;
			}

			.${LINK_CLASS}:hover .${POPUP_CLASS},
			.${LINK_CLASS}:focus-within .${POPUP_CLASS} {
				display: block;
			}

			.ffz-game-store-links__stores {
				display: block;
			}

			.ffz-game-store-links__stores {
				display: flex;
				flex-wrap: wrap;
				gap: 0.4rem;
			}

			.ffz-game-store-links__store {
				display: inline-flex;
				align-items: center;
				padding: 0.25rem 0.5rem;
				border-radius: 0.3rem;
				background: var(--color-background-button-secondary-default, #3a3a3d);
				color: inherit;
				font-weight: 600;
				text-decoration: none;
			}

			.ffz-game-store-links__store:hover,
			.ffz-game-store-links__store:focus {
				background: var(--color-background-button-secondary-hover, #4a4a4d);
				color: inherit;
				text-decoration: none;
			}
		`));
	}
}

GameStoreLinks.register();
