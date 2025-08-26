import * as Container from '@teneo/container'
import * as Rest from '@teneo/rest-client-components'
import * as Schedule from '@teneo/schedule'
import { Logging, Objects } from '@teneo/base'
import keygen from 'keygen'
import { ConfigClient } from './clients/clients.js'
import { DevicePackage } from './device_package.js'
import { WorkerConfig } from './worker-config.js'
import { ReportService } from './component/report-service.js'

@Container.expose({ role: 'schedule.task.worker' })
export class Worker implements Schedule.Task {

  @Container.config('teneo.mesh.tenants', { live: true })
  tenants: Record<string, { config: WorkerConfig }>

  @Container.config('teneo.task.worker.label')
  label: string

  // OPTIONAL - but nice to have for dev
  @Container.config('teneo.task.worker.immediate')
  immediate: boolean

  @Container.config('teneo.task.worker.schedule')
  schedule: string

  @Container.inject({ role: 'rest.client.builder' })
  clients: Rest.Client.Builder

  @Container.inject()
  logger: Logging.Logger

  @Container.inject({ role: 'device.package' })
  devicePackage: DevicePackage

  @Container.inject({ role: 'config.client' })
  configClient: ConfigClient

  @Container.inject({ role: 'report.service' })
  reportService: ReportService

  run = Schedule.exclusive(async function run(this: Worker) {
    this.logger.info('Running Task')
    const traceId = keygen.url(55)
    for (const tenantKey in this.tenants) {
      await this.reportService.processTenant(tenantKey, this.tenants[tenantKey].config, traceId)
    }
    this.logger.info('Finished Task')
  })

  onError(ex: Error) {
    this.logger.exception('Task failed to run.', ex, { task: Objects.pick(this, 'label') })
  }

  onOverflow() {
    this.logger.warn('Task overflowed configured execution window.', { task: Objects.pick(this, 'label') })
  }

}
