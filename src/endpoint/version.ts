import * as Container from '@teneo/container'
import { Endpoint, Middleware } from '@teneo/rest'
import packageJson from '../../package.json' assert {
  type: 'json'
}
@Container.expose({ role: 'rest.endpoint.version', namespace: [ 'Endpoint', 'Version' ] })
export class Singular implements Endpoint.Handler {

  @Container.inject({ role: 'rest.middleware.auth.token' })
  authenticate: Middleware.Function

  @Container.inject({ role: 'rest.middleware.authorize' })
  authorize: (resource: string, action?: string) => Middleware.Function

  name = 'version'

  route = '/version'

  get middleware(): Middleware.Stack {
    return [
      this.authenticate,
      this.authorize('version'),
      Middleware.negotiate('json')
    ]
  }

  get get(): Middleware.Stack {
    const { version } = packageJson
    return [
      async (ctx, next) => {
        ctx.body = { version }
        await next()
      }
    ]
  }

}
