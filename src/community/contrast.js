// Readable text colours for flair badges. Kept in step with Community's own
// colour utilities, so a flair reads the same here as on stream.

function luminance(hex) {
	const channel = offset => {
		const value = parseInt(hex.substr(offset, 2), 16) / 255;
		return value < 0.03928 ? value / 12.92 : ((value + 0.055) / 1.055) ** 2.4;
	};

	return 0.2126 * channel(1) + 0.7152 * channel(3) + 0.0722 * channel(5);
}

function contrast(a, b) {
	const one = luminance(a),
		two = luminance(b);

	return (Math.max(one, two) + 0.05) / (Math.min(one, two) + 0.05);
}

function shift(hex, amount) {
	const channel = offset => Math.max(0, Math.min(255, parseInt(hex.substr(offset, 2), 16) + amount))
		.toString(16)
		.padStart(2, '0');

	return `#${channel(1)}${channel(3)}${channel(5)}`;
}

// Text for a filled badge: white on a dark fill, black otherwise.
export function getContrastingShade(hex) {
	return contrast(hex, '#ffffff') >= 4.5 ? '#ffffff' : '#000000';
}

// Lightens (on black) or darkens (on white) a colour until it reaches `min` contrast
// against the background, so coloured text stays readable on the viewer's theme.
export function pushContrastToMinimum(hex, background, min) {
	const step = background === '#000000' ? 2 : -2;
	let color = hex;

	for(let tries = 0; tries < 128 && contrast(color, background) < min; tries++)
		color = shift(color, step);

	return color;
}
