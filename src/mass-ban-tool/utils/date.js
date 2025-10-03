export function isValidDate( dateObj ) {
    return dateObj instanceof Date && ! isNaN( dateObj );
}

export function getLocaleString( date ) {
    if ( isValidDate( date ) ) {
        return date.toLocaleString();
    } else {
        return '---';
    }
}

export function padDateString( value ) {
    return value.padStart( 2, 0 );
}
