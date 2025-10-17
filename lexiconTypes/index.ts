/**
 * GENERATED CODE - DO NOT MODIFY
 */
import {
  createServer as createXrpcServer,
  Server as XrpcServer,
  type Options as XrpcOptions,
  type AuthVerifier,
  type StreamAuthVerifier,
} from '@atproto/xrpc-server'
import { schemas } from './lexicons.js'
import * as FmTealAlphaFeedGetPlay from './types/fm/teal/alpha/feed/getPlay.js'
import * as FmTealAlphaFeedGetActorFeed from './types/fm/teal/alpha/feed/getActorFeed.js'
import * as FmTealAlphaActorGetProfile from './types/fm/teal/alpha/actor/getProfile.js'
import * as FmTealAlphaActorSearchActors from './types/fm/teal/alpha/actor/searchActors.js'
import * as FmTealAlphaActorGetProfiles from './types/fm/teal/alpha/actor/getProfiles.js'
import * as FmTealAlphaStatsGetUserTopArtists from './types/fm/teal/alpha/stats/getUserTopArtists.js'
import * as FmTealAlphaStatsGetTopReleases from './types/fm/teal/alpha/stats/getTopReleases.js'
import * as FmTealAlphaStatsGetLatest from './types/fm/teal/alpha/stats/getLatest.js'
import * as FmTealAlphaStatsGetUserTopReleases from './types/fm/teal/alpha/stats/getUserTopReleases.js'
import * as FmTealAlphaStatsGetTopArtists from './types/fm/teal/alpha/stats/getTopArtists.js'

export const APP_BSKY_GRAPH = {
  DefsModlist: 'app.bsky.graph.defs#modlist',
  DefsCuratelist: 'app.bsky.graph.defs#curatelist',
  DefsReferencelist: 'app.bsky.graph.defs#referencelist',
}
export const APP_BSKY_FEED = {
  DefsRequestLess: 'app.bsky.feed.defs#requestLess',
  DefsRequestMore: 'app.bsky.feed.defs#requestMore',
  DefsInteractionLike: 'app.bsky.feed.defs#interactionLike',
  DefsInteractionSeen: 'app.bsky.feed.defs#interactionSeen',
  DefsClickthroughItem: 'app.bsky.feed.defs#clickthroughItem',
  DefsContentModeVideo: 'app.bsky.feed.defs#contentModeVideo',
  DefsInteractionQuote: 'app.bsky.feed.defs#interactionQuote',
  DefsInteractionReply: 'app.bsky.feed.defs#interactionReply',
  DefsInteractionShare: 'app.bsky.feed.defs#interactionShare',
  DefsClickthroughEmbed: 'app.bsky.feed.defs#clickthroughEmbed',
  DefsInteractionRepost: 'app.bsky.feed.defs#interactionRepost',
  DefsClickthroughAuthor: 'app.bsky.feed.defs#clickthroughAuthor',
  DefsClickthroughReposter: 'app.bsky.feed.defs#clickthroughReposter',
  DefsContentModeUnspecified: 'app.bsky.feed.defs#contentModeUnspecified',
}
export const COM_ATPROTO_MODERATION = {
  DefsReasonRude: 'com.atproto.moderation.defs#reasonRude',
  DefsReasonSpam: 'com.atproto.moderation.defs#reasonSpam',
  DefsReasonOther: 'com.atproto.moderation.defs#reasonOther',
  DefsReasonAppeal: 'com.atproto.moderation.defs#reasonAppeal',
  DefsReasonSexual: 'com.atproto.moderation.defs#reasonSexual',
  DefsReasonViolation: 'com.atproto.moderation.defs#reasonViolation',
  DefsReasonMisleading: 'com.atproto.moderation.defs#reasonMisleading',
}

export function createServer(options?: XrpcOptions): Server {
  return new Server(options)
}

export class Server {
  xrpc: XrpcServer
  net: NetNS
  app: AppNS
  fm: FmNS
  com: ComNS

  constructor(options?: XrpcOptions) {
    this.xrpc = createXrpcServer(schemas, options)
    this.net = new NetNS(this)
    this.app = new AppNS(this)
    this.fm = new FmNS(this)
    this.com = new ComNS(this)
  }
}

export class NetNS {
  _server: Server
  mmatt: NetMmattNS

  constructor(server: Server) {
    this._server = server
    this.mmatt = new NetMmattNS(server)
  }
}

