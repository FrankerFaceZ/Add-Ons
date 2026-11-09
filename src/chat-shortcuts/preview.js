// Pure preview builder. No FFZ / DOM dependencies so it can be unit tested with node.

export const DEFAULT_PREVIEW_LENGTH = 60;

const ELLIPSIS = '…';

function truncate(text, max) {
	if ( text.length <= max )
		return [text, false];

	const cut = text.slice(0, max - 1),
		boundary = cut.search(/\s\S*$/);

	return [(boundary > 0 ? cut.slice(0, boundary) : cut).trimEnd(), true];
}

// Split text into [{text}] and [{emote, srcSet}] segments. `lookup` is a Map of
// emote name -> srcSet; names only match whole whitespace-separated words.
export function buildPreview(text, lookup, maxLength = DEFAULT_PREVIEW_LENGTH) {
	const [body, truncated] = truncate(text, maxLength),
		out = [];

	const pushText = value => {
		const last = out[out.length - 1];
		if ( last && last.text != null )
			last.text += value;
		else
			out.push({ text: value });
	};

	for(const part of body.split(/(\s+)/)) {
		if ( ! part )
			continue;

		const srcSet = lookup?.get(part);
		if ( srcSet )
			out.push({ emote: part, srcSet });
		else
			pushText(part);
	}

	if ( truncated )
		pushText(ELLIPSIS);

	return out;
}
