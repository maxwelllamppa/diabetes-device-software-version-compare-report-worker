import { Device } from '@teneo/device-domain'

export interface DeviceResponse {
  items: Device.Value[]
  nextUrl?: string
}
