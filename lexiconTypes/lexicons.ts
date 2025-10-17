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
  AppBskyEmbedDefs: {
    lexicon: 1,
    id: 'app.bsky.embed.defs',
    defs: {
      aspectRatio: {
        type: 'object',
        required: ['width', 'height'],
        properties: {
          width: {
            type: 'integer',
            minimum: 1,
          },
          height: {
            type: 'integer',
            minimum: 1,
          },
        },
        description:
          'width:height represents an aspect ratio. It may be approximate, and may not correspond to absolute dimensions in any given unit.',
      },
    },
  },
  AppBskyEmbedRecord: {
    lexicon: 1,
    id: 'app.bsky.embed.record',
    description:
      'A representation of a record embedded in a Bluesky record (eg, a post). For example, a quote-post, or sharing a feed generator record.',
    defs: {
      main: {
        type: 'object',
        required: ['record'],
        properties: {
          record: {
            ref: 'lex:com.atproto.repo.strongRef',
            type: 'ref',
          },
        },
      },
      view: {
        type: 'object',
        required: ['record'],
        properties: {
          record: {
            refs: [
              'lex:app.bsky.embed.record#viewRecord',
              'lex:app.bsky.embed.record#viewNotFound',
              'lex:app.bsky.embed.record#viewBlocked',
              'lex:app.bsky.embed.record#viewDetached',
              'lex:app.bsky.feed.defs#generatorView',
              'lex:app.bsky.graph.defs#listView',
              'lex:app.bsky.labeler.defs#labelerView',
              'lex:app.bsky.graph.defs#starterPackViewBasic',
            ],
            type: 'union',
          },
        },
      },
      viewRecord: {
        type: 'object',
        required: ['uri', 'cid', 'author', 'value', 'indexedAt'],
        properties: {
          cid: {
            type: 'string',
            format: 'cid',
          },
          uri: {
            type: 'string',
            format: 'at-uri',
          },
          value: {
            type: 'unknown',
            description: 'The record data itself.',
          },
          author: {
            ref: 'lex:app.bsky.actor.defs#profileViewBasic',
            type: 'ref',
          },
          embeds: {
            type: 'array',
            items: {
              refs: [
                'lex:app.bsky.embed.images#view',
                'lex:app.bsky.embed.video#view',
                'lex:app.bsky.embed.external#view',
                'lex:app.bsky.embed.record#view',
                'lex:app.bsky.embed.recordWithMedia#view',
              ],
              type: 'union',
            },
          },
          labels: {
            type: 'array',
            items: {
              ref: 'lex:com.atproto.label.defs#label',
              type: 'ref',
            },
          },
          indexedAt: {
            type: 'string',
            format: 'datetime',
          },
          likeCount: {
            type: 'integer',
          },
          quoteCount: {
            type: 'integer',
          },
          replyCount: {
            type: 'integer',
          },
          repostCount: {
            type: 'integer',
          },
        },
      },
      viewBlocked: {
        type: 'object',
        required: ['uri', 'blocked', 'author'],
        properties: {
          uri: {
            type: 'string',
            format: 'at-uri',
          },
          author: {
            ref: 'lex:app.bsky.feed.defs#blockedAuthor',
            type: 'ref',
          },
          blocked: {
            type: 'boolean',
            const: true,
          },
        },
      },
      viewDetached: {
        type: 'object',
        required: ['uri', 'detached'],
        properties: {
          uri: {
            type: 'string',
            format: 'at-uri',
          },
          detached: {
            type: 'boolean',
            const: true,
          },
        },
      },
      viewNotFound: {
        type: 'object',
        required: ['uri', 'notFound'],
        properties: {
          uri: {
            type: 'string',
            format: 'at-uri',
          },
          notFound: {
            type: 'boolean',
            const: true,
          },
        },
      },
    },
  },
  AppBskyEmbedImages: {
    lexicon: 1,
    id: 'app.bsky.embed.images',
    description: 'A set of images embedded in a Bluesky record (eg, a post).',
    defs: {
      main: {
        type: 'object',
        required: ['images'],
        properties: {
          images: {
            type: 'array',
            items: {
              ref: 'lex:app.bsky.embed.images#image',
              type: 'ref',
            },
            maxLength: 4,
          },
        },
      },
      view: {
        type: 'object',
        required: ['images'],
        properties: {
          images: {
            type: 'array',
            items: {
              ref: 'lex:app.bsky.embed.images#viewImage',
              type: 'ref',
            },
            maxLength: 4,
          },
        },
      },
      image: {
        type: 'object',
        required: ['image', 'alt'],
        properties: {
          alt: {
            type: 'string',
            description:
              'Alt text description of the image, for accessibility.',
          },
          image: {
            type: 'blob',
            accept: ['image/*'],
            maxSize: 1000000,
          },
          aspectRatio: {
            ref: 'lex:app.bsky.embed.defs#aspectRatio',
            type: 'ref',
          },
        },
      },
      viewImage: {
        type: 'object',
        required: ['thumb', 'fullsize', 'alt'],
        properties: {
          alt: {
            type: 'string',
            description:
              'Alt text description of the image, for accessibility.',
          },
          thumb: {
            type: 'string',
            format: 'uri',
            description:
              'Fully-qualified URL where a thumbnail of the image can be fetched. For example, CDN location provided by the App View.',
          },
          fullsize: {
            type: 'string',
            format: 'uri',
            description:
              'Fully-qualified URL where a large version of the image can be fetched. May or may not be the exact original blob. For example, CDN location provided by the App View.',
          },
          aspectRatio: {
            ref: 'lex:app.bsky.embed.defs#aspectRatio',
            type: 'ref',
          },
        },
      },
    },
  },
  AppBskyEmbedRecordWithMedia: {
    lexicon: 1,
    id: 'app.bsky.embed.recordWithMedia',
    description:
      'A representation of a record embedded in a Bluesky record (eg, a post), alongside other compatible embeds. For example, a quote post and image, or a quote post and external URL card.',
    defs: {
      main: {
        type: 'object',
        required: ['record', 'media'],
        properties: {
          media: {
            refs: [
              'lex:app.bsky.embed.images',
              'lex:app.bsky.embed.video',
              'lex:app.bsky.embed.external',
            ],
            type: 'union',
          },
          record: {
            ref: 'lex:app.bsky.embed.record',
            type: 'ref',
          },
        },
      },
      view: {
        type: 'object',
        required: ['record', 'media'],
        properties: {
          media: {
            refs: [
              'lex:app.bsky.embed.images#view',
              'lex:app.bsky.embed.video#view',
              'lex:app.bsky.embed.external#view',
            ],
            type: 'union',
          },
          record: {
            ref: 'lex:app.bsky.embed.record#view',
            type: 'ref',
          },
        },
      },
    },
  },
  AppBskyEmbedVideo: {
    lexicon: 1,
    id: 'app.bsky.embed.video',
    description: 'A video embedded in a Bluesky record (eg, a post).',
    defs: {
      main: {
        type: 'object',
        required: ['video'],
        properties: {
          alt: {
            type: 'string',
            maxLength: 10000,
            description:
              'Alt text description of the video, for accessibility.',
            maxGraphemes: 1000,
          },
          video: {
            type: 'blob',
            accept: ['video/mp4'],
            maxSize: 100000000,
            description:
              'The mp4 video file. May be up to 100mb, formerly limited to 50mb.',
          },
          captions: {
            type: 'array',
            items: {
              ref: 'lex:app.bsky.embed.video#caption',
              type: 'ref',
            },
            maxLength: 20,
          },
          aspectRatio: {
            ref: 'lex:app.bsky.embed.defs#aspectRatio',
            type: 'ref',
          },
        },
      },
      view: {
        type: 'object',
        required: ['cid', 'playlist'],
        properties: {
          alt: {
            type: 'string',
            maxLength: 10000,
            maxGraphemes: 1000,
          },
          cid: {
            type: 'string',
            format: 'cid',
          },
          playlist: {
            type: 'string',
            format: 'uri',
          },
          thumbnail: {
            type: 'string',
            format: 'uri',
          },
          aspectRatio: {
            ref: 'lex:app.bsky.embed.defs#aspectRatio',
            type: 'ref',
          },
        },
      },
      caption: {
        type: 'object',
        required: ['lang', 'file'],
        properties: {
          file: {
            type: 'blob',
            accept: ['text/vtt'],
            maxSize: 20000,
          },
          lang: {
            type: 'string',
            format: 'language',
          },
        },
      },
    },
  },
  AppBskyEmbedExternal: {
    lexicon: 1,
    id: 'app.bsky.embed.external',
    defs: {
      main: {
        type: 'object',
        required: ['external'],
        properties: {
          external: {
            ref: 'lex:app.bsky.embed.external#external',
            type: 'ref',
          },
        },
        description:
          "A representation of some externally linked content (eg, a URL and 'card'), embedded in a Bluesky record (eg, a post).",
      },
      view: {
        type: 'object',
        required: ['external'],
        properties: {
          external: {
            ref: 'lex:app.bsky.embed.external#viewExternal',
            type: 'ref',
          },
        },
      },
      external: {
        type: 'object',
        required: ['uri', 'title', 'description'],
        properties: {
          uri: {
            type: 'string',
            format: 'uri',
          },
          thumb: {
            type: 'blob',
            accept: ['image/*'],
            maxSize: 1000000,
          },
          title: {
            type: 'string',
          },
          description: {
            type: 'string',
          },
        },
      },
      viewExternal: {
        type: 'object',
        required: ['uri', 'title', 'description'],
        properties: {
          uri: {
            type: 'string',
            format: 'uri',
          },
          thumb: {
            type: 'string',
            format: 'uri',
          },
          title: {
            type: 'string',
          },
          description: {
            type: 'string',
          },
        },
      },
    },
  },
  AppBskyNotificationDefs: {
    lexicon: 1,
    id: 'app.bsky.notification.defs',
    defs: {
      preference: {
        type: 'object',
        required: ['list', 'push'],
        properties: {
          list: {
            type: 'boolean',
          },
          push: {
            type: 'boolean',
          },
        },
      },
      preferences: {
        type: 'object',
        required: [
          'chat',
          'follow',
          'like',
          'likeViaRepost',
          'mention',
          'quote',
          'reply',
          'repost',
          'repostViaRepost',
          'starterpackJoined',
          'subscribedPost',
          'unverified',
          'verified',
        ],
        properties: {
          chat: {
            ref: 'lex:app.bsky.notification.defs#chatPreference',
            type: 'ref',
          },
          like: {
            ref: 'lex:app.bsky.notification.defs#filterablePreference',
            type: 'ref',
          },
          quote: {
            ref: 'lex:app.bsky.notification.defs#filterablePreference',
            type: 'ref',
          },
          reply: {
            ref: 'lex:app.bsky.notification.defs#filterablePreference',
            type: 'ref',
          },
          follow: {
            ref: 'lex:app.bsky.notification.defs#filterablePreference',
            type: 'ref',
          },
          repost: {
            ref: 'lex:app.bsky.notification.defs#filterablePreference',
            type: 'ref',
          },
          mention: {
            ref: 'lex:app.bsky.notification.defs#filterablePreference',
            type: 'ref',
          },
          verified: {
            ref: 'lex:app.bsky.notification.defs#preference',
            type: 'ref',
          },
          unverified: {
            ref: 'lex:app.bsky.notification.defs#preference',
            type: 'ref',
          },
          likeViaRepost: {
            ref: 'lex:app.bsky.notification.defs#filterablePreference',
            type: 'ref',
          },
          subscribedPost: {
            ref: 'lex:app.bsky.notification.defs#preference',
            type: 'ref',
          },
          repostViaRepost: {
            ref: 'lex:app.bsky.notification.defs#filterablePreference',
            type: 'ref',
          },
          starterpackJoined: {
            ref: 'lex:app.bsky.notification.defs#preference',
            type: 'ref',
          },
        },
      },
      recordDeleted: {
        type: 'object',
        properties: {},
      },
      chatPreference: {
        type: 'object',
        required: ['include', 'push'],
        properties: {
          push: {
            type: 'boolean',
          },
          include: {
            type: 'string',
            knownValues: ['all', 'accepted'],
          },
        },
      },
      activitySubscription: {
        type: 'object',
        required: ['post', 'reply'],
        properties: {
          post: {
            type: 'boolean',
          },
          reply: {
            type: 'boolean',
          },
        },
      },
      filterablePreference: {
        type: 'object',
        required: ['include', 'list', 'push'],
        properties: {
          list: {
            type: 'boolean',
          },
          push: {
            type: 'boolean',
          },
          include: {
            type: 'string',
            knownValues: ['all', 'follows'],
          },
        },
      },
      subjectActivitySubscription: {
        type: 'object',
        required: ['subject', 'activitySubscription'],
        properties: {
          subject: {
            type: 'string',
            format: 'did',
          },
          activitySubscription: {
            ref: 'lex:app.bsky.notification.defs#activitySubscription',
            type: 'ref',
          },
        },
        description:
          'Object used to store activity subscription data in stash.',
      },
    },
  },
  AppBskyGraphDefs: {
    lexicon: 1,
    id: 'app.bsky.graph.defs',
    defs: {
      modlist: {
        type: 'token',
        description:
          'A list of actors to apply an aggregate moderation action (mute/block) on.',
      },
      listView: {
        type: 'object',
        required: ['uri', 'cid', 'creator', 'name', 'purpose', 'indexedAt'],
        properties: {
          cid: {
            type: 'string',
            format: 'cid',
          },
          uri: {
            type: 'string',
            format: 'at-uri',
          },
          name: {
            type: 'string',
            maxLength: 64,
            minLength: 1,
          },
          avatar: {
            type: 'string',
            format: 'uri',
          },
          labels: {
            type: 'array',
            items: {
              ref: 'lex:com.atproto.label.defs#label',
              type: 'ref',
            },
          },
          viewer: {
            ref: 'lex:app.bsky.graph.defs#listViewerState',
            type: 'ref',
          },
          creator: {
            ref: 'lex:app.bsky.actor.defs#profileView',
            type: 'ref',
          },
          purpose: {
            ref: 'lex:app.bsky.graph.defs#listPurpose',
            type: 'ref',
          },
          indexedAt: {
            type: 'string',
            format: 'datetime',
          },
          description: {
            type: 'string',
            maxLength: 3000,
            maxGraphemes: 300,
          },
          listItemCount: {
            type: 'integer',
            minimum: 0,
          },
          descriptionFacets: {
            type: 'array',
            items: {
              ref: 'lex:app.bsky.richtext.facet',
              type: 'ref',
            },
          },
        },
      },
      curatelist: {
        type: 'token',
        description:
          'A list of actors used for curation purposes such as list feeds or interaction gating.',
      },
      listPurpose: {
        type: 'string',
        knownValues: [
          'app.bsky.graph.defs#modlist',
          'app.bsky.graph.defs#curatelist',
          'app.bsky.graph.defs#referencelist',
        ],
      },
      listItemView: {
        type: 'object',
        required: ['uri', 'subject'],
        properties: {
          uri: {
            type: 'string',
            format: 'at-uri',
          },
          subject: {
            ref: 'lex:app.bsky.actor.defs#profileView',
            type: 'ref',
          },
        },
      },
      relationship: {
        type: 'object',
        required: ['did'],
        properties: {
          did: {
            type: 'string',
            format: 'did',
          },
          following: {
            type: 'string',
            format: 'at-uri',
            description:
              'if the actor follows this DID, this is the AT-URI of the follow record',
          },
          followedBy: {
            type: 'string',
            format: 'at-uri',
            description:
              'if the actor is followed by this DID, contains the AT-URI of the follow record',
          },
        },
        description:
          'lists the bi-directional graph relationships between one actor (not indicated in the object), and the target actors (the DID included in the object)',
      },
      listViewBasic: {
        type: 'object',
        required: ['uri', 'cid', 'name', 'purpose'],
        properties: {
          cid: {
            type: 'string',
            format: 'cid',
          },
          uri: {
            type: 'string',
            format: 'at-uri',
          },
          name: {
            type: 'string',
            maxLength: 64,
            minLength: 1,
          },
          avatar: {
            type: 'string',
            format: 'uri',
          },
          labels: {
            type: 'array',
            items: {
              ref: 'lex:com.atproto.label.defs#label',
              type: 'ref',
            },
          },
          viewer: {
            ref: 'lex:app.bsky.graph.defs#listViewerState',
            type: 'ref',
          },
          purpose: {
            ref: 'lex:app.bsky.graph.defs#listPurpose',
            type: 'ref',
          },
          indexedAt: {
            type: 'string',
            format: 'datetime',
          },
          listItemCount: {
            type: 'integer',
            minimum: 0,
          },
        },
      },
      notFoundActor: {
        type: 'object',
        required: ['actor', 'notFound'],
        properties: {
          actor: {
            type: 'string',
            format: 'at-identifier',
          },
          notFound: {
            type: 'boolean',
            const: true,
          },
        },
        description: 'indicates that a handle or DID could not be resolved',
      },
      referencelist: {
        type: 'token',
        description:
          'A list of actors used for only for reference purposes such as within a starter pack.',
      },
      listViewerState: {
        type: 'object',
        properties: {
          muted: {
            type: 'boolean',
          },
          blocked: {
            type: 'string',
            format: 'at-uri',
          },
        },
      },
      starterPackView: {
        type: 'object',
        required: ['uri', 'cid', 'record', 'creator', 'indexedAt'],
        properties: {
          cid: {
            type: 'string',
            format: 'cid',
          },
          uri: {
            type: 'string',
            format: 'at-uri',
          },
          list: {
            ref: 'lex:app.bsky.graph.defs#listViewBasic',
            type: 'ref',
          },
          feeds: {
            type: 'array',
            items: {
              ref: 'lex:app.bsky.feed.defs#generatorView',
              type: 'ref',
            },
            maxLength: 3,
          },
          labels: {
            type: 'array',
            items: {
              ref: 'lex:com.atproto.label.defs#label',
              type: 'ref',
            },
          },
          record: {
            type: 'unknown',
          },
          creator: {
            ref: 'lex:app.bsky.actor.defs#profileViewBasic',
            type: 'ref',
          },
          indexedAt: {
            type: 'string',
            format: 'datetime',
          },
          joinedWeekCount: {
            type: 'integer',
            minimum: 0,
          },
          listItemsSample: {
            type: 'array',
            items: {
              ref: 'lex:app.bsky.graph.defs#listItemView',
              type: 'ref',
            },
            maxLength: 12,
          },
          joinedAllTimeCount: {
            type: 'integer',
            minimum: 0,
          },
        },
      },
      starterPackViewBasic: {
        type: 'object',
        required: ['uri', 'cid', 'record', 'creator', 'indexedAt'],
        properties: {
          cid: {
            type: 'string',
            format: 'cid',
          },
          uri: {
            type: 'string',
            format: 'at-uri',
          },
          labels: {
            type: 'array',
            items: {
              ref: 'lex:com.atproto.label.defs#label',
              type: 'ref',
            },
          },
          record: {
            type: 'unknown',
          },
          creator: {
            ref: 'lex:app.bsky.actor.defs#profileViewBasic',
            type: 'ref',
          },
          indexedAt: {
            type: 'string',
            format: 'datetime',
          },
          listItemCount: {
            type: 'integer',
            minimum: 0,
          },
          joinedWeekCount: {
            type: 'integer',
            minimum: 0,
          },
          joinedAllTimeCount: {
            type: 'integer',
            minimum: 0,
          },
        },
      },
    },
  },
  AppBskyFeedDefs: {
    lexicon: 1,
    id: 'app.bsky.feed.defs',
    defs: {
      postView: {
        type: 'object',
        required: ['uri', 'cid', 'author', 'record', 'indexedAt'],
        properties: {
          cid: {
            type: 'string',
            format: 'cid',
          },
          uri: {
            type: 'string',
            format: 'at-uri',
          },
          embed: {
            refs: [
              'lex:app.bsky.embed.images#view',
              'lex:app.bsky.embed.video#view',
              'lex:app.bsky.embed.external#view',
              'lex:app.bsky.embed.record#view',
              'lex:app.bsky.embed.recordWithMedia#view',
            ],
            type: 'union',
          },
          author: {
            ref: 'lex:app.bsky.actor.defs#profileViewBasic',
            type: 'ref',
          },
          labels: {
            type: 'array',
            items: {
              ref: 'lex:com.atproto.label.defs#label',
              type: 'ref',
            },
          },
          record: {
            type: 'unknown',
          },
          viewer: {
            ref: 'lex:app.bsky.feed.defs#viewerState',
            type: 'ref',
          },
          indexedAt: {
            type: 'string',
            format: 'datetime',
          },
          likeCount: {
            type: 'integer',
          },
          quoteCount: {
            type: 'integer',
          },
          replyCount: {
            type: 'integer',
          },
          threadgate: {
            ref: 'lex:app.bsky.feed.defs#threadgateView',
            type: 'ref',
          },
          repostCount: {
            type: 'integer',
          },
          bookmarkCount: {
            type: 'integer',
          },
        },
      },
      replyRef: {
        type: 'object',
        required: ['root', 'parent'],
        properties: {
          root: {
            refs: [
              'lex:app.bsky.feed.defs#postView',
              'lex:app.bsky.feed.defs#notFoundPost',
              'lex:app.bsky.feed.defs#blockedPost',
            ],
            type: 'union',
          },
          parent: {
            refs: [
              'lex:app.bsky.feed.defs#postView',
              'lex:app.bsky.feed.defs#notFoundPost',
              'lex:app.bsky.feed.defs#blockedPost',
            ],
            type: 'union',
          },
          grandparentAuthor: {
            ref: 'lex:app.bsky.actor.defs#profileViewBasic',
            type: 'ref',
            description:
              'When parent is a reply to another post, this is the author of that post.',
          },
        },
      },
      reasonPin: {
        type: 'object',
        properties: {},
      },
      blockedPost: {
        type: 'object',
        required: ['uri', 'blocked', 'author'],
        properties: {
          uri: {
            type: 'string',
            format: 'at-uri',
          },
          author: {
            ref: 'lex:app.bsky.feed.defs#blockedAuthor',
            type: 'ref',
          },
          blocked: {
            type: 'boolean',
            const: true,
          },
        },
      },
      interaction: {
        type: 'object',
        properties: {
          item: {
            type: 'string',
            format: 'at-uri',
          },
          event: {
            type: 'string',
            knownValues: [
              'app.bsky.feed.defs#requestLess',
              'app.bsky.feed.defs#requestMore',
              'app.bsky.feed.defs#clickthroughItem',
              'app.bsky.feed.defs#clickthroughAuthor',
              'app.bsky.feed.defs#clickthroughReposter',
              'app.bsky.feed.defs#clickthroughEmbed',
              'app.bsky.feed.defs#interactionSeen',
              'app.bsky.feed.defs#interactionLike',
              'app.bsky.feed.defs#interactionRepost',
              'app.bsky.feed.defs#interactionReply',
              'app.bsky.feed.defs#interactionQuote',
              'app.bsky.feed.defs#interactionShare',
            ],
          },
          reqId: {
            type: 'string',
            maxLength: 100,
            description:
              'Unique identifier per request that may be passed back alongside interactions.',
          },
          feedContext: {
            type: 'string',
            maxLength: 2000,
            description:
              'Context on a feed item that was originally supplied by the feed generator on getFeedSkeleton.',
          },
        },
      },
      requestLess: {
        type: 'token',
        description:
          'Request that less content like the given feed item be shown in the feed',
      },
      requestMore: {
        type: 'token',
        description:
          'Request that more content like the given feed item be shown in the feed',
      },
      viewerState: {
        type: 'object',
        properties: {
          like: {
            type: 'string',
            format: 'at-uri',
          },
          pinned: {
            type: 'boolean',
          },
          repost: {
            type: 'string',
            format: 'at-uri',
          },
          bookmarked: {
            type: 'boolean',
          },
          threadMuted: {
            type: 'boolean',
          },
          replyDisabled: {
            type: 'boolean',
          },
          embeddingDisabled: {
            type: 'boolean',
          },
        },
        description:
          "Metadata about the requesting account's relationship with the subject content. Only has meaningful content for authed requests.",
      },
      feedViewPost: {
        type: 'object',
        required: ['post'],
        properties: {
          post: {
            ref: 'lex:app.bsky.feed.defs#postView',
            type: 'ref',
          },
          reply: {
            ref: 'lex:app.bsky.feed.defs#replyRef',
            type: 'ref',
          },
          reqId: {
            type: 'string',
            maxLength: 100,
            description:
              'Unique identifier per request that may be passed back alongside interactions.',
          },
          reason: {
            refs: [
              'lex:app.bsky.feed.defs#reasonRepost',
              'lex:app.bsky.feed.defs#reasonPin',
            ],
            type: 'union',
          },
          feedContext: {
            type: 'string',
            maxLength: 2000,
            description:
              'Context provided by feed generator that may be passed back alongside interactions.',
          },
        },
      },
      notFoundPost: {
        type: 'object',
        required: ['uri', 'notFound'],
        properties: {
          uri: {
            type: 'string',
            format: 'at-uri',
          },
          notFound: {
            type: 'boolean',
            const: true,
          },
        },
      },
      reasonRepost: {
        type: 'object',
        required: ['by', 'indexedAt'],
        properties: {
          by: {
            ref: 'lex:app.bsky.actor.defs#profileViewBasic',
            type: 'ref',
          },
          cid: {
            type: 'string',
            format: 'cid',
          },
          uri: {
            type: 'string',
            format: 'at-uri',
          },
          indexedAt: {
            type: 'string',
            format: 'datetime',
          },
        },
      },
      blockedAuthor: {
        type: 'object',
        required: ['did'],
        properties: {
          did: {
            type: 'string',
            format: 'did',
          },
          viewer: {
            ref: 'lex:app.bsky.actor.defs#viewerState',
            type: 'ref',
          },
        },
      },
      generatorView: {
        type: 'object',
        required: ['uri', 'cid', 'did', 'creator', 'displayName', 'indexedAt'],
        properties: {
          cid: {
            type: 'string',
            format: 'cid',
          },
          did: {
            type: 'string',
            format: 'did',
          },
          uri: {
            type: 'string',
            format: 'at-uri',
          },
          avatar: {
            type: 'string',
            format: 'uri',
          },
          labels: {
            type: 'array',
            items: {
              ref: 'lex:com.atproto.label.defs#label',
              type: 'ref',
            },
          },
          viewer: {
            ref: 'lex:app.bsky.feed.defs#generatorViewerState',
            type: 'ref',
          },
          creator: {
            ref: 'lex:app.bsky.actor.defs#profileView',
            type: 'ref',
          },
          indexedAt: {
            type: 'string',
            format: 'datetime',
          },
          likeCount: {
            type: 'integer',
            minimum: 0,
          },
          contentMode: {
            type: 'string',
            knownValues: [
              'app.bsky.feed.defs#contentModeUnspecified',
              'app.bsky.feed.defs#contentModeVideo',
            ],
          },
          description: {
            type: 'string',
            maxLength: 3000,
            maxGraphemes: 300,
          },
          displayName: {
            type: 'string',
          },
          descriptionFacets: {
            type: 'array',
            items: {
              ref: 'lex:app.bsky.richtext.facet',
              type: 'ref',
            },
          },
          acceptsInteractions: {
            type: 'boolean',
          },
        },
      },
      threadContext: {
        type: 'object',
        properties: {
          rootAuthorLike: {
            type: 'string',
            format: 'at-uri',
          },
        },
        description:
          'Metadata about this post within the context of the thread it is in.',
      },
      threadViewPost: {
        type: 'object',
        required: ['post'],
        properties: {
          post: {
            ref: 'lex:app.bsky.feed.defs#postView',
            type: 'ref',
          },
          parent: {
            refs: [
              'lex:app.bsky.feed.defs#threadViewPost',
              'lex:app.bsky.feed.defs#notFoundPost',
              'lex:app.bsky.feed.defs#blockedPost',
            ],
            type: 'union',
          },
          replies: {
            type: 'array',
            items: {
              refs: [
                'lex:app.bsky.feed.defs#threadViewPost',
                'lex:app.bsky.feed.defs#notFoundPost',
                'lex:app.bsky.feed.defs#blockedPost',
              ],
              type: 'union',
            },
          },
          threadContext: {
            ref: 'lex:app.bsky.feed.defs#threadContext',
            type: 'ref',
          },
        },
      },
      threadgateView: {
        type: 'object',
        properties: {
          cid: {
            type: 'string',
            format: 'cid',
          },
          uri: {
            type: 'string',
            format: 'at-uri',
          },
          lists: {
            type: 'array',
            items: {
              ref: 'lex:app.bsky.graph.defs#listViewBasic',
              type: 'ref',
            },
          },
          record: {
            type: 'unknown',
          },
        },
      },
      interactionLike: {
        type: 'token',
        description: 'User liked the feed item',
      },
      interactionSeen: {
        type: 'token',
        description: 'Feed item was seen by user',
      },
      clickthroughItem: {
        type: 'token',
        description: 'User clicked through to the feed item',
      },
      contentModeVideo: {
        type: 'token',
        description:
          'Declares the feed generator returns posts containing app.bsky.embed.video embeds.',
      },
      interactionQuote: {
        type: 'token',
        description: 'User quoted the feed item',
      },
      interactionReply: {
        type: 'token',
        description: 'User replied to the feed item',
      },
      interactionShare: {
        type: 'token',
        description: 'User shared the feed item',
      },
      skeletonFeedPost: {
        type: 'object',
        required: ['post'],
        properties: {
          post: {
            type: 'string',
            format: 'at-uri',
          },
          reason: {
            refs: [
              'lex:app.bsky.feed.defs#skeletonReasonRepost',
              'lex:app.bsky.feed.defs#skeletonReasonPin',
            ],
            type: 'union',
          },
          feedContext: {
            type: 'string',
            maxLength: 2000,
            description:
              'Context that will be passed through to client and may be passed to feed generator back alongside interactions.',
          },
        },
      },
      clickthroughEmbed: {
        type: 'token',
        description:
          'User clicked through to the embedded content of the feed item',
      },
      interactionRepost: {
        type: 'token',
        description: 'User reposted the feed item',
      },
      skeletonReasonPin: {
        type: 'object',
        properties: {},
      },
      clickthroughAuthor: {
        type: 'token',
        description: 'User clicked through to the author of the feed item',
      },
      clickthroughReposter: {
        type: 'token',
        description: 'User clicked through to the reposter of the feed item',
      },
      generatorViewerState: {
        type: 'object',
        properties: {
          like: {
            type: 'string',
            format: 'at-uri',
          },
        },
      },
      skeletonReasonRepost: {
        type: 'object',
        required: ['repost'],
        properties: {
          repost: {
            type: 'string',
            format: 'at-uri',
          },
        },
      },
      contentModeUnspecified: {
        type: 'token',
        description: 'Declares the feed generator returns any types of posts.',
      },
    },
  },
  AppBskyFeedPostgate: {
    lexicon: 1,
    id: 'app.bsky.feed.postgate',
    defs: {
      main: {
        key: 'tid',
        type: 'record',
        record: {
          type: 'object',
          required: ['post', 'createdAt'],
          properties: {
            post: {
              type: 'string',
              format: 'at-uri',
              description: 'Reference (AT-URI) to the post record.',
            },
            createdAt: {
              type: 'string',
              format: 'datetime',
            },
            embeddingRules: {
              type: 'array',
              items: {
                refs: ['lex:app.bsky.feed.postgate#disableRule'],
                type: 'union',
              },
              maxLength: 5,
              description:
                'List of rules defining who can embed this post. If value is an empty array or is undefined, no particular rules apply and anyone can embed.',
            },
            detachedEmbeddingUris: {
              type: 'array',
              items: {
                type: 'string',
                format: 'at-uri',
              },
              maxLength: 50,
              description:
                'List of AT-URIs embedding this post that the author has detached from.',
            },
          },
        },
        description:
          'Record defining interaction rules for a post. The record key (rkey) of the postgate record must match the record key of the post, and that record must be in the same repository.',
      },
      disableRule: {
        type: 'object',
        properties: {},
        description: 'Disables embedding of this post.',
      },
    },
  },
  AppBskyFeedThreadgate: {
    lexicon: 1,
    id: 'app.bsky.feed.threadgate',
    defs: {
      main: {
        key: 'tid',
        type: 'record',
        record: {
          type: 'object',
          required: ['post', 'createdAt'],
          properties: {
            post: {
              type: 'string',
              format: 'at-uri',
              description: 'Reference (AT-URI) to the post record.',
            },
            allow: {
              type: 'array',
              items: {
                refs: [
                  'lex:app.bsky.feed.threadgate#mentionRule',
                  'lex:app.bsky.feed.threadgate#followerRule',
                  'lex:app.bsky.feed.threadgate#followingRule',
                  'lex:app.bsky.feed.threadgate#listRule',
                ],
                type: 'union',
              },
              maxLength: 5,
              description:
                'List of rules defining who can reply to this post. If value is an empty array, no one can reply. If value is undefined, anyone can reply.',
            },
            createdAt: {
              type: 'string',
              format: 'datetime',
            },
            hiddenReplies: {
              type: 'array',
              items: {
                type: 'string',
                format: 'at-uri',
              },
              maxLength: 300,
              description: 'List of hidden reply URIs.',
            },
          },
        },
        description:
          "Record defining interaction gating rules for a thread (aka, reply controls). The record key (rkey) of the threadgate record must match the record key of the thread's root post, and that record must be in the same repository.",
      },
      listRule: {
        type: 'object',
        required: ['list'],
        properties: {
          list: {
            type: 'string',
            format: 'at-uri',
          },
        },
        description: 'Allow replies from actors on a list.',
      },
      mentionRule: {
        type: 'object',
        properties: {},
        description: 'Allow replies from actors mentioned in your post.',
      },
      followerRule: {
        type: 'object',
        properties: {},
        description: 'Allow replies from actors who follow you.',
      },
      followingRule: {
        type: 'object',
        properties: {},
        description: 'Allow replies from actors you follow.',
      },
    },
  },
  AppBskyFeedPost: {
    lexicon: 1,
    id: 'app.bsky.feed.post',
    defs: {
      main: {
        key: 'tid',
        type: 'record',
        record: {
          type: 'object',
          required: ['text', 'createdAt'],
          properties: {
            tags: {
              type: 'array',
              items: {
                type: 'string',
                maxLength: 640,
                maxGraphemes: 64,
              },
              maxLength: 8,
              description:
                'Additional hashtags, in addition to any included in post text and facets.',
            },
            text: {
              type: 'string',
              maxLength: 3000,
              description:
                'The primary post content. May be an empty string, if there are embeds.',
              maxGraphemes: 300,
            },
            embed: {
              refs: [
                'lex:app.bsky.embed.images',
                'lex:app.bsky.embed.video',
                'lex:app.bsky.embed.external',
                'lex:app.bsky.embed.record',
                'lex:app.bsky.embed.recordWithMedia',
              ],
              type: 'union',
            },
            langs: {
              type: 'array',
              items: {
                type: 'string',
                format: 'language',
              },
              maxLength: 3,
              description:
                'Indicates human language of post primary text content.',
            },
            reply: {
              ref: 'lex:app.bsky.feed.post#replyRef',
              type: 'ref',
            },
            facets: {
              type: 'array',
              items: {
                ref: 'lex:app.bsky.richtext.facet',
                type: 'ref',
              },
              description:
                'Annotations of text (mentions, URLs, hashtags, etc)',
            },
            labels: {
              refs: ['lex:com.atproto.label.defs#selfLabels'],
              type: 'union',
              description:
                'Self-label values for this post. Effectively content warnings.',
            },
            entities: {
              type: 'array',
              items: {
                ref: 'lex:app.bsky.feed.post#entity',
                type: 'ref',
              },
              description: 'DEPRECATED: replaced by app.bsky.richtext.facet.',
            },
            createdAt: {
              type: 'string',
              format: 'datetime',
              description:
                'Client-declared timestamp when this post was originally created.',
            },
          },
        },
        description: 'Record containing a Bluesky post.',
      },
      entity: {
        type: 'object',
        required: ['index', 'type', 'value'],
        properties: {
          type: {
            type: 'string',
            description: "Expected values are 'mention' and 'link'.",
          },
          index: {
            ref: 'lex:app.bsky.feed.post#textSlice',
            type: 'ref',
          },
          value: {
            type: 'string',
          },
        },
        description: 'Deprecated: use facets instead.',
      },
      replyRef: {
        type: 'object',
        required: ['root', 'parent'],
        properties: {
          root: {
            ref: 'lex:com.atproto.repo.strongRef',
            type: 'ref',
          },
          parent: {
            ref: 'lex:com.atproto.repo.strongRef',
            type: 'ref',
          },
        },
      },
      textSlice: {
        type: 'object',
        required: ['start', 'end'],
        properties: {
          end: {
            type: 'integer',
            minimum: 0,
          },
          start: {
            type: 'integer',
            minimum: 0,
          },
        },
        description:
          'Deprecated. Use app.bsky.richtext instead -- A text segment. Start is inclusive, end is exclusive. Indices are for utf16-encoded strings.',
      },
    },
  },
  AppBskyRichtextFacet: {
    lexicon: 1,
    id: 'app.bsky.richtext.facet',
    defs: {
      tag: {
        type: 'object',
        required: ['tag'],
        properties: {
          tag: {
            type: 'string',
            maxLength: 640,
            maxGraphemes: 64,
          },
        },
        description:
          "Facet feature for a hashtag. The text usually includes a '#' prefix, but the facet reference should not (except in the case of 'double hash tags').",
      },
      link: {
        type: 'object',
        required: ['uri'],
        properties: {
          uri: {
            type: 'string',
            format: 'uri',
          },
        },
        description:
          'Facet feature for a URL. The text URL may have been simplified or truncated, but the facet reference should be a complete URL.',
      },
      main: {
        type: 'object',
        required: ['index', 'features'],
        properties: {
          index: {
            ref: 'lex:app.bsky.richtext.facet#byteSlice',
            type: 'ref',
          },
          features: {
            type: 'array',
            items: {
              refs: [
                'lex:app.bsky.richtext.facet#mention',
                'lex:app.bsky.richtext.facet#link',
                'lex:app.bsky.richtext.facet#tag',
              ],
              type: 'union',
            },
          },
        },
        description: 'Annotation of a sub-string within rich text.',
      },
      mention: {
        type: 'object',
        required: ['did'],
        properties: {
          did: {
            type: 'string',
            format: 'did',
          },
        },
        description:
          "Facet feature for mention of another account. The text is usually a handle, including a '@' prefix, but the facet reference is a DID.",
      },
      byteSlice: {
        type: 'object',
        required: ['byteStart', 'byteEnd'],
        properties: {
          byteEnd: {
            type: 'integer',
            minimum: 0,
          },
          byteStart: {
            type: 'integer',
            minimum: 0,
          },
        },
        description:
          'Specifies the sub-string range a facet feature applies to. Start index is inclusive, end index is exclusive. Indices are zero-indexed, counting bytes of the UTF-8 encoded text. NOTE: some languages, like Javascript, use UTF-16 or Unicode codepoints for string slice indexing; in these languages, convert to byte arrays before working with facets.',
      },
    },
  },
  AppBskyActorDefs: {
    lexicon: 1,
    id: 'app.bsky.actor.defs',
    defs: {
      nux: {
        type: 'object',
        required: ['id', 'completed'],
        properties: {
          id: {
            type: 'string',
            maxLength: 100,
          },
          data: {
            type: 'string',
            maxLength: 3000,
            description:
              'Arbitrary data for the NUX. The structure is defined by the NUX itself. Limited to 300 characters.',
            maxGraphemes: 300,
          },
          completed: {
            type: 'boolean',
            default: false,
          },
          expiresAt: {
            type: 'string',
            format: 'datetime',
            description:
              'The date and time at which the NUX will expire and should be considered completed.',
          },
        },
        description: 'A new user experiences (NUX) storage object',
      },
      mutedWord: {
        type: 'object',
        required: ['value', 'targets'],
        properties: {
          id: {
            type: 'string',
          },
          value: {
            type: 'string',
            maxLength: 10000,
            description: 'The muted word itself.',
            maxGraphemes: 1000,
          },
          targets: {
            type: 'array',
            items: {
              ref: 'lex:app.bsky.actor.defs#mutedWordTarget',
              type: 'ref',
            },
            description: 'The intended targets of the muted word.',
          },
          expiresAt: {
            type: 'string',
            format: 'datetime',
            description:
              'The date and time at which the muted word will expire and no longer be applied.',
          },
          actorTarget: {
            type: 'string',
            default: 'all',
            description:
              'Groups of users to apply the muted word to. If undefined, applies to all users.',
            knownValues: ['all', 'exclude-following'],
          },
        },
        description: 'A word that the account owner has muted.',
      },
      savedFeed: {
        type: 'object',
        required: ['id', 'type', 'value', 'pinned'],
        properties: {
          id: {
            type: 'string',
          },
          type: {
            type: 'string',
            knownValues: ['feed', 'list', 'timeline'],
          },
          value: {
            type: 'string',
          },
          pinned: {
            type: 'boolean',
          },
        },
      },
      statusView: {
        type: 'object',
        required: ['status', 'record'],
        properties: {
          embed: {
            refs: ['lex:app.bsky.embed.external#view'],
            type: 'union',
            description: 'An optional embed associated with the status.',
          },
          record: {
            type: 'unknown',
          },
          status: {
            type: 'string',
            description: 'The status for the account.',
            knownValues: ['app.bsky.actor.status#live'],
          },
          isActive: {
            type: 'boolean',
            description:
              'True if the status is not expired, false if it is expired. Only present if expiration was set.',
          },
          expiresAt: {
            type: 'string',
            format: 'datetime',
            description:
              'The date when this status will expire. The application might choose to no longer return the status after expiration.',
          },
        },
      },
      preferences: {
        type: 'array',
        items: {
          refs: [
            'lex:app.bsky.actor.defs#adultContentPref',
            'lex:app.bsky.actor.defs#contentLabelPref',
            'lex:app.bsky.actor.defs#savedFeedsPref',
            'lex:app.bsky.actor.defs#savedFeedsPrefV2',
            'lex:app.bsky.actor.defs#personalDetailsPref',
            'lex:app.bsky.actor.defs#feedViewPref',
            'lex:app.bsky.actor.defs#threadViewPref',
            'lex:app.bsky.actor.defs#interestsPref',
            'lex:app.bsky.actor.defs#mutedWordsPref',
            'lex:app.bsky.actor.defs#hiddenPostsPref',
            'lex:app.bsky.actor.defs#bskyAppStatePref',
            'lex:app.bsky.actor.defs#labelersPref',
            'lex:app.bsky.actor.defs#postInteractionSettingsPref',
            'lex:app.bsky.actor.defs#verificationPrefs',
          ],
          type: 'union',
        },
      },
      profileView: {
        type: 'object',
        required: ['did', 'handle'],
        properties: {
          did: {
            type: 'string',
            format: 'did',
          },
          avatar: {
            type: 'string',
            format: 'uri',
          },
          handle: {
            type: 'string',
            format: 'handle',
          },
          labels: {
            type: 'array',
            items: {
              ref: 'lex:com.atproto.label.defs#label',
              type: 'ref',
            },
          },
          status: {
            ref: 'lex:app.bsky.actor.defs#statusView',
            type: 'ref',
          },
          viewer: {
            ref: 'lex:app.bsky.actor.defs#viewerState',
            type: 'ref',
          },
          pronouns: {
            type: 'string',
          },
          createdAt: {
            type: 'string',
            format: 'datetime',
          },
          indexedAt: {
            type: 'string',
            format: 'datetime',
          },
          associated: {
            ref: 'lex:app.bsky.actor.defs#profileAssociated',
            type: 'ref',
          },
          description: {
            type: 'string',
            maxLength: 2560,
            maxGraphemes: 256,
          },
          displayName: {
            type: 'string',
            maxLength: 640,
            maxGraphemes: 64,
          },
          verification: {
            ref: 'lex:app.bsky.actor.defs#verificationState',
            type: 'ref',
          },
        },
      },
      viewerState: {
        type: 'object',
        properties: {
          muted: {
            type: 'boolean',
          },
          blocking: {
            type: 'string',
            format: 'at-uri',
          },
          blockedBy: {
            type: 'boolean',
          },
          following: {
            type: 'string',
            format: 'at-uri',
          },
          followedBy: {
            type: 'string',
            format: 'at-uri',
          },
          mutedByList: {
            ref: 'lex:app.bsky.graph.defs#listViewBasic',
            type: 'ref',
          },
          blockingByList: {
            ref: 'lex:app.bsky.graph.defs#listViewBasic',
            type: 'ref',
          },
          knownFollowers: {
            ref: 'lex:app.bsky.actor.defs#knownFollowers',
            type: 'ref',
            description:
              'This property is present only in selected cases, as an optimization.',
          },
          activitySubscription: {
            ref: 'lex:app.bsky.notification.defs#activitySubscription',
            type: 'ref',
            description:
              'This property is present only in selected cases, as an optimization.',
          },
        },
        description:
          "Metadata about the requesting account's relationship with the subject account. Only has meaningful content for authed requests.",
      },
      feedViewPref: {
        type: 'object',
        required: ['feed'],
        properties: {
          feed: {
            type: 'string',
            description:
              'The URI of the feed, or an identifier which describes the feed.',
          },
          hideReplies: {
            type: 'boolean',
            description: 'Hide replies in the feed.',
          },
          hideReposts: {
            type: 'boolean',
            description: 'Hide reposts in the feed.',
          },
          hideQuotePosts: {
            type: 'boolean',
            description: 'Hide quote posts in the feed.',
          },
          hideRepliesByLikeCount: {
            type: 'integer',
            description:
              'Hide replies in the feed if they do not have this number of likes.',
          },
          hideRepliesByUnfollowed: {
            type: 'boolean',
            default: true,
            description:
              'Hide replies in the feed if they are not by followed users.',
          },
        },
      },
      labelersPref: {
        type: 'object',
        required: ['labelers'],
        properties: {
          labelers: {
            type: 'array',
            items: {
              ref: 'lex:app.bsky.actor.defs#labelerPrefItem',
              type: 'ref',
            },
          },
        },
      },
      interestsPref: {
        type: 'object',
        required: ['tags'],
        properties: {
          tags: {
            type: 'array',
            items: {
              type: 'string',
              maxLength: 640,
              maxGraphemes: 64,
            },
            maxLength: 100,
            description:
              "A list of tags which describe the account owner's interests gathered during onboarding.",
          },
        },
      },
      knownFollowers: {
        type: 'object',
        required: ['count', 'followers'],
        properties: {
          count: {
            type: 'integer',
          },
          followers: {
            type: 'array',
            items: {
              ref: 'lex:app.bsky.actor.defs#profileViewBasic',
              type: 'ref',
            },
            maxLength: 5,
            minLength: 0,
          },
        },
        description: "The subject's followers whom you also follow",
      },
      mutedWordsPref: {
        type: 'object',
        required: ['items'],
        properties: {
          items: {
            type: 'array',
            items: {
              ref: 'lex:app.bsky.actor.defs#mutedWord',
              type: 'ref',
            },
            description: 'A list of words the account owner has muted.',
          },
        },
      },
      savedFeedsPref: {
        type: 'object',
        required: ['pinned', 'saved'],
        properties: {
          saved: {
            type: 'array',
            items: {
              type: 'string',
              format: 'at-uri',
            },
          },
          pinned: {
            type: 'array',
            items: {
              type: 'string',
              format: 'at-uri',
            },
          },
          timelineIndex: {
            type: 'integer',
          },
        },
      },
      threadViewPref: {
        type: 'object',
        properties: {
          sort: {
            type: 'string',
            description: 'Sorting mode for threads.',
            knownValues: [
              'oldest',
              'newest',
              'most-likes',
              'random',
              'hotness',
            ],
          },
          prioritizeFollowedUsers: {
            type: 'boolean',
            description: 'Show followed users at the top of all replies.',
          },
        },
      },
      hiddenPostsPref: {
        type: 'object',
        required: ['items'],
        properties: {
          items: {
            type: 'array',
            items: {
              type: 'string',
              format: 'at-uri',
            },
            description:
              'A list of URIs of posts the account owner has hidden.',
          },
        },
      },
      labelerPrefItem: {
        type: 'object',
        required: ['did'],
        properties: {
          did: {
            type: 'string',
            format: 'did',
          },
        },
      },
      mutedWordTarget: {
        type: 'string',
        maxLength: 640,
        knownValues: ['content', 'tag'],
        maxGraphemes: 64,
      },
      adultContentPref: {
        type: 'object',
        required: ['enabled'],
        properties: {
          enabled: {
            type: 'boolean',
            default: false,
          },
        },
      },
      bskyAppStatePref: {
        type: 'object',
        properties: {
          nuxs: {
            type: 'array',
            items: {
              ref: 'lex:app.bsky.actor.defs#nux',
              type: 'ref',
            },
            maxLength: 100,
            description: 'Storage for NUXs the user has encountered.',
          },
          queuedNudges: {
            type: 'array',
            items: {
              type: 'string',
              maxLength: 100,
            },
            maxLength: 1000,
            description:
              'An array of tokens which identify nudges (modals, popups, tours, highlight dots) that should be shown to the user.',
          },
          activeProgressGuide: {
            ref: 'lex:app.bsky.actor.defs#bskyAppProgressGuide',
            type: 'ref',
          },
        },
        description:
          "A grab bag of state that's specific to the bsky.app program. Third-party apps shouldn't use this.",
      },
      contentLabelPref: {
        type: 'object',
        required: ['label', 'visibility'],
        properties: {
          label: {
            type: 'string',
          },
          labelerDid: {
            type: 'string',
            format: 'did',
            description:
              'Which labeler does this preference apply to? If undefined, applies globally.',
          },
          visibility: {
            type: 'string',
            knownValues: ['ignore', 'show', 'warn', 'hide'],
          },
        },
      },
      profileViewBasic: {
        type: 'object',
        required: ['did', 'handle'],
        properties: {
          did: {
            type: 'string',
            format: 'did',
          },
          avatar: {
            type: 'string',
            format: 'uri',
          },
          handle: {
            type: 'string',
            format: 'handle',
          },
          labels: {
            type: 'array',
            items: {
              ref: 'lex:com.atproto.label.defs#label',
              type: 'ref',
            },
          },
          status: {
            ref: 'lex:app.bsky.actor.defs#statusView',
            type: 'ref',
          },
          viewer: {
            ref: 'lex:app.bsky.actor.defs#viewerState',
            type: 'ref',
          },
          pronouns: {
            type: 'string',
          },
          createdAt: {
            type: 'string',
            format: 'datetime',
          },
          associated: {
            ref: 'lex:app.bsky.actor.defs#profileAssociated',
            type: 'ref',
          },
          displayName: {
            type: 'string',
            maxLength: 640,
            maxGraphemes: 64,
          },
          verification: {
            ref: 'lex:app.bsky.actor.defs#verificationState',
            type: 'ref',
          },
        },
      },
      savedFeedsPrefV2: {
        type: 'object',
        required: ['items'],
        properties: {
          items: {
            type: 'array',
            items: {
              ref: 'lex:app.bsky.actor.defs#savedFeed',
              type: 'ref',
            },
          },
        },
      },
      verificationView: {
        type: 'object',
        required: ['issuer', 'uri', 'isValid', 'createdAt'],
        properties: {
          uri: {
            type: 'string',
            format: 'at-uri',
            description: 'The AT-URI of the verification record.',
          },
          issuer: {
            type: 'string',
            format: 'did',
            description: 'The user who issued this verification.',
          },
          isValid: {
            type: 'boolean',
            description:
              'True if the verification passes validation, otherwise false.',
          },
          createdAt: {
            type: 'string',
            format: 'datetime',
            description: 'Timestamp when the verification was created.',
          },
        },
        description: 'An individual verification for an associated subject.',
      },
      profileAssociated: {
        type: 'object',
        properties: {
          chat: {
            ref: 'lex:app.bsky.actor.defs#profileAssociatedChat',
            type: 'ref',
          },
          lists: {
            type: 'integer',
          },
          labeler: {
            type: 'boolean',
          },
          feedgens: {
            type: 'integer',
          },
          starterPacks: {
            type: 'integer',
          },
          activitySubscription: {
            ref: 'lex:app.bsky.actor.defs#profileAssociatedActivitySubscription',
            type: 'ref',
          },
        },
      },
      verificationPrefs: {
        type: 'object',
        required: [],
        properties: {
          hideBadges: {
            type: 'boolean',
            default: false,
            description:
              'Hide the blue check badges for verified accounts and trusted verifiers.',
          },
        },
        description: 'Preferences for how verified accounts appear in the app.',
      },
      verificationState: {
        type: 'object',
        required: ['verifications', 'verifiedStatus', 'trustedVerifierStatus'],
        properties: {
          verifications: {
            type: 'array',
            items: {
              ref: 'lex:app.bsky.actor.defs#verificationView',
              type: 'ref',
            },
            description:
              'All verifications issued by trusted verifiers on behalf of this user. Verifications by untrusted verifiers are not included.',
          },
          verifiedStatus: {
            type: 'string',
            description: "The user's status as a verified account.",
            knownValues: ['valid', 'invalid', 'none'],
          },
          trustedVerifierStatus: {
            type: 'string',
            description: "The user's status as a trusted verifier.",
            knownValues: ['valid', 'invalid', 'none'],
          },
        },
        description:
          'Represents the verification information about the user this object is attached to.',
      },
      personalDetailsPref: {
        type: 'object',
        properties: {
          birthDate: {
            type: 'string',
            format: 'datetime',
            description: 'The birth date of account owner.',
          },
        },
      },
      profileViewDetailed: {
        type: 'object',
        required: ['did', 'handle'],
        properties: {
          did: {
            type: 'string',
            format: 'did',
          },
          avatar: {
            type: 'string',
            format: 'uri',
          },
          banner: {
            type: 'string',
            format: 'uri',
          },
          handle: {
            type: 'string',
            format: 'handle',
          },
          labels: {
            type: 'array',
            items: {
              ref: 'lex:com.atproto.label.defs#label',
              type: 'ref',
            },
          },
          status: {
            ref: 'lex:app.bsky.actor.defs#statusView',
            type: 'ref',
          },
          viewer: {
            ref: 'lex:app.bsky.actor.defs#viewerState',
            type: 'ref',
          },
          website: {
            type: 'string',
            format: 'uri',
          },
          pronouns: {
            type: 'string',
          },
          createdAt: {
            type: 'string',
            format: 'datetime',
          },
          indexedAt: {
            type: 'string',
            format: 'datetime',
          },
          associated: {
            ref: 'lex:app.bsky.actor.defs#profileAssociated',
            type: 'ref',
          },
          pinnedPost: {
            ref: 'lex:com.atproto.repo.strongRef',
            type: 'ref',
          },
          postsCount: {
            type: 'integer',
          },
          description: {
            type: 'string',
            maxLength: 2560,
            maxGraphemes: 256,
          },
          displayName: {
            type: 'string',
            maxLength: 640,
            maxGraphemes: 64,
          },
          followsCount: {
            type: 'integer',
          },
          verification: {
            ref: 'lex:app.bsky.actor.defs#verificationState',
            type: 'ref',
          },
          followersCount: {
            type: 'integer',
          },
          joinedViaStarterPack: {
            ref: 'lex:app.bsky.graph.defs#starterPackViewBasic',
            type: 'ref',
          },
        },
      },
      bskyAppProgressGuide: {
        type: 'object',
        required: ['guide'],
        properties: {
          guide: {
            type: 'string',
            maxLength: 100,
          },
        },
        description:
          'If set, an active progress guide. Once completed, can be set to undefined. Should have unspecced fields tracking progress.',
      },
      profileAssociatedChat: {
        type: 'object',
        required: ['allowIncoming'],
        properties: {
          allowIncoming: {
            type: 'string',
            knownValues: ['all', 'none', 'following'],
          },
        },
      },
      postInteractionSettingsPref: {
        type: 'object',
        required: [],
        properties: {
          threadgateAllowRules: {
            type: 'array',
            items: {
              refs: [
                'lex:app.bsky.feed.threadgate#mentionRule',
                'lex:app.bsky.feed.threadgate#followerRule',
                'lex:app.bsky.feed.threadgate#followingRule',
                'lex:app.bsky.feed.threadgate#listRule',
              ],
              type: 'union',
            },
            maxLength: 5,
            description:
              'Matches threadgate record. List of rules defining who can reply to this users posts. If value is an empty array, no one can reply. If value is undefined, anyone can reply.',
          },
          postgateEmbeddingRules: {
            type: 'array',
            items: {
              refs: ['lex:app.bsky.feed.postgate#disableRule'],
              type: 'union',
            },
            maxLength: 5,
            description:
              'Matches postgate record. List of rules defining who can embed this users posts. If value is an empty array or is undefined, no particular rules apply and anyone can embed.',
          },
        },
        description:
          'Default post interaction settings for the account. These values should be applied as default values when creating new posts. These refs should mirror the threadgate and postgate records exactly.',
      },
      profileAssociatedActivitySubscription: {
        type: 'object',
        required: ['allowSubscriptions'],
        properties: {
          allowSubscriptions: {
            type: 'string',
            knownValues: ['followers', 'mutuals', 'none'],
          },
        },
      },
    },
  },
  AppBskyLabelerDefs: {
    lexicon: 1,
    id: 'app.bsky.labeler.defs',
    defs: {
      labelerView: {
        type: 'object',
        required: ['uri', 'cid', 'creator', 'indexedAt'],
        properties: {
          cid: {
            type: 'string',
            format: 'cid',
          },
          uri: {
            type: 'string',
            format: 'at-uri',
          },
          labels: {
            type: 'array',
            items: {
              ref: 'lex:com.atproto.label.defs#label',
              type: 'ref',
            },
          },
          viewer: {
            ref: 'lex:app.bsky.labeler.defs#labelerViewerState',
            type: 'ref',
          },
          creator: {
            ref: 'lex:app.bsky.actor.defs#profileView',
            type: 'ref',
          },
          indexedAt: {
            type: 'string',
            format: 'datetime',
          },
          likeCount: {
            type: 'integer',
            minimum: 0,
          },
        },
      },
      labelerPolicies: {
        type: 'object',
        required: ['labelValues'],
        properties: {
          labelValues: {
            type: 'array',
            items: {
              ref: 'lex:com.atproto.label.defs#labelValue',
              type: 'ref',
            },
            description:
              'The label values which this labeler publishes. May include global or custom labels.',
          },
          labelValueDefinitions: {
            type: 'array',
            items: {
              ref: 'lex:com.atproto.label.defs#labelValueDefinition',
              type: 'ref',
            },
            description:
              'Label values created by this labeler and scoped exclusively to it. Labels defined here will override global label definitions for this labeler.',
          },
        },
      },
      labelerViewerState: {
        type: 'object',
        properties: {
          like: {
            type: 'string',
            format: 'at-uri',
          },
        },
      },
      labelerViewDetailed: {
        type: 'object',
        required: ['uri', 'cid', 'creator', 'policies', 'indexedAt'],
        properties: {
          cid: {
            type: 'string',
            format: 'cid',
          },
          uri: {
            type: 'string',
            format: 'at-uri',
          },
          labels: {
            type: 'array',
            items: {
              ref: 'lex:com.atproto.label.defs#label',
              type: 'ref',
            },
          },
          viewer: {
            ref: 'lex:app.bsky.labeler.defs#labelerViewerState',
            type: 'ref',
          },
          creator: {
            ref: 'lex:app.bsky.actor.defs#profileView',
            type: 'ref',
          },
          policies: {
            ref: 'lex:app.bsky.labeler.defs#labelerPolicies',
            type: 'ref',
          },
          indexedAt: {
            type: 'string',
            format: 'datetime',
          },
          likeCount: {
            type: 'integer',
            minimum: 0,
          },
          reasonTypes: {
            type: 'array',
            items: {
              ref: 'lex:com.atproto.moderation.defs#reasonType',
              type: 'ref',
            },
            description:
              "The set of report reason 'codes' which are in-scope for this service to review and action. These usually align to policy categories. If not defined (distinct from empty array), all reason types are allowed.",
          },
          subjectTypes: {
            type: 'array',
            items: {
              ref: 'lex:com.atproto.moderation.defs#subjectType',
              type: 'ref',
            },
            description:
              'The set of subject types (account, record, etc) this service accepts reports on.',
          },
          subjectCollections: {
            type: 'array',
            items: {
              type: 'string',
              format: 'nsid',
            },
            description:
              'Set of record types (collection NSIDs) which can be reported to this service. If not defined (distinct from empty array), default is any record type.',
          },
        },
      },
    },
  },
  FmTealAlphaFeedDefs: {
    lexicon: 1,
    id: 'fm.teal.alpha.feed.defs',
    description:
      'This lexicon is in a not officially released state. It is subject to change. | Misc. items related to feeds.',
    defs: {
      playView: {
        type: 'object',
        required: ['trackName', 'artists'],
        properties: {
          trackName: {
            type: 'string',
            minLength: 1,
            maxLength: 256,
            maxGraphemes: 2560,
            description: 'The name of the track',
          },
          trackMbId: {
            type: 'string',
            description: 'The Musicbrainz ID of the track',
          },
          recordingMbId: {
            type: 'string',
            description: 'The Musicbrainz recording ID of the track',
          },
          duration: {
            type: 'integer',
            description: 'The length of the track in seconds',
          },
          artists: {
            type: 'array',
            items: {
              type: 'ref',
              ref: 'lex:fm.teal.alpha.feed.defs#artist',
            },
            description: 'Array of artists in order of original appearance.',
          },
          releaseName: {
            type: 'string',
            maxLength: 256,
            maxGraphemes: 2560,
            description: 'The name of the release/album',
          },
          releaseMbId: {
            type: 'string',
            description: 'The Musicbrainz release ID',
          },
          isrc: {
            type: 'string',
            description: 'The ISRC code associated with the recording',
          },
          originUrl: {
            type: 'string',
            description: 'The URL associated with this track',
          },
          musicServiceBaseDomain: {
            type: 'string',
            description:
              "The base domain of the music service. e.g. music.apple.com, tidal.com, spotify.com. Defaults to 'local' if not provided.",
          },
          submissionClientAgent: {
            type: 'string',
            maxLength: 256,
            maxGraphemes: 2560,
            description:
              "A user-agent style string specifying the user agent. e.g. tealtracker/0.0.1b (Linux; Android 13; SM-A715F). Defaults to 'manual/unknown' if not provided.",
          },
          playedTime: {
            type: 'string',
            format: 'datetime',
            description: 'The unix timestamp of when the track was played',
          },
        },
      },
      artist: {
        type: 'object',
        required: ['artistName'],
        properties: {
          artistName: {
            type: 'string',
            minLength: 1,
            maxLength: 256,
            maxGraphemes: 2560,
            description: 'The name of the artist',
          },
          artistMbId: {
            type: 'string',
            description: 'The Musicbrainz ID of the artist',
          },
        },
      },
    },
  },
  FmTealAlphaFeedGetPlay: {
    lexicon: 1,
    id: 'fm.teal.alpha.feed.getPlay',
    description:
      'This lexicon is in a not officially released state. It is subject to change. | Retrieves a play given an author DID and record key.',
    defs: {
      main: {
        type: 'query',
        parameters: {
          type: 'params',
          required: ['authorDID', 'rkey'],
          properties: {
            authorDID: {
              type: 'string',
              format: 'at-identifier',
              description: "The author's DID for the play",
            },
            rkey: {
              type: 'string',
              description: 'The record key of the play',
            },
          },
        },
        output: {
          encoding: 'application/json',
          schema: {
            type: 'object',
            required: ['play'],
            properties: {
              play: {
                type: 'ref',
                ref: 'lex:fm.teal.alpha.feed.defs#playView',
              },
            },
          },
        },
      },
    },
  },
  FmTealAlphaFeedGetActorFeed: {
    lexicon: 1,
    id: 'fm.teal.alpha.feed.getActorFeed',
    description:
      "This lexicon is in a not officially released state. It is subject to change. | Retrieves multiple plays from the index or via an author's DID.",
    defs: {
      main: {
        type: 'query',
        parameters: {
          type: 'params',
          required: ['authorDID'],
          properties: {
            authorDID: {
              type: 'string',
              format: 'at-identifier',
              description: "The author's DID for the play",
            },
            cursor: {
              type: 'string',
              description: 'The cursor to start the query from',
            },
            limit: {
              type: 'integer',
              description:
                'The upper limit of tracks to get per request. Default is 20, max is 50.',
            },
          },
        },
        output: {
          encoding: 'application/json',
          schema: {
            type: 'object',
            required: ['plays'],
            properties: {
              plays: {
                type: 'array',
                items: {
                  type: 'ref',
                  ref: 'lex:fm.teal.alpha.feed.defs#playView',
                },
              },
            },
          },
        },
      },
    },
  },
  FmTealAlphaFeedPlay: {
    lexicon: 1,
    id: 'fm.teal.alpha.feed.play',
    description:
      "This lexicon is in a not officially released state. It is subject to change. | A declaration of a teal.fm play. Plays are submitted as a result of a user listening to a track. Plays should be marked as tracked when a user has listened to the entire track if it's under 2 minutes long, or half of the track's duration up to 4 minutes, whichever is longest.",
    defs: {
      main: {
        type: 'record',
        key: 'tid',
        record: {
          type: 'object',
          required: ['trackName'],
          properties: {
            trackName: {
              type: 'string',
              minLength: 1,
              maxLength: 256,
              maxGraphemes: 2560,
              description: 'The name of the track',
            },
            trackMbId: {
              type: 'string',
              description: 'The Musicbrainz ID of the track',
            },
            recordingMbId: {
              type: 'string',
              description: 'The Musicbrainz recording ID of the track',
            },
            duration: {
              type: 'integer',
              description: 'The length of the track in seconds',
            },
            artistNames: {
              type: 'array',
              items: {
                type: 'string',
                minLength: 1,
                maxLength: 256,
                maxGraphemes: 2560,
              },
              description:
                "Array of artist names in order of original appearance. Prefer using 'artists'.",
            },
            artistMbIds: {
              type: 'array',
              items: {
                type: 'string',
              },
              description:
                "Array of Musicbrainz artist IDs. Prefer using 'artists'.",
            },
            artists: {
              type: 'array',
              items: {
                type: 'ref',
                ref: 'lex:fm.teal.alpha.feed.defs#artist',
              },
              description: 'Array of artists in order of original appearance.',
            },
            releaseName: {
              type: 'string',
              maxLength: 256,
              maxGraphemes: 2560,
              description: 'The name of the release/album',
            },
            releaseMbId: {
              type: 'string',
              description: 'The Musicbrainz release ID',
            },
            isrc: {
              type: 'string',
              description: 'The ISRC code associated with the recording',
            },
            originUrl: {
              type: 'string',
              description: 'The URL associated with this track',
            },
            musicServiceBaseDomain: {
              type: 'string',
              description:
                "The base domain of the music service. e.g. music.apple.com, tidal.com, spotify.com. Defaults to 'local' if unavailable or not provided.",
            },
            submissionClientAgent: {
              type: 'string',
              maxLength: 256,
              maxGraphemes: 2560,
              description:
                "A metadata string specifying the user agent where the format is `<app-identifier>/<version> (<kernel/OS-base>; <platform/OS-version>; <device-model>)`. If string is provided, only `app-identifier` and `version` are required. `app-identifier` is recommended to be in reverse dns format. Defaults to 'manual/unknown' if unavailable or not provided.",
            },
            playedTime: {
              type: 'string',
              format: 'datetime',
              description: 'The unix timestamp of when the track was played',
            },
            trackDiscriminant: {
              type: 'string',
              maxLength: 128,
              maxGraphemes: 1280,
              description:
                "Distinguishing information for track variants (e.g. 'Acoustic Version', 'Live at Wembley', 'Radio Edit', 'Demo'). Used to differentiate between different versions of the same base track while maintaining grouping capabilities.",
            },
            releaseDiscriminant: {
              type: 'string',
              maxLength: 128,
              maxGraphemes: 1280,
              description:
                "Distinguishing information for release variants (e.g. 'Deluxe Edition', 'Remastered', '2023 Remaster', 'Special Edition'). Used to differentiate between different versions of the same base release while maintaining grouping capabilities.",
            },
          },
        },
      },
    },
  },
  FmTealAlphaActorDefs: {
    lexicon: 1,
    id: 'fm.teal.alpha.actor.defs',
    defs: {
      profileView: {
        type: 'object',
        properties: {
          did: {
            type: 'string',
            description: 'The decentralized identifier of the actor',
          },
          displayName: {
            type: 'string',
          },
          description: {
            type: 'string',
            description: 'Free-form profile description text.',
          },
          descriptionFacets: {
            type: 'array',
            description:
              'Annotations of text in the profile description (mentions, URLs, hashtags, etc). May be changed to another (backwards compatible) lexicon.',
            items: {
              type: 'ref',
              ref: 'lex:app.bsky.richtext.facet',
            },
          },
          featuredItem: {
            type: 'ref',
            description:
              "The user's most recent item featured on their profile.",
            ref: 'lex:fm.teal.alpha.actor.profile#featuredItem',
          },
          avatar: {
            type: 'string',
            description: 'IPLD of the avatar',
          },
          banner: {
            type: 'string',
            description: 'IPLD of the banner image',
          },
          status: {
            type: 'ref',
            ref: 'lex:fm.teal.alpha.actor.defs#statusView',
          },
          createdAt: {
            type: 'string',
            format: 'datetime',
          },
        },
      },
      miniProfileView: {
        type: 'object',
        properties: {
          did: {
            type: 'string',
            description: 'The decentralized identifier of the actor',
          },
          displayName: {
            type: 'string',
          },
          handle: {
            type: 'string',
          },
          avatar: {
            type: 'string',
            description: 'IPLD of the avatar',
          },
        },
      },
      statusView: {
        type: 'object',
        description: 'A declaration of the status of the actor.',
        properties: {
          time: {
            type: 'string',
            format: 'datetime',
            description: 'The unix timestamp of when the item was recorded',
          },
          expiry: {
            type: 'string',
            format: 'datetime',
            description:
              'The unix timestamp of the expiry time of the item. If unavailable, default to 10 minutes past the start time.',
          },
          item: {
            type: 'ref',
            ref: 'lex:fm.teal.alpha.feed.defs#playView',
          },
        },
      },
    },
  },
  FmTealAlphaActorProfileStatus: {
    lexicon: 1,
    id: 'fm.teal.alpha.actor.profileStatus',
    defs: {
      main: {
        type: 'record',
        description:
          'This lexicon is in a not officially released state. It is subject to change. | A declaration of the profile status of the actor.',
        key: 'literal:self',
        record: {
          type: 'object',
          required: ['completedOnboarding'],
          properties: {
            completedOnboarding: {
              type: 'string',
              description: 'The onboarding completion status',
              knownValues: [
                'none',
                'profileOnboarding',
                'playOnboarding',
                'complete',
              ],
            },
            createdAt: {
              type: 'string',
              format: 'datetime',
              description: 'The timestamp when this status was created',
            },
            updatedAt: {
              type: 'string',
              format: 'datetime',
              description: 'The timestamp when this status was last updated',
            },
          },
        },
      },
    },
  },
  FmTealAlphaActorGetProfile: {
    lexicon: 1,
    id: 'fm.teal.alpha.actor.getProfile',
    description:
      'This lexicon is in a not officially released state. It is subject to change. | Retrieves a play given an author DID and record key.',
    defs: {
      main: {
        type: 'query',
        parameters: {
          type: 'params',
          required: ['actor'],
          properties: {
            actor: {
              type: 'string',
              format: 'at-identifier',
              description: "The author's DID",
            },
          },
        },
        output: {
          encoding: 'application/json',
          schema: {
            type: 'object',
            required: ['actor'],
            properties: {
              actor: {
                type: 'ref',
                ref: 'lex:fm.teal.alpha.actor.defs#profileView',
              },
            },
          },
        },
      },
    },
  },
  FmTealAlphaActorSearchActors: {
    lexicon: 1,
    id: 'fm.teal.alpha.actor.searchActors',
    description:
      'This lexicon is in a not officially released state. It is subject to change. | Searches for actors based on profile contents.',
    defs: {
      main: {
        type: 'query',
        parameters: {
          type: 'params',
          required: ['q'],
          properties: {
            q: {
              type: 'string',
              description: 'The search query',
              maxGraphemes: 128,
              maxLength: 640,
            },
            limit: {
              type: 'integer',
              description: 'The maximum number of actors to return',
              minimum: 1,
              maximum: 25,
            },
            cursor: {
              type: 'string',
              description: 'Cursor for pagination',
            },
          },
        },
        output: {
          encoding: 'application/json',
          schema: {
            type: 'object',
            required: ['actors'],
            properties: {
              actors: {
                type: 'array',
                items: {
                  type: 'ref',
                  ref: 'lex:fm.teal.alpha.actor.defs#miniProfileView',
                },
              },
              cursor: {
                type: 'string',
                description: 'Cursor for pagination',
              },
            },
          },
        },
      },
    },
  },
  FmTealAlphaActorGetProfiles: {
    lexicon: 1,
    id: 'fm.teal.alpha.actor.getProfiles',
    description:
      'This lexicon is in a not officially released state. It is subject to change. | Retrieves the associated profile.',
    defs: {
      main: {
        type: 'query',
        parameters: {
          type: 'params',
          required: ['actors'],
          properties: {
            actors: {
              type: 'array',
              items: {
                type: 'string',
                format: 'at-identifier',
              },
              description: 'Array of actor DIDs',
            },
          },
        },
        output: {
          encoding: 'application/json',
          schema: {
            type: 'object',
            required: ['actors'],
            properties: {
              actors: {
                type: 'array',
                items: {
                  type: 'ref',
                  ref: 'lex:fm.teal.alpha.actor.defs#miniProfileView',
                },
              },
            },
          },
        },
      },
    },
  },
  FmTealAlphaActorStatus: {
    lexicon: 1,
    id: 'fm.teal.alpha.actor.status',
    defs: {
      main: {
        type: 'record',
        description:
          'This lexicon is in a not officially released state. It is subject to change. | A declaration of the status of the actor. Only one can be shown at a time. If there are multiple, the latest record should be picked and earlier records should be deleted or tombstoned.',
        key: 'literal:self',
        record: {
          type: 'object',
          required: ['time', 'item'],
          properties: {
            time: {
              type: 'string',
              format: 'datetime',
              description: 'The unix timestamp of when the item was recorded',
            },
            expiry: {
              type: 'string',
              format: 'datetime',
              description:
                'The unix timestamp of the expiry time of the item. If unavailable, default to 10 minutes past the start time.',
            },
            item: {
              type: 'ref',
              ref: 'lex:fm.teal.alpha.feed.defs#playView',
            },
          },
        },
      },
    },
  },
  FmTealAlphaActorProfile: {
    lexicon: 1,
    id: 'fm.teal.alpha.actor.profile',
    defs: {
      main: {
        type: 'record',
        description:
          'This lexicon is in a not officially released state. It is subject to change. | A declaration of a teal.fm account profile.',
        key: 'literal:self',
        record: {
          type: 'object',
          properties: {
            displayName: {
              type: 'string',
              maxGraphemes: 64,
              maxLength: 640,
            },
            description: {
              type: 'string',
              description: 'Free-form profile description text.',
              maxGraphemes: 256,
              maxLength: 2560,
            },
            descriptionFacets: {
              type: 'array',
              description:
                'Annotations of text in the profile description (mentions, URLs, hashtags, etc).',
              items: {
                type: 'ref',
                ref: 'lex:app.bsky.richtext.facet',
              },
            },
            featuredItem: {
              type: 'ref',
              description:
                "The user's most recent item featured on their profile.",
              ref: 'lex:fm.teal.alpha.actor.profile#featuredItem',
            },
            avatar: {
              type: 'blob',
              description:
                "Small image to be displayed next to posts from account. AKA, 'profile picture'",
              accept: ['image/png', 'image/jpeg'],
              maxSize: 1000000,
            },
            banner: {
              type: 'blob',
              description:
                'Larger horizontal image to display behind profile view.',
              accept: ['image/png', 'image/jpeg'],
              maxSize: 1000000,
            },
            createdAt: {
              type: 'string',
              format: 'datetime',
            },
          },
        },
      },
      featuredItem: {
        type: 'object',
        required: ['mbid', 'type'],
        properties: {
          mbid: {
            type: 'string',
            description: 'The Musicbrainz ID of the item',
          },
          type: {
            type: 'string',
            description:
              'The type of the item. Must be a valid Musicbrainz type, e.g. album, track, recording, etc.',
          },
        },
      },
    },
  },
  FmTealAlphaStatsDefs: {
    lexicon: 1,
    id: 'fm.teal.alpha.stats.defs',
    defs: {
      artistView: {
        type: 'object',
        required: ['mbid', 'name', 'playCount'],
        properties: {
          mbid: {
            type: 'string',
            description: 'MusicBrainz artist ID',
          },
          name: {
            type: 'string',
            description: 'Artist name',
          },
          playCount: {
            type: 'integer',
            description: 'Total number of plays for this artist',
          },
        },
      },
      releaseView: {
        type: 'object',
        required: ['mbid', 'name', 'playCount'],
        properties: {
          mbid: {
            type: 'string',
            description: 'MusicBrainz release ID',
          },
          name: {
            type: 'string',
            description: 'Release/album name',
          },
          playCount: {
            type: 'integer',
            description: 'Total number of plays for this release',
          },
        },
      },
      recordingView: {
        type: 'object',
        required: ['mbid', 'name', 'playCount'],
        properties: {
          mbid: {
            type: 'string',
            description: 'MusicBrainz recording ID',
          },
          name: {
            type: 'string',
            description: 'Recording/track name',
          },
          playCount: {
            type: 'integer',
            description: 'Total number of plays for this recording',
          },
        },
      },
    },
  },
  FmTealAlphaStatsGetUserTopArtists: {
    lexicon: 1,
    id: 'fm.teal.alpha.stats.getUserTopArtists',
    description: "Get a user's top artists by play count",
    defs: {
      main: {
        type: 'query',
        parameters: {
          type: 'params',
          required: ['actor'],
          properties: {
            actor: {
              type: 'string',
              format: 'at-identifier',
              description: "The user's DID or handle",
            },
            period: {
              type: 'string',
              enum: ['30days', '7days'],
              default: '30days',
              description: 'Time period for top artists',
            },
            limit: {
              type: 'integer',
              minimum: 1,
              maximum: 100,
              default: 50,
              description: 'Number of artists to return',
            },
            cursor: {
              type: 'string',
              description: 'Pagination cursor',
            },
          },
        },
        output: {
          encoding: 'application/json',
          schema: {
            type: 'object',
            required: ['artists'],
            properties: {
              artists: {
                type: 'array',
                items: {
                  type: 'ref',
                  ref: 'lex:fm.teal.alpha.stats.defs#artistView',
                },
              },
              cursor: {
                type: 'string',
                description: 'Next page cursor',
              },
            },
          },
        },
      },
    },
  },
  FmTealAlphaStatsGetTopReleases: {
    lexicon: 1,
    id: 'fm.teal.alpha.stats.getTopReleases',
    description: 'Get top releases/albums by play count',
    defs: {
      main: {
        type: 'query',
        parameters: {
          type: 'params',
          properties: {
            period: {
              type: 'string',
              enum: ['all', '30days', '7days'],
              default: 'all',
              description: 'Time period for top releases',
            },
            limit: {
              type: 'integer',
              minimum: 1,
              maximum: 100,
              default: 50,
              description: 'Number of releases to return',
            },
            cursor: {
              type: 'string',
              description: 'Pagination cursor',
            },
          },
        },
        output: {
          encoding: 'application/json',
          schema: {
            type: 'object',
            required: ['releases'],
            properties: {
              releases: {
                type: 'array',
                items: {
                  type: 'ref',
                  ref: 'lex:fm.teal.alpha.stats.defs#releaseView',
                },
              },
              cursor: {
                type: 'string',
                description: 'Next page cursor',
              },
            },
          },
        },
      },
    },
  },
  FmTealAlphaStatsGetLatest: {
    lexicon: 1,
    id: 'fm.teal.alpha.stats.getLatest',
    defs: {
      main: {
        type: 'query',
        description: 'Get latest plays globally',
        parameters: {
          type: 'params',
          properties: {
            limit: {
              type: 'integer',
              minimum: 1,
              maximum: 100,
              default: 50,
              description: 'Number of latest plays to return',
            },
          },
        },
        output: {
          encoding: 'application/json',
          schema: {
            type: 'object',
            required: ['plays'],
            properties: {
              plays: {
                type: 'array',
                items: {
                  type: 'ref',
                  ref: 'lex:fm.teal.alpha.feed.defs#playView',
                },
              },
            },
          },
        },
      },
    },
  },
  FmTealAlphaStatsGetUserTopReleases: {
    lexicon: 1,
    id: 'fm.teal.alpha.stats.getUserTopReleases',
    description: "Get a user's top releases/albums by play count",
    defs: {
      main: {
        type: 'query',
        parameters: {
          type: 'params',
          required: ['actor'],
          properties: {
            actor: {
              type: 'string',
              format: 'at-identifier',
              description: "The user's DID or handle",
            },
            period: {
              type: 'string',
              enum: ['30days', '7days'],
              default: '30days',
              description: 'Time period for top releases',
            },
            limit: {
              type: 'integer',
              minimum: 1,
              maximum: 100,
              default: 50,
              description: 'Number of releases to return',
            },
            cursor: {
              type: 'string',
              description: 'Pagination cursor',
            },
          },
        },
        output: {
          encoding: 'application/json',
          schema: {
            type: 'object',
            required: ['releases'],
            properties: {
              releases: {
                type: 'array',
                items: {
                  type: 'ref',
                  ref: 'lex:fm.teal.alpha.stats.defs#releaseView',
                },
              },
              cursor: {
                type: 'string',
                description: 'Next page cursor',
              },
            },
          },
        },
      },
    },
  },
  FmTealAlphaStatsGetTopArtists: {
    lexicon: 1,
    id: 'fm.teal.alpha.stats.getTopArtists',
    description: 'Get top artists by play count',
    defs: {
      main: {
        type: 'query',
        parameters: {
          type: 'params',
          properties: {
            period: {
              type: 'string',
              enum: ['all', '30days', '7days'],
              default: 'all',
              description: 'Time period for top artists',
            },
            limit: {
              type: 'integer',
              minimum: 1,
              maximum: 100,
              default: 50,
              description: 'Number of artists to return',
            },
            cursor: {
              type: 'string',
              description: 'Pagination cursor',
            },
          },
        },
        output: {
          encoding: 'application/json',
          schema: {
            type: 'object',
            required: ['artists'],
            properties: {
              artists: {
                type: 'array',
                items: {
                  type: 'ref',
                  ref: 'lex:fm.teal.alpha.stats.defs#artistView',
                },
              },
              cursor: {
                type: 'string',
                description: 'Next page cursor',
              },
            },
          },
        },
      },
    },
  },
  ComAtprotoLabelDefs: {
    lexicon: 1,
    id: 'com.atproto.label.defs',
    defs: {
      label: {
        type: 'object',
        required: ['src', 'uri', 'val', 'cts'],
        properties: {
          cid: {
            type: 'string',
            format: 'cid',
            description:
              "Optionally, CID specifying the specific version of 'uri' resource this label applies to.",
          },
          cts: {
            type: 'string',
            format: 'datetime',
            description: 'Timestamp when this label was created.',
          },
          exp: {
            type: 'string',
            format: 'datetime',
            description:
              'Timestamp at which this label expires (no longer applies).',
          },
          neg: {
            type: 'boolean',
            description:
              'If true, this is a negation label, overwriting a previous label.',
          },
          sig: {
            type: 'bytes',
            description: 'Signature of dag-cbor encoded label.',
          },
          src: {
            type: 'string',
            format: 'did',
            description: 'DID of the actor who created this label.',
          },
          uri: {
            type: 'string',
            format: 'uri',
            description:
              'AT URI of the record, repository (account), or other resource that this label applies to.',
          },
          val: {
            type: 'string',
            maxLength: 128,
            description:
              'The short string name of the value or type of this label.',
          },
          ver: {
            type: 'integer',
            description: 'The AT Protocol version of the label object.',
          },
        },
        description:
          'Metadata tag on an atproto resource (eg, repo or record).',
      },
      selfLabel: {
        type: 'object',
        required: ['val'],
        properties: {
          val: {
            type: 'string',
            maxLength: 128,
            description:
              'The short string name of the value or type of this label.',
          },
        },
        description:
          'Metadata tag on an atproto record, published by the author within the record. Note that schemas should use #selfLabels, not #selfLabel.',
      },
      labelValue: {
        type: 'string',
        knownValues: [
          '!hide',
          '!no-promote',
          '!warn',
          '!no-unauthenticated',
          'dmca-violation',
          'doxxing',
          'porn',
          'sexual',
          'nudity',
          'nsfl',
          'gore',
        ],
      },
      selfLabels: {
        type: 'object',
        required: ['values'],
        properties: {
          values: {
            type: 'array',
            items: {
              ref: 'lex:com.atproto.label.defs#selfLabel',
              type: 'ref',
            },
            maxLength: 10,
          },
        },
        description:
          'Metadata tags on an atproto record, published by the author within the record.',
      },
      labelValueDefinition: {
        type: 'object',
        required: ['identifier', 'severity', 'blurs', 'locales'],
        properties: {
          blurs: {
            type: 'string',
            description:
              "What should this label hide in the UI, if applied? 'content' hides all of the target; 'media' hides the images/video/audio; 'none' hides nothing.",
            knownValues: ['content', 'media', 'none'],
          },
          locales: {
            type: 'array',
            items: {
              ref: 'lex:com.atproto.label.defs#labelValueDefinitionStrings',
              type: 'ref',
            },
          },
          severity: {
            type: 'string',
            description:
              "How should a client visually convey this label? 'inform' means neutral and informational; 'alert' means negative and warning; 'none' means show nothing.",
            knownValues: ['inform', 'alert', 'none'],
          },
          adultOnly: {
            type: 'boolean',
            description:
              'Does the user need to have adult content enabled in order to configure this label?',
          },
          identifier: {
            type: 'string',
            maxLength: 100,
            description:
              "The value of the label being defined. Must only include lowercase ascii and the '-' character ([a-z-]+).",
            maxGraphemes: 100,
          },
          defaultSetting: {
            type: 'string',
            default: 'warn',
            description: 'The default setting for this label.',
            knownValues: ['ignore', 'warn', 'hide'],
          },
        },
        description:
          'Declares a label value and its expected interpretations and behaviors.',
      },
      labelValueDefinitionStrings: {
        type: 'object',
        required: ['lang', 'name', 'description'],
        properties: {
          lang: {
            type: 'string',
            format: 'language',
            description:
              'The code of the language these strings are written in.',
          },
          name: {
            type: 'string',
            maxLength: 640,
            description: 'A short human-readable name for the label.',
            maxGraphemes: 64,
          },
          description: {
            type: 'string',
            maxLength: 100000,
            description:
              'A longer description of what the label means and why it might be applied.',
            maxGraphemes: 10000,
          },
        },
        description:
          'Strings which describe the label in the UI, localized into a specific language.',
      },
    },
  },
  ComAtprotoRepoStrongRef: {
    lexicon: 1,
    id: 'com.atproto.repo.strongRef',
    description: 'A URI with a content-hash fingerprint.',
    defs: {
      main: {
        type: 'object',
        required: ['uri', 'cid'],
        properties: {
          cid: {
            type: 'string',
            format: 'cid',
          },
          uri: {
            type: 'string',
            format: 'at-uri',
          },
        },
      },
    },
  },
  ComAtprotoModerationDefs: {
    lexicon: 1,
    id: 'com.atproto.moderation.defs',
    defs: {
      reasonRude: {
        type: 'token',
        description:
          'Rude, harassing, explicit, or otherwise unwelcoming behavior. Prefer new lexicon definition `tools.ozone.report.defs#reasonHarassmentOther`.',
      },
      reasonSpam: {
        type: 'token',
        description:
          'Spam: frequent unwanted promotion, replies, mentions. Prefer new lexicon definition `tools.ozone.report.defs#reasonMisleadingSpam`.',
      },
      reasonType: {
        type: 'string',
        knownValues: [
          'com.atproto.moderation.defs#reasonSpam',
          'com.atproto.moderation.defs#reasonViolation',
          'com.atproto.moderation.defs#reasonMisleading',
          'com.atproto.moderation.defs#reasonSexual',
          'com.atproto.moderation.defs#reasonRude',
          'com.atproto.moderation.defs#reasonOther',
          'com.atproto.moderation.defs#reasonAppeal',
          'tools.ozone.report.defs#reasonAppeal',
          'tools.ozone.report.defs#reasonOther',
          'tools.ozone.report.defs#reasonViolenceAnimal',
          'tools.ozone.report.defs#reasonViolenceThreats',
          'tools.ozone.report.defs#reasonViolenceGraphicContent',
          'tools.ozone.report.defs#reasonViolenceGlorification',
          'tools.ozone.report.defs#reasonViolenceExtremistContent',
          'tools.ozone.report.defs#reasonViolenceTrafficking',
          'tools.ozone.report.defs#reasonViolenceOther',
          'tools.ozone.report.defs#reasonSexualAbuseContent',
          'tools.ozone.report.defs#reasonSexualNCII',
          'tools.ozone.report.defs#reasonSexualDeepfake',
          'tools.ozone.report.defs#reasonSexualAnimal',
          'tools.ozone.report.defs#reasonSexualUnlabeled',
          'tools.ozone.report.defs#reasonSexualOther',
          'tools.ozone.report.defs#reasonChildSafetyCSAM',
          'tools.ozone.report.defs#reasonChildSafetyGroom',
          'tools.ozone.report.defs#reasonChildSafetyPrivacy',
          'tools.ozone.report.defs#reasonChildSafetyHarassment',
          'tools.ozone.report.defs#reasonChildSafetyOther',
          'tools.ozone.report.defs#reasonHarassmentTroll',
          'tools.ozone.report.defs#reasonHarassmentTargeted',
          'tools.ozone.report.defs#reasonHarassmentHateSpeech',
          'tools.ozone.report.defs#reasonHarassmentDoxxing',
          'tools.ozone.report.defs#reasonHarassmentOther',
          'tools.ozone.report.defs#reasonMisleadingBot',
          'tools.ozone.report.defs#reasonMisleadingImpersonation',
          'tools.ozone.report.defs#reasonMisleadingSpam',
          'tools.ozone.report.defs#reasonMisleadingScam',
          'tools.ozone.report.defs#reasonMisleadingElections',
          'tools.ozone.report.defs#reasonMisleadingOther',
          'tools.ozone.report.defs#reasonRuleSiteSecurity',
          'tools.ozone.report.defs#reasonRuleProhibitedSales',
          'tools.ozone.report.defs#reasonRuleBanEvasion',
          'tools.ozone.report.defs#reasonRuleOther',
          'tools.ozone.report.defs#reasonSelfHarmContent',
          'tools.ozone.report.defs#reasonSelfHarmED',
          'tools.ozone.report.defs#reasonSelfHarmStunts',
          'tools.ozone.report.defs#reasonSelfHarmSubstances',
          'tools.ozone.report.defs#reasonSelfHarmOther',
        ],
      },
      reasonOther: {
        type: 'token',
        description:
          'Reports not falling under another report category. Prefer new lexicon definition `tools.ozone.report.defs#reasonOther`.',
      },
      subjectType: {
        type: 'string',
        description: 'Tag describing a type of subject that might be reported.',
        knownValues: ['account', 'record', 'chat'],
      },
      reasonAppeal: {
        type: 'token',
        description: 'Appeal a previously taken moderation action',
      },
      reasonSexual: {
        type: 'token',
        description:
          'Unwanted or mislabeled sexual content. Prefer new lexicon definition `tools.ozone.report.defs#reasonSexualUnlabeled`.',
      },
      reasonViolation: {
        type: 'token',
        description:
          'Direct violation of server rules, laws, terms of service. Prefer new lexicon definition `tools.ozone.report.defs#reasonRuleOther`.',
      },
      reasonMisleading: {
        type: 'token',
        description:
          'Misleading identity, affiliation, or content. Prefer new lexicon definition `tools.ozone.report.defs#reasonMisleadingOther`.',
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
  AppBskyEmbedDefs: 'app.bsky.embed.defs',
  AppBskyEmbedRecord: 'app.bsky.embed.record',
  AppBskyEmbedImages: 'app.bsky.embed.images',
  AppBskyEmbedRecordWithMedia: 'app.bsky.embed.recordWithMedia',
  AppBskyEmbedVideo: 'app.bsky.embed.video',
  AppBskyEmbedExternal: 'app.bsky.embed.external',
  AppBskyNotificationDefs: 'app.bsky.notification.defs',
  AppBskyGraphDefs: 'app.bsky.graph.defs',
  AppBskyFeedDefs: 'app.bsky.feed.defs',
  AppBskyFeedPostgate: 'app.bsky.feed.postgate',
  AppBskyFeedThreadgate: 'app.bsky.feed.threadgate',
  AppBskyFeedPost: 'app.bsky.feed.post',
  AppBskyRichtextFacet: 'app.bsky.richtext.facet',
  AppBskyActorDefs: 'app.bsky.actor.defs',
  AppBskyLabelerDefs: 'app.bsky.labeler.defs',
  FmTealAlphaFeedDefs: 'fm.teal.alpha.feed.defs',
  FmTealAlphaFeedGetPlay: 'fm.teal.alpha.feed.getPlay',
  FmTealAlphaFeedGetActorFeed: 'fm.teal.alpha.feed.getActorFeed',
  FmTealAlphaFeedPlay: 'fm.teal.alpha.feed.play',
  FmTealAlphaActorDefs: 'fm.teal.alpha.actor.defs',
  FmTealAlphaActorProfileStatus: 'fm.teal.alpha.actor.profileStatus',
  FmTealAlphaActorGetProfile: 'fm.teal.alpha.actor.getProfile',
  FmTealAlphaActorSearchActors: 'fm.teal.alpha.actor.searchActors',
  FmTealAlphaActorGetProfiles: 'fm.teal.alpha.actor.getProfiles',
  FmTealAlphaActorStatus: 'fm.teal.alpha.actor.status',
  FmTealAlphaActorProfile: 'fm.teal.alpha.actor.profile',
  FmTealAlphaStatsDefs: 'fm.teal.alpha.stats.defs',
  FmTealAlphaStatsGetUserTopArtists: 'fm.teal.alpha.stats.getUserTopArtists',
  FmTealAlphaStatsGetTopReleases: 'fm.teal.alpha.stats.getTopReleases',
  FmTealAlphaStatsGetLatest: 'fm.teal.alpha.stats.getLatest',
  FmTealAlphaStatsGetUserTopReleases: 'fm.teal.alpha.stats.getUserTopReleases',
  FmTealAlphaStatsGetTopArtists: 'fm.teal.alpha.stats.getTopArtists',
  ComAtprotoLabelDefs: 'com.atproto.label.defs',
  ComAtprotoRepoStrongRef: 'com.atproto.repo.strongRef',
  ComAtprotoModerationDefs: 'com.atproto.moderation.defs',
} as const