export class NetMmattNS {
  _server: Server
  right: NetMmattRightNS
  vitals: NetMmattVitalsNS

  constructor(server: Server) {
    this._server = server
    this.right = new NetMmattRightNS(server)
    this.vitals = new NetMmattVitalsNS(server)
  }
}

export class NetMmattRightNS {
  _server: Server

  constructor(server: Server) {
    this._server = server
  }
}

export class NetMmattVitalsNS {
  _server: Server

  constructor(server: Server) {
    this._server = server
  }
}

export class AppNS {
  _server: Server
  bsky: AppBskyNS

  constructor(server: Server) {
    this._server = server
    this.bsky = new AppBskyNS(server)
  }
}

export class AppBskyNS {
  _server: Server
  embed: AppBskyEmbedNS
  feed: AppBskyFeedNS
  richtext: AppBskyRichtextNS

  constructor(server: Server) {
    this._server = server
    this.embed = new AppBskyEmbedNS(server)
    this.feed = new AppBskyFeedNS(server)
    this.richtext = new AppBskyRichtextNS(server)
  }
}

export class AppBskyEmbedNS {
  _server: Server

  constructor(server: Server) {
    this._server = server
  }
}

export class AppBskyFeedNS {
  _server: Server

  constructor(server: Server) {
    this._server = server
  }
}

export class AppBskyRichtextNS {
  _server: Server

  constructor(server: Server) {
    this._server = server
  }
}

export class FmNS {
  _server: Server
  teal: FmTealNS

  constructor(server: Server) {
    this._server = server
    this.teal = new FmTealNS(server)
  }
}

export class FmTealNS {
  _server: Server
  alpha: FmTealAlphaNS

  constructor(server: Server) {
    this._server = server
    this.alpha = new FmTealAlphaNS(server)
  }
}

export class FmTealAlphaNS {
  _server: Server
  feed: FmTealAlphaFeedNS
  actor: FmTealAlphaActorNS
  stats: FmTealAlphaStatsNS

  constructor(server: Server) {
    this._server = server
    this.feed = new FmTealAlphaFeedNS(server)
    this.actor = new FmTealAlphaActorNS(server)
    this.stats = new FmTealAlphaStatsNS(server)
  }
}

export class FmTealAlphaFeedNS {
  _server: Server

  constructor(server: Server) {
    this._server = server
  }

  getPlay<AV extends AuthVerifier>(
    cfg: ConfigOf<
      AV,
      FmTealAlphaFeedGetPlay.Handler<ExtractAuth<AV>>,
      FmTealAlphaFeedGetPlay.HandlerReqCtx<ExtractAuth<AV>>
    >,
  ) {
    const nsid = 'fm.teal.alpha.feed.getPlay' // @ts-ignore
    return this._server.xrpc.method(nsid, cfg)
  }

  getActorFeed<AV extends AuthVerifier>(
    cfg: ConfigOf<
      AV,
      FmTealAlphaFeedGetActorFeed.Handler<ExtractAuth<AV>>,
      FmTealAlphaFeedGetActorFeed.HandlerReqCtx<ExtractAuth<AV>>
    >,
  ) {
    const nsid = 'fm.teal.alpha.feed.getActorFeed' // @ts-ignore
    return this._server.xrpc.method(nsid, cfg)
  }
}

export class FmTealAlphaActorNS {
  _server: Server

  constructor(server: Server) {
    this._server = server
  }

  getProfile<AV extends AuthVerifier>(
    cfg: ConfigOf<
      AV,
      FmTealAlphaActorGetProfile.Handler<ExtractAuth<AV>>,
      FmTealAlphaActorGetProfile.HandlerReqCtx<ExtractAuth<AV>>
    >,
  ) {
    const nsid = 'fm.teal.alpha.actor.getProfile' // @ts-ignore
    return this._server.xrpc.method(nsid, cfg)
  }

  searchActors<AV extends AuthVerifier>(
    cfg: ConfigOf<
      AV,
      FmTealAlphaActorSearchActors.Handler<ExtractAuth<AV>>,
      FmTealAlphaActorSearchActors.HandlerReqCtx<ExtractAuth<AV>>
    >,
  ) {
    const nsid = 'fm.teal.alpha.actor.searchActors' // @ts-ignore
    return this._server.xrpc.method(nsid, cfg)
  }

