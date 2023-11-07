'use strict';

const ffz = FrankerFaceZ.get(),
	i18n = ffz.resolve('i18n'),
	{createElement} = FrankerFaceZ.utilities.dom;

const STAT_CLASSES = 'preview-card-stat tw-align-items-center tw-border-radius-small tw-c-background-overlay tw-c-text-overlay tw-flex tw-font-size-6 tw-justify-content-center tw-pd-x-05';
const TYPES = {
	live: ['LIVE', null],
	host: ['Hosting', 'stream-type-indicator__hosting-dot tw-border-radius-rounded'],
	rerun: ['Rerun', 'ffz-i-cw'],
	RECORDING: ['In-Progress Stream', 'ffz-i-camera'],
	ARCHIVE: ['Past Broadcast'],
	HIGHLIGHT: ['Highlight'],
	CLIP: ['Clip']
};


export function createSubtitles(lines, navigate) {
	const out = [];

	for(const line of lines) {
		if ( ! line )
			continue;

		let content = line.content;
		if ( line.link )
			content = (<a
				href={line.link}
				class="tw-interactive ffz-link ffz-link--inherit"
				onClick={e => navigate(line.link, e, line.state)}
			>{content}</a>);

		out.push(<p class="tw-c-text-alt tw-ellipsis">{content}</p>);
	}

	return out;
}


export function createStreamIndicator(type, icon, label, slots = {}) {
	const data = TYPES[type];
	if ( ! icon )
		icon = data ? data[1] : null;
	if ( ! label )
		label = data ? i18n.t(`addon.deck.type.${type}`, data[0]) : null;

	return (<div class={`${STAT_CLASSES} preview-card-stat--${type}`}>
		{(icon || slots.icon) ? <div class="tw-align-items-center tw-flex tw-mg-r-05">
			{slots.icon || null}
			{icon ? <figure class={icon} /> : null}
		</div> : null}
		{label ? <span>{ label }</span> : null}
	</div>);
}


