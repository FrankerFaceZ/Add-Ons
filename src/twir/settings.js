export const SETTING_KEYS = {
	commandDescription: 'addon.twir.command_description',
	userBadges: 'addon.twir.user_badges',
};

// https://twitch.tv/twirapp
export const TWIR_APP_ID = 870280719;

export class Settings extends FrankerFaceZ.utilities.module.Module {
	constructor(...args) {
		super(...args);

		this.inject('settings');

		this.settings.add(SETTING_KEYS.commandDescription, {
			default: true,
			ui: {
				path: 'Add-Ons > Twir >> Commands',
				title: 'Description',
				description: 'Show command description or responses.',
				component: 'setting-check-box',
			}
		});

		this.settings.add(SETTING_KEYS.userBadges, {
			default: true,
			ui: {
				path: 'Add-Ons > Twir >> User Cosmetics',
				title: 'Badges',
				description: 'Show user badges.\n\n(Per-badge visibilty can be set in [Chat >> Badges > Visibilty > Add-Ons](~chat.badges.tabs.visibility))',
				component: 'setting-check-box',
			}
		});

		this.settings.getChanges(SETTING_KEYS.userBadges, enabled => {
			this.parent.twir_badges.toggleBadges(enabled);
		});
	}
}
