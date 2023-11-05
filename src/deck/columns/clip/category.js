const {get, deep_copy} = FrankerFaceZ.utilities.object;

import ColumnBase, {ClipColumnBase} from '../../column-base';
import { checkCosmetics, getLoader } from '../../data';

export default class Category extends ClipColumnBase {
	getEditComponent() {
		return [
			'bd-edit-category',
			'bd-edit-clip'
		]
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

		return ['addon.deck.clip-category', '{name} Clips', {name}];
	}

	canRun() {
		return super.canRun() && !! this.settings.name
	}

	reset() {
		super.reset();
		this.seen = null;
	}

	async load(first = 10, cursor = null) {
		// There's a pagination issue for trending...
		if ( this.settings.sort === 'TRENDING' )
			first = 25;

		const data = await getLoader().queryApollo({
			query: require('./category.gql'),
			variables: {
				name: this.settings.name,
				first,
				after: cursor,
				criteria: {
					period: this.settings.period || 'LAST_WEEK',
					sort: this.settings.sort || 'VIEWS_DESC',
					languages: this.languages
				}
			},
			fetchPolicy: 'network-only'
		});

		this.updateCache({
			displayName: get('data.game.displayName', data),
			avatar: get('data.game.avatarURL', data),
			cover: get('data.game.coverURL', data)
		});

		const edges = get('data.game.clips.edges', data),
			seen = this.seen = this.seen || new Set,
			items = [];

		cursor = null;

		let had_items = false;
		if ( Array.isArray(edges) )
			for(const edge of edges) {
				had_items = true;
				cursor = edge.cursor;
				if ( edge.node && ! seen.has(edge.node.id) ) {
					seen.add(edge.node.id);
					const copy = deep_copy(edge.node);
					checkCosmetics(copy.broadcaster);
					items.push(copy);
				}
			}

		return {
			items,
			cursor,
			finished: !(had_items && get('data.game.clips.pageInfo.hasNextPage', data))
		}
	}
}

Category.presets = {
	clip: [
		{
			settings: {
				period: 'LAST_WEEK',
				sort: 'VIEWS_DESC'
			},
			list: {
				icon: 'ffz-i-tag',
				title: 'Category',
				i18n: 'addon.deck.category',

				desc_i18n: 'addon.deck.category.clip-tip',
				desc: 'This column shows clips from a specific category.'
			}
		}
	]
};