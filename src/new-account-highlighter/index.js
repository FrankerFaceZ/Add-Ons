class NewAccountHighlighter extends Addon {
	static Mappings = {};
	updateTimer = null;

	constructor(...args) {
		super(...args);
		this.inject('chat.actions');
		this.inject('chat');

		const NewAccountHighlights = {
			type: 'newaccount_highlight',
			priority: 95,
		
			process(tokens, msg, user) {
				let minage = this.settings.get('newusers.minage');
				let minuid = NewAccountHighlighter.Mappings[minage].uid;
				if(msg.user.userID > minuid)
				{
					(msg.highlights = (msg.highlights || new Set())).add('user');
					msg.mentioned = true;
		
					const color = this.settings.get('newusers.highlightcolor') || '#FFFFFF';
					if(color)
						msg.mention_color = color
				}
				return tokens;
			}
		}
		this.chat.addTokenizer(NewAccountHighlights);
	}

	async refreshMappings() {
		let url = 'https://ffz.0x.software/api/mappings.json';

		return fetch(url).then((res) => {
			return res.json()
		}).then((out) => {
			NewAccountHighlighter.Mappings = out;
		}).catch(err => { throw err });
	}

	async onLoad() {
		return this.refreshMappings();
	}

	onEnable() {
		this.updateTimer = setInterval(() => {
			this.refreshMappings();
		}, (1000*60*25)+Math.floor(Math.random() * Math.floor(1000*60*10)));

		var dataArray = [];
		for (const key in NewAccountHighlighter.Mappings) {
			dataArray.push({
				value: key,
				title: key
			});
		}
		this.settings.add('newusers.minage', {
			//default: "0",
			ui: {
				path: 'Add-Ons > New User Highlighter >> Highlights',
				title: 'Minimum account age',
				description: 'Users whose account is younger than the specified time will be highlighted in chat.',
				component: 'setting-select-box',
				data: dataArray,
			},
		});

		this.settings.add("newusers.highlightcolor", {
			ui: {
				path: 'Add-Ons > New User Highlighter >> Highlights',
				title: 'Highlight Color',
				description: 'Set the color for your highlights',
				component: 'setting-color-box',
			},
		});
		
	}

	onDisable() {
		clearInterval(this.updateTimer);
	}

	async onUnload() {
	}
}

NewAccountHighlighter.register();
