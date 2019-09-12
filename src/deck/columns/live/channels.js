const {get, deep_copy} = FrankerFaceZ.utilities.object;

import ColumnBase, { LiveColumnBase } from '../../column-base';
import { getLoader, cleanViewersCount } from '../../data';

export default class Channels extends LiveColumnBase {

	getEditComponent() {
		return null;
	}

	getSortOptions() {
		return LiveColumnBase.SORT_OPTIONS;
	}

	getIcon() {
		return 'ffz-i-channels';
	}

	getTitle() {
		return ['addons.deck.live-channels', 'Live Channels']
	}

	reset() {
		super.reset();
		this.seen = null;
	}

	async load(first = 10, cursor = null) {
		const data = await getLoader().queryApollo({
			query: require('./channels.gql'),
			variables: {
				first,
				after: cursor,
				options: {
					sort: this.settings.sort || 'VIEWER_COUNT',
					tags: this.required_tags
				}
			},
			fetchPolicy: 'network-only'
		});

		const edges = get('data.streams.edges', data),
			seen = this.seen = this.seen || new Set,
			items = [];

		cursor = null;

		if ( Array.isArray(edges) )
			for(const edge of edges) {
				cursor = edge.cursor;
				if ( edge.node && edge.node.broadcaster && ! seen.has(edge.node.id) ) {
					seen.add(edge.node.id);
					const node = deep_copy(edge.node);
					cleanViewersCount(node, edge.node);

					node.broadcaster.stream = node;
					this.memorizeTags(node.broadcaster);
					items.push(node.broadcaster);
					node.broadcaster = undefined;
				}
			}

		return {
			items,
			cursor,
			finished: ! get('data.streams.pageInfo.hasNextPage', data)
		}
	}
}

Channels.presets = {
	live: [
		{
			settings: {
				sort: 'VIEWER_COUNT'
			},
			list: {
				icon: 'ffz-i-channels',
				title: 'Live Channels',
				i18n: 'addons.deck.live-channels'
			}
		}
	]
};