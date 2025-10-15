/**
 * GENERATED CODE - DO NOT MODIFY
 */
import {
  type LexiconDoc,
  Lexicons,
  ValidationError,
  type ValidationResult,
} from '@atproto/lexicon'
import { type $Typed, is$typed, maybe$typed } from './util.js'

export const schemaDict = {
  NetMmattRightNow: {
    lexicon: 1,
    id: 'net.mmatt.right.now',
    defs: {
      main: {
        type: 'record',
        key: 'tid',
        record: {
          type: 'object',
          properties: {
            createdAt: {
              type: 'string',
              format: 'datetime',
              description: 'The unix timestamp of when the status was recorded',
            },
            text: {
              type: 'string',
              description: 'The text of the status update',
            },
            emoji: {
              type: 'string',
              description: 'The emoji of the status update',
            },
          },
          required: ['createdAt', 'text'],
        },
        description: "A personal lexicon for mmatt's statuslog.",
      },
    },
  },
  NetMmattVitalsCar: {
    lexicon: 1,
    id: 'net.mmatt.vitals.car',
    defs: {
      main: {
        type: 'record',
        key: 'tid',
        record: {
          type: 'object',
          properties: {
            createdAt: {
              type: 'string',
              format: 'datetime',
              description: 'The unix timestamp of when the vital was recorded',
            },
            carFuelRange: {
              type: 'integer',
              description: 'The car fuel range value in miles',
            },
            carPercentFuelRemaining: {
              type: 'string',
              description:
                'The car fuel level value in percentage (floating point string)',
            },
            amountRemaining: {
              type: 'string',
              description:
                'The car fuel amount remaining value (floating point string)',
            },
            carTraveledDistance: {
              type: 'integer',
              description: 'The car traveled distance value',
            },
            carMake: {
              type: 'string',
              description: 'The car make value',
            },
            carModel: {
              type: 'string',
              description: 'The car model value',
            },
            carYear: {
              type: 'integer',
              description: 'The car year value',
            },
          },
          required: [
            'createdAt',
            'carFuelRange',
            'carPercentFuelRemaining',
            'amountRemaining',
            'carTraveledDistance',
          ],
        },
      },
    },
  },
  NetMmattVitalsRings: {
    lexicon: 1,
    id: 'net.mmatt.vitals.rings',
    defs: {
      main: {
        type: 'record',
        key: 'tid',
        record: {
          type: 'object',
          properties: {
            createdAt: {
              type: 'string',
              format: 'datetime',
              description: 'The unix timestamp of when the vital was recorded',
            },
            ringsMove: {
              type: 'integer',
              description: 'The move ring value',
            },
            ringsExercise: {
              type: 'integer',
              description: 'The exercise ring value',
            },
            ringsStandHours: {
              type: 'integer',
              description: 'The stand hours ring value',
            },
            ringsMoveGoal: {
              type: 'integer',
              description: 'The move goal ring value',
            },
            ringsExerciseGoal: {
              type: 'integer',
              description: 'The exercise goal ring value',
            },
            ringsStandHoursGoal: {
              type: 'integer',
              description: 'The stand hours goal ring value',
            },
            ringsSteps: {
              type: 'integer',
              description: 'The steps value',
            },
            ringsBurnedCalories: {
              type: 'integer',
              description: 'The burned calories value',
            },
            heartRate: {
              type: 'integer',
              description: 'The heart rate value',
            },
          },
          required: [
            'createdAt',
            'ringsMove',
            'ringsExercise',
            'ringsStandHours',
            'ringsMoveGoal',
            'ringsExerciseGoal',
            'ringsStandHoursGoal',
            'ringsSteps',
            'ringsBurnedCalories',
            'heartRate',
          ],
        },
      },
    },
  },
  NetMmattVitalsPhone: {
    lexicon: 1,
    id: 'net.mmatt.vitals.phone',
    defs: {
      main: {
        type: 'record',
        key: 'tid',
        record: {
          type: 'object',
          properties: {
            createdAt: {
              type: 'string',
              format: 'datetime',
              description: 'The unix timestamp of when the vital was recorded',
            },
            phoneMotion: {
              type: 'string',
              description: 'The phone motion value',
            },
            phoneVolume: {
              type: 'string',
              description: 'The phone volume value',
            },
            phoneAppearance: {
              type: 'string',
              description: 'The phone appearance value',
            },
            phoneBrightness: {
              type: 'string',
              description: 'The phone brightness value',
            },
            phoneOrientation: {
              type: 'string',
              description: 'The phone orientation value',
            },
            phoneCellBars: {
              type: 'string',
              description: 'The phone cell bars value',
            },
            phoneCellNetwork: {
              type: 'string',
              description: 'The phone cell network value',
            },
            phoneBatteryLevel: {
              type: 'string',
              description: 'The phone battery level value',
            },
            phoneBatteryCharging: {
              type: 'string',
              description: 'The phone battery charging value',
            },
            phoneOs: {
              type: 'string',
              description: 'The phone OS value',
            },
            phoneOsVersion: {
              type: 'string',
              description: 'The phone OS version value',
            },
            phoneModel: {
              type: 'string',
              description: 'The phone model value',
            },
          },
          required: [
            'createdAt',
            'phoneMotion',
            'phoneVolume',
            'phoneAppearance',
            'phoneBrightness',
            'phoneOrientation',
            'phoneCellBars',
            'phoneCellNetwork',
            'phoneBatteryLevel',
            'phoneBatteryCharging',
            'phoneOs',
            'phoneOsVersion',
            'phoneModel',
          ],
        },
      },
    },
  },
} as const satisfies Record<string, LexiconDoc>
export const schemas = Object.values(schemaDict) satisfies LexiconDoc[]
export const lexicons: Lexicons = new Lexicons(schemas)

export function validate<T extends { $type: string }>(
  v: unknown,
  id: string,
  hash: string,
  requiredType: true,
): ValidationResult<T>
export function validate<T extends { $type?: string }>(
  v: unknown,
  id: string,
  hash: string,
  requiredType?: false,
): ValidationResult<T>
export function validate(
  v: unknown,
  id: string,
  hash: string,
  requiredType?: boolean,
): ValidationResult {
  return (requiredType ? is$typed : maybe$typed)(v, id, hash)
    ? lexicons.validate(`${id}#${hash}`, v)
    : {
        success: false,
        error: new ValidationError(
          `Must be an object with "${hash === 'main' ? id : `${id}#${hash}`}" $type property`,
        ),
      }
}

export const ids = {
  NetMmattRightNow: 'net.mmatt.right.now',
  NetMmattVitalsCar: 'net.mmatt.vitals.car',
  NetMmattVitalsRings: 'net.mmatt.vitals.rings',
  NetMmattVitalsPhone: 'net.mmatt.vitals.phone',
} as const
