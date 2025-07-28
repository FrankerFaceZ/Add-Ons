// EloWard FFZ Addon - League of Legends Rank Badges for Streamers
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
		this.messageObserver = null;
		this.processedMessages = new Set();
		this.initializationFinalized = false;
		this.tooltipElement = null;


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
		this.initializeBasicInfrastructure();
		this.on('chat:room-add', this.onRoomAdd, this);
		this.on('chat:room-remove', this.onRoomRemove, this);
		this.on('site.context:changed', this.onContextChanged, this);
		this.initializeExistingRooms();
	}

	initializeBasicInfrastructure() {
		this.badgeStyleElement = document.createElement('style');
		this.badgeStyleElement.id = 'eloward-badge-styles';
		this.badgeStyleElement.textContent = this.generateRankSpecificCSS();
		document.head.appendChild(this.badgeStyleElement);

		this.chat.addTokenizer({
			type: 'eloward-ranks',
			process: this.processMessage.bind(this)
		});
	}

	finalizeInitialization() {

		if (this.badgeStyleElement) {
			this.badgeStyleElement.textContent = this.generateRankSpecificCSS();
		}

		this.setupMessageObserver();

	}



	setupMessageObserver() {
		if (this.messageObserver) {
			this.messageObserver.disconnect();
			this.messageObserver = null;
		}

		this.processExistingMessages();

		this.setupObserver();
	}

	processExistingMessages() {
		const chatContainer = this.findChatContainer();
		if (!chatContainer) {
			return;
		}

		let messageSelectors = ['.chat-line__message', '.chat-line', '[data-a-target="chat-line-message"]'];

		const existingMessages = chatContainer.querySelectorAll(messageSelectors.join(', '));
		
		// Collect unique usernames and their message elements (batch processing)
		const userMessageMap = new Map();
		
		for (const message of existingMessages) {
			if (this.processedMessages.has(message)) continue;
			
			// Find username element
			let usernameElement = null;
			let usernameSelectors = [
				'[data-a-target="chat-message-username"]',
				'.chat-author__display-name',
				'.chat-line__username'
			];
			
			for (const selector of usernameSelectors) {
				usernameElement = message.querySelector(selector);
				if (usernameElement) break;
			}
			
			if (!usernameElement) continue;
			
			const username = usernameElement.textContent?.trim().toLowerCase();
			if (!username) continue;
			
			// Skip if already has badge
			if (message.querySelector('.eloward-rank-badge')) continue;
			
			this.processedMessages.add(message);
			
			if (!userMessageMap.has(username)) {
				userMessageMap.set(username, []);
			}
			userMessageMap.get(username).push({
				messageElement: message,
				usernameElement: usernameElement
			});
		}
		
		// Process each unique username (batch processing)
		if (userMessageMap.size > 0) {
			this.processUsernamesBatch(userMessageMap);
		}
	}

	processUsernamesBatch(userMessageMap) {
		const currentChannel = this.getCurrentChannelName();
		if (!currentChannel) return;

		const hasLoLCategory = this.lolCategoryRooms.has(currentChannel);
		const isActive = this.activeChannels.has(currentChannel);

		if (!hasLoLCategory || !isActive) {
			return;
		}

		// First, apply cached ranks immediately and collect users needing fetch
		const usersNeedingFetch = new Set();
		
		for (const [username, messageData] of userMessageMap.entries()) {
			const cachedRank = this.getCachedRank(username);
			
			if (cachedRank) {
				// Apply rank to all messages for this user immediately
				this.applyRankToAllUserMessages(username, messageData, cachedRank);
				this.incrementMetric('successful_lookup', currentChannel);
			} else {
				usersNeedingFetch.add(username);
			}
			
			// Increment db_read metric once per user (not per message)
			this.incrementMetric('db_read', currentChannel);
		}
		
		// Fetch ranks for users not in cache
		if (usersNeedingFetch.size > 0) {
			this.fetchRanksForUsers(usersNeedingFetch, userMessageMap, currentChannel);
		}
	}

	applyRankToAllUserMessages(username, messageData, rankData) {
		messageData.forEach(({ messageElement, usernameElement }) => {
			this.addBadge(messageElement, username, rankData);
		});
	}

	fetchRanksForUsers(usersNeedingFetch, userMessageMap, currentChannel) {
		// Fetch ranks for each user
		for (const username of usersNeedingFetch) {
			const messageData = userMessageMap.get(username);
			
			this.fetchRankData(username).then(rankData => {
				if (rankData) {
					this.setCachedRank(username, rankData);
					this.applyRankToAllUserMessages(username, messageData, rankData);
					this.incrementMetric('successful_lookup', currentChannel);
				}
			}).catch(() => {});
		}
	}


	setupObserver() {
		const chatContainer = this.findChatContainer();
		if (!chatContainer) {
			return;
		}

		const messageSelectors = [
			'.chat-line__message',
			'.chat-line',
			'[data-a-target="chat-line-message"]'
		];

		this.messageObserver = new MutationObserver((mutations) => {
			if (this.activeChannels.size === 0) return;

			for (const mutation of mutations) {
				if (mutation.type === 'childList' && mutation.addedNodes.length > 0) {
					for (const node of mutation.addedNodes) {
						if (node.nodeType === Node.ELEMENT_NODE) {
							const isMessage = messageSelectors.some(selector => 
								node.matches && node.matches(selector)
							);
							
							if (isMessage && !this.processedMessages.has(node)) {
								this.processNewMessage(node);
							} else {
								const messages = node.querySelectorAll(messageSelectors.join(', '));
								for (const message of messages) {
									if (!this.processedMessages.has(message)) {
										this.processNewMessage(message);
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
	}

	processNewMessage(messageElement) {
		if (!messageElement || this.processedMessages.has(messageElement)) return;

		this.processedMessages.add(messageElement);

		// Find username element
		let usernameElement = null;
		let usernameSelectors = [
			'[data-a-target="chat-message-username"]',
			'.chat-author__display-name',
			'.chat-line__username'
		];
		
		for (const selector of usernameSelectors) {
			usernameElement = messageElement.querySelector(selector);
			if (usernameElement) break;
		}

		if (!usernameElement) return;

		const username = usernameElement.textContent?.trim().toLowerCase();
		if (!username) return;

		const currentChannel = this.getCurrentChannelName();
		if (!currentChannel) return;

		const hasLoLCategory = this.lolCategoryRooms.has(currentChannel);
		const isActive = this.activeChannels.has(currentChannel);

		if (!hasLoLCategory || !isActive) return;

		// Skip if already has badge
		if (messageElement.querySelector('.eloward-rank-badge')) return;

		this.incrementMetric('db_read', currentChannel);

		const cachedRank = this.getCachedRank(username);
		if (cachedRank) {
			this.incrementMetric('successful_lookup', currentChannel);
			this.addBadge(messageElement, username, cachedRank);
			
			// Apply to all other messages from this user in chat
			this.applyRankToAllUserMessagesInChat(username, cachedRank);
		} else {
			this.fetchRankData(username).then(rankData => {
				if (rankData) {
					this.setCachedRank(username, rankData);
					this.incrementMetric('successful_lookup', currentChannel);
					
					// Apply to all messages from this user in chat (including the current one)
					this.applyRankToAllUserMessagesInChat(username, rankData);
				}
			}).catch(() => {});
		}
	}

	applyRankToAllUserMessagesInChat(username, rankData) {
		const currentChannel = this.getCurrentChannelName();
		if (!currentChannel) return;

		let messageSelectors = ['.chat-line__message', '.chat-line', '[data-a-target="chat-line-message"]'];
		let usernameSelectors = [
			'[data-a-target="chat-message-username"]',
			'.chat-author__display-name',
			'.chat-line__username'
		];

		// Find all messages in the current chat
		const allMessages = document.querySelectorAll(messageSelectors.join(', '));
		
		allMessages.forEach(messageElement => {
			// Skip if already has badge
			if (messageElement.querySelector('.eloward-rank-badge')) return;
			
			// Find username element
			let usernameElement = null;
			for (const selector of usernameSelectors) {
				usernameElement = messageElement.querySelector(selector);
				if (usernameElement) break;
			}
			
			if (!usernameElement) return;
			
			const messageUsername = usernameElement.textContent?.trim().toLowerCase();
			if (messageUsername === username) {
				this.addBadge(messageElement, username, rankData);
			}
		});
	}

	findChatContainer() {
		const container = document.querySelector('.chat-list--default');
		if (container) {
			return container;
		}

		const anyMessage = document.querySelector('.chat-line__message, .chat-line');
		if (anyMessage) {
			const fallbackContainer = anyMessage.closest('[role="log"]') || anyMessage.parentElement;
			if (fallbackContainer && fallbackContainer !== document.body) {
				return fallbackContainer;
			}
		}

		return null;
	}

	addBadge(messageElement, username, rankData) {
		if (!rankData?.tier) {
			return;
		}

		// Find or create proper badge container - no fallbacks to username insertion
		const insertionPoint = this.findBadgeInsertionPoint(messageElement);
		if (!insertionPoint.container) {
			return;
		}

		const badge = this.createBadgeElement(rankData);
		insertionPoint.container.appendChild(badge);
	}

	createBadgeElement(rankData) {
		const badge = document.createElement('span');
		badge.className = 'eloward-rank-badge';
		badge.dataset.rankText = this.formatRankText(rankData);
		badge.dataset.rank = rankData.tier.toLowerCase();
		badge.dataset.division = rankData.division || '';
		badge.dataset.lp = rankData.leaguePoints !== undefined && rankData.leaguePoints !== null ? 
						  rankData.leaguePoints.toString() : '';
		badge.dataset.username = rankData.summonerName || '';
		
		const img = document.createElement('img');
		img.alt = rankData.tier;
		img.className = 'eloward-badge-img';
		img.width = 24;
		img.height = 24;
		img.src = `https://eloward-cdn.unleashai.workers.dev/lol/${rankData.tier.toLowerCase()}.png`;
		
		badge.appendChild(img);
		badge.addEventListener('mouseenter', (e) => this.showTooltip(e, rankData));
		badge.addEventListener('mouseleave', () => this.hideTooltip());
		
		return badge;
	}

	findBadgeInsertionPoint(messageContainer) {
		// First, look for existing badge container like chrome extension uses
		let badgeContainer = messageContainer.querySelector('.chat-line__message--badges');
		
		if (badgeContainer) {
			return { container: badgeContainer, before: null };
		}
		
		// If no badge container exists, create one in the same structure as chrome extension
		// Look for the message container structure
		const messageContainerChild = messageContainer.querySelector('.chat-line__message-container');
		
		if (messageContainerChild) {
			// Create the badge container as a sibling to username, not parent
			badgeContainer = document.createElement('span');
			badgeContainer.className = 'chat-line__message--badges';
			
			// Insert the badge container before the username container
			const usernameContainer = messageContainerChild.querySelector('.chat-line__username') || 
									messageContainerChild.querySelector('[data-a-target="chat-message-username"]') ||
									messageContainerChild.querySelector('.chat-author__display-name');
			
			if (usernameContainer) {
				messageContainerChild.insertBefore(badgeContainer, usernameContainer);
			} else {
				// Insert at the beginning of message container
				messageContainerChild.insertBefore(badgeContainer, messageContainerChild.firstChild);
			}
			
			return { container: badgeContainer, before: null };
		}
		
		// Fallback: look for username and create badge container as sibling
		const usernameSelectors = [
			'[data-a-target="chat-message-username"]',
			'.chat-author__display-name', 
			'.chat-line__username'
		];

		let usernameElement = null;
		for (const selector of usernameSelectors) {
			usernameElement = messageContainer.querySelector(selector);
			if (usernameElement) break;
		}

		if (usernameElement) {
			const parent = usernameElement.parentElement;
			if (parent && messageContainer.contains(parent)) {
				// Create badge container as sibling to username
				badgeContainer = document.createElement('span');
				badgeContainer.className = 'chat-line__message--badges';
				parent.insertBefore(badgeContainer, usernameElement);
				return { container: badgeContainer, before: null };
			}
		}
		
		// Last resort: create container at message level - this should always succeed
		badgeContainer = document.createElement('span');
		badgeContainer.className = 'chat-line__message--badges';
		messageContainer.insertBefore(badgeContainer, messageContainer.firstChild);
		return { container: badgeContainer, before: null };
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
			/* Badge container styling */
			.eloward-rank-badge {
				display: inline-flex !important;
				justify-content: center !important;
				align-items: center !important;
				vertical-align: middle !important;
				cursor: pointer !important;
				transform: translateY(-5px) !important;
				transition: none !important;
				width: 20px !important;
				height: 20px !important;
				box-sizing: content-box !important;
				-webkit-user-select: none !important;
				user-select: none !important;
				-webkit-touch-callout: none !important;
				position: relative !important;
				overflow: visible !important;
			}

			/* Universal image styling within containers */
			.eloward-rank-badge img {
				display: block !important;
				width: 100% !important;
				height: 100% !important;
				object-fit: cover !important;
				transform-origin: center !important;
				position: absolute !important;
				top: 50% !important;
				left: 50% !important;
			}

		`;

		// Add rank-specific image positioning
		const rankTransforms = {
			iron: { scale: '1.3', translate: 'translate(-1.5px, 1px)', margin: { right: '0px', left: '0px' } },
			bronze: { scale: '1.2', translate: 'translate(-1.5px, 2px)', margin: { right: '0px', left: '0px' } },
			silver: { scale: '1.2', translate: 'translate(-1.5px, 2px)', margin: { right: '0px', left: '0px' } },
			gold: { scale: '1.22', translate: 'translate(-1.5px, 3px)', margin: { right: '0px', left: '0px' } },
			platinum: { scale: '1.22', translate: 'translate(-1.5px, 3.5px)', margin: { right: '0px', left: '1px' } },
			emerald: { scale: '1.23', translate: 'translate(-1.5px, 3.5px)', margin: { right: '0px', left: '0px' } },
			diamond: { scale: '1.23', translate: 'translate(-1.5px, 2.5px)', margin: { right: '2px', left: '2px' } },
			master: { scale: '1.2', translate: 'translate(-1.5px, 3.5px)', margin: { right: '1.5px', left: '1.5px' } },
			grandmaster: { scale: '1.1', translate: 'translate(-1.5px, 4px)', margin: { right: '1px', left: '1px' } },
			challenger: { scale: '1.22', translate: 'translate(-1.5px, 4px)', margin: { right: '2.5px', left: '2.5px' } },
			unranked: { scale: '1.0', translate: 'translate(-1.5px, 4px)', margin: { right: '-1.5px', left: '-1.5px' } }
		};

		for (const tier of this.rankTiers) {
			const transform = rankTransforms[tier];
			if (transform) {
				// Image transforms
				css += `
					.eloward-rank-badge img[alt="${tier.toUpperCase()}"] {
						transform: translate(-50%, -50%) scale(${transform.scale}) ${transform.translate} !important;
					}
				`;

				// Badge margins
				css += `
					.eloward-rank-badge:has(img[alt="${tier.toUpperCase()}"]) {
						margin-right: ${transform.margin.right} !important;
						margin-left: ${transform.margin.left} !important;
					}
				`;

			}
		}

		
		// Theme-based filters (matching chrome extension)
		css += `
			.tw-root--theme-dark .eloward-rank-badge {
				filter: brightness(0.95) !important;
			}

			.tw-root--theme-light .eloward-rank-badge {
				filter: brightness(1.05) contrast(1.1) !important;
			}
		`;

		// Responsive design for small screens
		css += `
			@media (max-width: 400px) {
				.eloward-rank-badge {
					width: 20px !important;
					height: 20px !important;
					margin: 0 2px 0 0 !important;
				}
			}
		`;
		
		// Ensure chat containers can accommodate absolute positioning
		css += `
			.chat-line, .chat-line__message {
				position: relative !important;
			}
			
			.chat-author {
				position: relative !important;
			}

			/* Additional polish for badge positioning */
			.chat-line .eloward-rank-badge {
				vertical-align: text-bottom !important;
			}

			.chat-author .eloward-rank-badge {
				vertical-align: middle !important;
			}
		`;
		
		// Add comprehensive tooltip styling
		css += `
			/* Tooltips */
			.eloward-tooltip {
				position: absolute !important;
				z-index: 99999 !important;
				pointer-events: none !important;
				transform: translate(-50%, -100%) !important;
				font-family: Roobert, "Helvetica Neue", Helvetica, Arial, sans-serif !important;
				padding: 8px !important;
				border-radius: 8px !important;
				opacity: 0 !important;
				visibility: hidden !important;
				text-align: center !important;
				border: none !important;
				box-shadow: 0 4px 12px rgba(0, 0, 0, 0.4) !important;
				margin-top: -8px !important;
				display: flex !important;
				flex-direction: column !important;
				align-items: center !important;
				gap: 6px !important;
				background-color: #0e0e10 !important;
				color: #efeff1 !important;
			}

			.eloward-tooltip.visible {
				opacity: 1 !important;
				visibility: visible !important;
			}

			.eloward-tooltip-badge {
				width: 90px !important;
				height: 90px !important;
				object-fit: contain !important;
				display: block !important;
			}

			.eloward-tooltip-text {
				font-size: 13px !important;
				font-weight: 600 !important;
				line-height: 1.2 !important;
				white-space: nowrap !important;
			}

			.eloward-tooltip::after {
				content: "" !important;
				position: absolute !important;
				bottom: -4px !important;
				left: 50% !important;
				margin-left: -4px !important;
				border-width: 4px 4px 0 4px !important;
				border-style: solid !important;
				border-color: #0e0e10 transparent transparent transparent !important;
			}

			/* Dark theme tooltip adjustments */
			html.tw-root--theme-dark .eloward-tooltip,
			.tw-root--theme-dark .eloward-tooltip,
			body[data-a-theme="dark"] .eloward-tooltip,
			body.dark-theme .eloward-tooltip {
				background-color: white !important;
				color: #0e0e10 !important;
				box-shadow: 0 2px 5px rgba(0, 0, 0, 0.3) !important;
			}

			html.tw-root--theme-dark .eloward-tooltip::after,
			.tw-root--theme-dark .eloward-tooltip::after,
			body[data-a-theme="dark"] .eloward-tooltip::after,
			body.dark-theme .eloward-tooltip::after {
				border-color: white transparent transparent transparent !important;
			}

			/* Light theme tooltip adjustments */
			html.tw-root--theme-light .eloward-tooltip,
			.tw-root--theme-light .eloward-tooltip,
			body[data-a-theme="light"] .eloward-tooltip,
			body:not(.dark-theme):not([data-a-theme="dark"]) .eloward-tooltip {
				background-color: #0e0e10 !important;
				color: #efeff1 !important;
				box-shadow: 0 2px 5px rgba(0, 0, 0, 0.4) !important;
			}

			html.tw-root--theme-light .eloward-tooltip::after,
			.tw-root--theme-light .eloward-tooltip::after,
			body[data-a-theme="light"] .eloward-tooltip::after,
			body:not(.dark-theme):not([data-a-theme="dark"]) .eloward-tooltip::after {
				border-color: #0e0e10 transparent transparent transparent !important;
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
		
		const hasLoLCategory = await this.detectAndSetCategoryForRoom(roomLogin);
		const isActive = await this.checkChannelActive(roomLogin);
		
		if (isActive && hasLoLCategory) {
			this.activeChannels.add(roomLogin);
			
			if (!this.initializationFinalized) {
				this.initializationFinalized = true;
				this.finalizeInitialization();
			} else {
				this.resetForNewChannel();
			}
			
			this.processExistingChatUsers(room, roomLogin);
		} else if (!hasLoLCategory) {
		} else if (!isActive) {
		}
	}

	resetForNewChannel() {
		this.processedMessages.clear();
		this.hideTooltip();
		
		if (this.badgeStyleElement) {
			this.badgeStyleElement.textContent = this.generateRankSpecificCSS();
		}
		
		this.setupMessageObserver();
		
	}

	onRoomRemove(room) {
		const roomId = room.id;
		const roomLogin = this.activeRooms.get(roomId);
		
		this.activeRooms.delete(roomId);
		if (roomLogin) {
			this.activeChannels.delete(roomLogin);
			this.lolCategoryRooms.delete(roomLogin);
			
			if (this.activeChannels.size === 0) {
				this.processedMessages.clear();
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
		const chatUsers = this.getChatUsers(room);
		
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
		if (!this.settings.get('eloward.enabled')) {
			return tokens;
		}

		// All badge processing is now handled through DOM manipulation in message observers
		// This tokenizer is kept for compatibility but doesn't need to process badges anymore
		return tokens;
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
		}
		// For direct DOM badges, update lines for consistency
		this.emit('chat:update-lines');
	}

	clearUserData() {
		// Remove direct DOM badges
		document.querySelectorAll('.eloward-rank-badge').forEach(badge => {
			badge.remove();
		});
		
		this.hideTooltip();
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

		// Badges are added directly through DOM manipulation in addBadge
		// This method is kept for compatibility with the existing badge system
		this.userBadges.set(userId, { username, tier, rankData });
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
			return isActive;
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
			// Silent fail
		}
	}

	onDisable() {
		if (this.badgeStyleElement) {
			this.badgeStyleElement.remove();
			this.badgeStyleElement = null;
		}

		if (this.messageObserver) {
			this.messageObserver.disconnect();
			this.messageObserver = null;
		}

		if (this.tooltipElement) {
			this.tooltipElement.remove();
			this.tooltipElement = null;
		}

		this.hideTooltip();

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
				
				return isLoL;
			} else {
				return false;
			}
		} catch (error) {
			return false;
		}
	}


	showTooltip(event, rankData) {
		this.hideTooltip();
		
		if (!rankData?.tier) return;
		
		if (!this.tooltipElement) {
			this.tooltipElement = document.createElement('div');
			this.tooltipElement.className = 'eloward-tooltip';
			document.body.appendChild(this.tooltipElement);
		}
		
		const badge = event.currentTarget;
		const rankTier = badge.dataset.rank || 'UNRANKED';
		const division = badge.dataset.division || '';
		let lp = badge.dataset.lp || '';
		
		if (lp && !isNaN(Number(lp))) {
			lp = Number(lp).toString();
		}
		
		this.tooltipElement.innerHTML = '';
		
		const tooltipBadge = document.createElement('img');
		tooltipBadge.className = 'eloward-tooltip-badge';
		
		const originalImg = badge.querySelector('img');
		if (originalImg && originalImg.src) {
			tooltipBadge.src = originalImg.src;
			tooltipBadge.alt = 'Rank Badge';
		}
		
		this.tooltipElement.appendChild(tooltipBadge);
		
		const tooltipText = document.createElement('div');
		tooltipText.className = 'eloward-tooltip-text';
		
		if (!rankTier || rankTier.toUpperCase() === 'UNRANKED') {
			tooltipText.textContent = 'Unranked';
		} else {
			let formattedTier = rankTier.toLowerCase();
			formattedTier = formattedTier.charAt(0).toUpperCase() + formattedTier.slice(1);
			
			let rankText = formattedTier;
			
			if (division && !['MASTER', 'GRANDMASTER', 'CHALLENGER'].includes(rankTier.toUpperCase())) {
				rankText += ' ' + division;
			}
			
			if (lp !== undefined && lp !== null && lp !== '') {
				rankText += ' - ' + lp + ' LP';
			}
			
			tooltipText.textContent = rankText;
		}
		
		this.tooltipElement.appendChild(tooltipText);
		
		const rect = badge.getBoundingClientRect();
		const badgeCenter = rect.left + (rect.width / 2);
		
		this.tooltipElement.style.left = `${badgeCenter}px`;
		this.tooltipElement.style.top = `${rect.top - 5}px`;
		this.tooltipElement.classList.add('visible');
	}

	hideTooltip() {
		if (this.tooltipElement && this.tooltipElement.classList.contains('visible')) {
			this.tooltipElement.classList.remove('visible');
		}
	}
}

EloWardFFZAddon.register();