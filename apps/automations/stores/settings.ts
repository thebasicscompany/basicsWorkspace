/**
 * Settings store — re-exports from the proper directory structure.
 * The environment store now lives at stores/settings/environment/.
 */
export { useEnvironmentStore } from './settings/environment'
export type { EnvironmentVariable, EnvironmentStore } from './settings/environment'
