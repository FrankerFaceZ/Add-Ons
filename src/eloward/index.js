// EloWard FFZ Addon - League of Legends Rank Badges for Streamers
// Properly integrated with FFZ's badge system and chat architecture

class EloWardFFZAddon extends FrankerFaceZ.utilities.addon.Addon {
	constructor(...args) {
		super(...args);

		// Inject FFZ services
		this.inject('chat');
		this.inject('chat.badges');
		this.inject('settings');
		this.inject('site'); // Add site injection for context access

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

		// Settings - Use dynamic category detection as recommended by SirStendec
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

		// Dynamic category detection setting (as recommended in PR feedback)
		this.settings.add('eloward.category_detection', {
			default: 0,
			requires: ['context.categoryID'],
			process: ctx => ctx.get('context.categoryID') === '21779', // League of Legends category ID
			// No UI section means it's automatic only, as suggested in feedback
		});
	}

	onEnable() {
		this.log.info('EloWard FFZ Addon: Initializing');

		// Initialize rank badges
		this.initializeRankBadges();
		this.log.info('Rank badges initialized');

		// Detect Chrome extension conflict
		this.detectChromeExtension();
		this.log.info(`Chrome extension detection: ${this.chromeExtensionDetected ? 'DETECTED' : 'NOT DETECTED'}`);
		
		if (this.chromeExtensionDetected) {
			this.log.info('Chrome extension detected, disabling rank badges');
		}

		// Room-based approach as recommended in PR feedback - no URL fallback needed

		// Set up chat room event listeners
		this.on('chat:room-add', this.onRoomAdd, this);
		this.on('chat:room-remove', this.onRoomRemove, this);
		this.log.info('Chat room event listeners registered');

		// Setup chat tokenizer
		this.chat.addTokenizer({
			type: 'eloward-ranks',
			process: this.processMessage.bind(this)
		});
		this.log.info('Chat tokenizer registered');
		
		this.log.info('EloWard FFZ Addon initialization complete');
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
		// Try to get room data from different sources
		let roomLogin, roomId;
		
		// Try getter properties first (these appear as (...) in the logs)
		try {
			roomLogin = room.login;
			roomId = room.id;
		} catch (e) {
			// If getters fail, try other properties
		}
		
		// If getters didn't work, try alternative properties
		if (!roomLogin) {
			roomLogin = room._id || room.name || room.channel || room.roomLogin || room.displayName;
		}
		
		if (!roomId) {
			roomId = room._id || room.roomId || room.channelId;
		}
		
		this.log.info(`Room added: ${roomLogin} (ID: ${roomId})`);
		
		// If we still don't have room data, try to access it differently
		if (!roomLogin) {
			// Try accessing manager to get room info
			if (room.manager && room.manager.rooms) {
				this.log.info('Trying to get room info from manager...');
				for (const [key, managerRoom] of room.manager.rooms) {
					this.log.info(`Manager room: ${key} ->`, managerRoom.login);
				}
			}
			
			this.log.info('No room login found, room object constructor:', room.constructor.name);
			return;
		}
		
		this.activeRooms.set(roomId || roomLogin, roomLogin);
		
		// Check if this channel is subscribed to EloWard
		this.log.info(`Checking subscription for channel: ${roomLogin}`);
		const isSubscribed = await this.checkChannelSubscription(roomLogin);
		this.log.info(`Channel ${roomLogin} subscription status: ${isSubscribed ? 'SUBSCRIBED' : 'NOT SUBSCRIBED'}`);
		
		if (isSubscribed) {
			this.subscribedChannels.add(roomLogin);
			this.log.info(`Added ${roomLogin} to subscribed channels list`);
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
			this.log.debug('Addon disabled, skipping message processing');
			return tokens;
		}

		// Use dynamic category detection as recommended in PR feedback
		if (!this.settings.get('eloward.category_detection')) {
			this.log.debug('Not League of Legends category, skipping message processing');
			return tokens;
		}

		// Skip if Chrome extension is active
		if (this.chromeExtensionDetected) {
			this.log.debug('Chrome extension detected, skipping message processing');
			return tokens;
		}

		const user = msg?.user;
		const username = user?.login;
		
		// Handle multiple rooms and shared chats as recommended in PR feedback
		let roomLogin = msg?.roomLogin;
		const roomID = msg?.roomID;
		const sourceRoomID = msg?.sourceRoomID; // For shared chats
		
		this.log.debug(`Message from ${username} - roomLogin: ${roomLogin}, roomID: ${roomID}, sourceRoomID: ${sourceRoomID}`);

		if (!username || !roomLogin) {
			this.log.debug(`Missing user data - username: ${username}, roomLogin: ${roomLogin}`);
			this.log.debug(`Message object keys:`, Object.keys(msg || {}));
			return tokens;
		}

		// Check if this room's channel is subscribed
		if (!this.subscribedChannels.has(roomLogin)) {
			this.log.debug(`Channel ${roomLogin} not in subscribed channels list. Subscribed channels: [${Array.from(this.subscribedChannels).join(', ')}]`);
			return tokens;
		}

		this.log.debug(`Processing message from ${username} in ${roomLogin}`);

		// Track metrics and process rank lookup
		this.incrementMetric('db_read', roomLogin);

		const cachedRank = this.getCachedRank(username);
		if (cachedRank) {
			this.log.debug(`Found cached rank for ${username}: ${cachedRank.tier}`);
			this.incrementMetric('successful_lookup', roomLogin);
			this.addUserBadge(user.id, username, cachedRank);
		} else {
			this.log.debug(`No cached rank for ${username}, queuing lookup`);
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
		if (!rankData?.tier) {
			this.log.debug(`No tier data for ${username}, skipping badge assignment`);
			return;
		}

		const tier = rankData.tier.toLowerCase();
		if (!this.rankTiers.has(tier)) {
			this.log.debug(`Unknown tier '${tier}' for ${username}, skipping badge assignment`);
			return;
		}

		const badgeId = this.getBadgeId(tier);
		const ffzUser = this.chat.getUser(userId);

		// Check if user already has this badge
		if (ffzUser.getBadge(badgeId)) {
			this.log.debug(`User ${username} already has badge ${badgeId}`);
			return;
		}

		// Remove any existing EloWard badges from this user
		this.removeUserBadges(userId);

		// Add the badge to the user
		ffzUser.addBadge('addon.eloward', badgeId);
		this.log.info(`Added ${tier} badge to user ${username} (ID: ${userId})`);

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
		this.log.debug(`Fetching rank data for ${username}`);
		const response = await fetch(`${this.config.apiUrl}/ranks/lol/${username.toLowerCase()}`);
		
		if (response.status === 404) {
			this.log.debug(`No rank data found for ${username} (404)`);
			return null;
		}
		
		if (!response.ok) {
			this.log.debug(`API error for ${username}: HTTP ${response.status}`);
			throw new Error(`HTTP ${response.status}`);
		}

		const data = await response.json();
		this.log.debug(`Rank data retrieved for ${username}: ${data.rank_tier}`);
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
		if (!channelName) {
			this.log.debug('No channel name provided for subscription check');
			return false;
		}

		try {
			const normalizedName = channelName.toLowerCase();
			this.log.debug(`Checking subscription for: ${normalizedName}`);
			this.incrementMetric('db_read', normalizedName);
			
			const response = await fetch(`${this.config.subscriptionUrl}/subscription/verify`, {
				method: 'POST',
				headers: { 'Content-Type': 'application/json' },
				body: JSON.stringify({ channel_name: normalizedName })
			});

			if (!response.ok) {
				this.log.debug(`Subscription check failed for ${normalizedName}: HTTP ${response.status}`);
				return false;
			}
			
			const data = await response.json();
			const isSubscribed = !!data.subscribed;
			this.log.debug(`Subscription API response for ${normalizedName}: ${isSubscribed}`);
			return isSubscribed;
		} catch (error) {
			this.log.debug(`Subscription check error for ${channelName}: ${error.message}`);
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
		this.log.info('EloWard FFZ Addon: Disabling');
		
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
		
		this.log.info('EloWard FFZ Addon: Disabled');
	}
}

// Register the addon with FFZ
EloWardFFZAddon.register();