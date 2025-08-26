import { Client, Result, Response } from '@teneo/rest-client'
import { Package } from '@teneo/package-domain'
import { PackageRegistryClient as PackageRegistryClientBase } from '@teneo/package-registry-client'
export class PackageRegistryClient extends PackageRegistryClientBase {

  constructor(config: Client.Config) {
    super({ ...config, requestTimeout: 30000 })
  }

  async packagesForType(typeId: string, traceId: string): Result.Async<Result.Page<Package.Value>> {
    return await this.get<Response.Page<Package.Value>, Result.Page<Package.Value>>('GetPackagesForType', traceId)
      .endpoint(`packages?filter=typeId:${typeId}&limit=1000`)
      .accept('json')
      .timeout(30000)
      .invoke()
  }

  async createPackage(packageBody: string, traceId: string): Result.Async<Package.Value> {
    return await this.post<Package.Value, Package.Value>('createPackage', traceId)
      .endpoint(`packages`)
      .json(packageBody)
      .accept('json')
      .timeout(30000)
      .invoke()
  }

  async patchPackage(packageId: string, packageBody: string, traceId: string): Result.Async<Package.Value> {
    return await this.patch<Package.Value, Package.Value>('patchPackage', traceId)
      .endpoint(`packages/${packageId}`)
      .json(packageBody)
      .accept('json')
      .timeout(30000)
      .invoke()
  }

}
