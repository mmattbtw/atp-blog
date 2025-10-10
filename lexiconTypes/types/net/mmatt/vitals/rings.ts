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
const id = 'net.mmatt.vitals.rings'

export interface Record {
  $type: 'net.mmatt.vitals.rings'
  /** The unix timestamp of when the vital was recorded */
  createdAt: string
  /** The move ring value */
  ringsMove: number
  /** The exercise ring value */
  ringsExercise: number
  /** The stand hours ring value */
  ringsStandHours: number
  /** The move goal ring value */
  ringsMoveGoal: number
  /** The exercise goal ring value */
  ringsExerciseGoal: number
  /** The stand hours goal ring value */
  ringsStandHoursGoal: number
  /** The steps value */
  ringsSteps: number
  /** The burned calories value */
  ringsBurnedCalories: number
  [k: string]: unknown
}

const hashRecord = 'main'

export function isRecord<V>(v: V) {
  return is$typed(v, id, hashRecord)
}

export function validateRecord<V>(v: V) {
  return validate<Record & V>(v, id, hashRecord, true)
}
