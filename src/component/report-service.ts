/* eslint-disable @typescript-eslint/naming-convention */
/* eslint-disable max-len */
import * as Container from '@teneo/container'
import * as Rest from '@teneo/rest-client-components'
import { Logging } from '@teneo/base'
import { WorkerConfig } from '../worker-config.js'
import { DevicePackage } from '../device_package.js'
import { S3Client, PutObjectCommand } from '@aws-sdk/client-s3'
import { Readable } from 'stream'

const NA_STRING = ''

@Container.expose({ role: 'report.service', namespace: [ 'Report' ] })
export class ReportService {

  @Container.inject({ role: 'rest.client.builder' })
  clients: Rest.Client.Builder

  @Container.inject({ role: 'logger' })
  logger: Logging.Logger

  @Container.inject({ role: 'device.package' })
  devicePackage: DevicePackage

  @Container.config('teneo.task.worker.reportFilePrefix')
  reportFilePrefix: string

  @Container.config('teneo.task.worker.s3BucketName')
  s3BucketName: string

  @Container.config('teneo.task.worker.regionName')
  regionName: string

  // @Container.config('teneo.task.worker.KMS_KEY_ARN')
  // KMS_KEY_ARN: string

  lastTimeRan: Date = new Date()

  isRunning: boolean

  async processTenant(tenantKey: string, config: WorkerConfig, traceId: string) {
    const start = Date.now()
    const logger = this.logger.extend({ traceId })
    logger.info('Processing Tenant', { tenantKey })

    const reportData = await this.fetchData(tenantKey, config, logger, traceId)
    if (!reportData) {
      logger.error('Report failed to compete processing', { traceId })
      return
    }
    if (Object.keys(reportData).length === 0) {
      logger.info('Did not receive any report data.', { traceId })
    }
    await this.writeReport(tenantKey, config, reportData, logger, traceId)
    logger.info('Completed Processing', { elapsed: Date.now() - start })
  }

  async fetchData(tenantKey: string, config: WorkerConfig, logger: Logging.Logger, traceId: string): Promise<string[][] | undefined> {
    logger.info('Fetching data', { tenantKey, config, traceId })
    const state = await this.devicePackage.buildState(tenantKey, config, traceId)

    if (!state?.devices) {
      this.logger.error('Error fetching fetch devices')
      return
    }

    const reportRows = [ [ 'Serial Number', 'Software Version', 'Package Software Name' ] ]
    for (const device of state.devices) {
      logger.info(device.businessId)
      if (!device.softwareVersionNumber) {
        return
      }
      const {
        businessId,
        softwareVersionNumber

      } = device

      logger.info('LOOK', { device })
      if (!this.isIterable(device.assignments)) {
        continue
      }
      for (const assignment of device.assignments) {
        if (softwareVersionNumber === assignment.package?.name) {
          continue
        }
        reportRows.push([
          businessId,
          (softwareVersionNumber as string) || NA_STRING,
          (assignment.package?.name as string) || NA_STRING
        ])
      }
    }
    return reportRows
  }

  isIterable(obj: any) {
    // checks for null and undefined
    if (obj == null) {
      return false
    }
    return typeof obj[Symbol.iterator] === 'function'
  }

  private async uploadToS3(params: {
    bucket: string
    key: string
    content: string | Buffer | Readable
    contentType: string
  }) {
    const s3 = new S3Client({ region: this.regionName }) // credentials are read from env

    const command = new PutObjectCommand({
      Bucket: params.bucket,
      Key: params.key,
      Body: params.content,
      ContentType: params.contentType
      // ServerSideEncryption: 'aws:kms',
      // SSEKMSKeyId: this.KMS_KEY_ARN
    })

    await s3.send(command)
  }

  private async writeReport(tenantKey: string, config: WorkerConfig, reportData: string[][], logger: Logging.Logger, traceId: string) {
    logger.info('Report data:')
    logger.info(JSON.stringify(reportData, null, ' '))
    const exit = true
    if (exit) {
      return
    }
    logger.info('Writing to s3 bucket')

    const now = new Date()
    const timestamp = now.toISOString().replace(/[:.]/g, '-')

    const csvString = reportData.map(row => row.join(',')).join('\n')
    // console.log(csvString)

    await this.uploadToS3({
      bucket: this.s3BucketName,
      key: `${this.reportFilePrefix}-${timestamp}.csv`,
      content: csvString,
      contentType: 'text/csv'
    })
  }

}
