const {get, deep_copy} = FrankerFaceZ.utilities.object;

import { LiveColumnBase } from '../../column-base';
import { checkCosmetics, cleanTags, getLoader } from '../../data';

export default class Users extends LiveColumnBase {

	getEditComponent() {
		return [
			'bd-edit-channels'
		]
	}

	getSortOptions() {
		return null;
	}

	getIcon() {
		return 'ffz-i-user';
	}

	getTitle() {
		return ['addon.deck.specific-users', 'Specific Users']
	}

	getSubtitles() {
		const out = super.getSubtitles(),
			users = this.getUserSubtitle();

		if ( ! users )
			return out;
		else if ( ! out )
			return [users];

		out.push(users);
		return out;
	}

	getUserSubtitle() {
		const count = this.settings.ids?.length || 0;
		if ( ! count )
			return null;

		return {
			icon: 'ffz-i-user',
			i18n: 'addon.deck.sub.users',
			text: '{count, plural, one {# User} other {# Users}}',
			count
		}
	}

	canRun() {
		return super.canRun() && this.settings.ids?.length > 0
	}

	allowFilterCategories() {
		return true;
	}

	reset() {
		super.reset();
		this.remaining = null;
	}

	async load(first = 10) {
		if ( first > 100 )
			first = 100;

		if ( this.remaining == null )
			this.remaining = Array.from(this.settings.ids);

		const ids = this.remaining.splice(0, first);
		if ( ! ids.length )
			return {
				items: [],
				cursor: null,
				finished: true
			};

		const data = await getLoader().queryApollo({
			query: require('./users.gql'),
			variables: {
				ids
			},
			fetchPolicy: 'network-only'
		});

		const nodes = get('data.users', data),
			items = [];

		if ( Array.isArray(nodes) )
			for(const node of nodes) {
				// We only want live streaming users.
				if ( ! node.stream )
					continue;

				const copy = deep_copy(node);
				cleanTags(copy.stream);
				checkCosmetics(copy);
				items.push(copy);
			}

		return {
			items,
			finished: ! this.remaining.length
		}
	}
}

Users.presets = {
	live: [
		{
			settings: {
				ids: []
			},
			list: {
				icon: 'ffz-i-user',
				title: 'Specific Users',
				i18n: 'addon.deck.specific-users',

				desc_i18n: 'addon.deck.specific-users.tip',
				desc: 'This column shows all live channels from a custom, set list.'
			}
		}
	]
};