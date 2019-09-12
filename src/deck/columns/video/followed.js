const {get, deep_copy} = FrankerFaceZ.utilities.object;

import { VideoColumnBase } from '../../column-base';
import { getLoader } from '../../data';

export default class Followed extends VideoColumnBase {

	getEditComponent() {
		return [
			'bd-edit-video'
		];
	}

	getSortOptions() {
		return VideoColumnBase.SORT_OPTIONS;
	}

	getIcon() {
		return 'ffz-i-heart';
	}

	getTitle() {
		return ['addons.deck.video-followed', 'Followed Videos'];
	}

	reset() {
		super.reset();
		this.seen = null;
	}

	async load(first = 10, cursor = null) {
		const data = await getLoader().queryApollo({
			query: require('./followed.gql'),
			variables: {
				first,
				after: cursor,
				sort: this.settings.sort || 'VIEWS',
				types: this.types,
				languages: this.languages
			},
			fetchPolicy: 'network-only'
		});

		const edges = get('data.currentUser.followedVideos.edges', data),
			seen = this.seen = this.seen || new Set,
			items = [];

		cursor = null;

		if ( Array.isArray(edges) )
			for(const edge of edges) {
				cursor = edge.cursor;
				if ( edge.node && ! seen.has(edge.node.id) ) {
					seen.add(edge.node.id);
					this.memorizeTags(edge.node);
					items.push(deep_copy(edge.node));
				}
			}

		return {
			items,
			cursor,
			finished: ! get('data.currentUser.followedVideos.pageInfo.hasNextPage', data)
		}
	}
}

Followed.presets = {
	video: [
		{
			settings: {
				sort: 'VIEWS'
			},
			display: {
				icon: 'ffz-i-heart',
				title: 'Followed Videos',
				i18n: 'addons.deck.video-followed'
			},
			list: {
				icon: 'ffz-i-heart',
				title: 'Followed',
				i18n: 'addons.deck.followed'
			}
		}
	]
};