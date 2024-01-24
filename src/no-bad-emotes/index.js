const { has, addWordSeparators, glob_to_regex, escape_regex } = FrankerFaceZ.utilities.object; 


const COMMON_WORDS = require('./common.json');

const TERM_FLAGS = ['g', 'gi'];

function formatTerms(data) {
	const out = [];

	for(let i=0; i < data.length; i++) {
		const list = data[i];
		if ( list[0].length )
			list[1].push(`^(?:${list[0].join('|')})$`);

		out.push(list[1].length ? new RegExp(list[1].join('|'), TERM_FLAGS[i] || 'gi') : null);
	}

	return out;
}

class NoBadEmotes extends Addon {

	constructor(name, parent) {
		super(name, parent);

		this._use_common = null;

		this.inject('chat.emotes');

		this.doesEmoteMatch = this.doesEmoteMatch.bind(this);

		// Settings
		this.settings.add('addon.nobademotes.no-filter-personal', {
			default: false,
			ui: {
				path: 'Add-Ons > No Bad Emotes >> General @{"sort": -99}',
				title: 'Do not filter emotes out of personal emote sets.',
				component: 'setting-check-box'
			},
			changed: () => this.emotes.updateFiltered()
		});

		this.settings.add('addon.nobademotes.no-filter-global', {
			default: false,
			ui: {
				path: 'Add-Ons > No Bad Emotes >> General @{"sort": -99}',
				title: 'Do not filter emotes out of global emote sets.',
				component: 'setting-check-box'
			},
			changed: () => this.emotes.updateFiltered()
		});

		this.settings.add('addon.nobademotes.use-all-lower', {
			default: false,
			ui: {
				path: 'Add-Ons > No Bad Emotes >> Basic',
				title: 'Filter out emotes with names that are all lowercase letters.',
				component: 'setting-check-box'
			},
			changed: () => this.emotes.updateFiltered()
		});

		this.settings.add('addon.nobademotes.ban-short', {
			default: false,
			ui: {
				path: 'Add-Ons > No Bad Emotes >> Basic',
				title: 'Filter out emotes with names shorter than 3 characters.',
				component: 'setting-check-box'
			},
			changed: () => this.emotes.updateFiltered()
		});

		this.settings.add('addon.nobademotes.custom-names', {
			default: [],
			type: 'array_merge',
			always_inherit: true,
			ui: {
				path: 'Add-Ons > No Bad Emotes >> Custom Words @{"description": "Flexible filters for removing emotes based on their name. Please see [Chat > Filtering > Syntax Help](~) for details on how to use this."}',
				component: 'basic-terms'
			}
		});

		this.settings.add('__filter:addon.nobademotes.custom-names', {
			requires: ['addon.nobademotes.custom-names'],
			equals: 'requirements',
			process(ctx) {
				const val = ctx.get('addon.nobademotes.custom-names');
				if ( ! val || ! val.length )
					return null;

				const data = [
					[ // sensitive
						[], [] // word
					],
					[ // intensitive
						[], []
					]
				];

				let had_non = false;

				for(const item of val) {
					const t = item.t,
						sensitive = item.s,
						word = has(item, 'w') ? item.w : t !== 'raw';
					let v = item.v;

					if ( t === 'glob' )
						v = glob_to_regex(v);

					else if ( t !== 'regex' && t !== 'raw' )
						v = escape_regex(v);

					if ( ! v || ! v.length )
						continue;

					had_non = true;

					data[sensitive ? 0 : 1][word ? 0 : 1].push(v);
				}

				if ( ! had_non )
					return null;

				return had_non ? formatTerms(data) : null
			},
			changed: () => this.emotes.updateFiltered()
		});

		this.settings.add('addon.nobademotes.use-common', {
			default: true,
			ui: {
				path: 'Add-Ons > No Bad Emotes >> Common Words',
				title: 'Filter out emotes with names matching a list of common English words.',
				component: 'setting-check-box'
			},
			changed: val => this.onUseCommon(val)
		});

		this.settings.add('addon.nobademotes.capitalization-mode', {
			default: 0,
			ui: {
				path: 'Add-Ons > No Bad Emotes >> Common Words',
				title: 'Capitalization Mode',
				sort: 99,
				description: 'By default, we only filter common words if the emote name is all lower-case. You can optionally include emotes with the first letter capitalized.',
				component: 'setting-select-box',
				data: [
					{value: 0, title: 'Lowercase Only'},
					{value: 1, title: 'Lowercase or Initial Capital'}
				]
			},
			changed: () => {
				if ( this._use_common && this.common_words?.length )
					this.emotes.updateFiltered()
			}
		});

	}

