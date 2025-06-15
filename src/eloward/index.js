// EloWard FFZ Addon - League of Legends Rank Badges for Streamers
// Properly integrated with FFZ's badge system and chat architecture

class EloWardFFZAddon extends FrankerFaceZ.utilities.addon.Addon {
	constructor(...args) {
		super(...args);

		// Inject FFZ services
		this.inject('chat');
		this.inject('chat.badges');
		this.inject('settings');

		// Configuration
		this.config = {
			apiUrl: 'https://eloward-viewers-api.unleashai.workers.dev/api',
			subscriptionUrl: 'https://eloward-subscription-api.unleashai.workers.dev',
			cacheExpiry: 60 * 60 * 1000, // 1 hour
			maxCacheSize: 500,
			rateLimit: 100, // ms between requests
			maxQueueSize: 10
		};

		// State management
		this.cache = new Map();
		this.processingQueue = [];
		this.isProcessing = false;
		this.subscribedChannels = new Set();
		this.activeRooms = new Map(); // roomId -> roomLogin
		this.chromeExtensionDetected = false;
		this.rankTiers = new Set(['iron', 'bronze', 'silver', 'gold', 'platinum', 'emerald', 'diamond', 'master', 'grandmaster', 'challenger', 'unranked']);
		this.userBadges = new Map();

		// Settings - Dynamic category detection following FFZ patterns
		this.settings.add('eloward.enabled', {
			default: true,
			ui: {
				path: 'Add-Ons >> EloWard Rank Badges',
				title: 'Enable Rank Badges',
				description: 'Show League of Legends rank badges in chat.\n\n(Per-badge visibility can be set in [Chat >> Badges > Visibility > Add-Ons](~chat.badges.tabs.visibility))',
				component: 'setting-check-box'
			},
			changed: () => this.updateBadges()
		});

		this.settings.add('eloward.category_detection', {
			default: 0,
			requires: ['context.categoryID'],
			process: ctx => ctx.get('context.categoryID') === '21779', // League of Legends category ID
			ui: {
				path: 'Add-Ons >> EloWard Rank Badges',
				title: 'Category Detection',
				description: 'Control when rank badges are shown based on the current category.',
				component: 'setting-select-box',
				data: [
					{value: -1, title: 'Disabled'},
					{value: 0, title: 'Automatic (League of Legends only)'},
					{value: 1, title: 'Always Enabled'}
				]
			}
		});
	}

	onEnable() {
		this.log.info('EloWard FFZ Addon: Initializing');

		// Initialize rank badges
		this.initializeRankBadges();

		// Detect Chrome extension conflict
		this.detectChromeExtension();
		if (this.chromeExtensionDetected) {
			this.log.info('Chrome extension detected, disabling rank badges');
		}

		// Set up chat room event listeners
		this.on('chat:room-add', this.onRoomAdd, this);
		this.on('chat:room-remove', this.onRoomRemove, this);

		// Setup chat tokenizer
		this.chat.addTokenizer({
			type: 'eloward-ranks',
			process: this.processMessage.bind(this)
		});
	}

	getBadgeData(tier) {
		return {
			id: tier,
			title: `${tier.charAt(0).toUpperCase() + tier.slice(1)}`,
			slot: 1,
			image: `https://eloward-cdn.unleashai.workers.dev/lol/${tier}.png`,
			urls: {
				1: `https://eloward-cdn.unleashai.workers.dev/lol/${tier}.png`,
				2: `https://eloward-cdn.unleashai.workers.dev/lol/${tier}.png`,
				4: `https://eloward-cdn.unleashai.workers.dev/lol/${tier}.png`
			},
			svg: false,
			click_url: 'https://www.eloward.com/',
			tooltipExtra: (user, badge, createElement) => {
				// Dynamic tooltip showing current rank info
				const cachedRank = this.getCachedRank(user.login);
				if (cachedRank) {
					const rankText = this.formatRankText(cachedRank);
					return createElement('div', { className: 'tw-pd-05' }, rankText);
				}
				return null;
			}
		};
	}

	getBadgeId(tier) {
		return `addon.eloward.rank-${tier}`;
	}

