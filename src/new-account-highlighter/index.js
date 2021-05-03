class NewAccountHighlighter extends Addon {
	static Mappings = {'7d': 0};
	updateTimer = null;

	constructor(...args) {
		super(...args);

		this.inject('chat');

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
			},
			changed: () => this.emit('chat:update-lines')
		});

		this.settings.add('newusers.priority', {
			default: 0,
			ui: {
				path: 'Add-Ons > New User Highlighter >> Highlights',
				title: 'Highlight Priority',
				component: 'setting-text-box',
				type: 'number',
				process: 'to_int'
			},
			changed: () => this.emit('chat:update-lines')
		});

		this.settings.add('newusers.highlightcolor', {
			default: '#FFFFFF',
			ui: {
				path: 'Add-Ons > New User Highlighter >> Highlights',
				title: 'Highlight Color',
				description: 'Set the color for your highlights',
				component: 'setting-color-box'
			},
			changed: () => this.emit('chat:update-lines')
		});

		this.chat.addHighlightReason('user-age', 'Minimum Account Age');
		const t = this;

		const NewAccountHighlights = {
			type: 'newaccount_highlight',
			priority: 95,

			process(tokens, msg) {
				const minage = t.settings.get('newusers.minage');
				const minagemapping = NewAccountHighlighter.Mappings[minage];
				const minuid = minagemapping ? minagemapping.uid : Number.MAX_VALUE;
				if( msg.user.userID > minuid )
					this.applyHighlight(
						msg,
						t.settings.get('newusers.priority'),
						t.settings.get('newusers.highlightcolor'),
						'user-age'
					);

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
