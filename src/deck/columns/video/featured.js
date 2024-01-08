const {get, deep_copy} = FrankerFaceZ.utilities.object;

import { VideoColumnBase } from '../../column-base';
import { checkCosmetics, getLoader } from '../../data';

export default class Featured extends VideoColumnBase {

	getEditComponent() {
		return [
			'bd-edit-video',
			'bd-edit-count'
		];
	}

	getTitle() {
		return ['addon.deck.video-featured', 'Featured Videos']
	}

	async load(first = 10) {
		const data = await getLoader().queryApollo({
			query: require('./featured.gql'),
			variables: {
				first: this.settings.count || first,
				language: this.languages && this.languages[0] || ''
			},
			fetchPolicy: 'network-only'
		});

		const nodes = get('data.featuredVideos', data),
			items = [];

		if ( Array.isArray(nodes) )
			for(const node of nodes) {
				if ( node && node.video ) {
					const copy = deep_copy(node.video);
					copy.previewThumbnailURL = node.imageURL || copy.previewThumbnailURL;
					copy.title = node.title || copy.title;
					copy.priority = node.priorityLevel;
					// TODO: Clean tags
					//this.memorizeTags(copy);
					checkCosmetics(copy.owner);
					items.push(copy);
				}
			}

		items.sort((a, b) =>
			a.priority === b.priority ?
				b.viewCount - a.viewCount :
				a.priority - b.priority);

		return {
			items,
			cursor: null,
			finished: true
		}
	}
}

Featured.disabled_presets = {
	video: [
		{
			settings: {
				count: 10
			},
			list: {
				icon: 'ffz-i-twitch',
				title: 'Featured',
				i18n: 'addon.deck.featured',
			}
		}
	]
};