	initializeRankBadges() {
		for (const tier of this.rankTiers) {
			const badgeId = this.getBadgeId(tier);
			const badgeData = this.getBadgeData(tier);
			this.badges.loadBadgeData(badgeId, badgeData);
		}
	}

	async onRoomAdd(room) {
		const roomLogin = room.login;
		const roomId = room.id;
		
		this.activeRooms.set(roomId, roomLogin);
		
		// Check if this channel is subscribed to EloWard
		const isSubscribed = await this.checkChannelSubscription(roomLogin);
		if (isSubscribed) {
			this.subscribedChannels.add(roomLogin);
		}
	}

	onRoomRemove(room) {
		const roomId = room.id;
		const roomLogin = this.activeRooms.get(roomId);
		
		this.activeRooms.delete(roomId);
		if (roomLogin) {
			this.subscribedChannels.delete(roomLogin);
		}
	}

	processMessage(tokens, msg) {
		// Check if addon is enabled
		if (!this.settings.get('eloward.enabled')) {
			return tokens;
		}

		// Check category detection setting
		const categoryDetection = this.settings.get('eloward.category_detection');
		if (categoryDetection === -1) {
			return tokens; // Disabled
		}
		if (categoryDetection === 0 && !this.settings.get('eloward.category_detection')) {
			return tokens; // Auto mode but not League of Legends
		}

		// Skip if Chrome extension is active
		if (this.chromeExtensionDetected) {
			return tokens;
		}

		const user = msg?.user;
		const username = user?.login;
		const roomLogin = msg?.roomLogin;

		if (!username || !roomLogin) return tokens;

		// Check if this room's channel is subscribed
		if (!this.subscribedChannels.has(roomLogin)) {
			return tokens;
		}

		// Track metrics and process rank lookup
		this.incrementMetric('db_read', roomLogin);

		const cachedRank = this.getCachedRank(username);
		if (cachedRank) {
			this.incrementMetric('successful_lookup', roomLogin);
			this.addUserBadge(user.id, username, cachedRank);
		} else {
			this.queueRankLookup(username, user.id, roomLogin);
		}

		return tokens;
	}

	formatRankText(rankData) {
		if (!rankData?.tier || rankData.tier.toUpperCase() === 'UNRANKED') {
			return 'UNRANKED';
		}
		
		let rankText = rankData.tier;
		
		// Add division for ranks that have divisions
		if (rankData.division && !['MASTER', 'GRANDMASTER', 'CHALLENGER'].includes(rankData.tier.toUpperCase())) {
			rankText += ` ${rankData.division}`;
		}
		
		// Add LP for ranked players
		if (rankData.leaguePoints !== undefined && rankData.leaguePoints !== null) {
			rankText += ` - ${rankData.leaguePoints} LP`;
		}
		
		return rankText;
	}

	removeUserBadges(userId) {
		const existing = this.userBadges.get(userId);
		if (existing) {
			const ffzUser = this.chat.getUser(userId);
			ffzUser.removeBadge('addon.eloward', existing.badgeId);
			this.userBadges.delete(userId);
		}
	}

	updateBadges() {
		if (!this.settings.get('eloward.enabled')) {
			this.clearUserData();
		} else {
			// Re-add badges for all users when re-enabled
			for (const [userId, badgeInfo] of this.userBadges.entries()) {
				const ffzUser = this.chat.getUser(userId);
				ffzUser.addBadge('addon.eloward', badgeInfo.badgeId);
			}
		}
		this.emit('chat:update-lines');
	}

	clearUserData() {
		// Remove badges from all users
		for(const user of this.chat.iterateUsers()) {
			user.removeAllBadges('addon.eloward');
		}
		this.userBadges.clear();
	}

	addUserBadge(userId, username, rankData) {
		if (!rankData?.tier) return;

		const tier = rankData.tier.toLowerCase();
		if (!this.rankTiers.has(tier)) return;

		const badgeId = this.getBadgeId(tier);
		const ffzUser = this.chat.getUser(userId);

		// Check if user already has this badge
		if (ffzUser.getBadge(badgeId)) return;

		// Remove any existing EloWard badges from this user
		this.removeUserBadges(userId);

		// Add the badge to the user
		ffzUser.addBadge('addon.eloward', badgeId);

		// Track this badge assignment
		this.userBadges.set(userId, { username, tier, badgeId });

		// Update chat display for this user
		this.emit('chat:update-lines-by-user', userId, username, false, true);
	}

