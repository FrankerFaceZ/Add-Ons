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
			maxCacheSize: 500
		};

		// State management
		this.cache = new Map();
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

		// Add comprehensive environment detection and logging
		this.logEnvironmentInfo();

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

	logEnvironmentInfo() {
		this.log.info('=== EloWard Environment Detection ===');
		
		// Basic environment info
		this.log.info('User Agent:', navigator.userAgent);
		this.log.info('Current URL:', window.location.href);
		this.log.info('Is Popout:', window.location.href.includes('popout'));
		this.log.info('Is OBS Browser:', this.detectOBSBrowser());
		
		// FFZ Site context
		try {
			const siteContext = this.site?.getContext?.() || {};
			this.log.info('FFZ Site Context Available:', !!this.site);
			this.log.info('Site Context Keys:', Object.keys(siteContext));
			this.log.info('Site Context Values:', siteContext);
		} catch (error) {
			this.log.info('Error accessing site context:', error.message);
		}

		// Check for context.categoryID specifically
		try {
			const categoryDetection = this.settings.get('eloward.category_detection');
			this.log.info('Category Detection Setting Value:', categoryDetection);
		} catch (error) {
			this.log.info('Error getting category detection:', error.message);
		}

		// Check what's available in window.obsstudio (if in OBS)
		if (typeof window.obsstudio !== 'undefined') {
			this.log.info('OBS Studio bindings available');
			this.log.info('OBS Plugin Version:', window.obsstudio.pluginVersion);
			// Try to get current scene info
			try {
				window.obsstudio.getCurrentScene(function(scene) {
					this.log.info('OBS Current Scene:', scene);
				}.bind(this));
			} catch (error) {
				this.log.info('Error getting OBS scene:', error.message);
			}
		}

		// Check DOM for any stream/game info
		this.logDOMGameInfo();

		this.log.info('=== End Environment Detection ===');
	}

	detectOBSBrowser() {
		// Check multiple indicators for OBS browser
		const indicators = [
			typeof window.obsstudio !== 'undefined',
			navigator.userAgent.includes('OBS'),
			window.location.href.includes('obs'),
			document.title.includes('OBS')
		];
		
		const isOBS = indicators.some(indicator => indicator);
		this.log.info('OBS Detection Indicators:', indicators, 'Result:', isOBS);
		return isOBS;
	}

	logDOMGameInfo() {
		// Look for game/category info in the DOM
		const selectors = [
			'[data-a-target="stream-game-link"]',
			'[data-test-selector="stream-info-card-component"]',
			'.tw-link[href*="/directory/game/"]',
			'[aria-label*="playing"]',
			'.stream-info',
			'[data-target="directory-game"]'
		];

		this.log.info('Scanning DOM for game information...');
		selectors.forEach(selector => {
			try {
				const elements = document.querySelectorAll(selector);
				if (elements.length > 0) {
					this.log.info(`Found ${elements.length} elements for "${selector}"`);
					elements.forEach((el, index) => {
						this.log.info(`  [${index}] Text:`, el.textContent?.trim());
						this.log.info(`  [${index}] Href:`, el.href);
						this.log.info(`  [${index}] Data attrs:`, Object.fromEntries(
							Array.from(el.attributes)
								.filter(attr => attr.name.startsWith('data-'))
								.map(attr => [attr.name, attr.value])
						));
					});
				}
			} catch (error) {
				this.log.info(`Error scanning selector "${selector}":`, error.message);
			}
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

	async onRoomAdd(room) {
		const roomLogin = room.login;
		const roomId = room.id;
		
		// Enhanced logging for room detection
		this.log.info('=== Room Added ===');
		this.log.info('Room Login:', roomLogin);
		this.log.info('Room ID:', roomId);
		this.log.info('Room Object Keys:', Object.keys(room));
		this.log.info('Full Room Object:', room);
		
		if (!roomLogin) {
			this.log.info('No room login found, skipping');
			return;
		}
		
		this.activeRooms.set(roomId || roomLogin, roomLogin);
		
		// Check League of Legends category with detailed logging
		const categoryResult = await this.detectAndSetCategoryForRoom(roomLogin);
		this.log.info('Category detection result for', roomLogin, ':', categoryResult);
		
		// Check if this channel is subscribed to EloWard
		const isSubscribed = await this.checkChannelSubscription(roomLogin);
		this.log.info('Subscription check for', roomLogin, ':', isSubscribed);
		
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

	onContextChanged() {
		// Re-evaluate category detection for all active rooms when context changes
		this.log.info('Site context changed, re-checking categories for all rooms');
		
		for (const roomLogin of this.activeRooms.values()) {
			// Trigger immediate API check since context changed
			this.checkTwitchAPIForLoL(roomLogin).then(isLoL => {
				if (isLoL && !this.lolCategoryRooms.has(roomLogin)) {
					this.lolCategoryRooms.add(roomLogin);
					this.log.info('Added', roomLogin, 'to LoL category rooms after context change');
				} else if (!isLoL && this.lolCategoryRooms.has(roomLogin)) {
					this.lolCategoryRooms.delete(roomLogin);
					this.log.info('Removed', roomLogin, 'from LoL category rooms after context change');
				}
			});
		}
	}

	processMessage(tokens, msg) {
		// Enhanced logging for message processing
		this.log.info('=== Processing Message ===');
		this.log.info('Addon enabled:', this.settings.get('eloward.enabled'));
		this.log.info('Chrome extension detected:', this.chromeExtensionDetected);

		// Check if addon is enabled
		if (!this.settings.get('eloward.enabled')) {
			this.log.info('Addon disabled, skipping message');
			return tokens;
		}

		// Skip if Chrome extension is active
		if (this.chromeExtensionDetected) {
			this.log.info('Chrome extension active, skipping message');
			return tokens;
		}

		const user = msg?.user;
		const username = user?.login;
		
		// Handle multiple rooms and shared chats as recommended in PR feedback
		const roomLogin = msg?.roomLogin;

		this.log.info('Message details - Username:', username, 'Room:', roomLogin);
		this.log.info('User object keys:', user ? Object.keys(user) : 'No user');
		this.log.info('Full message object keys:', Object.keys(msg || {}));

		if (!username || !roomLogin) {
			this.log.info('Missing username or roomLogin, skipping message');
			return tokens;
		}

		// Check if this room has League of Legends category (checked once per room)
		const hasLoLCategory = this.lolCategoryRooms.has(roomLogin);
		this.log.info('Room', roomLogin, 'has LoL category:', hasLoLCategory);
		this.log.info('Current LoL category rooms:', Array.from(this.lolCategoryRooms));

		if (!hasLoLCategory) {
			this.log.info('Room not in LoL category, skipping message');
			return tokens;
		}

		// Check if this room's channel is subscribed
		const isSubscribed = this.subscribedChannels.has(roomLogin);
		this.log.info('Room', roomLogin, 'is subscribed:', isSubscribed);
		this.log.info('Current subscribed channels:', Array.from(this.subscribedChannels));

		if (!isSubscribed) {
			this.log.info('Room not subscribed, skipping message');
			return tokens;
		}

		// Track metrics and process rank lookup
		this.log.info('Processing rank lookup for user:', username, 'in room:', roomLogin);
		this.incrementMetric('db_read', roomLogin);

		const cachedRank = this.getCachedRank(username);
		if (cachedRank) {
			this.log.info('Found cached rank for', username, ':', cachedRank);
			this.incrementMetric('successful_lookup', roomLogin);
			this.addUserBadge(user.id, username, cachedRank);
		} else {
			this.log.info('No cached rank for', username, ', fetching from API');
			// Make direct API call without queuing
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
			// Silently handle errors - most are 404s for users without rank data
		}
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

		// Always update the badge data with current rank information for tooltip
		const formattedRankText = this.formatRankText(rankData);
		const badgeData = this.getBadgeData(tier);
		badgeData.title = formattedRankText; // Update title with full rank info
		
		// Load/update the badge data in FFZ's system with tooltip support
		this.badges.loadBadgeData(badgeId, badgeData);

		// Check if user already has this badge
		if (ffzUser.getBadge(badgeId)) {
			// Even if they have the badge, we updated the data, so continue to store rank data
		} else {
			// Remove any existing EloWard badges from this user
			this.removeUserBadges(userId);

			// Add the badge to the user
			ffzUser.addBadge('addon.eloward', badgeId);
		}

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
		this.subscribedChannels.clear();
		this.activeRooms.clear();
		this.lolCategoryRooms.clear();
	}

	async detectAndSetCategoryForRoom(roomLogin) {
		this.log.info('=== Category Detection for Room:', roomLogin, '===');
		
		// Fixed 5-second delay to let Twitch servers update after stream start
		const delayMs = 3000;
		
		this.log.info('Using 5-second detection delay for', roomLogin);
		
		// Wait for delay to let Twitch servers update
		await new Promise(resolve => setTimeout(resolve, delayMs));
		
		// Check manual override first
		const manualOverride = this.settings.get('eloward.manual_override');
		if (manualOverride) {
			this.log.info('Manual override enabled, adding', roomLogin, 'to LoL category rooms');
			this.lolCategoryRooms.add(roomLogin);
			return true;
		}
		
		// Use robust API detection
		const isLolCategory = await this.checkTwitchAPIForLoL(roomLogin);
		this.log.info('API detection result for', roomLogin, ':', isLolCategory);
		
		if (isLolCategory) {
			this.lolCategoryRooms.add(roomLogin);
			this.log.info('Added', roomLogin, 'to LoL category rooms via API');
		}
		
		return isLolCategory;
	}





	async checkTwitchAPIForLoL(channelName) {
		try {
			this.log.info('=== Single Robust API Check for:', channelName, '===');
			
			// Method 1: GraphQL API (most reliable, works everywhere)
			const gqlResult = await this.checkGraphQLAPI(channelName);
			if (gqlResult !== null) {
				this.log.info('GraphQL API result for', channelName, ':', gqlResult);
				return gqlResult;
			}
			
			// Method 2: Fallback to our proxy API
			const proxyResult = await this.checkProxyAPI(channelName);
			this.log.info('Proxy API result for', channelName, ':', proxyResult);
			return proxyResult;
			
		} catch (error) {
			this.log.info('Error in robust API check for', channelName, ':', error.message);
			return false;
		}
	}



	async checkGraphQLAPI(channelName) {
		try {
			this.log.info('Checking GraphQL API for', channelName);
			
			// Use Twitch's GraphQL API that powers the web interface
			const gqlQuery = {
				query: `
					query($login: String!) {
						user(login: $login) {
							stream {
								id
								game {
									id
									name
								}
							}
						}
					}
				`,
				variables: { login: channelName }
			};
			
			const response = await fetch('https://gql.twitch.tv/gql', {
				method: 'POST',
				headers: {
					'Client-ID': 'kimne78kx3ncx6brgo4mv6wki5h1ko', // Public web client ID
					'Content-Type': 'application/json'
				},
				body: JSON.stringify(gqlQuery)
			});
			
			if (response.ok) {
				const data = await response.json();
				this.log.info('GraphQL API response for', channelName, ':', data);
				
				const stream = data.data?.user?.stream;
				if (stream?.game) {
					const isLoL = stream.game.id === '21779' || stream.game.name === 'League of Legends';
					this.log.info('GraphQL confirmed LoL status for', channelName, ':', isLoL);
					return isLoL;
				} else {
					this.log.info('Channel', channelName, 'is not live or has no game set');
					return false;
				}
			} else {
				this.log.info('GraphQL API request failed with status:', response.status);
			}
		} catch (error) {
			this.log.info('GraphQL API error for', channelName, ':', error.message);
		}
		
		return null;
	}



	async checkProxyAPI(channelName) {
		try {
			// Use our own API proxy as fallback
			const proxyAPIUrl = `${this.config.apiUrl}/twitch/stream/${channelName}`;
			
			const response = await fetch(proxyAPIUrl, {
				method: 'GET',
				headers: {
					'Accept': 'application/json'
				}
			});
			
			if (response.ok) {
				const data = await response.json();
				this.log.info('Proxy API Response for', channelName, ':', data);
				
				// Check if the game is League of Legends (game_id: 21779)
				if (data.game_id === '21779' || data.game_name === 'League of Legends') {
					this.log.info('Proxy API confirmed LoL stream for', channelName);
					return true;
				}
			} else {
				this.log.info('Proxy API request failed with status:', response.status);
			}
			
			return false;
		} catch (error) {
			this.log.info('Proxy API error:', error.message);
			return false;
		}
	}


}

// Register the addon with FFZ
EloWardFFZAddon.register();