/* eslint-disable max-len */
import * as Container from '@teneo/container'
import { Middleware, Endpoint } from '@teneo/rest'
import { ReportService } from '../component/report-service.js'
import * as Resource from '@teneo/rest-resources'
import { WorkerConfig } from '../worker-config.js'

@Container.expose({ role: 'rest.endpoint.manual.runreport', namespace: [ 'Manual', 'RunReport' ] })
export class RunReport implements Endpoint.Handler {

  @Container.inject({ role: 'rest.middleware.auth.token' })
  authToken: Middleware.Function

  @Container.inject({ role: 'report.service' })
  reportService: ReportService

  @Container.inject({ role: 'rest.middleware.authorize' })
  authorize: (resource: string, action?: string) => Middleware.Function

  @Container.config('teneo.mesh.tenants', { live: true })
  tenants: Record<string, { config: WorkerConfig }>

  name = 'report'

  route = '/report'

  get middleware(): Middleware.Stack {
    return [
      this.authToken,
      this.authorize('report'),
      Middleware.negotiate('application/json')
    ]
  }

  get post(): Middleware.Stack {
    return [
      Resource.Gather.Input.body(),
      async (ctx, next) => {
        const { deviceGroupId } = ctx.request.body as { deviceGroupId: string }

        if (!deviceGroupId) {
          return Middleware.fail(ctx, 400, 'deviceGroupId', 'deviceGroupId not provided')
        }

        ctx.status = 200
        ctx.body = {}
        if (this.reportService.isRunning) {
          return Middleware.fail(ctx, 422, 'runReport', `This request can't be processed at this time. Report already in progress.`)
        } else {
          setImmediate(async () => {
            const tenantKey = ctx.state.tenantKey
            const config = this.tenants[tenantKey].config
            config.deviceGroupId = deviceGroupId
            await this.reportService.processTenant(ctx.state.tenantKey, config, ctx.state.traceId)
          })
        }
        await next()
      }
    ]
  }

}