	queueRankLookup(username, userId, roomLogin) {
		if (!this.processingQueue.find(item => item.username === username)) {
			this.processingQueue.push({ username, userId, roomLogin });

			if (this.processingQueue.length > this.config.maxQueueSize) {
				this.processingQueue.shift();
			}

			this.processQueue();
		}
	}

	async processQueue() {
		if (this.isProcessing || this.processingQueue.length === 0) return;

		this.isProcessing = true;
		const { username, userId, roomLogin } = this.processingQueue.shift();

		try {
			const rankData = await this.fetchRankData(username);
			if (rankData) {
				this.setCachedRank(username, rankData);
				this.addUserBadge(userId, username, rankData);
				this.incrementMetric('successful_lookup', roomLogin);
			}
		} catch (error) {
			// Silently handle errors - most are 404s for users without rank data
		}

		this.isProcessing = false;
		setTimeout(() => this.processQueue(), this.config.rateLimit);
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
		const entry = this.cache.get(username.toLowerCase());
		if (entry && (Date.now() - entry.timestamp < this.config.cacheExpiry)) {
			entry.frequency = (entry.frequency || 0) + 1;
			return entry.data;
		}
		if (entry) {
			this.cache.delete(username.toLowerCase());
		}
		return null;
	}

	setCachedRank(username, data) {
		this.cache.set(username.toLowerCase(), {
			data,
			timestamp: Date.now(),
			frequency: 1
		});

		if (this.cache.size > this.config.maxCacheSize) {
			this.evictLFU();
		}
	}

	evictLFU() {
		let lowestFrequency = Infinity;
		let userToEvict = null;

		for (const [key, entry] of this.cache.entries()) {
			if (entry.timestamp && (Date.now() - entry.timestamp > this.config.cacheExpiry)) {
				this.cache.delete(key);
				continue;
			}

			if (entry.frequency < lowestFrequency) {
				lowestFrequency = entry.frequency;
				userToEvict = key;
			}
		}

		if (userToEvict) {
			this.cache.delete(userToEvict);
		}
	}

	detectChromeExtension() {
		// Check for the specific data attribute set by Chrome extension
		this.chromeExtensionDetected = document.body.getAttribute('data-eloward-chrome-ext') === 'active';
		
		if (this.chromeExtensionDetected) {
			this.log.info('Chrome extension detected - FFZ addon will disable rank badges to avoid conflicts');
		}
	}

	async checkChannelSubscription(channelName) {
		if (!channelName) return false;

		try {
			const normalizedName = channelName.toLowerCase();
			this.incrementMetric('db_read', normalizedName);
			
			const response = await fetch(`${this.config.subscriptionUrl}/subscription/verify`, {
				method: 'POST',
				headers: { 'Content-Type': 'application/json' },
				body: JSON.stringify({ channel_name: normalizedName })
			});

			if (!response.ok) return false;
			const data = await response.json();
			return !!data.subscribed;
		} catch (error) {
			return false;
		}
	}

	async incrementMetric(type, channelName) {
		if (!channelName) return;

		try {
			const normalizedName = channelName.toLowerCase();
			
			await fetch(`${this.config.subscriptionUrl}/metrics/${type}`, {
				method: 'POST',
				headers: { 'Content-Type': 'application/json' },
				body: JSON.stringify({ channel_name: normalizedName })
			});
		} catch (error) {
			// Silently fail metrics to avoid disrupting main functionality
		}
	}

	onDisable() {
		// Remove event listeners
		this.off('chat:room-add', this.onRoomAdd);
		this.off('chat:room-remove', this.onRoomRemove);

		// Remove tokenizer
		this.chat.removeTokenizer('eloward-ranks');

		// Clear all data
		this.clearUserData();
		this.cache.clear();
		this.processingQueue = [];
		this.subscribedChannels.clear();
		this.activeRooms.clear();
	}
}

// Register the addon with FFZ
EloWardFFZAddon.register();
