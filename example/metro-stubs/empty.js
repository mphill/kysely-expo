// Stub for kysely's Node-only FileMigrationProvider, which uses a dynamic
// import() that Hermes cannot statically compile. React Native uses
// ExpoMigrationProvider instead, so this provider is never constructed.
module.exports = {};
