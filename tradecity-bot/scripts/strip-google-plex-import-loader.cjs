const { stripGooglePlexImports } = require('../src/utils/strip-google-plex-import');

module.exports = function stripGooglePlexImportLoader(source) {
    return stripGooglePlexImports(source);
};
