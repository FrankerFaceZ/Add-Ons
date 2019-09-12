const {get, deep_copy} = FrankerFaceZ.utilities.object;

import { LiveColumnBase } from '../../column-base';
import { getLoader, cleanViewersCount } from '../../data';

export default class Team extends LiveColumnBase {

	getEditComponent() {
		return [
			'bd-edit-team'
		];
	}

	useIcon() {
		return false;
	}

	getTitle() {
		if ( ! this.settings.name )
			return ['addons.deck.unset', '(Unset)'];

		if ( this.cache && this.cache.displayName )
			return this.cache.displayName;

		return this.settings.name;
	}

	canRun() {
		return !! this.settings.name
	}

	reset() {
		super.reset();
		this.seen = null;
	}

	async load(first = 10, cursor = null) {
		const data = await getLoader().queryApollo({
			query: require('./team.gql'),
			variables: {
				name: this.settings.name,
				first,
				after: cursor
			},
			fetchPolicy: 'network-only'
		});

		this.updateCache({
			displayName: get('data.team.displayName', data),
			avatar: get('data.team.logoURL', data),
			cover: get('data.team.bannerURL', data)
		});

		const edges = get('data.team.liveMembers.edges', data),
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
			finished: ! get('data.team.liveMembers.pageInfo.hasNextPage', data)
		}
	}
}

Team.presets = {
	live: [
		{
			list: {
				icon: 'ffz-i-star',
				title: 'Team',
				i18n: 'addons.deck.team'
			}
		}
	]
};