/* eslint-disable max-len */
import { Logging } from '@teneo/base'
import * as Container from '@teneo/container'
import { Package } from '@teneo/package-domain'
import * as Rest from '@teneo/rest-client-components'
import { DeviceClient, ExchangeClient, PackageClient } from './clients/clients.js'
import { AssignmentCompact, AssignmentWithPackage, DeviceWithAssignments, State } from './types/state.js'
import { WorkerConfig } from './worker-config.js'
@Container.expose({ role: 'device.package', namespace: [ 'Device', 'Package' ]  })
export class DevicePackage {

  @Container.inject({ role: 'rest.client.builder' })
  clients: Rest.Client.Builder

  @Container.inject({ role: 'logger' })
  logger: Logging.Logger

  @Container.config('teneo.task.worker.deviceBatchSize')
  deviceBatchSize: number

  @Container.config('teneo.task.worker.packageBatchSize')
  packageBatchSize: number

  @Container.config('teneo.task.worker.assignmentBatchSize')
  assignmentBatchSize: number

  async buildState(tenantKey: string, config: WorkerConfig, traceId: string): Promise<State | undefined>  {
    this.logger.info('Loading device app state', { traceId })

    const state = new State()
    const deviceClient = this.clients.build(tenantKey, 'device-registry', DeviceClient)
    const packageClient = this.clients.build(tenantKey, 'package-registry', PackageClient)
    const exchangeClient = this.clients.build(tenantKey, 'package-exchange', ExchangeClient)

    // DEVICES
    this.logger.info('Loading all devices', { traceId })
    const devices = await deviceClient.loadAll(this.deviceBatchSize, traceId)
    if (!devices) {
      this.logger.error('Error fetching fetch devices')
      return
    }
    state.devices = devices as DeviceWithAssignments[]
    const devicesById: { [key: string]: DeviceWithAssignments } = {}
    for (const device of state.devices) {
      device.assignments = []
      devicesById[device.id] = device
    }
    // this.logger.info('device by id', { devicesById })

    // PACKAGES
    this.logger.info('Loading all packages', { traceId })
    const packages = await packageClient.loadAll(this.packageBatchSize, traceId)
    if (!packages) {
      this.logger.error('Error fetching fetch devices')
      return
    }

    const packagesById: { [key: string]: Package.Value } = {}
    for (const currentPackage of packages) {
      if (currentPackage.id) { packagesById[currentPackage.id] = currentPackage }
      if (currentPackage.metadata?.bundleId) { state.packagesByBundleId[currentPackage.metadata.bundleId as string] = currentPackage }
      if (currentPackage.metadata?.packageId) { state.packagesByBundleId[currentPackage.metadata.bundleId as string] = currentPackage }
    }

    // ASSIGNMENTS
    this.logger.info('Loading all assignments', { traceId })
    const assignments = await exchangeClient.loadAll(this.assignmentBatchSize, traceId) as AssignmentWithPackage[]
    if (!assignments) {
      this.logger.error('Error fetching assignments')
    }

    const assignmentsById: { [key: string]: AssignmentCompact } = {}
    for (const assignment of assignments) {
      if (assignment.id) { assignmentsById[assignment.id] = assignment }
      assignment.package = packagesById[assignment.packageId]
      const device = devicesById[assignment.deviceId]
      if (device) { device.assignments.push(assignment) }
    }
    state.assignments = assignments


    this.logger.debug('Loaded State', {
      devices: devices.length,
      assignments: assignments.length,
      packages: packages.length,
      traceId
    })
    return state
  }

}
