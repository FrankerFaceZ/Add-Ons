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
		this.inject('site.twitch_data'); // Inject twitch_data for getUserGame

		// Configuration
		this.config = {
			apiUrl: 'https://eloward-ranks.unleashai.workers.dev/api',
			channelUrl: 'https://eloward-users.unleashai.workers.dev',
			cacheExpiry: 60 * 60 * 1000, // 1 hour
			maxCacheSize: 500
		};

		// State management
		this.cache = new Map();
		this.activeChannels = new Set();
		this.activeRooms = new Map(); // roomId -> roomLogin
		this.lolCategoryRooms = new Set(); // rooms where LoL category is detected
		this.chromeExtensionDetected = false;
		this.rankTiers = new Set(['iron', 'bronze', 'silver', 'gold', 'platinum', 'emerald', 'diamond', 'master', 'grandmaster', 'challenger', 'unranked']);
		this.userBadges = new Map();
		this.badgeStyleElement = null;
		
		// Rank-specific styling configurations
		this.rankStyles = {
			iron: { width: '24px', height: '24px', margin: '0 0px 0 -4px', padding: '0', top: '-4px' },
			bronze: { width: '24px', height: '24px', margin: '0 2px 0 1px', padding: '0', top: '0px' },
			silver: { width: '24px', height: '24px', margin: '0 2px 0 1px', padding: '0', top: '0px' },
			gold: { width: '24px', height: '24px', margin: '0 0px 4px -4px'},
			platinum: { width: '24px', height: '24px', margin: '0 2px 0 1px', padding: '0', top: '0px' },
			emerald: { width: '24px', height: '24px', margin: '0 2px 0 1px', padding: '0', top: '0px' },
			diamond: { width: '24px', height: '24px', margin: '0 2px 0 1px', padding: '0', top: '0px' },
			master: { width: '24px', height: '24px', margin: '0 2px 0 1px', padding: '0', top: '0px' },
			grandmaster: { width: '24px', height: '24px', margin: '0 2px 0 1px', padding: '0', top: '0px' },
			challenger: { width: '24px', height: '24px', margin: '0 2px 0 1px', padding: '0', top: '0px' },
			unranked: { width: '24px', height: '24px', margin: '0 2px 0 1px', padding: '0', top: '0px' }
		};
		

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

		// Manual override for OBS/popout environments
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
		this.log.info('EloWard FFZ Addon: Initializing');

		// IMMEDIATE Chrome Extension Detection - Check FIRST before any initialization
		// Check both body and documentElement for the detection attribute
		const chromeExtDetectedBody = document.body?.getAttribute('data-eloward-chrome-ext') === 'active';
		const chromeExtDetectedHtml = document.documentElement?.getAttribute('data-eloward-chrome-ext') === 'active';
		
		if (chromeExtDetectedBody || chromeExtDetectedHtml) {
			this.chromeExtensionDetected = true;
			this.log.info('Chrome extension detected - FFZ addon completely disabled for entire session');
			// Exit immediately - no functionality should be enabled
			return;
		}

		// Inject custom CSS for rank-specific badges
		this.badgeStyleElement = document.createElement('style');
		this.badgeStyleElement.id = 'eloward-badge-styles';
		this.badgeStyleElement.textContent = this.generateRankSpecificCSS();
		document.head.appendChild(this.badgeStyleElement);

		// Initialize rank badges
		this.initializeRankBadges();

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

	generateRankSpecificCSS() {
		let css = '';
		
		// Generate CSS for each rank tier
		for (const tier of this.rankTiers) {
			const styles = this.rankStyles[tier];
			if (styles) {
				css += `
					.ffz-badge[data-badge="addon.eloward.rank-${tier}"] {
						width: ${styles.width} !important;
						height: ${styles.height} !important;
						margin: ${styles.margin} !important;
						padding: ${styles.padding} !important;
						background-size: contain !important;
						vertical-align: middle !important;
						position: relative;
						top: ${styles.top} !important;
					}
				`;
			}
		}
		
		return css;
	}

	updateRankStyles(tier, styles) {
		if (this.rankStyles[tier]) {
			Object.assign(this.rankStyles[tier], styles);
			
			// Update the CSS if the style element exists
			if (this.badgeStyleElement) {
				this.badgeStyleElement.textContent = this.generateRankSpecificCSS();
			}
		}
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

	createTooltipHandler(user, badge, createElement) {
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
			style: 'display: flex; align-items: center; gap: 8px; min-width: 150px; padding: 4px;'
		});
		
		const rankImage = createElement('img', {
			src: rankImageUrl,
			style: 'width: 32px; height: 32px; flex-shrink: 0;',
			alt: tier
		});
		
		const rankTextEl = createElement('span', {
			style: 'font-size: 14px; font-weight: 500; color: #efeff1;'
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

	async onRoomAdd(room) {
		const roomLogin = room.login;
		const roomId = room.id;
		
		if (!roomLogin) {
			return;
		}
		
		this.activeRooms.set(roomId || roomLogin, roomLogin);
		
		// Check League of Legends category and channel active status
		await this.detectAndSetCategoryForRoom(roomLogin);
		const isActive = await this.checkChannelActive(roomLogin);
		
		if (isActive) {
			this.activeChannels.add(roomLogin);
			this.log.info(`EloWard active for channel: ${roomLogin}`);
			
			// Process existing users in chat when room becomes active
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
		
		let roomCount = 0;
		
		try {
			for (const room of this.chat.iterateRooms()) {
				roomCount++;
				
				// Process room asynchronously to avoid blocking
				setTimeout(() => {
					this.onRoomAdd(room);
				}, 10 * roomCount); // Stagger processing
			}
		} catch (error) {
			this.log.info(`Error iterating rooms: ${error.message}`);
		}
	}
	
	async processExistingChatUsers(room, roomLogin) {
		
		// Check if this room has League of Legends category and channel is active
		const hasLoLCategory = this.lolCategoryRooms.has(roomLogin);
		const isActive = this.activeChannels.has(roomLogin);

		if (!hasLoLCategory || !isActive) {
			return;
		}
		
		// Get all users currently visible in chat
		const chatUsers = this.getChatUsers(room);
		
		// Process each user for rank badges
		for (const user of chatUsers) {
			const username = user.login;
			const userId = user.id;
			
			if (!username || !userId) continue;
			
			// Skip if already processed or has badge
			if (this.userBadges.has(userId)) {
				continue;
			}
			
			const cachedRank = this.getCachedRank(username);
			if (cachedRank) {
				this.addUserBadge(userId, username, cachedRank);
			} else {
				// Small delay to avoid overwhelming the API
				setTimeout(() => {
					this.fetchRankData(username).then(rankData => {
						if (rankData) {
							this.setCachedRank(username, rankData);
							this.addUserBadge(userId, username, rankData);
							this.incrementMetric('successful_lookup', roomLogin);
						}
					}).catch(() => {});
				}, Math.random() * 100); // Random delay 0-100ms
			}
		}
	}
	
	getChatUsers(room) {
		const users = [];
		
		try {
			// Use FFZ's recommended approach instead of accessing room.users directly
			if (room && room.iterateUsers) {
				for (const user of room.iterateUsers()) {
					if (user.login && user.id) {
						users.push(user);
					}
				}
			}
		} catch (error) {
			// Ignore errors when getting chat users
		}
		
		return users;
	}

	onContextChanged() {
		// Re-evaluate category detection for all active rooms when context changes
		
		for (const roomLogin of this.activeRooms.values()) {
			// Trigger immediate check using FFZ's getUserGame since context changed
			this.checkStreamCategory(roomLogin).then(isLoL => {
				if (isLoL && !this.lolCategoryRooms.has(roomLogin)) {
					this.lolCategoryRooms.add(roomLogin);
				} else if (!isLoL && this.lolCategoryRooms.has(roomLogin)) {
					this.lolCategoryRooms.delete(roomLogin);
				}
			});
		}
	}

	processMessage(tokens, msg) {
		// Check if addon is enabled
		if (!this.settings.get('eloward.enabled')) {
			return tokens;
		}

		const user = msg?.user;
		const username = user?.login;
		const roomLogin = msg?.roomLogin;

		if (!username || !roomLogin) {
			return tokens;
		}


		// Check if this room has League of Legends category and channel is active
		const hasLoLCategory = this.lolCategoryRooms.has(roomLogin);
		const isActive = this.activeChannels.has(roomLogin);

		if (!hasLoLCategory || !isActive) {
			return tokens;
		}

		// Track metrics and process rank lookup
		this.incrementMetric('db_read', roomLogin);

		const cachedRank = this.getCachedRank(username);
		if (cachedRank) {
			this.incrementMetric('successful_lookup', roomLogin);
			this.addUserBadge(user.id, username, cachedRank);
		} else {
			this.fetchRankData(username).then(rankData => {
				if (rankData) {
					this.setCachedRank(username, rankData);
					this.addUserBadge(user.id, username, rankData);
					this.incrementMetric('successful_lookup', roomLogin);
				}
			}).catch(() => {});
		}

		return tokens;
	}


	formatRankText(rankData) {
		if (!rankData?.tier || rankData.tier.toUpperCase() === 'UNRANKED') {
			return 'UNRANKED';
		}
		
		let rankText = rankData.tier.toUpperCase();
		
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

		// Check if user already has the same badge to avoid unnecessary operations
		const existing = this.userBadges.get(userId);
		if (existing && existing.badgeId === badgeId) {
			return;
		}


		// Always update the badge data with current rank information for tooltip
		const formattedRankText = this.formatRankText(rankData);
		const badgeData = this.getBadgeData(tier);
		badgeData.title = formattedRankText; // Update title with full rank info
		
		// Load/update the badge data in FFZ's system with tooltip support
		this.badges.loadBadgeData(badgeId, badgeData);

		// Only remove existing badges if they're different
		if (existing && existing.badgeId !== badgeId) {
			this.removeUserBadges(userId);
		}

		// Always add the badge to ensure it's properly attached
		ffzUser.addBadge('addon.eloward', badgeId);

		// Track this badge assignment - IMPORTANT: Store the full rank data here
		this.userBadges.set(userId, { username, tier, badgeId, rankData });

		// Update chat display for this user
		this.emit('chat:update-lines-by-user', userId, username, false, true);
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
			entry.frequency = (entry.frequency || 0) + 1;
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
			return !!data.active;
		} catch (error) {
			return false;
		}
	}

	async incrementMetric(type, channelName) {
		if (!channelName) return;

		try {
			const normalizedName = channelName.toLowerCase();
			
			await fetch(`${this.config.channelUrl}/metrics/${type}`, {
				method: 'POST',
				headers: { 'Content-Type': 'application/json' },
				body: JSON.stringify({ channel_name: normalizedName })
			});
		} catch (error) {
			// Silently fail metrics to avoid disrupting main functionality
		}
	}

	onDisable() {
		// Remove custom CSS
		if (this.badgeStyleElement) {
			this.badgeStyleElement.remove();
			this.badgeStyleElement = null;
		}

		// Remove event listeners
		this.off('chat:room-add', this.onRoomAdd);
		this.off('chat:room-remove', this.onRoomRemove);
		this.off('site.context:changed', this.onContextChanged);

		// Remove tokenizer
		this.chat.removeTokenizer('eloward-ranks');

		// Clear all data
		this.clearUserData();
		this.cache.clear();
		this.activeChannels.clear();
		this.activeRooms.clear();
		this.lolCategoryRooms.clear();
	}

	async detectAndSetCategoryForRoom(roomLogin) {
		// Fixed delay to let Twitch servers update after stream start
		const delayMs = 3000;
		await new Promise(resolve => setTimeout(resolve, delayMs));
		
		// Check manual override first
		const manualOverride = this.settings.get('eloward.manual_override');
		if (manualOverride) {
			this.log.info(`Manual override enabled, adding ${roomLogin} to LoL category rooms.`);
			this.lolCategoryRooms.add(roomLogin);
			return true;
		}
		
		// Use FFZ's getUserGame method for reliable category detection
		const isLolCategory = await this.checkStreamCategory(roomLogin);
		
		if (isLolCategory) {
			this.lolCategoryRooms.add(roomLogin);
		}
		
		return isLolCategory;
	}

	async checkStreamCategory(channelName) {
		try {
			// Use FFZ's getUserGame method for reliable category detection
			// This leverages FFZ's caching and data layer as recommended by SirStendec
			const game = await this.twitch_data.getUserGame(null, channelName);
			
			if (game) {
				// Check for League of Legends by ID or name
				const isLoL = game.id === '21779' || 
					game.name === 'League of Legends' ||
					game.displayName === 'League of Legends';
				
				this.log.info(`Game detected for ${channelName}: ${game.name || game.displayName} (ID: ${game.id})`);
				return isLoL;
			} else {
				this.log.info(`No game detected for ${channelName} (channel may be offline or no game set)`);
				return false;
			}
		} catch (error) {
			this.log.info(`Error checking game for ${channelName} via FFZ:`, error.message);
			return false;
		}
	}
}

// Register the addon with FFZ
EloWardFFZAddon.register();