  getProfiles<AV extends AuthVerifier>(
    cfg: ConfigOf<
      AV,
      FmTealAlphaActorGetProfiles.Handler<ExtractAuth<AV>>,
      FmTealAlphaActorGetProfiles.HandlerReqCtx<ExtractAuth<AV>>
    >,
  ) {
    const nsid = 'fm.teal.alpha.actor.getProfiles' // @ts-ignore
    return this._server.xrpc.method(nsid, cfg)
  }
}

export class FmTealAlphaStatsNS {
  _server: Server

  constructor(server: Server) {
    this._server = server
  }

  getUserTopArtists<AV extends AuthVerifier>(
    cfg: ConfigOf<
      AV,
      FmTealAlphaStatsGetUserTopArtists.Handler<ExtractAuth<AV>>,
      FmTealAlphaStatsGetUserTopArtists.HandlerReqCtx<ExtractAuth<AV>>
    >,
  ) {
    const nsid = 'fm.teal.alpha.stats.getUserTopArtists' // @ts-ignore
    return this._server.xrpc.method(nsid, cfg)
  }

  getTopReleases<AV extends AuthVerifier>(
    cfg: ConfigOf<
      AV,
      FmTealAlphaStatsGetTopReleases.Handler<ExtractAuth<AV>>,
      FmTealAlphaStatsGetTopReleases.HandlerReqCtx<ExtractAuth<AV>>
    >,
  ) {
    const nsid = 'fm.teal.alpha.stats.getTopReleases' // @ts-ignore
    return this._server.xrpc.method(nsid, cfg)
  }

  getLatest<AV extends AuthVerifier>(
    cfg: ConfigOf<
      AV,
      FmTealAlphaStatsGetLatest.Handler<ExtractAuth<AV>>,
      FmTealAlphaStatsGetLatest.HandlerReqCtx<ExtractAuth<AV>>
    >,
  ) {
    const nsid = 'fm.teal.alpha.stats.getLatest' // @ts-ignore
    return this._server.xrpc.method(nsid, cfg)
  }

  getUserTopReleases<AV extends AuthVerifier>(
    cfg: ConfigOf<
      AV,
      FmTealAlphaStatsGetUserTopReleases.Handler<ExtractAuth<AV>>,
      FmTealAlphaStatsGetUserTopReleases.HandlerReqCtx<ExtractAuth<AV>>
    >,
  ) {
    const nsid = 'fm.teal.alpha.stats.getUserTopReleases' // @ts-ignore
    return this._server.xrpc.method(nsid, cfg)
  }

  getTopArtists<AV extends AuthVerifier>(
    cfg: ConfigOf<
      AV,
      FmTealAlphaStatsGetTopArtists.Handler<ExtractAuth<AV>>,
      FmTealAlphaStatsGetTopArtists.HandlerReqCtx<ExtractAuth<AV>>
    >,
  ) {
    const nsid = 'fm.teal.alpha.stats.getTopArtists' // @ts-ignore
    return this._server.xrpc.method(nsid, cfg)
  }
}

export class ComNS {
  _server: Server
  atproto: ComAtprotoNS

  constructor(server: Server) {
    this._server = server
    this.atproto = new ComAtprotoNS(server)
  }
}

export class ComAtprotoNS {
  _server: Server
  repo: ComAtprotoRepoNS

  constructor(server: Server) {
    this._server = server
    this.repo = new ComAtprotoRepoNS(server)
  }
}

export class ComAtprotoRepoNS {
  _server: Server

  constructor(server: Server) {
    this._server = server
  }
}

type SharedRateLimitOpts<T> = {
  name: string
  calcKey?: (ctx: T) => string | null
  calcPoints?: (ctx: T) => number
}
type RouteRateLimitOpts<T> = {
  durationMs: number
  points: number
  calcKey?: (ctx: T) => string | null
  calcPoints?: (ctx: T) => number
}
type HandlerOpts = { blobLimit?: number }
type HandlerRateLimitOpts<T> = SharedRateLimitOpts<T> | RouteRateLimitOpts<T>
type ConfigOf<Auth, Handler, ReqCtx> =
  | Handler
  | {
      auth?: Auth
      opts?: HandlerOpts
      rateLimit?: HandlerRateLimitOpts<ReqCtx> | HandlerRateLimitOpts<ReqCtx>[]
      handler: Handler
    }
type ExtractAuth<AV extends AuthVerifier | StreamAuthVerifier> = Extract<
  Awaited<ReturnType<AV>>,
  { credentials: unknown }
>
