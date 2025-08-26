import { Country } from './country'

export type Template = {
  id: string
  key: string
  name:string
  body: { items: Country[] }
  tenantId: string
  createdBy: string
  updatedBy: string
  createdAt: Date
  updatedAt: Date
}
