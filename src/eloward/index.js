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
		
		// Rank-specific styling configurations for FFZ badges
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

		// 7TV-specific styling configurations (different layout system)
		// Note: These can be customized independently from FFZ styling
		this.rankStyles7TV = {
			iron: { width: '28px', height: '28px', margin: '0px -7px 5px -3px'},
			bronze: { width: '26px', height: '26px', margin: '0px -7px 3px -3px'},	
			silver: { width: '24px', height: '24px', margin: '0px -7px 2px -3px'},
			gold: { width: '24px', height: '24px', margin: '0px -7px 0px -3px'},
			platinum: { width: '24px', height: '24px', margin: '2px -5px 0px -1px'},
			emerald: { width: '24px', height: '24px', margin: '2px -5px 0px -1px'},
			diamond: { width: '24px', height: '24px', margin: '0px -3px 0px 1px'},
			master: { width: '24px', height: '24px', margin: '2px -5px 0px -1px'},
			grandmaster: { width: '24px', height: '24px', margin: '2px -5px 0px -1px'},
			challenger: { width: '24px', height: '24px', margin: '0px -7px 5px -3px'},
			unranked: { width: '24px', height: '24px', margin: '1px -7px 0px -3px'}
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
		}, 2500);
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
			
			// Set up message observer for 7TV mode
			this.setupMessageObserver();
		}
	}

	performChannelSwitchFallbackDetection() {
		// Only perform fallback detection if we have active channels
		if (this.activeChannels.size === 0) {
			return;
		}
		
		// Store current mode before re-detection
		const currentMode = this.chatMode;
		this.log.info(`Channel switch fallback detection starting - current mode: ${currentMode}`);
		
		this.detectChatMode();
		
		// Only act if mode actually changed, especially to 7TV
		if (currentMode !== this.chatMode) {
			this.log.info(`Channel switch fallback detection - switching from ${currentMode} to ${this.chatMode}`);
			
			// Regenerate CSS with correct styles
			if (this.badgeStyleElement) {
				this.badgeStyleElement.textContent = this.generateRankSpecificCSS();
			}
			
			// Reset and setup message observer for the correct mode
			this.setupMessageObserver();
			
			// If we switched to 7TV, we might need to process existing messages
			if (this.chatMode === 'seventv' && currentMode !== 'seventv') {
				this.processExistingMessages();
			}
		} else {
			this.log.info(`Channel switch fallback detection - mode unchanged: ${this.chatMode}`);
		}
	}

	setupMessageObserver() {
		// Clear existing observer
		if (this.messageObserver) {
			this.messageObserver.disconnect();
			this.messageObserver = null;
		}

		// Process existing messages for all modes
		this.processExistingMessages();

		// Set up direct observer only for 7TV mode
		if (this.chatMode === 'seventv' && this.sevenTVDetected) {
			this.setupSevenTVObserver();
		}
	}

	processExistingMessages() {
		// Find chat container
		const chatContainer = this.findChatContainer();
		if (!chatContainer) {
			return;
		}

		// Define selectors based on chat mode
		let messageSelectors;
		if (this.chatMode === 'seventv') {
			messageSelectors = ['.seventv-message', '.chat-line__message', '.chat-line'];
		} else {
			messageSelectors = ['.chat-line__message', '.chat-line', '[data-a-target="chat-line-message"]'];
		}

		// Process existing messages
		const existingMessages = chatContainer.querySelectorAll(messageSelectors.join(', '));
		
		for (const message of existingMessages) {
			if (!this.processedMessages.has(message)) {
				if (this.chatMode === 'seventv') {
					this.processDirectMessage(message);
				} else {
					this.processStandardMessage(message);
				}
			}
		}
	}

	setupSevenTVObserver() {
		// Find chat container
		const chatContainer = this.findChatContainer();
		if (!chatContainer) {
			return;
		}

		// Define selectors for 7TV mode
		const messageSelectors = [
			'.seventv-message',
			'.chat-line__message',
			'.chat-line'
		];

		// Set up mutation observer for new messages
		this.messageObserver = new MutationObserver((mutations) => {
			// Only process if we have active channels
			if (this.activeChannels.size === 0) return;

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
		});

		this.messageObserver.observe(chatContainer, {
			childList: true,
			subtree: true
		});

		this.log.info(`✅ 7TV message observer ready`);
	}

	findChatContainer() {
		// Use the proven working selector
		const container = document.querySelector('.chat-list--default');
		if (container) {
			return container;
		}

		// Fallback for edge cases: find container from any existing message
		const anyMessage = document.querySelector('.chat-line__message, .chat-line');
		if (anyMessage) {
			const fallbackContainer = anyMessage.closest('[role="log"]') || anyMessage.parentElement;
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

		// Extract username from 7TV message (use most robust selector)
		const usernameElement = messageElement.querySelector('.seventv-chat-user-username');
		if (!usernameElement) {
			return;
		}

		const username = usernameElement.textContent?.trim();
		if (!username) {
			return;
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

	processStandardMessage(messageElement) {
		if (!messageElement) return;

		// Mark message as processed to avoid duplicates
		this.processedMessages.add(messageElement);

		// Extract username from standard Twitch message (fallback selectors for existing messages)
		const usernameSelectors = [
			'[data-a-target="chat-message-username"]', // Primary robust selector
			'.chat-author__display-name', // Fallback for existing messages
			'.chat-line__username' // Additional fallback
		];

		let usernameElement = null;
		let username = null;

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
			return;
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

		// Check if badge already exists (for FFZ mode, check FFZ badges)
		if (messageElement.querySelector('.eloward-rank-badge') || 
			messageElement.querySelector('.ffz-badge[data-badge*="addon.eloward"]')) {
			return;
		}

		// Track metrics and process rank lookup
		this.incrementMetric('db_read', currentChannel);

		const cachedRank = this.getCachedRank(username);
		if (cachedRank) {
			this.incrementMetric('successful_lookup', currentChannel);
			// For standard mode, we need to find the user ID to use FFZ badges
			this.addStandardModeBadge(messageElement, username, cachedRank);
		} else {
			this.fetchRankData(username).then(rankData => {
				if (rankData) {
					this.setCachedRank(username, rankData);
					this.incrementMetric('successful_lookup', currentChannel);
					this.addStandardModeBadge(messageElement, username, rankData);
				}
			}).catch(() => {});
		}
	}

	addStandardModeBadge(messageElement, username, rankData) {
		// For standard mode, extract user ID from message element attributes
		const userId = messageElement.getAttribute('data-user-id') || 
			messageElement.querySelector('[data-user-id]')?.getAttribute('data-user-id');

		if (userId) {
			// Use the standard addUserBadge method which will use FFZ badges
			this.addUserBadge(userId, username, rankData);
		} else {
			// Fallback for existing messages: find user in FFZ's user list
			for (const room of this.chat.iterateRooms()) {
				for (const user of room.iterateUsers()) {
					if (user.login && user.login.toLowerCase() === username.toLowerCase()) {
						this.addUserBadge(user.id, username, rankData);
						return;
					}
				}
			}
		}
	}

	getCurrentChannelName() {
		// Get channel name from URL
		const pathname = window.location.pathname;
		
		// Handle popout chat URLs: /popout/:userName/chat
		const popoutMatch = pathname.match(/^\/popout\/([^/]+)\/chat/);
		if (popoutMatch) {
			return popoutMatch[1].toLowerCase();
		}
		
		// Handle dashboard popout chat URLs: /popout/u/:userName/stream-manager/chat
		const dashPopoutMatch = pathname.match(/^\/popout\/u\/([^/]+)\/stream-manager\/chat/);
		if (dashPopoutMatch) {
			return dashPopoutMatch[1].toLowerCase();
		}
		
		// Handle embed chat URLs: /embed/:userName/chat
		const embedMatch = pathname.match(/^\/embed\/([^/]+)\/chat/);
		if (embedMatch) {
			return embedMatch[1].toLowerCase();
		}
		
		// Handle moderator popout chat URLs: /popout/moderator/:userName/chat
		const modPopoutMatch = pathname.match(/^\/popout\/moderator\/([^/]+)\/chat/);
		if (modPopoutMatch) {
			return modPopoutMatch[1].toLowerCase();
		}
		
		// Handle normal URLs: /:userName
		const normalMatch = pathname.match(/^\/([^/]+)/);
		return normalMatch ? normalMatch[1].toLowerCase() : null;
	}

	detectChatMode() {
		// Check for 7TV elements in the DOM (more comprehensive check)
		const has7TVElements = !!(
			document.querySelector('.seventv-message') ||
			document.querySelector('.seventv-chat-user') ||
			document.querySelector('[data-seventv]') ||
			document.querySelector('.seventv-paint') ||
			document.querySelector('.seventv-chat-user-username') ||
			document.querySelector('.seventv-chat-badge') ||
			document.querySelector('.seventv-emote') ||
			// Check for 7TV extension presence in the page
			window.SevenTV ||
			document.querySelector('script[src*="seventv"]') ||
			document.querySelector('link[href*="seventv"]')
		);

		// Check for specific FFZ elements
		const hasFFZElements = !!(
			document.querySelector('.ffz-message-line') ||
			document.querySelector('.ffz-chat-line') ||
			document.querySelector('[data-ffz-component]')
		);

		// Store previous mode for comparison
		const previousMode = this.chatMode;

		// Determine chat mode
		if (has7TVElements) {
			this.chatMode = 'seventv';
			this.sevenTVDetected = true;
			this.log.info(`Chat mode detected: SEVENTV`);
		} else if (hasFFZElements) {
			this.chatMode = 'ffz';
			this.log.info(`Chat mode detected: FFZ`);
		} else {
			// If we previously detected 7TV but can't find elements now,
			// preserve 7TV mode (elements might be temporarily missing during transitions)
			if (previousMode === 'seventv' && this.sevenTVDetected) {
				this.log.info(`Chat mode: Preserving SEVENTV mode (elements temporarily missing)`);
				// Keep existing mode
			} else {
				this.chatMode = 'standard';
				this.log.info(`Chat mode detected: STANDARD`);
			}
		}
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
		let css = `
			/* Base 7TV badge styling */
			.seventv-chat-badge.eloward-rank-badge.seventv-integration {
				display: inline-block;
				vertical-align: middle;
				position: relative;
				border-radius: 4px;
				overflow: hidden;
			}

			/* Image styling */
			.seventv-badge-img, .eloward-badge-img {
				width: 100% !important;
				height: 100% !important;
				object-fit: contain;
			}

			/* Badge list container */
			.seventv-chat-user-badge-list {
				display: inline-flex;
				align-items: center;
				gap: 4px;
				margin-right: 8px;
			}

			/* Responsive sizing for different chat widths */
			@media (max-width: 400px) {
				.seventv-chat-badge.eloward-rank-badge.seventv-integration {
					width: 20px !important;
					height: 20px !important;
					margin: 0 2px 0 0 !important;
				}
			}

			/* Dark theme integration (7TV compatible) */
			.tw-root--theme-dark .seventv-chat-badge.eloward-rank-badge.seventv-integration {
				filter: brightness(0.95);
			}

			/* Light theme integration */
			.tw-root--theme-light .seventv-chat-badge.eloward-rank-badge.seventv-integration {
				filter: brightness(1.05) contrast(1.1);
			}

			/* Rank-specific 7TV styling */`;

		// Add rank-specific styles for 7TV mode
		for (const tier of this.rankTiers) {
			const styles = this.rankStyles7TV[tier];
			if (styles) {
				// Use 7TV-specific styling values
				const tv7Width = styles.width;
				const tv7Height = styles.height;
				const tv7Margin = styles.margin;
				
				css += `
					.seventv-chat-badge.eloward-rank-badge.seventv-integration[data-rank="${tier}"] {
						width: ${tv7Width} !important;
						height: ${tv7Height} !important;
						margin: ${tv7Margin} !important;
					}
				`;
			}
		}

		css += `
			/* Integration with 7TV's badge spacing */
			.seventv-chat-user .seventv-chat-user-badge-list + .seventv-chat-user-username {
				margin-left: 4px;
			}
		`;
		
		return css;
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
			} else {
				// For subsequent channels, we need to reset 7TV state and set up observer for new channel
				this.resetForNewChannel();
			}
			
			// Process existing users in chat when room becomes active
			this.processExistingChatUsers(room, roomLogin);
		}
	}

	resetForNewChannel() {
		// Clear processed messages from previous channel
		this.processedMessages.clear();
		
		// Re-detect chat mode in case it changed
		this.detectChatMode();
		
		// Regenerate CSS in case chat mode changed
		if (this.badgeStyleElement) {
			this.badgeStyleElement.textContent = this.generateRankSpecificCSS();
		}
		
		// Reset and setup message observer for the new channel
		this.setupMessageObserver();
		
		// Add fallback detection for channel switches (7TV might load late)
		setTimeout(() => {
			this.performChannelSwitchFallbackDetection();
		}, 1500);
		
		this.log.info(`Reset EloWard state for new channel in ${this.chatMode} mode`);
	}

	onRoomRemove(room) {
		const roomId = room.id;
		const roomLogin = this.activeRooms.get(roomId);
		
		this.activeRooms.delete(roomId);
		if (roomLogin) {
			this.activeChannels.delete(roomLogin);
			this.lolCategoryRooms.delete(roomLogin);
			
			// Only clear state if no active channels remain
			if (this.activeChannels.size === 0) {
				// Clear processed messages when leaving all channels
				this.processedMessages.clear();
				
				// Clean up 7TV badges from DOM when leaving all channels
				if (this.sevenTVDetected) {
					document.querySelectorAll('.eloward-rank-badge.seventv-integration').forEach(badge => {
						badge.remove();
					});
				}
			}
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
	
	async processExistingChatUsers(room, roomLogin) {
		// Get all users currently visible in chat
		const chatUsers = this.getChatUsers(room);
		
		// Process each user for rank badges
		for (const user of chatUsers) {
			const username = user.login;
			const userId = user.id;
			
			if (!username || !userId || this.userBadges.has(userId)) {
				continue;
			}
			
			const cachedRank = this.getCachedRank(username);
			if (cachedRank) {
				this.addUserBadge(userId, username, cachedRank);
			} else {
				this.fetchRankData(username).then(rankData => {
					if (rankData) {
						this.setCachedRank(username, rankData);
						this.addUserBadge(userId, username, rankData);
						this.incrementMetric('successful_lookup', roomLogin);
					}
				}).catch(() => {});
			}
		}
	}
	
	getChatUsers(room) {
		const users = [];
		
		// Use FFZ's recommended approach
		if (room && room.iterateUsers) {
			for (const user of room.iterateUsers()) {
				if (user.login && user.id) {
					users.push(user);
				}
			}
		}
		
		return users;
	}

	onContextChanged() {
		// Re-evaluate category detection for all active rooms when context changes
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

	processMessage(tokens, msg) {
		// Check if addon is enabled
		if (!this.settings.get('eloward.enabled')) {
			return tokens;
		}

		// Skip FFZ tokenizer processing in 7TV mode since we use direct DOM manipulation
		if (this.chatMode === 'seventv' && this.sevenTVDetected) {
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
		// Simple approach: find recent messages from this user and add badges
		const userMessages = document.querySelectorAll('.seventv-chat-user');
		
		userMessages.forEach(messageElement => {
			const usernameElement = messageElement.querySelector('.seventv-chat-user-username');
			if (usernameElement && 
				usernameElement.textContent?.trim().toLowerCase() === username.toLowerCase() &&
				!messageElement.querySelector('.eloward-rank-badge')) {
				
				this.addSevenTVBadge(messageElement, usernameElement, rankData);
			}
		});
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

		// Simple eviction when cache is too large
		if (this.cache.size > this.config.maxCacheSize) {
			this.evictOldEntries();
		}
	}

	evictOldEntries() {
		// Remove expired entries first
		const now = Date.now();
		for (const [key, entry] of this.cache.entries()) {
			if (entry.timestamp && (now - entry.timestamp > this.config.cacheExpiry)) {
				this.cache.delete(key);
			}
		}

		// If still too large, remove oldest entries
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
		// Check manual override first
		const manualOverride = this.settings.get('eloward.manual_override');
		if (manualOverride) {
			this.log.info(`Manual override enabled, adding ${roomLogin} to LoL category rooms.`);
			this.lolCategoryRooms.add(roomLogin);
			return true;
		}
		
		// Check stream category
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
		
		// Setup tooltip data and rank-specific attributes
		badge.dataset.rank = rankData.tier.toLowerCase();
		badge.dataset.division = rankData.division || '';
		badge.dataset.lp = rankData.leaguePoints !== undefined && rankData.leaguePoints !== null ? 
			rankData.leaguePoints.toString() : '';
		badge.dataset.username = rankData.summonerName || '';
		
		badgeList.appendChild(badge);
	}


}

// Register the addon with FFZ
EloWardFFZAddon.register();