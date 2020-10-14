import * as Constants from './constants.js'
import * as ModtoolsTokenizer from './ModtoolsHighlights.jsx'

class ModTools extends Addon {
	constructor(...args) {
		super(...args);
		this.inject('chat.actions');
		this.inject('chat');

		// TODO: re-enable once I can override color, if possible.
		this.settings.add(Constants.HIGHLIGHT_COLOR_KEY, {
			ui: {
				path: 'Add-Ons > Mod Tools >> Highlights',
				title: 'Highlight Color',
				description: 'Set the color for your highlights',
				component: 'setting-color-box',
			},
		});
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

		this.chat.addTokenizer(ModtoolsTokenizer.ModtoolsHighlights);
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
				if(this.settings.provider.get(Constants.HIGHLIGHT_USERS_KEY, []).includes(msg.user.userID))
				{
					appearance.type = 'icon';
					appearance.icon = 'ffz-i-eye-off';
				}
				return appearance;
			},

			tooltip(data) {
				return this.i18n.t('modtools.actions.highlight.tooltip', `Highlight ${data.user.login}`);
			},

			click(event, data) {
				const val = this.settings.provider.get(Constants.HIGHLIGHT_USERS_KEY, [])
				const idx = val.indexOf(data.user.id);
				if ( idx === -1 )
					val.push(data.user.id);
				else
					val.splice(idx, 1);
				this.settings.provider.set(Constants.HIGHLIGHT_USERS_KEY, val)
				this.parent.emit('chat:update-lines')
			}
		})

		this.actions.addAction('multicommand', {
			presets: [{
				appearance: {
					type: 'text',
					text: 'MC'
				}
			}],

			required_context: ['room'],

			defaults: {
				command: '@{{user.login}} HeyGuys\n/timeout {{user.login}}',
			},

			title: 'Multicommand',
			description: '{options.command}',

			editor: () => import('./views/edit-action.vue'),

			tooltip(data) {
				return this.replaceVariables(data.options.command, data)
			},

			click(event, data) {
				const msg = this.replaceVariables(data.options.command, data).split('\n');
				msg.forEach(element => {
					var line = element.trim()
					if(line && line !== "")
						this.sendMessage(data.room.login, line);
				});
			}
		})
	}

	onDisable() {
	}

	async onUnload() {
	}
}

ModTools.register();
