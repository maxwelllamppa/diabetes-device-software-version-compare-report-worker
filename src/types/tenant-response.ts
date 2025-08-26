import { Tenant } from './tenant'

export interface TenantResponse {
  statusCode: number
  items: Tenant[]
}
