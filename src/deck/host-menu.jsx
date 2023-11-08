/* eslint-disable react/jsx-no-bind */
'use strict';

const ffz = FrankerFaceZ.get(),
	i18n = ffz.resolve('i18n'),
	{createElement} = FrankerFaceZ.utilities.dom;

/**
 *
 * @param {number} x
 * @param {number} y
 * @returns {object}
 */
export function makeReference(x, y) {
	return {
		getBoundingClientRect: () => ({
			top: y,
			bottom: y,
			y,
			left: x,
			right: x,
			x
		}),
		clientWidth: 0,
		clientHeight: 0
	};
}

/**
 *
 * @param {object} item
 * @param {Function} navigate
 * @returns {HTMLElement}
 */
export function createMenu(item, navigate) {
	return (<div class="bd--host-menu ffz-balloon tw-block">
		<div class="tw-border tw-elevation-1 tw-border-radius-small tw-c-background-base">
			<div class="scrollable-area" data-simplebar>
				<div class="simplebar-scroll-content">
					<div class="simplebar-content">
						<div class="tw-mg-y-05 tw-pd-x-1">
							<p class="tw-c-text-alt-2 tw-font-size-6 tw-strong tw-upcase">
								{i18n.t('directory.hosted', 'Hosted Channel')}
							</p>
						</div>
						{renderChannel(item, navigate)}
						<div class="tw-border-t tw-mg-t-1 tw-mg-x-05 tw-pd-b-1" />
						<div class="tw-mg-y-05 tw-pd-x-1">
							<p class="tw-c-text-alt-2 tw-font-size-6 tw-strong tw-upcase">
								{i18n.t('directory.hosting', 'Hosting Channels')}
							</p>
						</div>
						{item.hosts.map(host => renderChannel(host, navigate))}
					</div>
				</div>
			</div>
		</div>
	</div>);
}

/**
 *
 * @param {object} node
 * @param {Function} navigate
 * @returns {HTMLElement}
 */
function renderChannel(node, navigate) {
	const url = `/${node.login}`
	return (<a
		class="tw-block tw-full-width ffz-interactable ffz-interactable--hover-enabled ffz-interactable--default tw-interactive tw-pd-x-1"
		href={url}
		onClick={e => navigate(url, e, {channelView: 'Watch'})}
	>
		<div class="tw-align-items-center tw-flex tw-pd-05 tw-relative">
			<div class="bd--host-menu--avatar tw-border-radius-small tw-overflow-hidden">
				<div class="ffz-aspect ffz-aspect--align-top">
					<div class="ffz-aspect__spacer" style="padding-bottom: 100%" />
					<figure class="ffz-avatar ffz-avatar--size-40">
						<div class="tw-border-radius-rounded tw-overflow-hidden">
							<img
								class="ffz-avatar__img tw-image"
								alt={node.displayName}
								src={node.profileImageURL}
							/>
						</div>
					</figure>
				</div>
			</div>
			<div class="tw-flex-grow-1 tw-mg-l-1">
				{ node.displayName }
			</div>
		</div>
	</a>);
}
