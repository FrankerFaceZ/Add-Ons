const {get, deep_copy} = FrankerFaceZ.utilities.object;

import { LiveColumnBase } from '../../column-base';
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
		const tags = this.settings?.tags;
		if ( tags?.length === 1 ) {
			const tag = getLoader().getTagImmediate(tags[0], () => this.vue.refreshFromInst());
			if ( tag )
				return ['addon.deck.live-tag', '{name} Streams', {name: tag.label}];
		}

		return ['addon.deck.live-channels', 'Live Channels']
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
				i18n: 'addon.deck.live-channels',

				desc_i18n: 'addon.deck.live-channels.tip',
				desc: 'This column shows all live channels on Twitch. It\'s useful for filtering by certain tags.'
			}
		}
	]
};