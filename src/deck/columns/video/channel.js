const {get, deep_copy} = FrankerFaceZ.utilities.object;

import ColumnBase, { VideoColumnBase, LiveColumnBase } from '../../column-base';
import { getLoader, cleanViewersCount, cleanTags, checkCosmetics } from '../../data';

export default class Channel extends VideoColumnBase {
	getComponent(item) {
		if ( item.text )
			return 'bd-heading-card';

		if ( item.stream )
			return 'bd-live-card';

		return 'bd-video-card';
	}

	getEditComponent() {
		return [
			'bd-edit-channel',
			'bd-edit-video-channel',
			'bd-edit-video'
		];
	}

	getSortOptions() {
		return VideoColumnBase.SORT_OPTIONS;
	}

	getIconicType() {
		return ColumnBase.ICONIC_TYPES.BOXART;
	}

	showUserLine() {
		return false;
	}

	useIcon() {
		return false;
	}

	getTitle() {
		if ( ! this.settings.id )
			return ['addon.deck.unset', '(Unset)'];

		if ( this.cache && this.cache.displayName )
			return ['addon.deck.user-videos', '{user} Videos', {
				user: this.cache.displayName
			}];

		return ['addon.deck.user', 'User #{id}', this.settings];
	}

	canRun() {
		return super.canRun() && !! this.settings.id
	}

	allowFilterCategories() {
		return true;
	}

	reset() {
		super.reset();
		this.seen = null;
	}

	filterItems(items) {
		const out = [];
		if ( ! Array.isArray(items) )
			return out;

		const no_recordings = this.settings.no_recordings,
			no_live = this.settings.no_live,
			hide_reruns = this.global_settings.hide_reruns,
			blocked_games = this.global_settings.blocked_games;

		let was_stream = null;

		for(const item of items) {
			let is_stream;

			if ( item.stream ) {
				if ( no_live || ! LiveColumnBase.filterStream(item, hide_reruns, blocked_games, this.required_tags) )
					continue;

				is_stream = true;

			} else {
				if ( ! VideoColumnBase.filterVideo(item, no_recordings, this.types, blocked_games, this.required_tags) )
					continue;

				is_stream = false;
			}

			if ( is_stream !== was_stream ) {
				was_stream = is_stream;
				if ( is_stream )
					out.push({
						i18n: 'addon.deck.card.stream',
						text: 'Live Stream',
						color: 'tw-c-text-alt',
						size: 5,
						upcase: true
					});
				else
					out.push({
						i18n: 'addon.deck.card.video',
						text: 'Videos',
						color: 'tw-c-text-alt',
						size: 5,
						upcase: true
					});
			}

			out.push(item);
		}

		return out;
	}

	async load(first = 10, cursor = null) {
		const data = await getLoader().queryApollo({
			query: require('./channel.gql'),
			variables: {
				id: this.settings.id,
				first,
				after: cursor,
				sort: this.settings.sort || 'VIEWS',
				types: this.types
			},
			fetchPolicy: 'network-only'
		});

		const owner = {
			id: get('data.user.id', data),
			login: get('data.user.login', data),
			displayName: get('data.user.displayName', data),
			profileImageURL: get('data.user.profileImageURL', data),
			bannerImageURL: get('data.user.bannerImageURL', data)
		};

		owner.profileImageURL = checkCosmetics(owner, () => this.updateCache({
			avatar: owner.profileImageURL
		}));

		this.updateCache({
			displayName: owner.displayName,
			avatar: owner.profileImageURL,
			cover: owner.bannerImageURL
		});

		const edges = get('data.user.videos.edges', data),
			seen = this.seen = this.seen || new Set,
			items = [];

		cursor = null;

		if ( ! seen.has('STREAM') ) {
			seen.add('STREAM');
			const stream_at = get('data.user.stream.createdAt', data);
			if ( stream_at ) {
				const item = deep_copy(Object.assign({}, data.data.user, {
					videos: null
				}));

				cleanViewersCount(item.stream, data.data.user.stream);
				cleanTags(item.stream);
				items.push(item);
			}
		}

		if ( Array.isArray(edges) )
			for(const edge of edges) {
				cursor = edge.cursor;
				if ( edge.node && ! seen.has(edge.node.id) ) {
					seen.add(edge.node.id);
					const copy = deep_copy(edge.node);
					copy.owner = owner;
					// TODO: Clean tags
					//this.memorizeTags(copy);
					items.push(copy);
				}
			}

		return {
			items,
			cursor,
			finished: ! get('data.user.videos.pageInfo.hasNextPage', data)
		}
	}
}

Channel.presets = {
	video: [
		{
			settings: {
				no_recordings: true,
				sort: 'TIME'
			},
			list: {
				icon: 'ffz-i-user',
				title: 'Channel',
				i18n: 'addon.deck.channel',

				desc_i18n: 'addon.deck.channel.video-tip',
				desc: 'This column shows videos from a specific channel.'
			}
		}
	]
};