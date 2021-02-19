const {get, deep_copy} = FrankerFaceZ.utilities.object;

import { LiveColumnBase } from '../../column-base';
import { getLoader, cleanViewersCount } from '../../data';

export default class Followed extends LiveColumnBase {

	getIcon() {
		return 'ffz-i-heart';
	}

	getTitle() {
		return ['addon.deck.live-followed', 'Followed Streams']
	}

	reset() {
		super.reset();

		this.seen = null;
	}

	async load(first = 10, cursor = null) {
		const data = await getLoader().queryApollo({
			query: require('./followed.gql'),
			variables: {
				first,
				after: cursor,
				sort: this.settings.sort || 'VIEWER_COUNT'
			},
			fetchPolicy: 'network-only'
		});

		const edges = get('data.currentUser.followedLiveUsers.edges', data),
			seen = this.seen = this.seen || new Set,
			items = [];

		cursor = null;

		if ( Array.isArray(edges) )
			for(const edge of edges) {
				cursor = edge.cursor;
				if ( edge.node && ! seen.has(edge.node.id) ) {
					seen.add(edge.node.id);
					const copy = deep_copy(edge.node);
					cleanViewersCount(copy.stream, edge.node.stream);
					this.memorizeTags(copy);
					items.push(copy);
				}
			}

		return {
			items,
			cursor,
			finished: ! get('data.currentUser.followedLiveUsers.pageInfo.hasNextPage', data)
		}
	}
}

Followed.presets = {
	live: [
		{
			list: {
				icon: 'ffz-i-heart',
				title: 'Followed',
				i18n: 'addon.deck.followed',

				desc_i18n: 'addon.deck.followed.live-tip',
				desc: 'This column shows live channels that you\'re following.'
			}
		}
	]
};