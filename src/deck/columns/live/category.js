const {get, deep_copy} = FrankerFaceZ.utilities.object;

import { LiveColumnBase } from '../../column-base';
import { getLoader, cleanViewersCount, cleanTags, checkCosmetics } from '../../data';

export default class Category extends LiveColumnBase {

	getEditComponent() {
		return [
			'bd-edit-category'
		];
	}

	getSortOptions() {
		return LiveColumnBase.SORT_OPTIONS;
	}

	showGameLine() {
		return false;
	}

	useIcon() {
		return false;
	}

	getTitle() {
		if ( ! this.settings.name )
			return ['addon.deck.unset', '(Unset)'];

		let name = this.settings.name;
		if ( this.cache && this.cache.displayName )
			name = this.cache.displayName;

		return ['addon.deck.live-category', '{name} Streams', {name}];
	}

	canRun() {
		return !! this.settings.name
	}

	reset() {
		super.reset();
		this.seen = null;
	}

	async load(first = 10, cursor = null) {
		if ( first > 100 )
			first = 100;

		const data = await getLoader().queryApollo({
			query: require('./category.gql'),
			variables: {
				name: this.settings.name,
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

		this.updateCache({
			displayName: get('data.game.displayName', data),
			avatar: get('data.game.avatarURL', data),
			cover: get('data.game.coverURL', data)
		});

		const edges = get('data.game.streams.edges', data),
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
			finished: ! get('data.game.streams.pageInfo.hasNextPage', data)
		}
	}
}

Category.presets = {
	live: [
		{
			settings: {
				sort: 'VIEWER_COUNT'
			},
			list: {
				icon: 'ffz-i-tag',
				title: 'Category',
				i18n: 'addon.deck.category',

				desc_i18n: 'addon.deck.category.live-tip',
				desc: 'This column shows live channels streaming a specific category. For example, you can create an example showing all channels playing Super Mario 64.'
			}
		}
	]
};