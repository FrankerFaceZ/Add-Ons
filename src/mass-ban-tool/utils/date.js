export function isValidDate( dateObj ) {
    return dateObj instanceof Date && ! isNaN( dateObj );
}
