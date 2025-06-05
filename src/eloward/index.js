// EloWard FFZ Addon - League of Legends Rank Badges for Streamers
// Properly integrated with FFZ's badge system and chat architecture

class EloWardFFZAddon extends FrankerFaceZ.utilities.addon.Addon {
	constructor(...args) {
		super(...args);

		// Inject FFZ services
		this.inject('chat');
		this.inject('chat.badges');
		this.inject('settings');
		this.inject('site.router');
		this.inject('site.twitch_data');
		this.inject('i18n');

		// Configuration
		this.config = {
			apiUrl: 'https://eloward-viewers-api.unleashai.workers.dev/api',
			subscriptionUrl: 'https://eloward-subscription-api.unleashai.workers.dev',
			cacheExpiry: 60 * 60 * 1000, // 1 hour
			maxCacheSize: 500,
			rateLimit: 100, // ms between requests
			maxQueueSize: 10, // Maximum number of pending rank lookups
		};

		// Supported games
		this.supportedGames = {
			'League of Legends': true
		};

		// State management
		this.cache = new Map();
		this.processingQueue = [];
		this.isProcessing = false;
		this.isChannelSubscribed = false;
		this.channelName = null;
		this.currentGame = null;
		this.chromeExtensionDetected = false;
		this.gameCheckInterval = null;
		this.rankTiers = new Set(['iron', 'bronze', 'silver', 'gold', 'platinum', 'emerald', 'diamond', 'master', 'grandmaster', 'challenger', 'unranked']);
		this.tokenizerActive = false;
		this.userBadges = new Map();

		// Settings
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
	}

	async onEnable() {
		this.log.info('🚀 EloWard FFZ Addon: Starting initialization');

		// Initialize rank badges
		this.initializeRankBadges();

		// Detect Chrome extension conflict
		this.detectChromeExtension();
		this.log.info(`🔍 Chrome extension detection: ${this.chromeExtensionDetected ? 'DETECTED' : 'NOT DETECTED'}`);

		if (this.chromeExtensionDetected) {
			this.log.info('🎭 Chrome extension detected, entering compatibility mode');
		}

		// Get current channel and game
		this.channelName = this.getCurrentChannel();
		this.log.info(`📺 Channel detected: ${this.channelName || 'NONE'}`);

		this.currentGame = await this.getGameWithRetries();
		this.log.info(`🎮 Game detected: ${this.currentGame || 'NONE'}`);

		if (!this.channelName) {
			this.log.info('❌ No channel detected - addon inactive');
			return;
		}

		if (!this.isGameSupported(this.currentGame)) {
			this.log.info(`❌ Game '${this.currentGame || 'unknown'}' is not supported - addon inactive`);
			return;
		}

		this.log.info(`✅ Supported game '${this.currentGame}' detected`);

		// Only activate rank badges if Chrome extension is NOT detected
		if (!this.chromeExtensionDetected) {
			this.isChannelSubscribed = await this.checkChannelSubscription();

			if (!this.isChannelSubscribed) {
				this.log.info(`❌ Channel ${this.channelName} is not subscribed - addon inactive`);
				return;
			}

			this.log.info(`🛡️ EloWard FFZ Addon: ACTIVE for ${this.channelName}`);
			this.setupChatTokenizer();
		} else {
			this.log.info('🎭 Chrome extension detected - rank badges disabled, FFZ emotes remain active');
		}

		this.startGameMonitoring();
		this.log.info('🎉 EloWard FFZ Addon initialization complete');
	}

