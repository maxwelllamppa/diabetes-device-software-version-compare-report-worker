/* eslint-disable no-use-before-define */
/**
 * Generic interface for what a configuration values could be.
 */
export type Config = { [key: string]: ConfigValue }

export type ConfigValue = string | number | boolean | ConfigValueMap | ConfigValueArray | null

export interface ConfigValueMap { [key: string]: ConfigValue }

export type ConfigValueArray = Array<ConfigValue>
