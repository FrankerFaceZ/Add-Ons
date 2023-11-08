const {generateUUID} = FrankerFaceZ.utilities.object;

import ColumnBase, { LiveColumnBase, ClipColumnBase, VideoColumnBase } from '../../column-base';
import { getLoader } from '../../data';

export default class Shelves extends ColumnBase {

	static getColumnComponent() {
		return 'bd-discover-column'
	}

	getComponent(item) {
		if ( item.stream )
			return 'bd-live-card';

		else if ( item.curator )
			return 'bd-clip-card';

		return 'bd-video-card';
	}

	getIcon() {
		return 'ffz-i-twitch'
	}

	getTitle() {
		return ['addon.deck.shelves', 'Discover (Front Page)']
	}

	reset() {
		super.reset();
		this.request_id = generateUUID();
	}

	filterItems(items) {
		const out = [];
		if ( ! Array.isArray(items) )
			return out;

		const no_recordings = this.settings.no_recordings,
			hide_reruns = this.global_settings.hide_reruns,
			blocked_games = this.global_settings.blocked_games,
			required_tags = this.required_tags;

		for(const item of items) {
			if ( item.stream ) {
				if ( ! LiveColumnBase.filterStream(item, hide_reruns, blocked_games, required_tags) )
					continue;

			} else if ( item.curator ) {
				if ( ! ClipColumnBase.filterClip(item, blocked_games) )
					continue;

			} else {
				if ( ! VideoColumnBase.filterVideo(item, no_recordings, null, blocked_games, required_tags) )
					continue;
			}

			out.push(item);
		}

		return out;
	}

	async load(first = 10) {
		// eslint-disable-next-line no-unused-vars
		const data = await getLoader().queryApollo({
			query: require('./shelves.gql'),
			variables: {
				requestID: this.request_id,
				platform: 'web',
				itemsPerRow: first
			}
		});

		return {
			items: [],
			finished: true
		}
	}

}

/*Shelves.presets = {
	other: [
		{
			list: {
				icon: 'ffz-i-twitch',
				title: 'Discover (Front Page)',
				i18n: 'addon.deck.shelves'
			}
		}
	]
}*/