export function createCard(props = {}, slots = {}, data = {}, navigate) {
	let preview_children;

	if ( props.image ) {
		let tag;
		if ( props.embed )
			tag = (<iframe
				class="tw-image tw-full-width"
				src={props.embed}
				allowFullScreen={false}
				allow="accelerometer; autoplay; encrypted-media; gyroscope"
				frameBorder={0}
			/>);
		else
			tag = (<img
				class="tw-image tw-full-width"
				alt={props.cardTitle || props.title}
				src={props.image}
			/>);

		preview_children = [
			// eslint-disable-next-line react/jsx-key
			<div class="tw-border-radius-medium tw-c-background-alt-2 tw-overflow-hidden">
				<div class="ffz-aspect ffz-aspect--align-top">
					<div class="ffz-aspect__spacer" style="padding-top: 56.25%" />
					<div class="preview-card-thumbnail__image">
						{tag}
					</div>
				</div>
			</div>
		];

		const meta_bits = [];

		if ( props.topLeft || slots.topLeft )
			meta_bits.push(<div data-test-selector="top-left-selector" class="tw-absolute tw-left-0 tw-top-0 tw-mg-1">
				{slots.topLeft || null}
				{props.topLeft ? <div class={STAT_CLASSES}>
					{props.topLeftIcon ? <figure class={props.topLeftIcon} /> : null}
					{props.topLeft}
				</div> : null}
			</div>);

		if ( props.topRight || slots.topRight )
			meta_bits.push(<div data-test-selector="top-right-selector" class="tw-absolute tw-right-0 tw-top-0 tw-mg-1">
				{slots.topRight || null}
				{props.topRight ? <div class={STAT_CLASSES}>
					{props.topRightIcon ? <figure class={props.topRightIcon} /> : null}
					{props.topRight}
				</div> : null}
			</div>);

		if ( props.bottomLeft || slots.bottomLeft )
			meta_bits.push(<div data-test-selector="bottom-left-selector" class="tw-absolute tw-left-0 tw-bottom-0 tw-mg-1">
				{slots.bottomLeft || null}
				{props.bottomLeft ? <div class={STAT_CLASSES}>
					{props.bottomLeftIcon ? <figure class={props.bottomLeftIcon} /> : null}
					{props.bottomLeft}
				</div> : null}
			</div>);

		if ( props.bottomRight || slots.bottomRight )
			meta_bits.push(<div data-test-selector="bottom-right-selector" class="tw-absolute tw-right-0 tw-bottom-0 tw-mg-1">
				{slots.bottomRight || null}
				{props.bottomRight ? <div class={STAT_CLASSES}>
					{props.bottomRightIcon ? <figure class={props.bottomRightIcon} /> : null}
					{props.bottomRight}
				</div> : null}
			</div>);

		if ( meta_bits.length )
			preview_children.push(<div class="preview-card-overlay tw-absolute tw-full-height tw-full-width tw-left-0 tw-top-0">
				{meta_bits}
			</div>);

		if ( props.link )
			preview_children = (<a
				class="tw-interactive ffz-link"
				href={props.link}
				data-a-target="preview-card-image-link"
				// eslint-disable-next-line react/jsx-no-bind
				onClick={e => navigate(props.link, e, props.state)}
			>{preview_children}</a>);
	}

	let iconic;

	if ( props.avatar || props.boxart || slots.iconic ) {
		let url, state, aspect, image;

		if ( props.avatar ) {
			url = props.avatarLink || props.link;
			state = props.avatarLink ? props.avatarState : props.state;
			aspect = 1;
			image = (<figure class="ffz-avatar ffz-avatar--size-40">
				<div class="tw-border-radius-rounded tw-overflow-hidden">
					<img
						class="ffz-avatar__img tw-image"
						alt={props.avatarTitle || props.title}
						src={props.avatar}
					/>
				</div>
			</figure>);

		} else if ( props.boxart ) {
			url = props.boxartLink || props.link;
			state = props.boxartLink ? props.boxartState : props.state;
			aspect = 3/4;
			image = <img class="tw-image" alt={props.boxartTitle || props.title} src={props.boxart} />;
		}

		if ( url )
			iconic = (<a
				href={url}
				class="tw-interactive ffz-link"
				onClick={e => navigate(url, e, state)}
			>
				<div class="deck-card-iconic-image__wrapper tw-border-radius-small tw-overflow-hidden">
					<div class="ffz-aspect ffz-aspect--align-top">
						<div class="ffz-aspect__spacer" style={`padding-bottom: ${aspect * 100}%`} />
						{image}
					</div>
				</div>
			</a>);

		iconic = (<div class="tw-flex-grow-0 tw-flex-shrink-0 tw-mg-r-1">
			{slots.iconic || null}
			{iconic || null}
		</div>);
	}


	const out = (<div class={`preview-card ${data.class || ''}`}>
		{preview_children ? <div class="tw-relative">{preview_children}</div> : null}
		<div class="tw-flex tw-flex-nowrap tw-mg-t-1">
			{iconic || null}
			<div class="deck-card__titles-wrapper tw-flex-grow-1 tw-flex-shrink-1 tw-full-width">
				<div>
					<span class="tw-c-text-alt">
						<a
							class="tw-interactive ffz-link ffz-link--hover-underline-none ffz-link--inherit"
							href={props.titleLink || props.link}
							onClick={e => navigate(props.titleLink || props.link, e, props.titleLink ? props.titleState : props.state)}
						>
							<h3
								class="ffz--line-clamp tw-font-size-5"
								style={`--ffz-lines: 3`}
								title={props.title}
							>
								{ props.title }
							</h3>
						</a>
					</span>
					{slots.subtitles ? <div class="deck-card-titles__subtitle-wrapper">
						{slots.subtitles}
					</div> : null}
				</div>
				{Array.isArray(props.tags) && props.tags.length ? createTagList(props.tags, {}, navigate) : null}
			</div>
		</div>
	</div>);

	if ( data.id )
		out.id = data.id;

	return out;
}


export function createTagList(tags, data = {}, navigate) {
	const out = [];

	for(const tag of tags) {
		const lang = false,
			url = `/directory/all/tags/${tag}`;

		out.push(<div class={`tw-border-radius-rounded tw-semibold tw-inline-block ffz-tag tw-mg-r-05 ${data.noMargin ? '' : 'tw-mg-t-05'}`}>
			<a
				class="tw-block tw-border-radius-rounded ffz-interactable ffz-interactable--alpha ffz-interactable--hover-enabled tw-interactive"
				href={url}
				onClick={e => navigate(url, e)}
			>
				<div
					class={`ffz-tag__content ${lang ? 'ffz-i-language' : ''}`}
				>
					{ tag }
				</div>
			</a>
		</div>)
	}

	return (<div class={`bd--tag-list tw-font-size-7 tw-c-text-base ${data.staticClass || ''}`}>
		{out}
	</div>);
}