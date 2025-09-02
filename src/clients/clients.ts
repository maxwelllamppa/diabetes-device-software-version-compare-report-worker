/* eslint-disable max-len */
import { Logging } from '@teneo/base'
import * as Container from '@teneo/container'
import { Device } from '@teneo/device-domain'
import { DeviceRegistryClient } from '@teneo/device-registry-client'
import { Package } from '@teneo/package-domain'
import { PackageRegistryClient } from '@teneo/package-registry-client'
import { Client, Response, Result } from '@teneo/rest-client'
import { DeviceResponse, PackageResponse, TemplateResponse, TenantResponse } from '../types/index.js'
import { Template } from '../types/template.js'
import { Tenant } from '../types/tenant.js'

type PackageVersion = {
  version: string
}
export class IntegrationClient extends Client.Standard.V2 {

  constructor(config: Client.Config, logger?: Logging.Logger) {
    super('integration', config, logger)
  }

  async getPackageVersion(bundleId: string, externalVersionId: string): Promise<Result.Any<PackageVersion>> {
    return this.get<PackageVersion, PackageVersion>('GetPackageVersion')
      .endpoint(`apps/${bundleId}/external-versions/${externalVersionId}/version`)
      .accept('json')
      .onFailure('Unable to get package version.')
      .invoke()
  }

}

export class DeviceClient extends DeviceRegistryClient {

  @Container.inject({ role: 'logger' })

  async loadAll(limit: number, traceId: string): Promise<Device.Value[]> {
    let allDevices: Device.Value[] = []
    let loadMore = true

    while (loadMore) {
      const response = await this.get<DeviceResponse, DeviceResponse>('LoadAllDevices', traceId)
        .endpoint(`devices?offset=${allDevices.length}&limit=${limit}&sort=created_at:desc`)
        .accept('json')
        .onFailure('Unable to get devices.')
        .timeout(200000)
        .invoke()

      if (Result.isFailure(response)) {
        throw response.errors
      }

      if (response.value.items.length > 0) {
        allDevices = allDevices.concat(response.value.items)
      }
      // eslint-disable-next-line @typescript-eslint/ban-ts-comment
      // @ts-ignore
      loadMore = response.value.nextUrl !== undefined || response.value.next !== undefined
    }

    return allDevices
  }

}

export class PackageClient extends PackageRegistryClient {

  async loadAll(
    limit: number,
    traceId: string
  ): Promise<Package.Value[]> {
    let allPackages: Package.Value[] = []
    let loadMore = true

    while (loadMore) {
      const url = `packages?offset=${allPackages.length}&limit=${limit}&sort=created_at:desc`
      // console.log(url)
      const response = await this.get<PackageResponse, PackageResponse>(
        'LoadAllPackages',
        traceId
      )
        .endpoint(url)
        .accept('json')
        .onFailure('Unable to get packages.')
        .timeout(200000)
        .invoke()

      if (Result.isFailure(response)) {
        throw response.errors
      }

      if (response.value.items.length > 0) {
        allPackages = allPackages.concat(response.value.items)
      }
      // eslint-disable-next-line @typescript-eslint/ban-ts-comment
      // @ts-ignore
      loadMore = response.value.nextUrl !== undefined || response.value.next !== undefined
    }

    return allPackages.filter((p) => p.status !== Package.Status.DISABLED)
  }

}

export class ExchangeClient extends Client.Standard.V1 {

  constructor(config: Client.Config, logger?: Logging.Logger) {
    super('ExchangeRegistryClient', config, logger)
  }

  async loadAll(
    limit: number,
    traceId: string
  ): Promise<Package.Assignment.Value[]> {
    let allAssignments: Package.Assignment.Value[] = []
    let loadMore = true

    while (loadMore) {
      const response: any = await this.getAssignments(
        limit,
        allAssignments.length,
        'createdAt:desc',
        traceId
      )
      if (Result.isFailure(response)) {
        throw response.errors
      }

      if (response.value.items.length > 0) {
        allAssignments = allAssignments.concat(response.value.items)
        // Log the current total count after this page
        this.logger?.info(
          `Fetched ${response.value.items.length} assignments on this page. Total so far: ${allAssignments.length}`
        )
      }
      // eslint-disable-next-line @typescript-eslint/ban-ts-comment
      // @ts-ignore
      loadMore = response.value.nextUrl !== undefined || response.value.next !== undefined
    }

    return allAssignments
  }

