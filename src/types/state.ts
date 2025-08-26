import { Device } from '@teneo/device-domain'
import { Package } from '@teneo/package-domain'


export interface AssignmentWithPackage extends Package.Assignment.Value {
  package: Package.Value
  status: Package.Assignment.Status
}

export interface DeviceWithAssignments extends Device.Value {
  assignments: AssignmentWithPackage[]
}


export interface AppData {
  name: string
  status: string
  installedVersion?: string
  installDate?: string
  // iOS field
  bundleId?: string
  // Android field
  packageId?: string
}


export class State {

  devices: DeviceWithAssignments[] = []

  assignments: AssignmentWithPackage[] = []

  packagesByBundleId: { [key: string]: Package.Value } = {}

  packages: Package.Value[] = []

}
