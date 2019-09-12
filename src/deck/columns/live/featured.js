const {get, deep_copy} = FrankerFaceZ.utilities.object;

import { LiveColumnBase } from '../../column-base';
import { cleanViewersCount, getLoader } from '../../data';

export default class Featured extends LiveColumnBase {

	getEditComponent() {
		return [
			'bd-edit-count'
		];
	}

	getIcon() {
		return 'ffz-i-twitch';
	}

	getTitle() {
		return ['addons.deck.live-featured', 'Featured Streams']
	}

	async load(first = 10) {
		const data = await getLoader().queryApollo({
			query: require('./featured.gql'),
			variables: {
				first: this.settings.count || first,
				language: this.languages && this.languages[0] || '',
			},
			fetchPolicy: 'network-only'
		});

		const edges = get('data.featuredStreams', data),
			items = [];

		if ( Array.isArray(edges) )
			for(const edge of edges) {
				if ( edge.broadcaster && edge.stream ) {
					const copy = deep_copy(edge.broadcaster);
					copy.stream = deep_copy(edge.stream);
					copy.priority = edge.priorityLevel || 0;
					cleanViewersCount(copy.stream, edge.stream);
					this.memorizeTags(copy);
					items.push(copy);
				}
			}

		items.sort((a, b) =>
			a.priority === b.priority ?
				b.stream.viewersCount - a.stream.viewersCount :
				a.priority - b.priority);

		return {
			items,
			cursor: null,
			finished: true
		}
	}

}

Featured.presets = {
	live: [
		{
			settings: {
				count: 10
			},
			list: {
				icon: 'ffz-i-twitch',
				title: 'Featured',
				i18n: 'addons.deck.featured'
			}
		}
	]
};