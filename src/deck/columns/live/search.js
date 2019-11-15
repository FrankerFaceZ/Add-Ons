const {get, deep_copy} = FrankerFaceZ.utilities.object;

import { LiveColumnBase } from '../../column-base';
import { getLoader, cleanViewersCount } from '../../data';

export default class Search extends LiveColumnBase {

	getEditComponent() {
		return [
			'bd-edit-search'
		];
	}

	getIcon() {
		return 'ffz-i-search';
	}

	getTitle() {
		if ( ! this.settings.query )
			return ['addon.deck.unset', '(Unset)'];

		return this.settings.query;
	}

	canRun() {
		return !! this.settings.query
	}

	reset() {
		super.reset();
		this.seen = null;
	}

	async load(first = 10, cursor = null) {
		const data = await getLoader().queryApollo({
			query: require('./search.gql'),
			variables: {
				query: this.settings.query,
				first,
				after: cursor
			},
			fetchPolicy: 'network-only'
		});

		const nodes = get('data.searchFor.liveChannels.items', data),
			seen = this.seen = this.seen || new Set,
			items = [];

		if ( Array.isArray(nodes) )
			for(const node of nodes) {
				if ( node && ! seen.has(node.id) ) {
					seen.add(node.id);
					const copy = deep_copy(node);
					cleanViewersCount(copy.stream, node.stream);
					this.memorizeTags(copy);
					items.push(copy);
				}
			}

		return {
			items,
			cursor: get('data.searchFor.liveChannels.cursor', data),
			finished: ! get('data.searchFor.liveChannels.pageInfo.hasNextPage', data)
		}
	}
}

Search.presets = {
	live: [
		{
			list: {
				icon: 'ffz-i-search',
				title: 'Search',
				i18n: 'addon.deck.search'
			}
		}
	]
};