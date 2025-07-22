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
		this.chromeExtensionDetected = false;
		this.rankTiers = new Set(['iron', 'bronze', 'silver', 'gold', 'platinum', 'emerald', 'diamond', 'master', 'grandmaster', 'challenger', 'unranked']);
		this.userBadges = new Map();
		this.badgeStyleElement = null;
		this.chatMode = 'standard';
		this.sevenTVDetected = false;
		this.messageObserver = null;
		this.processedMessages = new Set();
		this.initializationFinalized = false;
		
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

		this.rankStyles7TV = {
			iron: { width: '28px', height: '28px', margin: '0px -7px 5px -3px'},
			bronze: { width: '26px', height: '26px', margin: '0px -7px 3px -3px'},	
			silver: { width: '24px', height: '24px', margin: '0px -7px 2px -3px'},
			gold: { width: '24px', height: '24px', margin: '0px -7px 0px -3px'},
			platinum: { width: '24px', height: '24px', margin: '2px -5px 0px -1px'},
			emerald: { width: '24px', height: '24px', margin: '2px -5px 0px -1px'},
			diamond: { width: '24px', height: '24px', margin: '0px -3px 0px 1px'},
			master: { width: '24px', height: '24px', margin: '2px -3px 0px 1px'},
			grandmaster: { width: '22px', height: '22px', margin: '3px -3px 0px 1px'},
			challenger: { width: '24px', height: '24px', margin: '2px -1px 0px 3px'},
			unranked: { width: '24px', height: '24px', margin: '1px -7px 0px -3px'}
		};

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
		const chromeExtDetectedBody = document.body?.getAttribute('data-eloward-chrome-ext') === 'active';
		const chromeExtDetectedHtml = document.documentElement?.getAttribute('data-eloward-chrome-ext') === 'active';
		
		if (chromeExtDetectedBody || chromeExtDetectedHtml) {
			this.chromeExtensionDetected = true;
			return;
		}

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

		this.initializeRankBadges();

		this.chat.addTokenizer({
			type: 'eloward-ranks',
			process: this.processMessage.bind(this)
		});
	}

	finalizeInitialization() {
		this.detectChatMode();

		if (this.badgeStyleElement) {
			this.badgeStyleElement.textContent = this.generateRankSpecificCSS();
		}

		this.setupMessageObserver();

		setTimeout(() => {
			this.performFallbackChatModeDetection();
		}, 2500);
	}

	performFallbackChatModeDetection() {
		const previousMode = this.chatMode;
		this.detectChatMode();
		
		if (previousMode !== this.chatMode && this.chatMode === 'seventv') {
			if (this.badgeStyleElement) {
				this.badgeStyleElement.textContent = this.generateRankSpecificCSS();
			}
			this.setupMessageObserver();
		}
	}

	performChannelSwitchFallbackDetection() {
		if (this.activeChannels.size === 0) {
			return;
		}
		
		const currentMode = this.chatMode;
		this.detectChatMode();
		
		if (currentMode !== this.chatMode) {
			if (this.badgeStyleElement) {
				this.badgeStyleElement.textContent = this.generateRankSpecificCSS();
			}
			
			this.setupMessageObserver();
			
			if (this.chatMode === 'seventv' && currentMode !== 'seventv') {
				this.processExistingMessages();
			}
		}
	}

	setupMessageObserver() {
		if (this.messageObserver) {
			this.messageObserver.disconnect();
			this.messageObserver = null;
		}

		this.processExistingMessages();

		if (this.chatMode === 'seventv' && this.sevenTVDetected) {
			this.setupSevenTVObserver();
		}
	}

	processExistingMessages() {
		const chatContainer = this.findChatContainer();
		if (!chatContainer) {
			return;
		}

		let messageSelectors;
		if (this.chatMode === 'seventv') {
			messageSelectors = ['.seventv-message', '.chat-line__message', '.chat-line'];
		} else {
			messageSelectors = ['.chat-line__message', '.chat-line', '[data-a-target="chat-line-message"]'];
		}

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
		const chatContainer = this.findChatContainer();
		if (!chatContainer) {
			return;
		}

		const messageSelectors = [
			'.seventv-message',
			'.chat-line__message',
			'.chat-line'
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
								this.processDirectMessage(node);
							} else {
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

	processDirectMessage(messageElement) {
		if (!messageElement) return;

		this.processedMessages.add(messageElement);

		const usernameElement = messageElement.querySelector('.seventv-chat-user-username');
		if (!usernameElement) {
			return;
		}

		const username = usernameElement.textContent?.trim();
		if (!username) {
			return;
		}

		const currentChannel = this.getCurrentChannelName();
		if (!currentChannel) {
			return;
		}

		const hasLoLCategory = this.lolCategoryRooms.has(currentChannel);
		const isActive = this.activeChannels.has(currentChannel);

		if (!hasLoLCategory || !isActive) {
			return;
		}

		if (messageElement.querySelector('.eloward-rank-badge')) {
			return;
		}

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

		this.processedMessages.add(messageElement);

		const usernameSelectors = [
			'[data-a-target="chat-message-username"]',
			'.chat-author__display-name',
			'.chat-line__username'
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

		const currentChannel = this.getCurrentChannelName();
		if (!currentChannel) {
			return;
		}

		const hasLoLCategory = this.lolCategoryRooms.has(currentChannel);
		const isActive = this.activeChannels.has(currentChannel);

		if (!hasLoLCategory || !isActive) {
			return;
		}

		if (messageElement.querySelector('.eloward-rank-badge') || 
			messageElement.querySelector('.ffz-badge[data-badge*="addon.eloward"]')) {
			return;
		}

		this.incrementMetric('db_read', currentChannel);

		const cachedRank = this.getCachedRank(username);
		if (cachedRank) {
			this.incrementMetric('successful_lookup', currentChannel);
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
		const userId = messageElement.getAttribute('data-user-id') || 
			messageElement.querySelector('[data-user-id]')?.getAttribute('data-user-id');

		if (userId) {
			this.addUserBadge(userId, username, rankData);
		} else {
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

	detectChatMode() {
		const has7TVElements = !!(
			document.querySelector('.seventv-message') ||
			document.querySelector('.seventv-chat-user') ||
			document.querySelector('[data-seventv]') ||
			document.querySelector('.seventv-paint') ||
			document.querySelector('.seventv-chat-user-username') ||
			document.querySelector('.seventv-chat-badge') ||
			document.querySelector('.seventv-emote') ||
			window.SevenTV ||
			document.querySelector('script[src*="seventv"]') ||
			document.querySelector('link[href*="seventv"]')
		);

		const hasFFZElements = !!(
			document.querySelector('.ffz-message-line') ||
			document.querySelector('.ffz-chat-line') ||
			document.querySelector('[data-ffz-component]')
		);

		const previousMode = this.chatMode;

		if (has7TVElements) {
			this.chatMode = 'seventv';
			this.sevenTVDetected = true;
		} else if (hasFFZElements) {
			this.chatMode = 'ffz';
		} else {
			if (previousMode === 'seventv' && this.sevenTVDetected) {
				// Keep existing mode
			} else {
				this.chatMode = 'standard';
			}
		}
	}

	generateRankSpecificCSS() {
		let css = '';
		
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

		if (this.sevenTVDetected) {
			css += this.getSevenTVStyles();
		}
		
		return css;
	}

	getSevenTVStyles() {
		let css = `
			.seventv-chat-badge.eloward-rank-badge.seventv-integration {
				display: inline-block;
				vertical-align: middle;
				position: relative;
				border-radius: 4px;
				overflow: hidden;
			}

			.seventv-badge-img, .eloward-badge-img {
				width: 100% !important;
				height: 100% !important;
				object-fit: contain;
			}

			.seventv-chat-user-badge-list {
				display: inline-flex;
				align-items: center;
				gap: 0px;
				margin-right: 0px;
			}

			@media (max-width: 400px) {
				.seventv-chat-badge.eloward-rank-badge.seventv-integration {
					width: 20px !important;
					height: 20px !important;
					margin: 0 2px 0 0 !important;
				}
			}

			.tw-root--theme-dark .seventv-chat-badge.eloward-rank-badge.seventv-integration {
				filter: brightness(0.95);
			}

			.tw-root--theme-light .seventv-chat-badge.eloward-rank-badge.seventv-integration {
				filter: brightness(1.05) contrast(1.1);
			}
		`;

		for (const tier of this.rankTiers) {
			const styles = this.rankStyles7TV[tier];
			if (styles) {
				css += `
					.seventv-chat-badge.eloward-rank-badge.seventv-integration[data-rank="${tier}"] {
						width: ${styles.width} !important;
						height: ${styles.height} !important;
						margin: ${styles.margin} !important;
					}
				`;
			}
		}

		css += `
			.seventv-chat-user .seventv-chat-user-badge-list + .seventv-chat-user-username {
				margin-left: 4px;
			}

			.eloward-7tv-tooltip {
				position: absolute;
				z-index: 99999;
				pointer-events: none;
				transform: translate(-50%, -100%);
				font-family: Roobert, "Helvetica Neue", Helvetica, Arial, sans-serif;
				padding: 8px;
				border-radius: 8px;
				text-align: center;
				border: none;
				box-shadow: 0 4px 12px rgba(0, 0, 0, 0.4);
				margin-top: -8px;
				display: flex;
				flex-direction: column;
				align-items: center;
				gap: 6px;
			}

			.eloward-7tv-tooltip-badge {
				width: 90px;
				height: 90px;
				object-fit: contain;
				display: block;
			}

			.eloward-7tv-tooltip-text {
				font-size: 13px;
				font-weight: 600;
				line-height: 1.2;
				white-space: nowrap;
			}

			.eloward-7tv-tooltip::after {
				content: "";
				position: absolute;
				bottom: -4px;
				left: 50%;
				margin-left: -4px;
				border-width: 4px 4px 0 4px;
				border-style: solid;
			}

			html.tw-root--theme-dark .eloward-7tv-tooltip,
			.tw-root--theme-dark .eloward-7tv-tooltip,
			body[data-a-theme="dark"] .eloward-7tv-tooltip,
			body.dark-theme .eloward-7tv-tooltip {
				color: #0e0e10;
				background-color: white;
				box-shadow: 0 2px 5px rgba(0, 0, 0, 0.3);
			}

			html.tw-root--theme-dark .eloward-7tv-tooltip::after,
			.tw-root--theme-dark .eloward-7tv-tooltip::after,
			body[data-a-theme="dark"] .eloward-7tv-tooltip::after,
			body.dark-theme .eloward-7tv-tooltip::after {
				border-color: white transparent transparent transparent;
			}

			html.tw-root--theme-light .eloward-7tv-tooltip,
			.tw-root--theme-light .eloward-7tv-tooltip,
			body[data-a-theme="light"] .eloward-7tv-tooltip,
			body:not(.dark-theme):not([data-a-theme="dark"]) .eloward-7tv-tooltip {
				color: #efeff1;
				background-color: #0e0e10;
				box-shadow: 0 2px 5px rgba(0, 0, 0, 0.4);
			}

			html.tw-root--theme-light .eloward-7tv-tooltip::after,
			.tw-root--theme-light .eloward-7tv-tooltip::after,
			body[data-a-theme="light"] .eloward-7tv-tooltip::after,
			body:not(.dark-theme):not([data-a-theme="dark"]) .eloward-7tv-tooltip::after {
				border-color: #0e0e10 transparent transparent transparent;
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
		
		await this.detectAndSetCategoryForRoom(roomLogin);
		const isActive = await this.checkChannelActive(roomLogin);
		
		if (isActive) {
			this.activeChannels.add(roomLogin);
			
			if (!this.initializationFinalized) {
				this.initializationFinalized = true;
				this.finalizeInitialization();
			} else {
				this.resetForNewChannel();
			}
			
			this.processExistingChatUsers(room, roomLogin);
		}
	}

	resetForNewChannel() {
		this.processedMessages.clear();
		this.hideSevenTVTooltip();
		this.detectChatMode();
		
		if (this.badgeStyleElement) {
			this.badgeStyleElement.textContent = this.generateRankSpecificCSS();
		}
		
		this.setupMessageObserver();
		
		setTimeout(() => {
			this.performChannelSwitchFallbackDetection();
		}, 1500);
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

		if (this.chatMode === 'seventv' && this.sevenTVDetected) {
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
		
		if (rankData.division && !['MASTER', 'GRANDMASTER', 'CHALLENGER'].includes(rankData.tier.toUpperCase())) {
			rankText += ` ${rankData.division}`;
		}
		
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
		
		if (this.sevenTVDetected) {
			document.querySelectorAll('.eloward-rank-badge.seventv-integration').forEach(badge => {
				badge.remove();
			});
		}
		
		this.hideSevenTVTooltip();
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

		if (this.chatMode === 'seventv' && this.sevenTVDetected) {
			this.addSevenTVBadgeToExistingMessages(userId, username, rankData);
			this.userBadges.set(userId, { username, tier, rankData });
			return;
		}

		const badgeId = this.getBadgeId(tier);
		const ffzUser = this.chat.getUser(userId);

		const existing = this.userBadges.get(userId);
		if (existing && existing.badgeId === badgeId) {
			return;
		}

		const formattedRankText = this.formatRankText(rankData);
		const badgeData = this.getBadgeData(tier);
		badgeData.title = formattedRankText;
		
		this.badges.loadBadgeData(badgeId, badgeData);

		if (existing && existing.badgeId !== badgeId) {
			this.removeUserBadges(userId);
		}

		ffzUser.addBadge('addon.eloward', badgeId);
		this.userBadges.set(userId, { username, tier, badgeId, rankData });
		this.emit('chat:update-lines-by-user', userId, username, false, true);
	}

	addSevenTVBadgeToExistingMessages(userId, username, rankData) {
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

		this.hideSevenTVTooltip();

		this.off('chat:room-add', this.onRoomAdd);
		this.off('chat:room-remove', this.onRoomRemove);
		this.off('site.context:changed', this.onContextChanged);

		this.chat.removeTokenizer('eloward-ranks');

		this.clearUserData();
		this.cache.clear();
		this.activeChannels.clear();
		this.activeRooms.clear();
		this.lolCategoryRooms.clear();
		
		this.chatMode = 'standard';
		this.sevenTVDetected = false;
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

	addSevenTVBadge(messageContainer, usernameElement, rankData) {
		if (!rankData?.tier || !this.sevenTVDetected) {
			return;
		}

		let badgeList = messageContainer.querySelector('.seventv-chat-user-badge-list');
		
		if (!badgeList) {
			const chatUser = messageContainer.querySelector('.seventv-chat-user');
			if (!chatUser) {
				return;
			}
			
			badgeList = document.createElement('span');
			badgeList.className = 'seventv-chat-user-badge-list';
			
			const username = chatUser.querySelector('.seventv-chat-user-username');
			if (username) {
				chatUser.insertBefore(badgeList, username);
			} else {
				chatUser.insertBefore(badgeList, chatUser.firstChild);
			}
		}

		if (badgeList.querySelector('.eloward-rank-badge')) {
			return;
		}
		
		const badge = document.createElement('div');
		badge.className = 'seventv-chat-badge eloward-rank-badge seventv-integration';
		badge.dataset.rankText = this.formatRankText(rankData);
		
		const img = document.createElement('img');
		img.alt = rankData.tier;
		img.className = 'eloward-badge-img seventv-badge-img';
		img.src = `https://eloward-cdn.unleashai.workers.dev/lol/${rankData.tier.toLowerCase()}.png`;
		
		badge.appendChild(img);
		
		badge.dataset.rank = rankData.tier.toLowerCase();
		badge.dataset.division = rankData.division || '';
		badge.dataset.lp = rankData.leaguePoints !== undefined && rankData.leaguePoints !== null ? 
			rankData.leaguePoints.toString() : '';
		badge.dataset.username = rankData.summonerName || '';
		
		badge.addEventListener('mouseenter', (e) => this.showSevenTVTooltip(e, rankData));
		badge.addEventListener('mouseleave', () => this.hideSevenTVTooltip());
		
		badgeList.appendChild(badge);
	}

	showSevenTVTooltip(event, rankData) {
		this.hideSevenTVTooltip();
		
		if (!rankData?.tier) return;
		
		const tooltip = document.createElement('div');
		tooltip.className = 'eloward-7tv-tooltip';
		tooltip.id = 'eloward-7tv-tooltip-active';
		
		const tooltipBadge = document.createElement('img');
		tooltipBadge.className = 'eloward-7tv-tooltip-badge';
		tooltipBadge.src = `https://eloward-cdn.unleashai.workers.dev/lol/${rankData.tier.toLowerCase()}.png`;
		tooltipBadge.alt = 'Rank Badge';
		
		const tooltipText = document.createElement('div');
		tooltipText.className = 'eloward-7tv-tooltip-text';
		tooltipText.textContent = this.formatRankText(rankData);
		
		tooltip.appendChild(tooltipBadge);
		tooltip.appendChild(tooltipText);
		
		const rect = event.target.getBoundingClientRect();
		const badgeCenter = rect.left + (rect.width / 2);
		
		tooltip.style.left = `${badgeCenter}px`;
		tooltip.style.top = `${rect.top - 5}px`;
		
		document.body.appendChild(tooltip);
	}

	hideSevenTVTooltip() {
		const existingTooltip = document.getElementById('eloward-7tv-tooltip-active');
		if (existingTooltip && existingTooltip.parentNode) {
			existingTooltip.remove();
		}
	}
}

EloWardFFZAddon.register();