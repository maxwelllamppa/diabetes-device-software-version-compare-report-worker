import { Package } from '@teneo/package-domain'

export interface AssignmentCompact {
  id: string
  deviceId: string
  packageId: string
  // packageTypeId: string
}

export interface AssignmentWithPackage extends AssignmentCompact {
  package: Package.Value
  status: Package.Assignment.Status
}

export interface DeviceCompact {
  id: string
  businessId: string
  // metadata: Json.Map
  softwareVersionNumber: string
}

export interface DeviceWithAssignments extends DeviceCompact {
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
