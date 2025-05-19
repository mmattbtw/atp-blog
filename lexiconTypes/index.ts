/**
 * GENERATED CODE - DO NOT MODIFY
 */
import {
  XrpcClient,
  type FetchHandler,
  type FetchHandlerOptions,
} from '@atproto/xrpc'
import { schemas } from './lexicons.js'
import { CID } from 'multiformats/cid'
import { type OmitKey, type Un$Typed } from './util.js'
import * as NetMmattRightNow from './types/net/mmatt/right/now.js'

export * as NetMmattRightNow from './types/net/mmatt/right/now.js'

export class AtpBaseClient extends XrpcClient {
  net: NetNS

  constructor(options: FetchHandler | FetchHandlerOptions) {
    super(options, schemas)
    this.net = new NetNS(this)
  }

  /** @deprecated use `this` instead */
  get xrpc(): XrpcClient {
    return this
  }
}

export class NetNS {
  _client: XrpcClient
  mmatt: NetMmattNS

  constructor(client: XrpcClient) {
    this._client = client
    this.mmatt = new NetMmattNS(client)
  }
}

export class NetMmattNS {
  _client: XrpcClient
  right: NetMmattRightNS

  constructor(client: XrpcClient) {
    this._client = client
    this.right = new NetMmattRightNS(client)
  }
}

export class NetMmattRightNS {
  _client: XrpcClient
  now: NetMmattRightNowRecord

  constructor(client: XrpcClient) {
    this._client = client
    this.now = new NetMmattRightNowRecord(client)
  }
}

export class NetMmattRightNowRecord {
  _client: XrpcClient

  constructor(client: XrpcClient) {
    this._client = client
  }

  async list(
    params: OmitKey<ComAtprotoRepoListRecords.QueryParams, 'collection'>,
  ): Promise<{
    cursor?: string
    records: { uri: string; value: NetMmattRightNow.Record }[]
  }> {
    const res = await this._client.call('com.atproto.repo.listRecords', {
      collection: 'net.mmatt.right.now',
      ...params,
    })
    return res.data
  }

  async get(
    params: OmitKey<ComAtprotoRepoGetRecord.QueryParams, 'collection'>,
  ): Promise<{ uri: string; cid: string; value: NetMmattRightNow.Record }> {
    const res = await this._client.call('com.atproto.repo.getRecord', {
      collection: 'net.mmatt.right.now',
      ...params,
    })
    return res.data
  }

  async create(
    params: OmitKey<
      ComAtprotoRepoCreateRecord.InputSchema,
      'collection' | 'record'
    >,
    record: Un$Typed<NetMmattRightNow.Record>,
    headers?: Record<string, string>,
  ): Promise<{ uri: string; cid: string }> {
    const collection = 'net.mmatt.right.now'
    const res = await this._client.call(
      'com.atproto.repo.createRecord',
      undefined,
      { collection, ...params, record: { ...record, $type: collection } },
      { encoding: 'application/json', headers },
    )
    return res.data
  }

  async delete(
    params: OmitKey<ComAtprotoRepoDeleteRecord.InputSchema, 'collection'>,
    headers?: Record<string, string>,
  ): Promise<void> {
    await this._client.call(
      'com.atproto.repo.deleteRecord',
      undefined,
      { collection: 'net.mmatt.right.now', ...params },
      { headers },
    )
  }
}
