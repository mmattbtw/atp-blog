/**
 * GENERATED CODE - DO NOT MODIFY
 */
import { type ValidationResult, BlobRef } from '@atproto/lexicon'
import { CID } from 'multiformats/cid'
import { validate as _validate } from '../../../../lexicons'
import {
  type $Typed,
  is$typed as _is$typed,
  type OmitKey,
} from '../../../../util'

const is$typed = _is$typed,
  validate = _validate
const id = 'net.mmatt.vitals.car'

export interface Record {
  $type: 'net.mmatt.vitals.car'
  /** The unix timestamp of when the vital was recorded */
  createdAt: string
  /** The car fuel range value in miles */
  carFuelRange: number
  /** The car fuel level value in percentage */
  carPercentFuelRemaining: number
  /** The car fuel amount remaining value */
  amountRemaining: number
  /** The car traveled distance value */
  carTraveledDistance: number
  /** The car make value */
  carMake?: string
  /** The car model value */
  carModel?: string
  /** The car year value */
  carYear?: number
  [k: string]: unknown
}

const hashRecord = 'main'

export function isRecord<V>(v: V) {
  return is$typed(v, id, hashRecord)
}

export function validateRecord<V>(v: V) {
  return validate<Record & V>(v, id, hashRecord, true)
}
