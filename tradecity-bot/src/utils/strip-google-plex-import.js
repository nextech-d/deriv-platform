const GOOGLE_PLEX_IMPORT_RE =
    /@import\s*(?:url\(\s*)?['"]?https:\/\/fonts\.googleapis\.com\/css[^'")]*IBM\+Plex[^'")]*['"]?\s*\)?\s*;?/gi;

function stripGooglePlexImports(css) {
    return String(css).replace(GOOGLE_PLEX_IMPORT_RE, '');
}

module.exports = { stripGooglePlexImports, GOOGLE_PLEX_IMPORT_RE };
