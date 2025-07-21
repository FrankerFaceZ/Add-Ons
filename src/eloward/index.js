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
		this.chatMode = 'standard'; // 'standard', 'seventv', 'ffz'
		this.sevenTVDetected = false;
		this.messageObserver = null; // For direct message observation in 7TV mode
		this.processedMessages = new Set(); // Track processed messages to avoid duplicates
		this.initializationFinalized = false; // Track if we've completed full initialization
		
		// Rank-specific styling configurations
		this.rankStyles = {
			iron: { width: '28px', height: '28px', margin: '0 -2px 7.5px -6px'},
			bronze: { width: '26px', height: '26px', margin: '0 -1.5px 6px -5px'},
			silver: { width: '24px', height: '24px', margin: '0 0px 6px -4.5px'},
			gold: { width: '24px', height: '24px', margin: '0 0px 4px -4px'},
			platinum: { width: '24px', height: '24px', margin: '0 0.5px 3.5px -3.5px'},
			emerald: { width: '24px', height: '24px', margin: '0 1px 3px -3px'},
			diamond: { width: '24px', height: '24px', margin: '0 3px 4px -1px'},
			master: { width: '24px', height: '24px', margin: '0 3px 3px -1px'},
			grandmaster: { width: '24px', height: '24px', margin: '0 3px 2px -1px'},
			challenger: { width: '24px', height: '24px', margin: '0 3px 1px -1px'},
			unranked: { width: '24px', height: '24px', margin: '0 -0.2px 2.5px -3.5px'}
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

		// Basic infrastructure setup only
		this.initializeBasicInfrastructure();

		// Set up chat room event listeners (these will handle activation logic)
		this.on('chat:room-add', this.onRoomAdd, this);
		this.on('chat:room-remove', this.onRoomRemove, this);

		// Listen for context changes to re-evaluate category detection
		this.on('site.context:changed', this.onContextChanged, this);

		// Handle existing rooms - this will trigger the real initialization when appropriate
		this.initializeExistingRooms();
	}

	initializeBasicInfrastructure() {
		// Inject custom CSS for rank-specific badges (basic setup, no chat mode detection yet)
		this.badgeStyleElement = document.createElement('style');
		this.badgeStyleElement.id = 'eloward-badge-styles';
		this.badgeStyleElement.textContent = this.generateRankSpecificCSS();
		document.head.appendChild(this.badgeStyleElement);

		// Initialize rank badges
		this.initializeRankBadges();

		// Setup chat tokenizer (for non-7TV modes)
		this.chat.addTokenizer({
			type: 'eloward-ranks',
			process: this.processMessage.bind(this)
		});
	}

	finalizeInitialization() {
		// This gets called AFTER we know the channel is streaming LoL and is active
		this.log.info('EloWard FFZ Addon: Ready');

		// NOW detect chat mode and set up observers
		this.detectChatMode();

		// Regenerate CSS now that we know the chat mode
		if (this.badgeStyleElement) {
			this.badgeStyleElement.textContent = this.generateRankSpecificCSS();
		}

		this.setupMessageObserver();

		// Single fallback detection for late-loading extensions
		setTimeout(() => {
			this.performFallbackChatModeDetection();
		}, 15000);
	}

	performFallbackChatModeDetection() {
		const previousMode = this.chatMode;
		this.detectChatMode();
		
		// Only act if mode actually changed to 7TV
		if (previousMode !== this.chatMode && this.chatMode === 'seventv') {
			this.log.info(`Late 7TV detection - switching from ${previousMode} to ${this.chatMode}`);
			
			// Regenerate CSS with 7TV styles
			if (this.badgeStyleElement) {
				this.badgeStyleElement.textContent = this.generateRankSpecificCSS();
			}
			
			// Update existing user badges to use 7TV system
			this.convertExistingBadgesToSevenTV();
			
			// Set up message observer for 7TV mode
			this.setupMessageObserver();
		}
	}

	setupMessageObserver() {
		// Clear existing observer
		if (this.messageObserver) {
			this.messageObserver.disconnect();
			this.messageObserver = null;
		}

		// Only set up direct observer for 7TV mode
		if (this.chatMode !== 'seventv' || !this.sevenTVDetected) {
			return;
		}

		// Find chat container
		const chatContainer = this.findChatContainer();
		if (!chatContainer) {
			this.log.info(`❌ No chat container found for message observer`);
			return;
		}

		// Define selectors for 7TV mode
		const messageSelectors = [
			'.seventv-message',
			'.chat-line__message',
			'.chat-line'
		];

		// Process existing messages
		try {
			const existingMessages = chatContainer.querySelectorAll(messageSelectors.join(', '));
			let processed = 0;
			
			for (const message of existingMessages) {
				if (!this.processedMessages.has(message)) {
					this.processDirectMessage(message);
					processed++;
				}
			}
			
			if (processed > 0) {
				this.log.info(`📝 Processed ${processed} existing messages in 7TV mode`);
			}
		} catch (error) {
			this.log.info(`❌ Error processing existing messages:`, error);
		}

		// Set up mutation observer for new messages
		this.messageObserver = new MutationObserver((mutations) => {
			// Only process if we have active channels
			if (this.activeChannels.size === 0) return;

			try {
				for (const mutation of mutations) {
					if (mutation.type === 'childList' && mutation.addedNodes.length > 0) {
						for (const node of mutation.addedNodes) {
							if (node.nodeType === Node.ELEMENT_NODE) {
								// Check if it's a message or contains messages
								const isMessage = messageSelectors.some(selector => 
									node.matches && node.matches(selector)
								);
								
								if (isMessage && !this.processedMessages.has(node)) {
									this.processDirectMessage(node);
								} else {
									// Check for messages within the added node
									const messages = node.querySelectorAll(messageSelectors.join(', '));
									for (const message of messages) {
										if (!this.processedMessages.has(message)) {
											this.processDirectMessage(message);
										}
									}
								}
							}
						}
					}
				}
			} catch (error) {
				this.log.info(`❌ Error in mutation observer:`, error);
			}
		});

		this.messageObserver.observe(chatContainer, {
			childList: true,
			subtree: true
		});

		this.log.info(`✅ 7TV message observer ready`);
	}

	findChatContainer() {
		// Use the proven working selector first
		const container = document.querySelector('.chat-list--default');
		if (container) {
			return container;
		}

		// Fallback: look for any message and find its container
		const anyMessage = document.querySelector('.seventv-message, .chat-line__message, .chat-line');
		if (anyMessage) {
			const fallbackContainer = anyMessage.closest('[role="log"]') || 
				anyMessage.closest('.chat-list--default') || 
				anyMessage.parentElement;
			if (fallbackContainer && fallbackContainer !== document.body) {
				return fallbackContainer;
			}
		}

		return null;
	}

	processDirectMessage(messageElement) {
		if (!messageElement) return;

		// Mark message as processed to avoid duplicates
		this.processedMessages.add(messageElement);

		// Extract username from message
		const usernameSelectors = [
			'.seventv-chat-user-username',
			'.chat-author__display-name',
			'[data-a-target="chat-message-username"]'
		];

		let username = null;
		let usernameElement = null;

		for (const selector of usernameSelectors) {
			usernameElement = messageElement.querySelector(selector);
			if (usernameElement) {
				username = usernameElement.textContent?.trim();
				if (username) {
					break;
				}
			}
		}

		if (!username) {
			return; // No username found
		}

		// Get current room/channel name
		const currentChannel = this.getCurrentChannelName();
		if (!currentChannel) {
			return;
		}

		// Check if this room has League of Legends category and channel is active
		const hasLoLCategory = this.lolCategoryRooms.has(currentChannel);
		const isActive = this.activeChannels.has(currentChannel);

		if (!hasLoLCategory || !isActive) {
			return;
		}

		// Check if badge already exists
		if (messageElement.querySelector('.eloward-rank-badge')) {
			return;
		}

		// Track metrics and process rank lookup
		this.incrementMetric('db_read', currentChannel);

		const cachedRank = this.getCachedRank(username);
		if (cachedRank) {
			this.incrementMetric('successful_lookup', currentChannel);
			this.addSevenTVBadge(messageElement, usernameElement, cachedRank);
		} else {
			this.fetchRankData(username).then(rankData => {
				if (rankData) {
					this.setCachedRank(username, rankData);
					this.incrementMetric('successful_lookup', currentChannel);
					this.addSevenTVBadge(messageElement, usernameElement, rankData);
				}
			}).catch(() => {});
		}
	}

	getCurrentChannelName() {
		// Try to get channel name from URL or other sources
		const pathname = window.location.pathname;
		const match = pathname.match(/^\/([^/]+)/);
		if (match) {
			return match[1].toLowerCase();
		}

		// Fallback: try to get from active rooms
		if (this.activeRooms.size > 0) {
			return Array.from(this.activeRooms.values())[0];
		}

		return null;
	}

	convertExistingBadgesToSevenTV() {
		// Convert existing FFZ badges to 7TV badges for better compatibility
		for (const [userId, badgeInfo] of this.userBadges.entries()) {
			if (badgeInfo.rankData) {
				// Remove FFZ badge and add 7TV badge
				const ffzUser = this.chat.getUser(userId);
				if (ffzUser && badgeInfo.badgeId) {
					ffzUser.removeBadge('addon.eloward', badgeInfo.badgeId);
				}
				
				// Add 7TV badge
				this.addSevenTVBadgeToExistingMessages(userId, badgeInfo.username, badgeInfo.rankData);
			}
		}
	}

	detectChatMode() {
		// Check for 7TV elements in the DOM
		const sevenTVSelectors = [
			'.seventv-message',
			'.seventv-chat-user',
			'[data-seventv]',
			'.seventv-paint',
			'.seventv-chat-user-badge-list'
		];

		let sevenTVFound = [];
		sevenTVSelectors.forEach(selector => {
			const elements = document.querySelectorAll(selector);
			if (elements.length > 0) {
				sevenTVFound.push(`${selector}: ${elements.length}`);
			}
		});

		const has7TVElements = sevenTVFound.length > 0;

		// Check for specific FFZ elements (beyond just this addon)
		const ffzSelectors = [
			'.ffz-message-line',
			'.ffz-chat-line',
			'[data-ffz-component]',
			'.ffz-addon'
		];

		let ffzFound = [];
		ffzSelectors.forEach(selector => {
			const elements = document.querySelectorAll(selector);
			if (elements.length > 0) {
				ffzFound.push(`${selector}: ${elements.length}`);
			}
		});

		const hasFFZElements = ffzFound.length > 0;

		// Determine chat mode
		if (has7TVElements) {
			this.chatMode = 'seventv';
			this.sevenTVDetected = true;
			this.log.info(`🎭 7TV elements found: [${sevenTVFound.join(', ')}]`);
		} else if (hasFFZElements) {
			this.chatMode = 'ffz';
			this.log.info(`🔧 FFZ elements found: [${ffzFound.join(', ')}]`);
		} else {
			this.chatMode = 'standard';
			this.log.info(`📺 No extension elements found - using standard mode`);
		}

		this.log.info(`Chat mode detected: ${this.chatMode.toUpperCase()}`);
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

		// Add 7TV-specific styles if 7TV is detected
		if (this.sevenTVDetected) {
			css += this.getSevenTVStyles();
		}
		
		return css;
	}

	getSevenTVStyles() {
		return `
			.seventv-chat-badge.eloward-rank-badge.seventv-integration {
				display: inline-block;
				width: 28px !important;
				height: 28px !important;
				margin: 0 4px 0 0 !important;
				vertical-align: middle;
				position: relative;
				border-radius: 4px;
				overflow: hidden;
			}

			.seventv-badge-img {
				width: 100% !important;
				height: 100% !important;
				object-fit: contain;
			}

			.seventv-chat-user-badge-list {
				display: inline-flex;
				align-items: center;
				gap: 4px;
				margin-right: 8px;
			}

			.seventv-chat-user-badge-list .eloward-rank-badge {
				cursor: pointer;
			}
		`;
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
			
			// Finalize initialization on first active channel
			if (!this.initializationFinalized) {
				this.initializationFinalized = true;
				this.finalizeInitialization();
			}
			
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
			
			// For 7TV mode, also handle direct message processing
			if (this.chatMode === 'seventv' && this.sevenTVDetected) {
				setTimeout(() => {
					this.processSevenTVMessage(username, cachedRank);
				}, 100); // Small delay to allow DOM update
			}
		} else {
			this.fetchRankData(username).then(rankData => {
				if (rankData) {
					this.setCachedRank(username, rankData);
					this.addUserBadge(user.id, username, rankData);
					this.incrementMetric('successful_lookup', roomLogin);
					
					// For 7TV mode, also handle direct message processing
					if (this.chatMode === 'seventv' && this.sevenTVDetected) {
						setTimeout(() => {
							this.processSevenTVMessage(username, rankData);
						}, 100); // Small delay to allow DOM update
					}
				}
			}).catch(() => {});
		}

		return tokens;
	}

	processSevenTVMessage(username, rankData) {
		// Find recent messages from this user that might not have badges yet
		const recentMessages = document.querySelectorAll('.seventv-chat-user');
		
		recentMessages.forEach(messageElement => {
			const usernameElement = messageElement.querySelector('.seventv-chat-user-username');
			if (usernameElement && 
				usernameElement.textContent?.trim().toLowerCase() === username.toLowerCase() &&
				!messageElement.querySelector('.eloward-rank-badge')) {
				
				this.addSevenTVBadge(messageElement, usernameElement, rankData);
			}
		});
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
		// Remove FFZ badges from all users
		for(const user of this.chat.iterateUsers()) {
			user.removeAllBadges('addon.eloward');
		}
		
		// Remove 7TV badges from DOM
		if (this.sevenTVDetected) {
			document.querySelectorAll('.eloward-rank-badge.seventv-integration').forEach(badge => {
				badge.remove();
			});
		}
		
		this.userBadges.clear();
		this.processedMessages.clear();
	}

	addUserBadge(userId, username, rankData) {
		if (!rankData?.tier) {
			return;
		}

		const tier = rankData.tier.toLowerCase();
		if (!this.rankTiers.has(tier)) {
			return;
		}

		// For 7TV mode, use direct DOM manipulation instead of FFZ badges
		if (this.chatMode === 'seventv' && this.sevenTVDetected) {
			// Find message containers for this user and add 7TV badges directly
			this.addSevenTVBadgeToExistingMessages(userId, username, rankData);
			
			// Store badge info for future message processing
			this.userBadges.set(userId, { username, tier, rankData });
			
			return;
		}

		// Use FFZ native badge system for other modes
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

	addSevenTVBadgeToExistingMessages(userId, username, rankData) {
		// Find all existing messages from this user and add 7TV badges
		const messageSelectors = [
			`.seventv-message`,
			`.seventv-chat-user`,
			`[data-user-id="${userId}"]`,
			`[data-username="${username}"]`
		];

		// Try each selector to find user messages
		for (const selector of messageSelectors) {
			const messages = document.querySelectorAll(selector);
			
			messages.forEach(messageElement => {
				// Verify this is the right user
				const messageUsername = this.extractUsernameFromMessage(messageElement, username);
				if (messageUsername && messageUsername.toLowerCase() === username.toLowerCase()) {
					const usernameElement = messageElement.querySelector('.seventv-chat-user-username');
					if (usernameElement && !messageElement.querySelector('.eloward-rank-badge')) {
						this.addSevenTVBadge(messageElement, usernameElement, rankData);
					}
				}
			});
		}
	}

	extractUsernameFromMessage(messageElement, expectedUsername) {
		// Try various methods to extract username from message element
		const usernameElement = messageElement.querySelector('.seventv-chat-user-username');
		if (usernameElement) {
			return usernameElement.textContent?.trim();
		}

		// Fallback methods
		const dataUsername = messageElement.getAttribute('data-username');
		if (dataUsername) {
			return dataUsername;
		}

		return expectedUsername; // Fallback to expected username
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

		// Clean up message observer
		if (this.messageObserver) {
			this.messageObserver.disconnect();
			this.messageObserver = null;
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
		
		// Reset state
		this.chatMode = 'standard';
		this.sevenTVDetected = false;
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

	addSevenTVBadge(messageContainer, usernameElement, rankData) {
		if (!rankData?.tier || !this.sevenTVDetected) {
			return;
		}

		// Find or create 7TV badge list container
		let badgeList = messageContainer.querySelector('.seventv-chat-user-badge-list');
		
		if (!badgeList) {
			const chatUser = messageContainer.querySelector('.seventv-chat-user');
			if (!chatUser) {
				return;
			}
			
			// Create badge list container
			badgeList = document.createElement('span');
			badgeList.className = 'seventv-chat-user-badge-list';
			
			// Insert before username
			const username = chatUser.querySelector('.seventv-chat-user-username');
			if (username) {
				chatUser.insertBefore(badgeList, username);
			} else {
				chatUser.insertBefore(badgeList, chatUser.firstChild);
			}
		}

		// Check if badge already exists
		if (badgeList.querySelector('.eloward-rank-badge')) {
			return;
		}
		
		// Create 7TV-style badge
		const badge = document.createElement('div');
		badge.className = 'seventv-chat-badge eloward-rank-badge seventv-integration';
		badge.dataset.rankText = this.formatRankText(rankData);
		
		const img = document.createElement('img');
		img.alt = rankData.tier;
		img.className = 'eloward-badge-img seventv-badge-img';
		img.src = `https://eloward-cdn.unleashai.workers.dev/lol/${rankData.tier.toLowerCase()}.png`;
		
		badge.appendChild(img);
		
		// Setup tooltip data
		badge.dataset.rank = rankData.tier;
		badge.dataset.division = rankData.division || '';
		badge.dataset.lp = rankData.leaguePoints !== undefined && rankData.leaguePoints !== null ? 
			rankData.leaguePoints.toString() : '';
		badge.dataset.username = rankData.summonerName || '';
		
		badgeList.appendChild(badge);
	}
}

// Register the addon with FFZ
EloWardFFZAddon.register();