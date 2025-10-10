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
const id = 'net.mmatt.vitals.phone'

export interface Record {
  $type: 'net.mmatt.vitals.phone'
  /** The unix timestamp of when the vital was recorded */
  createdAt: string
  /** The phone motion value */
  phoneMotion: string
  /** The phone volume value */
  phoneVolume: string
  /** The phone appearance value */
  phoneAppearance: string
  /** The phone brightness value */
  phoneBrightness: string
  /** The phone orientation value */
  phoneOrientation: string
  /** The phone cell bars value */
  phoneCellBars: string
  /** The phone cell network value */
  phoneCellNetwork: string
  /** The phone battery level value */
  phoneBatteryLevel: string
  /** The phone battery charging value */
  phoneBatteryCharging: string
  /** The phone OS value */
  phoneOs: string
  /** The phone OS version value */
  phoneOsVersion: string
  /** The phone model value */
  phoneModel: string
  [k: string]: unknown
}

const hashRecord = 'main'

export function isRecord<V>(v: V) {
  return is$typed(v, id, hashRecord)
}

export function validateRecord<V>(v: V) {
  return validate<Record & V>(v, id, hashRecord, true)
}
