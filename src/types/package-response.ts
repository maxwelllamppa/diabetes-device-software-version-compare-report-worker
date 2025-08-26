import { Package } from '@teneo/package-domain'

export interface PackageResponse {
  items: Package.Value[]
  nextUrl?: string
}
