class ModTools extends Addon {
	constructor(...args) {
		super(...args);
		this.inject('chat.actions');
		this.inject('chat');

		// TODO: re-enable once I can override color, if possible.
		/*
		this.settings.add('modtools.highlights.color', {
			ui: {
				path: 'Add-Ons > Mod Tools >> Highlights',
				title: 'Highlight Color',
				description: 'Set the color for your highlights',
				component: 'setting-color-box',
			},
		});
		*/
		this.settings.addUI('modtools.about', {
			ui: {
				path: 'Add-Ons > Mod Tools >> Current Features',
				title: 'Current features',
				component: () => import('./views/current-features.vue'),
			},
		});
		this.settings.addUI('modtools.highlights.clear', {
			ui: {
				path: 'Add-Ons > Mod Tools >> Highlights',
				title: 'Clear highlights',
				description: 'Clear all current highlights',
				component: () => import('./views/clear-button.vue'),
			},
		});
	}

	async onLoad() {
	}

	onEnable() {

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
			description: '',
			override_appearance(appearance, data, msg, current_room, current_user, mod_icons) {
				
				if(this.settings.provider.get('modtools.highlight-temp-users', []).includes(msg.user.userID))
				{
					(msg.highlights = (msg.highlights || new Set())).add('user');
					msg.mentioned = true;
					appearance.type = 'icon';
					appearance.icon = 'ffz-i-eye-off';

					// TODO: Should it be hex color? Also re-enable once I can override color, if possible.
					/*
					const color = this.settings.get('modtools.highlights.color')
					if(color)
						msg.mention_color = color
					*/
				}

				return appearance;
			},

			tooltip(data) {
				return this.i18n.t('modtools.actions.highlight.tooltip', `Highlight ${data.user.login}`);
			},

			click(event, data) {
				const val = this.settings.provider.get('modtools.highlight-temp-users', [])
				const idx = val.indexOf(data.user.id);
				if ( idx === -1 )
					val.push(data.user.id);
				else
					val.splice(idx, 1);
				this.settings.provider.set('modtools.highlight-temp-users', val)
				this.parent.emit('chat:update-lines')
			}
		})

		this.actions.addAction('botsuppression', {
			presets: [{
				appearance: {
					type: 'icon',
					icon: 'ffz-fa fa-shield'
				},
				display: {
					mod: true,
				}
			}],
			defaults: {},
			required_context: ['room'],
			title: 'Bot spam suppression',
			description: 'Clears chat and enables follower only mode (10 min)',


			tooltip(data) {
				return this.i18n.t('modtools.actions.botsuppression.tooltip', `Clears chat and enables follower only mode (10 min)`);
			},

			click(event, data) {
				this.sendMessage(data.room.login, '/clear');
				this.sendMessage(data.room.login, '/followers 10');
			}
		})
	}

	onDisable() {
	}

	async onUnload() {
	}
}

ModTools.register();
