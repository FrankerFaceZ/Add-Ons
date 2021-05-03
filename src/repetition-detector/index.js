'use strict'
const createElement = FrankerFaceZ.utilities.dom.createElement;

class RepetitionDetector extends Addon {

	cache = new Map();

	cacheEvictionTimer = null;

	constructor(...args) {
		super(...args);
		this.inject('chat');
		this.injectAs('site_fine', 'site.fine');
		this.injectAs('site_chat', 'site.chat');


		const tryAppendCounter = ctx => {
			requestAnimationFrame(() => {
				if(ctx.props.message.repetitionCount && !ctx.props.message.repetitionShown) {
					const repetitionCount = ctx.props.message.repetitionCount;
					ctx.props.message.repetitionShown = true;
					if(repetitionCount >= this.settings.get('addon.repetition_detector.repetitions_threshold')) {
						let msgElement = this.site_fine.getChildNode(ctx);
						if(!msgElement) return;
						//Sometimes messages are rendered with a message container, we have to append our div inside of that to have it on the same line
						const childContainer = msgElement.querySelector('.chat-line__message-container');
						if(childContainer) msgElement = childContainer;
						const textColor = this.settings.get('addon.repetition_detector.text_color');
						const counterElement = createElement('span', {'style': `color: ${textColor}; margin-left: 10px`}, `x${repetitionCount}`);
						msgElement.appendChild(counterElement);
					}
				}
			});
		}

		//sometimes appending the element on mount seems to not work properly
		this.site_chat.chat_line.ChatLine.on('mount', ctx => tryAppendCounter(ctx));
		this.site_chat.chat_line.ChatLine.on('update', ctx => tryAppendCounter(ctx));


		this.settings.add('addon.repetition_detector.similarity_threshold', {
			default: 80,
			ui: {
				path: 'Add-Ons > Chat Repetition Detector >> General Settings',
				title: 'Similarity threshold in %',
				description: 'Minimum similarity between 2 messages to count them as repetitions',
				component: 'setting-text-box',
				process: 'to_int',
				bounds: [0, 100]
			}
		});

		this.settings.add('addon.repetition_detector.repetitions_threshold', {
			default: 2,
			ui: {
				path: 'Add-Ons > Chat Repetition Detector >> General Settings',
				title: 'Repetition threshold',
				description: 'Amount of repetitions before the message is marked',
				component: 'setting-text-box',
				process: 'to_int',
				bounds: [0]
			}
		});

		this.settings.add('addon.repetition_detector.ignore_mods', {
			default: true,
			ui: {
				path: 'Add-Ons > Chat Repetition Detector >> General Settings',
				title: 'Ignore mods',
				description: 'Do not check messages by mods or the broadcaster',
				component: 'setting-check-box'
			}
		});

		this.settings.add('addon.repetition_detector.cache_ttl', {
			default: 600,
			ui: {
				path: 'Add-Ons > Chat Repetition Detector >> Cache Settings',
				title: 'Cache TTL',
				description: 'Amount of seconds for messages to stay in the cache. A long TTL leads to high RAM usage, especially in bigger channels',
				component: 'setting-text-box',
				process: 'to_int',
				bounds: [1]
			},
			//Cache eviction will happen 10x per TTL, at least once every 10s, max once per second
			changed: () => this.startCacheEvictionTimer(Math.min(Math.floor(this.settings.get('addon.repetition_detector.cache_ttl')/10), 10))
		});

		this.settings.add('addon.repetition_detector.text_color', {
			default: '#FF0000',
			ui: {
				path: 'Add-Ons > Chat Repetition Detector >> Style',
				title: 'Text Color',
				description: 'Text color used to display repetitions in chat',
				component: 'setting-color-box'
			}
		});

		this.settings.addUI('addon.repetition_detector.pad-bottom', {
			path: 'Add-Ons > Chat Repetition Detector',
			sort: 1000,
			component: 'setting-spacer',
			top: '30rem',
			force_seen: true
		});

		const checkRepetitionAndCache = (username, message) => {
			const cacheTtl = this.settings.get('addon.repetition_detector.cache_ttl') * 60000;
			const simThreshold = this.settings.get('addon.repetition_detector.similarity_threshold');
			if(this.cache.has(username)) {
				this.cache.get(username).expire = Date.now() + cacheTtl;
				let n = 1;
				const messagesInCache = this.cache.get(username).messages;
				for(let i = 0; i < messagesInCache.length; i++) {
					if(compareTwoStrings(message, messagesInCache[i].msg) > simThreshold / 100) {
						n++;
					}
				}
				this.cache.get(username).messages.push({msg: message, expire: Date.now() + cacheTtl});
				return n;
			} else {
				this.cache.set(username, {
					messages:[
						{
							msg: message, expire: Date.now() + cacheTtl
						}
					],
					expire: Date.now() + cacheTtl
				});
				return 0;
			}
		}

		this.chat.on('chat:receive-message', event => {
			const msg = event.message;
			if(!msg.message || msg.message === '') return;
			if(this.settings.get('addon.repetition_detector.ignore_mods') &&
					(msg.badges.moderator || msg.badges.broadcaster)) return;
			msg.repetitionCount = checkRepetitionAndCache(msg.user.id, msg.message);
		})
	}

