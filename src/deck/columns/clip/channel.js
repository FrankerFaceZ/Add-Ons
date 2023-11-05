const {get, deep_copy} = FrankerFaceZ.utilities.object;

import ColumnBase, { ClipColumnBase, LiveColumnBase } from '../../column-base';
import { getLoader, cleanViewersCount, cleanTags, checkCosmetics } from '../../data';

export default class Channel extends ClipColumnBase {
	getComponent(item) {
		if ( item.text )
			return 'bd-heading-card';
		else if ( item.stream )
			return 'bd-live-card';

		return 'bd-clip-card';
	}

	getEditComponent() {
		return [
			'bd-edit-channel',
			'bd-edit-video-channel',
			'bd-edit-clip'
		]
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
			return ['addon.deck.user-clips', '{user} Clips', {
				user: this.cache.displayName
			}];

		return ['addon.deck.user-id', 'User #{id}', this.settings];
	}

	canRun() {
		return super.canRun() && !! this.settings.id
	}

	reset() {
		super.reset();
		this.seen = null;
	}

	filterItems(items) {
		const out = [];
		if ( ! Array.isArray(items) )
			return out;

		const no_live = this.settings.no_live,
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
				if ( ! ClipColumnBase.filterClip(item, blocked_games) )
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
						i18n: 'addon.deck.card.clip',
						text: 'Clips',
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
		// There's a pagination issue for trending...
		if ( this.settings.sort === 'TRENDING' )
			first = 25;

		const data = await getLoader().queryApollo({
			query: require('./channel.gql'),
			variables: {
				id: this.settings.id,
				first,
				after: cursor,
				criteria: {
					period: this.settings.period || 'LAST_WEEK',
					sort: this.settings.sort || 'VIEWS_DESC'
				}
			},
			fetchPolicy: 'network-only'
		});

		const broadcaster = {
			id: get('data.user.id', data),
			login: get('data.user.login', data),
			displayName: get('data.user.displayName', data),
			profileImageURL: get('data.user.profileImageURL', data),
			bannerImageURL: get('data.user.bannerImageURL', data)
		};

		broadcaster.profileImageURL = checkCosmetics(broadcaster, () => this.updateCache({
			avatar: broadcaster.profileImageURL
		}));

		this.updateCache({
			displayName: broadcaster.displayName,
			avatar: broadcaster.profileImageURL,
			cover: broadcaster.bannerImageURL
		});

		const edges = get('data.user.clips.edges', data),
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

		let had_items = false;
		if ( Array.isArray(edges) )
			for(const edge of edges) {
				had_items = true;
				cursor = edge.cursor;
				if ( edge.node && ! seen.has(edge.node.id) ) {
					seen.add(edge.node.id);
					const copy = deep_copy(edge.node);
					copy.broadcaster = broadcaster;
					items.push(copy);
				}
			}

		return {
			items,
			cursor,
			finished: !(had_items && get('data.user.clips.pageInfo.hasNextPage', data))
		}
	}
}

Channel.presets = {
	clip: [
		{
			settings: {
				period: 'LAST_WEEK',
				sort: 'VIEWS_DESC'
			},
			list: {
				icon: 'ffz-i-user',
				title: 'Channel',
				i18n: 'addon.deck.channel',

				desc_i18n: 'addon.deck.channel.clip-tip',
				desc: 'This column shows clips from a specific channel.'
			}
		}
	]
};