	onEnable() {
		// Call this before adding our filter so we only process once.
		this.onUseCommon(this.settings.get('addon.nobademotes.use-common'));

		this.emotes.addFilter({
			type: 'nobademotes',
			test: this.doesEmoteMatch
		});
	}

	onDisable() {
		this.emotes.removeFilter('nobademotes');
	}

	// Common Words

	onUseCommon(val) {
		// No change? No problem :D
		if ( this._use_common === val )
			return;

		// Check if we have set this before. We don't update filters the first
		// time around.
		const was_set = this._use_common == null;

		// And update the value.
		this._use_common = val;

		// If we're just disabling, or if we've already loaded, then we don't
		// need to worry about loading.
		if ( ! val || this.common_words ) {
			// But we might need to update the filters.
			if ( was_set )
				this.emotes.updateFiltered();
			return;
		}

		this.loadCommonWords();
	}

	async loadCommonWords() {
		if ( this._loading_common || this.common_words?.length )
			return;

		this._loading_common = true;

		let data;
		try {
			data = await fetch(COMMON_WORDS).then(resp => resp.ok ? resp.json() : null);
		} catch(err) {
			this.log.warn('Unable to load common words list.', err);
			this._loading_common = false;
			return;
		}

		if ( ! Array.isArray(data?.words) ) {
			this._loading_common = false;
			this.common_words = [];
			return;
		}

		this._loading_common = false;
		this.common_words = data.words;
		this.log.info(`Loaded ${data.words.length} common words.`);

		if ( this._use_common )
			this.emotes.updateFiltered();
	}


	// Filtering

	doesEmoteMatch(emote, set) {
		if ( set ) {
			if ( this.settings.get('addon.nobademotes.no-filter-global') && this.emotes.default_sets.includes(set.id) )
				return false;

			if ( set.personal && this.settings.get('addon.nobademotes.no-filter-personal') )
				return false;
		}

		const no_short = this.settings.get('addon.nobademotes.ban-short');
		if ( no_short && emote.name.length < 3 )
			return true;

		const lname = emote.name.toLowerCase();

		const no_lower = this.settings.get('addon.nobademotes.use-all-lower');
		if ( no_lower && lname === emote.name )
			return true;

		if ( this.doesCommonNameMatch(emote, lname) )
			return true;

		if ( this.doesCustomMatch(emote) )
			return true;
	}

	doesCommonNameMatch(emote, lname) {
		if ( ! this._use_common || ! this.common_words )
			return false;

		const cap_mode = this.settings.get('addon.nobademotes.capitalization-mode');
		if ( cap_mode === 0 && lname !== emote.name )
			return false;

		if ( cap_mode === 1 && emote.name.slice(1) !== lname.slice(1) )
			return false;

		return this.common_words.includes(lname);
	}

	doesCustomMatch(emote) {
		const filters = this.settings.get('__filter:addon.nobademotes.custom-names');
		if ( ! filters )
			return false;

		for(let i = 0; i < filters.length; i++) {
			if ( filters[i] ) {
				filters[i].lastIndex = -1;
				if ( filters[i].test(emote.name) )
					return true;
			}
		}
	}

}

NoBadEmotes.register();
