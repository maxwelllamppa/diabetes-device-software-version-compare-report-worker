import { Config } from './config'

/**
 * Interface that represents a Tenant within the Teneo platform. Tenants are generally referenced by their `key` property.
 */
export interface Tenant {

  /**
     * The unique identifier for a Tenant.
     */
  id: string

  /**
     * The user-friendly key that can be used to cross reference this tenant between services.
     */
  key: string

  /**
     * The descriptive name of this Tenant.
     */
  name: string

  /**
     * Any additional endpoints for this Tenant that are not covered by the Service mapped endpoints.
     */
  endpoints: { [key: string]: string }

  /**
     * Specific configuration for this Tenant. This will include any specific configurations for this tenant across the platform.
     */
  config: Config

}
