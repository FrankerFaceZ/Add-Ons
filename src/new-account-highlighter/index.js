class NewAccountHighlighter extends Addon {
	static Mappings = {'7d': 0};
	updateTimer = null;

	constructor(...args) {
		super(...args);
		this.inject('chat');

		this.chat.addHighlightReason('user-age', 'Minimum Account Age');

		this.settings.add('newusers.minage', {
			default: '7d',
			ui: {
				path: 'Add-Ons > New User Highlighter >> Highlights',
				title: 'Minimum account age',
				description: 'Users whose account is younger than the specified time will be highlighted in chat.',
				component: 'setting-select-box',
				data: () => {
					const arr = Object.keys(NewAccountHighlighter.Mappings).map(age => ({value: age, title: age}));
					arr.push({value: null, title: 'Disabled'});
					return arr;
				}
			}
		});

		this.settings.add('newusers.priority', {
			default: 0,
			ui: {
				path: 'Add-Ons > New User Highlighter >> Highlights',
				title: 'Highlight Priority',
				component: 'setting-text-box',
				type: 'number',
				process: 'to_int'
			}
		});

		this.settings.add('newusers.highlightcolor', {
			default: '#FFFFFF',
			ui: {
				path: 'Add-Ons > New User Highlighter >> Highlights',
				title: 'Highlight Color',
				description: 'Set the color for your highlights',
				component: 'setting-color-box'
			}
		});

		const NewAccountHighlights = {
			type: 'newaccount_highlight',
			priority: 95,

			process(tokens, msg) {
				const minage = this.settings.get('newusers.minage');
				const minagemapping = NewAccountHighlighter.Mappings[minage];
				const minuid = minagemapping ? minagemapping.uid : Number.MAX_VALUE;
				if(msg.user.userID > minuid)
				{
					(msg.highlights = (msg.highlights || new Set())).add('user-age');
					msg.mentioned = true;
					const color = this.settings.get('newusers.highlightcolor'),
						priority = this.settings.get('newusers.priority');

					if ( msg.color_priority == null || priority > msg.color_priority ) {
						msg.color_priority = priority;
						msg.mention_color = color;
					}
				}
				return tokens;
			}
		}
		this.chat.addTokenizer(NewAccountHighlights);
	}

	async refreshMappings() {
		const url = 'https://ffz.0x.bot/api/mappings.json';

		const out = await fetch(url).then(resp => resp.ok ? resp.json() : null);
		if ( out )
			NewAccountHighlighter.Mappings = out;
	}

	onLoad() {
		return this.refreshMappings();
	}

	onEnable() {
		this.updateTimer = setInterval(() => {
			this.refreshMappings();
		}, (1000*60*25)+Math.floor(Math.random() * Math.floor(1000*60*10)));
	}

	onDisable() {
		clearInterval(this.updateTimer);
	}

	async onUnload() {
	}
}

NewAccountHighlighter.register();