	onEnable() {
		this.log.info('Enabled!');
		//Cache eviction will happen 10x per TTL, at least once every 10s, max once per second
		this.startCacheEvictionTimer(Math.min(Math.floor(this.settings.get('addon.repetition_detector.cache_ttl')/10), 10));
	}

	startCacheEvictionTimer(intervalSeconds) {
		if(this.cacheEvictionTimer) {
			clearInterval(this.cacheEvictionTimer);
		}
		this.cacheEvictionTimer = setInterval(() => {
			this.log.debug('Running cache eviction cycle');
			for(const [username, val] of this.cache) {
				if(val.expire < Date.now()) {
					this.cache.delete(username);
				} else {
					val.messages = val.messages.filter(msg => msg.expire > Date.now());
					if(val.messages.length === 0) {
						this.cache.delete(username);
					}
				}
			}
		}, intervalSeconds * 1000);
	}

	onDisable() {
		if(this.cacheEvictionTimer) {
			clearInterval(this.cacheEvictionTimer);
		}
		this.cache.clear();
	}


}
RepetitionDetector.register();

/**
 * Calculates the degree of similarity of 2 strings based on Dices Coefficient
 * @param {string} first  First string for comparison
 * @param {string} second Second string for comparison
 * @returns {number} Degree of similarity in the range [0,1]
 * @see Original source code {@link https://github.com/aceakash/string-similarity}, MIT License
 */
function compareTwoStrings(first, second) {
	first = first.replace(/\s+/g, '')
	second = second.replace(/\s+/g, '')

	if (!first.length && !second.length) return 1;
	if (!first.length || !second.length) return 0;
	if (first === second) return 1;
	if (first.length === 1 && second.length === 1)
		return first === second ? 1 : 0;
	if (first.length < 2 || second.length < 2) return 0;

	const firstBigrams = new Map();
	for (let i = 0; i < first.length - 1; i++) {
		const bigram = first.substring(i, i + 2);
		const count = firstBigrams.has(bigram) ? firstBigrams.get(bigram) + 1 : 1;

		firstBigrams.set(bigram, count);
	}

	let intersectionSize = 0;
	for (let i = 0; i < second.length - 1; i++) {
		const bigram = second.substring(i, i + 2);
		const count = firstBigrams.has(bigram) ? firstBigrams.get(bigram) : 0;

		if (count > 0) {
			firstBigrams.set(bigram, count - 1);
			intersectionSize++;
		}
	}

	return (2.0 * intersectionSize) / (first.length + second.length - 2);
}
