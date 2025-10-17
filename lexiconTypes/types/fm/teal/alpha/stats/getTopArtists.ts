/**
 * GENERATED CODE - DO NOT MODIFY
 */
import express from 'express'
import { type ValidationResult, BlobRef } from '@atproto/lexicon'
import { CID } from 'multiformats/cid'
import { validate as _validate } from '../../../../../lexicons'
import {
  type $Typed,
  is$typed as _is$typed,
  type OmitKey,
} from '../../../../../util'
import { HandlerAuth, HandlerPipeThrough } from '@atproto/xrpc-server'
import type * as FmTealAlphaStatsDefs from './defs.js'

const is$typed = _is$typed,
  validate = _validate
const id = 'fm.teal.alpha.stats.getTopArtists'

export interface QueryParams {
  /** Time period for top artists */
  period: 'all' | '30days' | '7days'
  /** Number of artists to return */
  limit: number
  /** Pagination cursor */
  cursor?: string
}

export type InputSchema = undefined

export interface OutputSchema {
  artists: FmTealAlphaStatsDefs.ArtistView[]
  /** Next page cursor */
  cursor?: string
}

export type HandlerInput = undefined

export interface HandlerSuccess {
  encoding: 'application/json'
  body: OutputSchema
  headers?: { [key: string]: string }
}

export interface HandlerError {
  status: number
  message?: string
}

export type HandlerOutput = HandlerError | HandlerSuccess | HandlerPipeThrough
export type HandlerReqCtx<HA extends HandlerAuth = never> = {
  auth: HA
  params: QueryParams
  input: HandlerInput
  req: express.Request
  res: express.Response
  resetRouteRateLimits: () => Promise<void>
}
export type Handler<HA extends HandlerAuth = never> = (
  ctx: HandlerReqCtx<HA>,
) => Promise<HandlerOutput> | HandlerOutput
