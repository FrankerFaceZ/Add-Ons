class HighlightAction extends Addon {
	constructor(...args) {
		super(...args);
		this.inject('chat.actions');
		this.inject('chat');

		// TODO: re-enable once I can override color, if possible.
		/*
		this.settings.add('hlactions.color', {
			ui: {
				path: 'Add-Ons > Highlight Action >> Highlights',
				title: 'Highlight Color',
				description: 'Set the color for your highlights',
				component: 'setting-color-box',
			},
		});
		*/
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
					(msg.highlights = (msg.highlights || new Set())).add('user2');
					msg.mentioned = true;
					appearance.type = 'icon';
					appearance.icon = 'ffz-i-eye-off';

					// TODO: Should it be hex color? Also re-enable once I can override color, if possible.
					/*
					const color = this.settings.get('hlactions.color')
					if(color)
						msg.mention_color = color
					*/
				}

				return appearance;
			},

			tooltip(data) {
				return this.i18n.t('chat.actions.highlight.tooltip', `Highlight ${data.user.login}`);
			},

			click(event, data) {
				const val = this.settings.provider.get(settingsKey, [])
				const idx = val.indexOf(data.user.id);
				if ( idx === -1 )
					val.push(data.user.id);
				else
					val.splice(idx, 1);
				this.settings.provider.set(settingsKey, val)
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
