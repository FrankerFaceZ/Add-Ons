const {get, deep_copy} = FrankerFaceZ.utilities.object;

import { LiveColumnBase } from '../../column-base';
import { checkCosmetics, cleanTags, cleanViewersCount, getLoader } from '../../data';

export default class Hosted extends LiveColumnBase {

	getShelfComponent() {
		return 'bd-host-shelf-card';
	}

	getComponent() {
		return 'bd-host-card'
	}

	getIcon() {
		return 'ffz-i-plus';
	}

	getTitle() {
		return ['addon.deck.live-hosted', 'Hosted Streams']
	}

	reset() {
		super.reset();
		this.count = 25;
		this.channels = null;
		this.seen = null;
	}

	allowFilterCategories() {
		return true;
	}

	async load() {
		const data = await getLoader().queryApollo({
			query: require('./hosted.gql'),
			variables: {
				first: this.count
			},
			fetchPolicy: 'network-only'
		});

		const nodes = get('data.currentUser.followedHosts.nodes', data),
			group_hosts = this.global_settings.group_hosts,
			seen = this.seen = this.seen || new Set,
			channels = this.channels = this.channels || {},
			items = [];

		if( Array.isArray(nodes) )
			for(const node of nodes) {
				if ( node && node.hosting && ! seen.has(node.id) ) {
					seen.add(node.id);
					let channel = channels[node.hosting.id];
					if ( ! channel ) {
						channel = deep_copy(node.hosting);
						channel.hosts = [];
						cleanViewersCount(channel.stream, node.hosting.stream);
						checkCosmetics(channel);
						if ( group_hosts )
							channels[channel.id] = channel;
						else
							channel.real_id = node.id;

						cleanTags(channel.stream);
						items.push(channel);
					}

					channel.hosts.push({
						id: node.id,
						login: node.login,
						displayName: node.displayName,
						profileImageURL: node.profileImageURL
					});
				}
			}

		const total = get('data.currentUser.follows.totalCount', data) || 0;
		let finished = nodes.length < this.count;
		if ( ! finished ) {
			const new_count = Math.min(50, total, this.count * 2);
			finished = new_count === this.count;
			this.count = new_count;
		}

		return {
			items,
			cursor: null,
			finished
		};
	}
}

Hosted.presets = {
	/*live: [
		{
			list: {
				icon: 'ffz-i-plus',
				title: 'Hosted',
				i18n: 'addon.deck.hosted',

				desc_i18n: 'addon.deck.hosted.live-tip',
				desc: 'This column shows live channels being hosted by channels you follow.'
			}
		}
	]*/
};