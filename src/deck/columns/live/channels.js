const {get, deep_copy} = FrankerFaceZ.utilities.object;

import { LiveColumnBase } from '../../column-base';
import { getLoader, cleanViewersCount, cleanTags, checkCosmetics } from '../../data';

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
		if ( tags?.[0] )
			return ['addon.deck.live-tag', '{name} Streams', {name: tags[0]}];

		return ['addon.deck.live-channels', 'Live Channels']
	}

	reset() {
		super.reset();
		this.seen = null;
	}

	async load(first = 10, cursor = null) {
		if (first < 1) first = 1;
		if (first > 30) first = 30;

		const data = await getLoader().queryApollo({
			query: require('./channels.gql'),
			variables: {
				first,
				after: cursor,
				options: {
					sort: this.settings.sort || 'VIEWER_COUNT',
					broadcasterLanguages: this.languages,
					freeformTags: this.required_tags
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
					checkCosmetics(node.broadcaster);

					node.broadcaster.stream = node;
					cleanTags(node);
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