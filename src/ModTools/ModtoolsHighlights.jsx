import * as Constants from './constants.js'
export const ModtoolsHighlights = {
	type: 'modtools_highlight',
	priority: 90,

	process(tokens, msg, user) {
		if(this.settings.provider.get(Constants.HIGHLIGHT_USERS_KEY, []).includes(msg.user.userID))
		{
			(msg.highlights = (msg.highlights || new Set())).add('user');
			msg.mentioned = true;

			const color = this.settings.get(Constants.HIGHLIGHT_COLOR_KEY)
			if(color)
				msg.mention_color = color
		}
		return tokens;
	}
}