	getBadgeData(tier, title = null) {
		const formattedTitle = title || `${tier.charAt(0).toUpperCase() + tier.slice(1)}`;
		return {
			id: tier,
			title: formattedTitle,
			slot: 1,
			image: `https://eloward-cdn.unleashai.workers.dev/lol/${tier}.png`,
			urls: {
				1: `https://eloward-cdn.unleashai.workers.dev/lol/${tier}.png`,
				2: `https://eloward-cdn.unleashai.workers.dev/lol/${tier}.png`,
				4: `https://eloward-cdn.unleashai.workers.dev/lol/${tier}.png`
			},
			svg: false,
			click_url: 'https://www.eloward.com/',
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
		this.log.info('✅ Rank badges initialized');
	}

	setupChatTokenizer() {
		this.chat.addTokenizer({
			type: 'eloward-ranks',
			process: this.processMessage.bind(this)
		});
		this.tokenizerActive = true;
		this.log.info('👂 Chat tokenizer setup complete');
	}

	removeChatTokenizer() {
		if (this.tokenizerActive) {
			this.chat.removeTokenizer('eloward-ranks');
			this.tokenizerActive = false;
		}
	}

	processMessage(tokens, msg) {
		if (!this.settings.get('eloward.enabled') || !this.isChannelSubscribed) {
			return tokens;
		}

		const user = msg?.user;
		const username = user?.login;

		if (!username) return tokens;

		// Increment db_read counter for every rank lookup (cache hit or miss) - matching Chrome extension behavior
		this.incrementMetric('db_read');

		const cachedRank = this.getCachedRank(username);
		if (cachedRank) {
			// Increment successful_lookup for cache hits - matching Chrome extension behavior
			this.incrementMetric('successful_lookup');
			this.addUserBadge(user.id, username, cachedRank);
		} else {
			this.queueRankLookup(username, user.id);
		}

		return tokens;
	}

	formatRankText(rankData) {
		if (!rankData || !rankData.tier || rankData.tier.toUpperCase() === 'UNRANKED') {
			return 'UNRANKED';
		}
		
		let rankText = rankData.tier;
		
		// Add division for ranks that have divisions (not Master, Grandmaster, Challenger)
		if (rankData.division && !['MASTER', 'GRANDMASTER', 'CHALLENGER'].includes(rankData.tier.toUpperCase())) {
			rankText += ` ${rankData.division}`;
		}
		
		// Add LP for ranked players (not for Unranked)
		if (rankData.tier.toUpperCase() !== 'UNRANKED' && 
			rankData.leaguePoints !== undefined && 
			rankData.leaguePoints !== null) {
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
		const enabled = this.settings.get('eloward.enabled');

		if (!enabled) {
			// Clear all user badges when disabled
			this.clearUserData();
			// Also remove badge definitions when disabled
			this.removeBadges();
		} else {
			// Re-initialize badges when re-enabled
			this.initializeRankBadges();
			
			// Re-add badges for all users when re-enabled
			for (const [userId, badgeInfo] of this.userBadges.entries()) {
				const ffzUser = this.chat.getUser(userId);
				ffzUser.addBadge('addon.eloward', badgeInfo.badgeId);
			}
		}

		this.emit('chat:update-lines');
	}

	clearUserData() {
		// Remove badges from all users - following FFZ addon pattern
		for(const user of this.chat.iterateUsers()) {
			user.removeAllBadges('addon.eloward');
		}
		
		// Clear our internal tracking
		this.userBadges.clear();
	}

	addUserBadge(userId, username, rankData) {
		if (!rankData?.tier) return;

		const tier = rankData.tier.toLowerCase();
		if (!this.rankTiers.has(tier)) return;

		const badgeId = this.getBadgeId(tier);
		const ffzUser = this.chat.getUser(userId);

		// Check if user already has this exact badge
		if (ffzUser.getBadge(badgeId)) return;

		// Remove any existing EloWard badges from this user
		this.removeUserBadges(userId);

		// Update badge data with current rank information (for tooltip)
		const formattedRankText = this.formatRankText(rankData);
		const badgeData = this.getBadgeData(tier, formattedRankText);

		// Load/update the badge data in FFZ's system
		this.badges.loadBadgeData(badgeId, badgeData);

		// Add the badge to the user
		ffzUser.addBadge('addon.eloward', badgeId);

		// Track this badge assignment
		this.userBadges.set(userId, {
			username,
			tier,
			badgeId
		});

		// Update chat display for this specific user
		this.emit('chat:update-lines-by-user', userId, username, false, true);
	}

	queueRankLookup(username, userId) {
		if (!this.processingQueue.find(item => item.username === username)) {
			this.processingQueue.push({ username, userId });

			if (this.processingQueue.length > this.config.maxQueueSize) {
				this.processingQueue.shift();
			}

			this.processQueue();
		}
	}

	async processQueue() {
		if (this.isProcessing || this.processingQueue.length === 0) return;

		this.isProcessing = true;
		const { username, userId } = this.processingQueue.shift();

		try {
			// db_read is already incremented in processMessage, so we don't need it here
			const rankData = await this.fetchRankData(username);
			if (rankData) {
				this.setCachedRank(username, rankData);
				this.addUserBadge(userId, username, rankData);
				// Increment successful_lookup for API results - matching Chrome extension behavior
				await this.incrementMetric('successful_lookup');
			}
		} catch (error) {
			// Silently handle errors - most are 404s for users without rank data
		}

		this.isProcessing = false;
		setTimeout(() => this.processQueue(), this.config.rateLimit);
	}

	async fetchRankData(username) {
		try {
			const response = await fetch(`${this.config.apiUrl}/ranks/lol/${username.toLowerCase()}`);
			if (!response.ok) return null;

			const data = await response.json();
			return {
				tier: data.rank_tier,
				division: data.rank_division,
				leaguePoints: data.lp,
				summonerName: data.riot_id
			};
		} catch (error) {
			return null;
		}
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
		const indicators = [
			'.eloward-rank-badge',
			'#eloward-extension-styles',
			'[data-eloward-processed]',
			'[data-eloward-badge]',
			'.eloward-tooltip'
		];

		for (const selector of indicators) {
			if (document.querySelector(selector)) {
				this.chromeExtensionDetected = true;
				return;
			}
		}

		if (window.elowardExtension || window._eloward_chat_observer || document.body.dataset.elowardExtension) {
			this.chromeExtensionDetected = true;
		}
	}

	startGameMonitoring() {
		this.gameCheckInterval = setInterval(async () => {
			const newGame = await this.getGameWithRetries(3, 1000);

			if (newGame !== this.currentGame) {
				const oldGame = this.currentGame;
				this.currentGame = newGame;

				this.log.info(`🎮 Game changed: ${oldGame || 'unknown'} → ${newGame || 'unknown'}`);

				if (this.isGameSupported(newGame)) {
					this.log.info(`✅ Supported game '${newGame}' detected - activating addon`);

					if (!this.chromeExtensionDetected) {
						const subscribed = await this.checkChannelSubscription();
						this.isChannelSubscribed = subscribed;

						if (subscribed) {
							this.setupChatTokenizer();
						}
					}
				} else {
					this.log.info(`❌ Game '${newGame || 'unknown'}' not supported - deactivating addon`);
					this.isChannelSubscribed = false;
					this.removeChatTokenizer();
					this.updateBadges();
				}
			}
		}, 10000);
	}

	getCurrentChannel() {
		if (this.resolve('site.router')) {
			const router = this.resolve('site.router');
			if (router.current_name === 'user' && router.route?.params?.user) {
				return router.route.params.user.toLowerCase();
			}
		}

		const path = window.location.pathname;
		const pathSegments = path.split('/');

		if (pathSegments[1] === 'moderator' && pathSegments.length > 2) {
			return pathSegments[2].toLowerCase();
		}

		if (pathSegments[1] && pathSegments[1] !== 'oauth2' && !pathSegments[1].includes('auth')) {
			return pathSegments[1].toLowerCase();
		}

		return null;
	}

	logGameDetection(method, game) {
		this.log.debug(`🎮 Game detected (${method}): ${game}`);
		return game;
	}

	getCurrentGame() {
		try {
			// Method 1: FFZ API access
			try {
				const siteData = this.resolve('site');
				if (siteData && siteData.getUser) {
					const currentUser = siteData.getUser();
					if (currentUser?.broadcastSettings?.game?.displayName) {
						const game = currentUser.broadcastSettings.game.displayName;
						return this.logGameDetection('FFZ Site Data', game);
					}
				}

				const twitchData = this.resolve('site.twitch_data');
				if (twitchData) {
					const channelID = this.settings.get('context.channelID');
					if (channelID && twitchData.getUser) {
						twitchData.getUser(channelID).then(userData => {
							if (userData?.broadcastSettings?.game?.displayName) {
								const game = userData.broadcastSettings.game.displayName;
								this.logGameDetection('FFZ Twitch Data', game);
								this.currentGame = game;
								return game;
							}
						}).catch(() => {/* Ignore errors */});
					}
				}
			} catch (ffzError) {
				this.log.debug('FFZ API game detection failed:', ffzError);
			}

			// Method 2: Direct game link
			const gameLink = document.querySelector('a[data-a-target="stream-game-link"]');
			if (gameLink && gameLink.textContent) {
				const game = gameLink.textContent.trim();
				return this.logGameDetection('Direct Link', game);
			}

			// Method 3: React Props Access
			try {
				const reactElements = document.querySelectorAll('[data-a-target*="stream"], [data-a-target*="game"], .tw-card');
				for (const element of reactElements) {
					const reactFiber = element._reactInternalFiber || element._reactInterns ||
						Object.keys(element).find(key => key.startsWith('__reactInternalInstance') || key.startsWith('__reactFiber'));
					if (reactFiber) {
						const fiber = typeof reactFiber === 'string' ? element[reactFiber] : reactFiber;
						if (fiber && fiber.memoizedProps) {
							const props = fiber.memoizedProps;
							let gameName = null;
							if (props.stream?.game?.displayName) {
								gameName = props.stream.game.displayName;
							} else if (props.stream?.broadcaster?.broadcastSettings?.game?.displayName) {
								gameName = props.stream.broadcaster.broadcastSettings.game.displayName;
							} else if (props.metadataRight?.props?.stream?.game?.displayName) {
								gameName = props.metadataRight.props.stream.game.displayName;
							} else if (props.tooltipContent?.props?.stream?.content?.game?.displayName) {
								gameName = props.tooltipContent.props.stream.content.game.displayName;
							}

							if (gameName) {
								this.logGameDetection('React Props', gameName);
								return gameName.trim();
							}
						}
					}
				}
			} catch (reactError) {
				this.log.debug('React data access failed:', reactError);
			}

			// Method 4: Global State Access
			try {
				if (window.__INITIAL_STATE__) {
					const state = window.__INITIAL_STATE__;
					if (state.currentChannel?.stream?.game?.displayName) {
						const game = state.currentChannel.stream.game.displayName;
						this.logGameDetection('Global State', game);
						return game;
					}
				}
			} catch (stateError) {
				this.log.debug('Global state access failed:', stateError);
			}

			// Method 5: Enhanced DOM Selectors
			const categorySelectors = [
				'.side-nav-card__metadata p[title]',
				'.tw-media-card-meta__subtitle',
				'[data-a-target="browse-game-title"]',
				'.tw-card-title',
				'.game-hover',
				'[data-test-selector="game-card-title"]',
				'p[data-a-target="stream-game-link"]'
			];

			for (const selector of categorySelectors) {
				const elements = document.querySelectorAll(selector);
				for (const element of elements) {
					const text = element.textContent || element.getAttribute('title');
					if (text && text.trim() && !text.includes('viewer') && !text.includes('follower')) {
						const game = text.trim();
						this.logGameDetection('DOM', game);
						return game;
					}
				}
			}

			// Method 6: Channel Info Container
			const channelInfoContainer = document.querySelector('[data-a-target="stream-info-card"], .channel-info-content');
			if (channelInfoContainer) {
				const gameElements = channelInfoContainer.querySelectorAll('a[href*="/directory/game/"], a[href*="/directory/category/"]');
				for (const gameElement of gameElements) {
					const game = gameElement.textContent.trim();
					if (game) {
						this.logGameDetection('Channel Info', game);
						return game;
					}
				}
			}

			// Method 7: URL Parsing
			if (window.location.pathname.startsWith('/directory/game/') || window.location.pathname.startsWith('/directory/category/')) {
				const pathSegments = window.location.pathname.split('/');
				if (pathSegments.length >= 4) {
					const game = decodeURIComponent(pathSegments[3]);
					this.logGameDetection('URL', game);
					return game;
				}
			}

			// Method 8: Meta tags
			const metaGame = document.querySelector('meta[property="og:game"]');
			if (metaGame && metaGame.getAttribute('content')) {
				const game = metaGame.getAttribute('content').trim();
				this.logGameDetection('Meta', game);
				return game;
			}

			return null;
		} catch (error) {
			this.log.error('Error detecting game:', error);
			return null;
		}
	}

	getGameWithRetries(maxAttempts = 5, interval = 2000) {
		return new Promise(resolve => {
			let attempts = 0;

			const tryGetGame = () => {
				const game = this.getCurrentGame();
				if (game) {
					resolve(game);
				} else if (attempts < maxAttempts) {
					attempts++;
					this.log.debug(`🔄 Game detection retry attempt ${attempts}/${maxAttempts}`);
					setTimeout(tryGetGame, interval);
				} else {
					this.log.debug(`❌ Failed to detect game after ${maxAttempts} attempts`);
					resolve(null);
				}
			};

			tryGetGame();
		});
	}

	isGameSupported(game) {
		if (!game) return false;

		if (this.supportedGames[game] === true) {
			return true;
		}

		const gameLower = game.toLowerCase();
		for (const supportedGame of Object.keys(this.supportedGames)) {
			if (supportedGame.toLowerCase() === gameLower) {
				return true;
			}
		}

		return false;
	}

	async checkChannelSubscription() {
		if (!this.channelName) return false;

		try {
			// Normalize the channel name to lowercase for consistency with Chrome extension
			const normalizedName = this.channelName.toLowerCase();
			
			// Increment db_read counter for subscription checks - matching Chrome extension behavior
			await this.incrementMetric('db_read');
			
			const response = await fetch(`${this.config.subscriptionUrl}/subscription/verify`, {
				method: 'POST',
				headers: { 'Content-Type': 'application/json' },
				body: JSON.stringify({ channel_name: normalizedName })
			});

			if (!response.ok) return false;
			const data = await response.json();
			const isSubscribed = !!data.subscribed;

			this.log.info(`${this.channelName} subscription status: ${isSubscribed ? 'ACTIVE ✅' : 'NOT ACTIVE ❌'}`);
			return isSubscribed;
		} catch (error) {
			// Silently handle subscription check errors to avoid console clutter
			return false;
		}
	}

	async incrementMetric(type) {
		if (!this.channelName) return;

		try {
			// Normalize the channel name to lowercase for consistency with Chrome extension  
			const normalizedName = this.channelName.toLowerCase();
			
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
		this.log.info('🛑 EloWard FFZ Addon: Disabling...');

		if (this.gameCheckInterval) {
			clearInterval(this.gameCheckInterval);
			this.gameCheckInterval = null;
		}

		this.removeChatTokenizer();

		this.clearUserData();

		this.cache.clear();
		this.processingQueue = [];

		this.removeBadges();

		this.log.info('✅ EloWard FFZ Addon: Disabled successfully');
	}

	removeBadges() {
		// Remove badge definitions from FFZ - following FFZ addon pattern
		for (const tier of this.rankTiers) {
			const badgeId = this.getBadgeId(tier);
			this.badges.removeBadge(badgeId, false);
		}
		
		// Rebuild badge CSS after removal
		this.badges.buildBadgeCSS();
	}
}

// Register the addon with FFZ
EloWardFFZAddon.register();
