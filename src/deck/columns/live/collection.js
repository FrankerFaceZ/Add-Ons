const {get, deep_copy} = FrankerFaceZ.utilities.object;

import { LiveColumnBase } from '../../column-base';
import { getLoader, cleanViewersCount, cleanTags, checkCosmetics } from '../../data';

export default class Collection extends LiveColumnBase {

	getEditComponent() {
		return [
			'bd-edit-collection'
		];
	}

	showGameLine() {
		return true;
	}

	useIcon() {
		return true;
	}

	getTitle() {
		if ( ! this.settings.slug )
			return ['addon.deck.unset', '(Unset)'];

		let name = this.settings.slug;
		if ( this.cache && this.cache.displayName )
			name = this.cache.displayName;

		return ['addon.deck.live-category', '{name} Streams', {name}];
	}

	canRun() {
		return !! this.settings.slug
	}

	reset() {
		super.reset();
		this.seen = null;
	}

	async load(first = 10, cursor = null) {
		if ( first > 100 )
			first = 100;

		const data = await getLoader().queryApollo({
			query: require('./collection.gql'),
			variables: {
				slug: this.settings.slug,
				first,
				after: cursor,
				options: {
                    requestID: 'twilight-browsable-collections',
                    recommendationsContext: {
                        platform: 'web'
                    },
					broadcasterLanguages: this.languages
				}
			},
			fetchPolicy: 'network-only'
		});

		this.updateCache({
			displayName: get('data.collection.name.fallbackLocalizedTitle', data),
			description: get('data.collection.description.fallbackLocalizedTitle', data)
		});

		const edges = get('data.collection.streams.edges', data),
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
			finished: ! get('data.collection.streams.pageInfo.hasNextPage', data)
		}
	}
}

Collection.presets = {
	live: [
		{
			settings: {
				sort: 'VIEWER_COUNT'
			},
			list: {
				icon: 'ffz-i-tag',
				title: 'Collection',
				i18n: 'addon.deck.collection',

				desc_i18n: 'addon.deck.collection.live-tip',
				desc: 'This column shows live channels from a collection. For example, you can create a column showing all channels with an active Hype Train.'
			}
		}
	]
};