  async getAssignments(
    limit = 15000,
    offset = 0,
    sort = 'createdAt:asc',
    traceId?: string
  ): Result.Async<Result.Page<Package.Assignment.Value>> {
    return this.getPage(
      (builder) => builder.endpoint(
        `assignments?limit=${limit}&offset=${offset}&sort=${sort}&filter=(status:applied)`
      ),
      traceId || ''
    )
  }

  async getAllNext(
    nextUrl: string,
    traceId: string
  ): Result.Async<Result.Page<Package.Assignment.Value>> {
    return this.getPage((builder) => builder.path(nextUrl), traceId)
  }

  async getPage(
    from: Client.Standard.InvokerFrom<Package.Assignment.Value>,
    traceId: string
  ): Result.Async<Result.Page<Package.Assignment.Value>> {
    const builder = from(
      this.get<Response.Page<Package.Assignment.Value>, Result.Page<Package.Assignment.Value>>(
        'GetAllAssignments',
        traceId
      )
    )
      .onFailure('Unable to get assignments.')
      .accept('json')
      .timeout(30000)
      .extractor(async ({ body: { items, nextUrl } }) => ({
        items: items ?? [],
        next: nextUrl
          ? async (traceId) => this.getAllNext(nextUrl, traceId || '')
          : undefined
      }))

    return builder.invoke()
  }

}
@Container.expose({ role: 'config.client' })
export class ConfigClient extends Client.Standard.V1 {

  constructor(config: Client.Config, logger?: Logging.Logger) {
    super('ConfigClient', config, logger)
  }


  async getTenants(traceId: string): Result.Async<TenantResponse> {
    return this.get<TenantResponse, TenantResponse>('GetTenants', traceId)
      .endpoint('tenants')
      .accept('json')
      .onFailure('Unable to get tenants.')
      .invoke()
  }

  async getTenant(tenantId: string, traceId: string): Result.Async<Tenant> {
    return this.get<Tenant, Tenant>('GetTenant', traceId)
      .endpoint(`tenants/${tenantId}`)
      .accept('json')
      .onFailure('Unable to get tenant.')
      .invoke()
  }

  async getTemplates(tenantKey: string, traceId: string): Result.Async<TemplateResponse> {
    const tenants = await this.getTenants(traceId)
    const errorMessage = 'Error fetching tenants for getTemplates'

    if (Result.isFailure(tenants)) {
      this.logger.error(errorMessage)
      throw new Error(errorMessage)
    }

    const tenant = tenants.value.items.find((t: { key: string }) => t.key == tenantKey)

    return await this.get<TemplateResponse, TemplateResponse>('GetTemplates', traceId)
      .endpoint(`tenants/${tenant?.id}/templates`)
      .accept('json')
      .timeout(30000)
      .onFailure('Unable to get templates.')
      .invoke()
  }

  async getTemplate(tenantId: string, templateId: string, traceId: string): Result.Async<Template> {
    return this.get<Template, Template>('GetTemplate', traceId)
      .endpoint(`tenants/${tenantId}/templates/${templateId}`)
      .accept('json')
      .onFailure('Unable to get template.')
      .invoke()
  }

  async getTemplateContent(tenantKey: string, templateKey: string, traceId: string) : Result.Async<Template> {
    const templates = await this.getTemplates(tenantKey, traceId)
    const errorMessage = 'Error fetching template content'
    if (Result.isFailure(templates)) {
      this.logger.error(errorMessage)
      throw new Error(errorMessage)
    }

    const template = templates.value.items.find((t: { key: string }) => t.key == templateKey)

    if (template?.tenantId === undefined || template.tenantId === '') {
      throw new Error(errorMessage)
    }

    return this.getTemplate(template.tenantId, template.id, traceId)
  }

}
