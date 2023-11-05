const {get, deep_copy} = FrankerFaceZ.utilities.object;

import { VideoColumnBase } from '../../column-base';
import { checkCosmetics, cleanTags, getLoader } from '../../data';

export default class Category extends VideoColumnBase {

	getEditComponent() {
		return [
			'bd-edit-video',
			'bd-edit-category'
		];
	}

	getSortOptions() {
		return VideoColumnBase.SORT_OPTIONS;
	}

	getIcon() {
		return 'ffz-i-tag';
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

		return ['addon.deck.video-category', '{name} Videos', {name}];
	}

	canRun() {
		return super.canRun() && !! this.settings.name
	}

	reset() {
		super.reset();
		this.seen = null;
	}

	async load(first = 10, cursor = null) {
		const data = await getLoader().queryApollo({
			query: require('./category.gql'),
			variables: {
				name: this.settings.name,
				first,
				after: cursor,
				sort: this.settings.sort || 'VIEWS',
				types: this.types,
				languages: this.languages
			},
			fetchPolicy: 'network-only'
		});

		this.updateCache({
			displayName: get('data.game.displayName', data),
			avatar: get('data.game.avatarURL', data),
			cover: get('data.game.coverURL', data)
		});

		const edges = get('data.game.videos.edges', data),
			seen = this.seen = this.seen || new Set,
			items = [];

		cursor = null;

		if ( Array.isArray(edges) )
			for(const edge of edges) {
				cursor = edge.cursor;
				if ( edge.node && ! seen.has(edge.node.id) ) {
					seen.add(edge.node.id);
					// TODO: Clean tags?
					//this.memorizeTags(edge.node);
					const copy = deep_copy(edge.node);
					checkCosmetics(copy.owner);
					items.push(copy);
				}
			}

		return {
			items,
			cursor,
			finished: ! get('data.game.videos.pageInfo.hasNextPage', data)
		}
	}
}

Category.presets = {
	video: [
		{
			settings: {
				sort: 'VIEWS'
			},
			list: {
				icon: 'ffz-i-tag',
				title: 'Category',
				i18n: 'addon.deck.category',

				desc_i18n: 'addon.deck.category.video-tip',
				desc: 'This column shows videos in a specific category.'
			}
		}
	]
};