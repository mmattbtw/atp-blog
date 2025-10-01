/**
 * GENERATED CODE - DO NOT MODIFY
 */
import {
  Lexicons,
  ValidationError,
  type LexiconDoc,
  type ValidationResult,
} from "@atproto/lexicon";

import { is$typed, maybe$typed } from "./util";

export const schemaDict = {
  NetMmattRightNow: {
    lexicon: 1,
    id: "net.mmatt.right.now",
    defs: {
      main: {
        type: "record",
        description: "A personal lexicon for mmatt's statuslog.",
        key: "tid",
        record: {
          type: "object",
          required: ["createdAt", "text"],
          properties: {
            createdAt: {
              type: "string",
              format: "datetime",
              description: "The unix timestamp of when the status was recorded",
            },
            text: {
              type: "string",
              description: "The text of the status update",
            },
            emoji: {
              type: "string",
              description: "The emoji of the status update",
            },
          },
        },
      },
    },
  },
} as const satisfies Record<string, LexiconDoc>;
export const schemas = Object.values(schemaDict) satisfies LexiconDoc[];
export const lexicons: Lexicons = new Lexicons(schemas);

export function validate<T extends { $type: string }>(
  v: unknown,
  id: string,
  hash: string,
  requiredType: true,
): ValidationResult<T>;
export function validate<T extends { $type?: string }>(
  v: unknown,
  id: string,
  hash: string,
  requiredType?: false,
): ValidationResult<T>;
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
          `Must be an object with "${hash === "main" ? id : `${id}#${hash}`}" $type property`,
        ),
      };
}

export const ids = {
  NetMmattRightNow: "net.mmatt.right.now",
} as const;
