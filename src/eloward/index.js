class EloWardFFZAddon extends FrankerFaceZ.utilities.addon.Addon {
	constructor(...args) {
		super(...args);

		this.inject('chat');
		this.inject('chat.badges');
		this.inject('settings');
		this.inject('site');
		this.inject('site.twitch_data');

		this.config = {
			apiUrl: 'https://eloward-ranks.unleashai.workers.dev/api',
			channelUrl: 'https://eloward-users.unleashai.workers.dev',
			cacheExpiry: 60 * 60 * 1000,
			maxCacheSize: 500
		};

		this.cache = new Map();
		this.activeChannels = new Set();
		this.activeRooms = new Map();
		this.lolCategoryRooms = new Set();
		this.rankTiers = new Set(['iron', 'bronze', 'silver', 'gold', 'platinum', 'emerald', 'diamond', 'master', 'grandmaster', 'challenger', 'unranked']);
		this.userBadges = new Map();
		this.badgeStyleElement = null;


		this.settings.add('eloward.enabled', {
			default: true,
			ui: {
				path: 'Add-Ons >> EloWard Rank Badges',
				title: 'Enable Rank Badges',
				description: 'Show League of Legends rank badges in chat when streaming League of Legends.\n\n(Per-badge visibility can be set in [Chat >> Badges > Visibility > Add-Ons](~chat.badges.tabs.visibility))',
				component: 'setting-check-box'
			},
			changed: () => this.updateBadges()
		});

		this.settings.add('eloward.manual_override', {
			default: false,
			ui: {
				path: 'Add-Ons >> EloWard Rank Badges',
				title: 'Manual Override',
				description: 'Force enable rank badges for all channels (useful for OBS or when automatic detection fails)',
				component: 'setting-check-box'
			},
			changed: () => this.updateBadges()
		});
	}

	onEnable() {
		this.log.info('🚀 EloWard: Starting initialization...');
		this.initializeBasicInfrastructure();
		this.initializeRankBadges();
		this.on('chat:room-add', this.onRoomAdd, this);
		this.on('chat:room-remove', this.onRoomRemove, this);
		this.on('site.context:changed', this.onContextChanged, this);
		
		this.chat.addTokenizer({
			type: 'eloward-ranks',
			process: this.processMessage.bind(this)
		});
		
		this.initializeExistingRooms();
	}

	initializeBasicInfrastructure() {
		this.badgeStyleElement = document.createElement('style');
		this.badgeStyleElement.id = 'eloward-badge-styles';
		this.badgeStyleElement.textContent = this.generateRankSpecificCSS();
		document.head.appendChild(this.badgeStyleElement);
	}

	getBadgeData(tier) {
		return {
			id: tier,
			title: `${tier.charAt(0).toUpperCase() + tier.slice(1)}`,
			slot: 99,
			image: `https://eloward-cdn.unleashai.workers.dev/lol/${tier}.png`,
			urls: {
				1: `https://eloward-cdn.unleashai.workers.dev/lol/${tier}.png`,
				2: `https://eloward-cdn.unleashai.workers.dev/lol/${tier}.png`,
				4: `https://eloward-cdn.unleashai.workers.dev/lol/${tier}.png`
			},
			svg: false,
			tooltipExtra: this.createTooltipHandler.bind(this)
		};
	}

	getBadgeId(tier) {
		return `addon.eloward.rank-${tier}`;
	}

	createTooltipHandler(user, _badge, createElement) {
		try {
			const username = user.login || user.user_login;
			if (!username) return null;
			
			const cachedRank = this.getCachedRank(username);
			if (!cachedRank) return null;
			
			return this.createRankTooltip(cachedRank, createElement);
		} catch (error) {
			return null;
		}
	}

	createRankTooltip(rankData, createElement) {
		if (!rankData?.tier) return null;
		
		const tier = rankData.tier.toLowerCase();
		const rankImageUrl = `https://eloward-cdn.unleashai.workers.dev/lol/${tier}.png`;
		const rankText = this.formatRankText(rankData);
		
		const container = createElement('div', {
			style: 'display: flex; align-items: center; gap: 8px; min-width: 120px; padding: 4px;'
		});
		
		const rankImage = createElement('img', {
			src: rankImageUrl,
			style: 'width: 24px; height: 24px; flex-shrink: 0;',
			alt: tier
		});
		
		const rankTextEl = createElement('span', {
			style: 'font-size: 13px; font-weight: 500; color: #efeff1;'
		}, rankText);
		
		container.appendChild(rankImage);
		container.appendChild(rankTextEl);
		
		return container;
	}

	initializeRankBadges() {
		for (const tier of this.rankTiers) {
			const badgeId = this.getBadgeId(tier);
			const badgeData = this.getBadgeData(tier);
			this.badges.loadBadgeData(badgeId, badgeData);
		}
	}

	processMessage(tokens, msg) {
		if (!this.settings.get('eloward.enabled')) {
			return tokens;
		}

		const user = msg?.user;
		const username = user?.login;
		const roomLogin = msg?.roomLogin;

		if (!username || !roomLogin) {
			return tokens;
		}

		const hasLoLCategory = this.lolCategoryRooms.has(roomLogin);
		const isActive = this.activeChannels.has(roomLogin);

		if (!hasLoLCategory || !isActive) {
			return tokens;
		}

		this.incrementMetric('db_read', roomLogin);

		const cachedRank = this.getCachedRank(username);
		if (cachedRank) {
			this.incrementMetric('successful_lookup', roomLogin);
			this.addUserBadge(user.id, username, cachedRank);
		} else {
			this.fetchAndProcessRank(username, user.id, roomLogin);
		}

		return tokens;
	}

	async fetchAndProcessRank(username, userId, roomLogin) {
		try {
			const rankData = await this.fetchRankData(username);
			if (rankData) {
				this.setCachedRank(username, rankData);
				this.addUserBadge(userId, username, rankData);
				this.incrementMetric('successful_lookup', roomLogin);
			}
		} catch (error) {
			// Silent fail for 404s and other errors
		}
	}

	getCurrentChannelName() {
		const pathname = window.location.pathname;
		
		const popoutMatch = pathname.match(/^\/popout\/([^/]+)\/chat/);
		if (popoutMatch) {
			return popoutMatch[1].toLowerCase();
		}
		
		const dashPopoutMatch = pathname.match(/^\/popout\/u\/([^/]+)\/stream-manager\/chat/);
		if (dashPopoutMatch) {
			return dashPopoutMatch[1].toLowerCase();
		}
		
		const embedMatch = pathname.match(/^\/embed\/([^/]+)\/chat/);
		if (embedMatch) {
			return embedMatch[1].toLowerCase();
		}
		
		const modPopoutMatch = pathname.match(/^\/popout\/moderator\/([^/]+)\/chat/);
		if (modPopoutMatch) {
			return modPopoutMatch[1].toLowerCase();
		}
		
		const normalMatch = pathname.match(/^\/([^/]+)/);
		return normalMatch ? normalMatch[1].toLowerCase() : null;
	}


	generateRankSpecificCSS() {
		let css = `
			.ffz-badge[data-badge^="addon.eloward.rank-"] {
				display: inline-flex !important;
				justify-content: center !important;
				align-items: center !important;
				width: 20px !important;
				height: 20px !important;
				min-width: 20px !important;
				margin: 0 .3rem .2rem 0 !important;
				background-size: contain !important;
				background-repeat: no-repeat !important;
				background-position: center !important;
				transform: translateY(-5px) !important;
				position: relative !important;
				vertical-align: middle !important;
				cursor: pointer !important;
				transition: none !important;
				box-sizing: content-box !important;
				-webkit-user-select: none !important;
				user-select: none !important;
				-webkit-touch-callout: none !important;
				overflow: visible !important;
			}

		`;

		const rankTransforms = {
			iron: { scale: '1.3', translate: 'translate(-1.5px, 1.5px)', margin: { right: '0px', left: '0px' } },
			bronze: { scale: '1.2', translate: 'translate(-1.5px, 3px)', margin: { right: '0px', left: '0px' } },
			silver: { scale: '1.2', translate: 'translate(-1.5px, 2.5px)', margin: { right: '0px', left: '0px' } },
			gold: { scale: '1.22', translate: 'translate(-1.5px, 3.5px)', margin: { right: '0px', left: '0px' } },
			platinum: { scale: '1.22', translate: 'translate(-1.5px, 4px)', margin: { right: '0px', left: '1px' } },
			emerald: { scale: '1.23', translate: 'translate(-1.5px, 4px)', margin: { right: '0px', left: '0px' } },
			diamond: { scale: '1.23', translate: 'translate(-1.5px, 3.25px)', margin: { right: '2px', left: '2px' } },
			master: { scale: '1.2', translate: 'translate(-1.5px, 4px)', margin: { right: '1.5px', left: '1.5px' } },
			grandmaster: { scale: '1.1', translate: 'translate(-1.5px, 4.5px)', margin: { right: '1px', left: '1px' } },
			challenger: { scale: '1.22', translate: 'translate(-1.5px, 4px)', margin: { right: '2.5px', left: '2.5px' } },
			unranked: { scale: '1.0', translate: 'translate(-1.5px, 5px)', margin: { right: '-1.5px', left: '-1.5px' } }
		};

		for (const tier of this.rankTiers) {
			const transform = rankTransforms[tier];
			if (transform) {
				css += `
					.ffz-badge[data-badge="addon.eloward.rank-${tier}"] {
						transform: translateY(-5px) scale(${transform.scale}) ${transform.translate} !important;
						margin-right: ${transform.margin.right} !important;
						margin-left: ${transform.margin.left} !important;
					}
				`;
			}
		}

		css += `
			.tw-root--theme-dark .ffz-badge[data-badge^="addon.eloward.rank-"] {
				filter: brightness(0.95) !important;
			}

			.tw-root--theme-light .ffz-badge[data-badge^="addon.eloward.rank-"] {
				filter: brightness(1.05) contrast(1.1) !important;
			}
		`;

		css += `
			@media (max-width: 400px) {
				.ffz-badge[data-badge^="addon.eloward.rank-"] {
					width: 18px !important;
					height: 18px !important;
					min-width: 18px !important;
					margin-right: 0.2rem !important;
				}
			}
		`;
		
		return css;
	}

	async onRoomAdd(room) {
		const roomLogin = room.login;
		const roomId = room.id;
		
		if (!roomLogin) {
			return;
		}
		
		this.activeRooms.set(roomId || roomLogin, roomLogin);
		
		await this.detectAndSetCategoryForRoom(roomLogin);
		const isEnabled = await this.checkChannelActive(roomLogin);
		
		if (isEnabled) {
			this.activeChannels.add(roomLogin);
			this.log.info(`🎉 EloWard: Addon enabled for ${roomLogin} - ready to show rank badges!`);
			this.processExistingChatUsers(room, roomLogin);
		}
	}

	onRoomRemove(room) {
		const roomId = room.id;
		const roomLogin = this.activeRooms.get(roomId);
		
		this.activeRooms.delete(roomId);
		if (roomLogin) {
			this.activeChannels.delete(roomLogin);
			this.lolCategoryRooms.delete(roomLogin);
		}
	}

	initializeExistingRooms() {
		if (!this.chat || !this.chat.iterateRooms) {
			return;
		}
		
		for (const room of this.chat.iterateRooms()) {
			this.onRoomAdd(room);
		}
	}
	processExistingChatUsers(room, roomLogin) {
		if (!room || !roomLogin || !this.lolCategoryRooms.has(roomLogin) || !this.activeChannels.has(roomLogin)) {
			return;
		}
		
		try {
			for (const user of room.iterateUsers()) {
				if (!user.login || !user.id || this.userBadges.has(user.id)) {
					continue;
				}
				
				this.incrementMetric('db_read', roomLogin);
				
				const cachedRank = this.getCachedRank(user.login);
				if (cachedRank) {
					this.incrementMetric('successful_lookup', roomLogin);
					this.addUserBadge(user.id, user.login, cachedRank);
				} else {
					this.fetchRankData(user.login).then(rankData => {
						if (rankData) {
							this.setCachedRank(user.login, rankData);
							this.addUserBadge(user.id, user.login, rankData);
							this.incrementMetric('successful_lookup', roomLogin);
						}
					}).catch(() => {});
				}
			}
		} catch (error) {
			this.log.warn(`Error processing existing users for ${roomLogin}:`, error);
		}
	}

	removeUserBadges(userId) {
		const existing = this.userBadges.get(userId);
		if (existing) {
			const ffzUser = this.chat.getUser(userId);
			ffzUser.removeBadge('addon.eloward', existing.badgeId);
			this.userBadges.delete(userId);
		}
	}

	addUserBadge(userId, username, rankData) {
		if (!rankData?.tier) {
			return;
		}

		const tier = rankData.tier.toLowerCase();
		if (!this.rankTiers.has(tier)) {
			return;
		}

		const badgeId = this.getBadgeId(tier);
		const ffzUser = this.chat.getUser(userId);

		const formattedRankText = this.formatRankText(rankData);
		const badgeData = this.getBadgeData(tier);
		badgeData.title = formattedRankText;
		
		this.badges.loadBadgeData(badgeId, badgeData);

		if (!ffzUser.getBadge(badgeId)) {
			this.removeUserBadges(userId);
			ffzUser.addBadge('addon.eloward', badgeId);
		}

		this.userBadges.set(userId, { username, tier, badgeId, rankData });
		this.emit('chat:update-lines-by-user', userId, username, false, true);
	}

	onContextChanged() {
		for (const roomLogin of this.activeRooms.values()) {
			this.checkStreamCategory(roomLogin).then(isLoL => {
				if (isLoL) {
					this.lolCategoryRooms.add(roomLogin);
				} else {
					this.lolCategoryRooms.delete(roomLogin);
				}
			}).catch(() => {});
		}
	}

	formatRankText(rankData) {
		if (!rankData?.tier || rankData.tier.toUpperCase() === 'UNRANKED') {
			return 'UNRANKED';
		}
		
		let rankText = rankData.tier.toUpperCase();
		
		if (rankData.division && !['MASTER', 'GRANDMASTER', 'CHALLENGER'].includes(rankData.tier.toUpperCase())) {
			rankText += ` ${rankData.division}`;
		}
		
		if (rankData.leaguePoints !== undefined && rankData.leaguePoints !== null) {
			rankText += ` - ${rankData.leaguePoints} LP`;
		}
		
		return rankText;
	}

	updateBadges() {
		if (!this.settings.get('eloward.enabled')) {
			this.clearUserData();
		} else {
			for (const [userId, badgeInfo] of this.userBadges.entries()) {
				const ffzUser = this.chat.getUser(userId);
				ffzUser.addBadge('addon.eloward', badgeInfo.badgeId);
			}
		}
		this.emit('chat:update-lines');
	}

	clearUserData() {
		for(const user of this.chat.iterateUsers()) {
			user.removeAllBadges('addon.eloward');
		}
		this.userBadges.clear();
	}

	async fetchRankData(username) {
		const response = await fetch(`${this.config.apiUrl}/ranks/lol/${username.toLowerCase()}`);
		
		if (response.status === 404) {
			return null;
		}
		
		if (!response.ok) {
			throw new Error(`HTTP ${response.status}`);
		}

		const data = await response.json();
		
		return {
			tier: data.rank_tier,
			division: data.rank_division,
			leaguePoints: data.lp,
			summonerName: data.riot_id
		};
	}

	getCachedRank(username) {
		if (!username) {
			return null;
		}
		
		const normalizedUsername = username.toLowerCase();
		const entry = this.cache.get(normalizedUsername);
		if (entry && (Date.now() - entry.timestamp < this.config.cacheExpiry)) {
			return entry.data;
		}
		if (entry) {
			this.cache.delete(normalizedUsername);
		}
		return null;
	}

	setCachedRank(username, data) {
		this.cache.set(username.toLowerCase(), {
			data,
			timestamp: Date.now()
		});

		if (this.cache.size > this.config.maxCacheSize) {
			this.evictOldEntries();
		}
	}

	evictOldEntries() {
		const now = Date.now();
		for (const [key, entry] of this.cache.entries()) {
			if (entry.timestamp && (now - entry.timestamp > this.config.cacheExpiry)) {
				this.cache.delete(key);
			}
		}

		if (this.cache.size > this.config.maxCacheSize) {
			const entries = Array.from(this.cache.entries())
				.sort((a, b) => a[1].timestamp - b[1].timestamp);
			
			const toRemove = entries.slice(0, entries.length - this.config.maxCacheSize + 50);
			toRemove.forEach(([key]) => this.cache.delete(key));
		}
	}

	async checkChannelActive(channelName) {
		if (!channelName) {
			return false;
		}

		try {
			const normalizedName = channelName.toLowerCase();
			this.incrementMetric('db_read', normalizedName);
			
			const response = await fetch(`${this.config.channelUrl}/channelstatus/verify`, {
				method: 'POST',
				headers: { 'Content-Type': 'application/json' },
				body: JSON.stringify({ channel_name: normalizedName })
			});

			if (!response.ok) {
				return false;
			}
			
			const data = await response.json();
			const isActive = !!data.active;
			
			if (isActive) {
				this.log.info(`✅ EloWard: Channel ${channelName} is active and registered`);
			} else {
				this.log.info(`❌ EloWard: Channel ${channelName} is not active`);
			}
			
			return isActive;
		} catch (error) {
			this.log.warn(`⚠️ EloWard: Failed to check status for ${channelName}`);
			return false;
		}
	}

	async incrementMetric(type, channelName) {
		if (!channelName) return;

		try {
			await fetch(`${this.config.channelUrl}/metrics/${type}`, {
				method: 'POST',
				headers: { 'Content-Type': 'application/json' },
				body: JSON.stringify({ channel_name: channelName.toLowerCase() })
			});
		} catch (error) {
			// Silent fail
		}
	}

	onDisable() {
		if (this.badgeStyleElement) {
			this.badgeStyleElement.remove();
			this.badgeStyleElement = null;
		}

		this.off('chat:room-add', this.onRoomAdd);
		this.off('chat:room-remove', this.onRoomRemove);
		this.off('site.context:changed', this.onContextChanged);

		this.chat.removeTokenizer('eloward-ranks');

		this.clearUserData();
		this.cache.clear();
		this.activeChannels.clear();
		this.activeRooms.clear();
		this.lolCategoryRooms.clear();
	}

	async detectAndSetCategoryForRoom(roomLogin) {
		const manualOverride = this.settings.get('eloward.manual_override');
		if (manualOverride) {
			this.lolCategoryRooms.add(roomLogin);
			return true;
		}
		
		const isLolCategory = await this.checkStreamCategory(roomLogin);
		
		if (isLolCategory) {
			this.lolCategoryRooms.add(roomLogin);
		}
		
		return isLolCategory;
	}

	async checkStreamCategory(channelName) {
		try {
			const game = await this.twitch_data.getUserGame(null, channelName);
			
			if (game) {
				const gameName = game.name || game.displayName || 'Unknown';
				const isLoL = game.id === '21779' || 
					game.name === 'League of Legends' ||
					game.displayName === 'League of Legends';
				
				if (isLoL) {
					this.log.info(`🎮 EloWard: League of Legends detected for ${channelName}`);
				} else {
					this.log.info(`🎯 EloWard: Different game detected for ${channelName}: ${gameName}`);
				}
				
				return isLoL;
			} else {
				this.log.info(`❓ EloWard: No game category found for ${channelName}`);
				return false;
			}
		} catch (error) {
			return false;
		}
	}

}

EloWardFFZAddon.register();