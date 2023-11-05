const {get, deep_copy, generateUUID} = FrankerFaceZ.utilities.object;

import { LiveColumnBase } from '../../column-base';
import { getLoader, cleanViewersCount, cleanTags, checkCosmetics } from '../../data';

export default class Recommended extends LiveColumnBase {

	getEditComponent() {
		return [
			'bd-edit-count'
		];
	}

	getIcon() {
		return 'ffz-i-thumbs-up'
	}

	getTitle() {
		return ['addon.deck.live-recommended', 'Recommended Streams']
	}

	reset() {
		super.reset();
		this.request_id = generateUUID();
	}

	async load() {
		const data = await getLoader().queryApollo({
			query: require('./recommended.gql'),
			variables: {
				first: this.settings.count || 10,
				id: this.request_id,
				language: this.languages && this.languages[0]?.toLowerCase?.() || '',
				location: 'FOLLOWING_PAGE'
			},
			fetchPolicy: 'network-only'
		});

		const edges = get('data.currentUser.recommendations.liveRecommendations.edges', data),
			items = [];

		if ( Array.isArray(edges) )
			for(const edge of edges) {
				if ( edge.node && edge.node.broadcaster ) {
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
			cursor: null,
			finished: true
		}
	}

}

Recommended.presets = {
	live: [
		{
			settings: {
				count: 10
			},
			list: {
				icon: 'ffz-i-thumbs-up',
				title: 'Recommended',
				i18n: 'addon.deck.recommended',

				desc_i18n: 'addon.deck.recommended.live-tip',
				desc: 'This column shows live channels that Twitch recommends for you, based on your viewing history.'
			}
		}
	]
};