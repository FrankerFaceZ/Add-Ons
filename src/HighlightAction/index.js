class HighlightAction extends Addon {
	constructor(...args) {
		super(...args);
		this.inject('chat.actions');
		this.inject('chat');

		this.settings.add('hlactions.color', {
			ui: {
				path: 'Add-Ons > Highlight Action >> Highlights',
				title: 'Highlight Color',
				description: 'Set the color for your highlights',
				component: 'setting-color-box',
			},
		});
		this.settings.addUI('hlactions.clear', {
			ui: {
				path: 'Add-Ons > Highlight Action >> Highlights',
				title: 'Clear highlights',
				description: 'Clear all current highlights',
				component: () => import('./views/clear-button.vue'),
			},
		});
	}

	async onLoad() {
	}

	onEnable() {
		const settingsKey = 'hlaction.highlight-temp'

		this.actions.addAction('highlight', {
			presets: [{
				appearance: {
					type: 'icon',
					icon: 'ffz-i-eye'
				},
			}],
			defaults: {},
			required_context: ['user'],

			title: 'Highlight User',
			override_appearance(appearance, data, msg, current_room, current_user, mod_icons) {
				
				if(this.settings.provider.get(settingsKey)?.includes?.(msg.user.userID))
				{
					(msg.highlights = (msg.highlights || new Set())).add('user');
					msg.mentioned = true;

					const color = this.settings.get('hlactions.color')
					console.log(color)
					if(color)
						msg.mention_color = 'rgba(0, 0, 255, 1.0)'
				}
				
				if (msg.mentioned) {
					appearance.type = 'icon';
					appearance.icon = 'ffz-i-eye-off';
				}

				return appearance;
			},

			tooltip(data) {
				return this.i18n.t('chat.actions.highlight.tooltip', `Highlight ${data.user.login}`);
			},

			click(event, data) {
				console.log('click')
				const val = this.settings.provider.get(settingsKey, [])
				const idx = val.indexOf(data.user.id);
				if ( idx === -1 )
					val.push(data.user.id);
				else
					val.splice(idx, 1);
				this.settings.provider.set(settingsKey, val)
				console.log(this)
				console.log(data)
				this.parent.emit('chat:update-lines')
			}
		})
	}

	onDisable() {
	}

	async onUnload() {
	}
}

HighlightAction.register();
