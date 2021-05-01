'use strict'
const createElement = FrankerFaceZ.utilities.dom.createElement;

class RepetitionDetector extends Addon {

	cache = {};

	cacheEvictionTimer = null;

	constructor(...args) {
		super(...args);
		this.inject('chat');
		this.injectAs('site_fine', 'site.fine');
		this.injectAs('site_chat', 'site.chat');


		const tryAppendCounter = ctx => {
			setTimeout(() => {
				if(ctx.props.message.repetitionChecked && !ctx.props.message.repetitionShown) {
					const repetitionCount = ctx.props.message.repetitionCount;
					ctx.props.message.repetitionShown = true;
					if(repetitionCount >= this.settings.get('repetition_detector.repetitions_threshold')) {
						let msgElement = this.site_fine.getChildNode(ctx);
						if(!msgElement) return;
						//Sometimes messages are rendered with a message container, we have to append our div inside of that to have it on the same line
						const childContainer = msgElement.querySelector('.chat-line__message-container');
						if(childContainer) msgElement = childContainer;
						const textColor = this.settings.get('repetition_detector.text_color');
						const counterElement = createElement('span', {'style': `color: ${textColor}; margin-left: 10px`}, `x${repetitionCount}`);
						msgElement.appendChild(counterElement);
					}
				}
			});
		}

		//sometimes appending the element on mount seems to not work properly
		this.site_chat.chat_line.ChatLine.on('mount', ctx => tryAppendCounter(ctx));
		this.site_chat.chat_line.ChatLine.on('update', ctx => tryAppendCounter(ctx));


		this.settings.add('repetition_detector.similarity_threshold', {
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

		this.settings.add('repetition_detector.repetitions_threshold', {
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

		this.settings.add('repetition_detector.ignore_mods', {
			default: true,
			ui: {
				path: 'Add-Ons > Chat Repetition Detector >> General Settings',
				title: 'Ignore mods',
				description: 'Do not check messages by mods or the broadcaster',
				component: 'setting-check-box'
			}
		});

		this.settings.add('repetition_detector.cache_ttl', {
			default: 10,
			ui: {
				path: 'Add-Ons > Chat Repetition Detector >> Cache Settings',
				title: 'Cache TTL',
				description: 'Amount of minutes for messages to stay in the cache. A long TTL leads to high RAM usage, especially in bigger channels',
				component: 'setting-text-box',
				process: 'to_int',
				bounds: [0]
			}
		});

		this.settings.add('repetition_detector.text_color', {
			default: '#FF0000',
			ui: {
				path: 'Add-Ons > Chat Repetition Detector >> Style',
				title: 'Text Color',
				description: 'Text color used to display repetitions in chat',
				component: 'setting-color-box'
			}
		});

		const checkRepetitionAndCache = (username, message) => {
			const cacheTtl = this.settings.get('repetition_detector.cache_ttl') * 60000;
			if(this.cache[username]) {
				this.cache[username].expire = Date.now() + cacheTtl;
				let n = 1;
				this.cache[username].messages.forEach(msg => {
					if(compareTwoStrings(message, msg.msg) > this.settings.get('repetition_detector.similarity_threshold') / 100) {
						n++;
					}
				});
				this.cache[username].messages.push({msg: message, expire: Date.now() + cacheTtl});
				return n;
			} else {
				this.cache[username] = {
					messages:[
						{
							msg: message, expire: Date.now() + cacheTtl
						}
					],
					expire: Date.now() + cacheTtl
				};
				return 0;
			}
		}

		const RepetitionDetectorTokenizer = {
			type: 'repetition_detector',
			priority: -100,

			process(tokens, msg) {
				if(msg.repetitionChecked) return tokens;
				if(this.settings.get('repetition_detector.ignore_mods') &&
						(msg.badges.moderator || msg.badges.broadcaster)) return tokens;

				msg.repetitionChecked = true;
				msg.repetitionCount = checkRepetitionAndCache(msg.user.userLogin, msg.messageBody);
				return tokens;
			}
		}
		this.chat.addTokenizer(RepetitionDetectorTokenizer);
	}

	async onLoad() {
	}

	onEnable() {
		this.log.info('Enabled!');
		this.cacheEvictionTimer = setInterval(() => {
			this.log.debug('Running cache eviction cycle');
			Object.keys(this.cache).forEach(user => {
				if(this.cache[user].expire < Date.now()) {
					delete this.cache[user];
				} else {
					this.cache[user].messages = this.cache[user].messages.filter(msg => msg.expire > Date.now());
					if(this.cache[user].messages.length === 0) {
						delete this.cache[user];
					}
				}
			});
		}, 10000);
	}

	onDisable() {
		if(this.cacheEvictionTimer) {
			clearInterval(this.cacheEvictionTimer);
		}
		this.cache = {};
	}

	async onUnload() {
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