'use strict';

export const MAX_OFFSET_SECONDS = 24 * 60 * 60;

export function clampOffset(value) {
	if ( typeof value !== 'number' || ! Number.isFinite(value) )
		return 0;

	return Math.max(-MAX_OFFSET_SECONDS, Math.min(MAX_OFFSET_SECONDS, Math.round(value)));
}

export function parseOffset(value) {
	if ( typeof value !== 'string' )
		return null;

	const input = value.trim();
	if ( ! input )
		return null;

	let sign = 1,
		body = input;

	if ( body[0] === '+' || body[0] === '-' ) {
		sign = body[0] === '-' ? -1 : 1;
		body = body.slice(1);
	}

	if ( ! /^\d+(?::\d+){0,2}$/.test(body) )
		return null;

	const parts = body.split(':').map(part => Number.parseInt(part, 10));
	let seconds;

	if ( parts.length === 1 )
		seconds = parts[0];
	else if ( parts.length === 2 ) {
		if ( parts[1] >= 60 )
			return null;

		seconds = parts[0] * 60 + parts[1];
	} else {
		if ( parts[1] >= 60 || parts[2] >= 60 )
			return null;

		seconds = parts[0] * 3600 + parts[1] * 60 + parts[2];
	}

	if ( seconds > MAX_OFFSET_SECONDS )
		return null;

	return clampOffset(sign * seconds);
}

export function formatOffset(value) {
	const offset = clampOffset(value),
		sign = offset > 0 ? '+' : offset < 0 ? '-' : '',
		absolute = Math.abs(offset),
		hours = Math.floor(absolute / 3600),
		minutes = Math.floor((absolute % 3600) / 60),
		seconds = absolute % 60;

	return `${sign}${String(hours).padStart(2, '0')}:${String(minutes).padStart(2, '0')}:${String(seconds).padStart(2, '0')}`;
}
