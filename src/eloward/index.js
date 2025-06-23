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
		this.lolCategoryRooms = new Set(); // rooms where LoL category is detected
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

		// Detect Chrome extension conflict
		this.detectChromeExtension();
		if (this.chromeExtensionDetected) {
			this.log.info('Chrome extension detected, disabling rank badges');
		}

		// Set up chat room event listeners
		this.on('chat:room-add', this.onRoomAdd, this);
		this.on('chat:room-remove', this.onRoomRemove, this);

		// Listen for context changes to re-evaluate category detection
		this.on('site.context:changed', this.onContextChanged, this);

		// Setup chat tokenizer
		this.chat.addTokenizer({
			type: 'eloward-ranks',
			process: this.processMessage.bind(this)
		});

		// Handle existing rooms with proper timing and retries
		this.initializeExistingRooms();
		
		this.log.info('EloWard FFZ Addon: Ready');
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
		
		// Try getter properties first
		try {
			roomLogin = room.login;
			roomId = room.id;
		} catch (e) {
			// Silently handle getter errors
		}
		
		// If getters didn't work, try alternative properties
		if (!roomLogin) {
			roomLogin = room._id || room.name || room.channel || room.roomLogin || room.displayName;
		}
		
		if (!roomId) {
			roomId = room._id || room.roomId || room.channelId;
		}
		
		// If we still don't have room data, skip silently
		if (!roomLogin) {
			return;
		}
		
		this.activeRooms.set(roomId || roomLogin, roomLogin);
		
		// Check League of Legends category with backup method and retry logic
		await this.detectAndSetCategoryForRoom(roomLogin);
		
		// Check if this channel is subscribed to EloWard
		const isSubscribed = await this.checkChannelSubscription(roomLogin);
		
		if (isSubscribed) {
			this.subscribedChannels.add(roomLogin);
			this.log.info(`EloWard active for channel: ${roomLogin}`);
		}
	}

	onRoomRemove(room) {
		const roomId = room.id;
		const roomLogin = this.activeRooms.get(roomId);
		
		this.activeRooms.delete(roomId);
		if (roomLogin) {
			this.subscribedChannels.delete(roomLogin);
			this.lolCategoryRooms.delete(roomLogin);
		}
	}

	initializeExistingRooms() {
		// Try immediately first
		if (this.tryProcessExistingRooms()) {
			return;
		}
		
		// If immediate attempt failed, retry with delays
		let retryCount = 0;
		const maxRetries = 5;
		const retryDelays = [100, 250, 500, 1000, 2000]; // Progressive delays
		
		const attemptRoomDetection = () => {
			if (this.tryProcessExistingRooms()) {
				return;
			}
			
			retryCount++;
			if (retryCount < maxRetries) {
				setTimeout(attemptRoomDetection, retryDelays[retryCount - 1]);
			} else {
				this.log.info('Failed to detect existing rooms after retries');
			}
		};
		
		setTimeout(attemptRoomDetection, retryDelays[0]);
	}

	tryProcessExistingRooms() {
		if (!this.chat || !this.chat.iterateRooms) {
			return false;
		}
		
		let roomCount = 0;
		
		try {
			for (const room of this.chat.iterateRooms()) {
				roomCount++;
				
				// Process room asynchronously to avoid blocking
				setTimeout(() => {
					this.onRoomAdd(room);
				}, 10 * roomCount); // Stagger processing
			}
			
			return roomCount > 0;
			
		} catch (error) {
			this.log.info(`Error iterating rooms: ${error.message}`);
			return false;
		}
	}



	async onContextChanged() {
		// Re-evaluate category detection for all active rooms when context changes
		for (const roomLogin of this.activeRooms.values()) {
			// Use immediate detection for context changes (DOM should already be loaded)
			const isLolCategory = this.detectLeagueOfLegendsCategory();
			
			if (isLolCategory && !this.lolCategoryRooms.has(roomLogin)) {
				this.lolCategoryRooms.add(roomLogin);
			} else if (!isLolCategory && this.lolCategoryRooms.has(roomLogin)) {
				this.lolCategoryRooms.delete(roomLogin);
			}
		}
	}

	processMessage(tokens, msg) {
		// Check if addon is enabled
		if (!this.settings.get('eloward.enabled')) {
			return tokens;
		}

		// Skip if Chrome extension is active
		if (this.chromeExtensionDetected) {
			return tokens;
		}

		const user = msg?.user;
		const username = user?.login;
		
		// Handle multiple rooms and shared chats as recommended in PR feedback
		let roomLogin = msg?.roomLogin;

		if (!username || !roomLogin) {
			return tokens;
		}

		// Check if this room has League of Legends category (checked once per room)
		if (!this.lolCategoryRooms.has(roomLogin)) {
			return tokens;
		}

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
		if (!rankData?.tier) {
			return;
		}

		const tier = rankData.tier.toLowerCase();
		if (!this.rankTiers.has(tier)) {
			return;
		}

		const badgeId = this.getBadgeId(tier);
		const ffzUser = this.chat.getUser(userId);

		// Check if user already has this badge
		if (ffzUser.getBadge(badgeId)) {
			return;
		}

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
			this.log.info('Chrome extension detected, disabling rank badges');
		}
	}

	async checkChannelSubscription(channelName) {
		if (!channelName) {
			return false;
		}

		try {
			const normalizedName = channelName.toLowerCase();
			this.incrementMetric('db_read', normalizedName);
			
			const response = await fetch(`${this.config.subscriptionUrl}/subscription/verify`, {
				method: 'POST',
				headers: { 'Content-Type': 'application/json' },
				body: JSON.stringify({ channel_name: normalizedName })
			});

			if (!response.ok) {
				return false;
			}
			
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
		this.off('site.context:changed', this.onContextChanged);

		// Remove tokenizer
		this.chat.removeTokenizer('eloward-ranks');

		// Clear all data
		this.clearUserData();
		this.cache.clear();
		this.processingQueue = [];
		this.subscribedChannels.clear();
		this.activeRooms.clear();
		this.lolCategoryRooms.clear();
	}

	async detectAndSetCategoryForRoom(roomLogin) {
		// Wait for FFZ context to be ready (based on observed timing)
		const initialDelay = 3700; // ~3.7 seconds - when context typically becomes available
		await new Promise(resolve => setTimeout(resolve, initialDelay));
		
		// Try detection after the delay
		let isLolCategory = this.detectLeagueOfLegendsCategory();
		
		// If still failed, add some light backup retries
		if (!isLolCategory) {
			isLolCategory = await this.retryCategoryDetection();
		}
		
		// Set the final result
		if (isLolCategory) {
			this.lolCategoryRooms.add(roomLogin);
		}
		
		return isLolCategory;
	}

	async retryCategoryDetection() {
		const retryDelays = [500, 1000]; // Lighter backup retries
		
		const tryDetection = async (attemptIndex) => {
			if (attemptIndex >= retryDelays.length) {
				return false;
			}
			
			await new Promise(resolve => setTimeout(resolve, retryDelays[attemptIndex]));
			
			const isLolCategory = this.detectLeagueOfLegendsCategory();
			if (isLolCategory) {
				return true;
			}
			
			return tryDetection(attemptIndex + 1);
		};
		
		return tryDetection(0);
	}

	detectLeagueOfLegendsCategory() {
		// FFZ context-based detection using context.categoryID
		const contextDetection = this.settings.get('eloward.category_detection');
		return contextDetection;
	}
}

// Register the addon with FFZ
EloWardFFZAddon.register();