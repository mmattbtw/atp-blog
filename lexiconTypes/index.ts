/**
 * GENERATED CODE - DO NOT MODIFY
 */
import {
  type Auth,
  type Options as XrpcOptions,
  Server as XrpcServer,
  type StreamConfigOrHandler,
  type MethodConfigOrHandler,
  createServer as createXrpcServer,
} from '@atproto/xrpc-server'
import { schemas } from './lexicons.js'
import * as FmTealAlphaActorGetProfile from './types/fm/teal/alpha/actor/getProfile.js'
import * as FmTealAlphaActorGetProfiles from './types/fm/teal/alpha/actor/getProfiles.js'
import * as FmTealAlphaActorSearchActors from './types/fm/teal/alpha/actor/searchActors.js'
import * as FmTealAlphaFeedGetActorFeed from './types/fm/teal/alpha/feed/getActorFeed.js'
import * as FmTealAlphaFeedGetPlay from './types/fm/teal/alpha/feed/getPlay.js'
import * as FmTealAlphaStatsGetLatest from './types/fm/teal/alpha/stats/getLatest.js'
import * as FmTealAlphaStatsGetTopArtists from './types/fm/teal/alpha/stats/getTopArtists.js'
import * as FmTealAlphaStatsGetTopReleases from './types/fm/teal/alpha/stats/getTopReleases.js'
import * as FmTealAlphaStatsGetUserTopArtists from './types/fm/teal/alpha/stats/getUserTopArtists.js'
import * as FmTealAlphaStatsGetUserTopReleases from './types/fm/teal/alpha/stats/getUserTopReleases.js'

export function createServer(options?: XrpcOptions): Server {
  return new Server(options)
}

export class Server {
  xrpc: XrpcServer
  app: AppNS
  fm: FmNS
  net: NetNS

  constructor(options?: XrpcOptions) {
    this.xrpc = createXrpcServer(schemas, options)
    this.app = new AppNS(this)
    this.fm = new FmNS(this)
    this.net = new NetNS(this)
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
  richtext: AppBskyRichtextNS

  constructor(server: Server) {
    this._server = server
    this.richtext = new AppBskyRichtextNS(server)
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
  actor: FmTealAlphaActorNS
  feed: FmTealAlphaFeedNS
  stats: FmTealAlphaStatsNS

  constructor(server: Server) {
    this._server = server
    this.actor = new FmTealAlphaActorNS(server)
    this.feed = new FmTealAlphaFeedNS(server)
    this.stats = new FmTealAlphaStatsNS(server)
  }
}

export class FmTealAlphaActorNS {
  _server: Server

  constructor(server: Server) {
    this._server = server
  }

  getProfile<A extends Auth = void>(
    cfg: MethodConfigOrHandler<
      A,
      FmTealAlphaActorGetProfile.QueryParams,
      FmTealAlphaActorGetProfile.HandlerInput,
      FmTealAlphaActorGetProfile.HandlerOutput
    >,
  ) {
    const nsid = 'fm.teal.alpha.actor.getProfile' // @ts-ignore
    return this._server.xrpc.method(nsid, cfg)
  }

  getProfiles<A extends Auth = void>(
    cfg: MethodConfigOrHandler<
      A,
      FmTealAlphaActorGetProfiles.QueryParams,
      FmTealAlphaActorGetProfiles.HandlerInput,
      FmTealAlphaActorGetProfiles.HandlerOutput
    >,
  ) {
    const nsid = 'fm.teal.alpha.actor.getProfiles' // @ts-ignore
    return this._server.xrpc.method(nsid, cfg)
  }

  searchActors<A extends Auth = void>(
    cfg: MethodConfigOrHandler<
      A,
      FmTealAlphaActorSearchActors.QueryParams,
      FmTealAlphaActorSearchActors.HandlerInput,
      FmTealAlphaActorSearchActors.HandlerOutput
    >,
  ) {
    const nsid = 'fm.teal.alpha.actor.searchActors' // @ts-ignore
    return this._server.xrpc.method(nsid, cfg)
  }
}

export class FmTealAlphaFeedNS {
  _server: Server

  constructor(server: Server) {
    this._server = server
  }

  getActorFeed<A extends Auth = void>(
    cfg: MethodConfigOrHandler<
      A,
      FmTealAlphaFeedGetActorFeed.QueryParams,
      FmTealAlphaFeedGetActorFeed.HandlerInput,
      FmTealAlphaFeedGetActorFeed.HandlerOutput
    >,
  ) {
    const nsid = 'fm.teal.alpha.feed.getActorFeed' // @ts-ignore
    return this._server.xrpc.method(nsid, cfg)
  }

  getPlay<A extends Auth = void>(
    cfg: MethodConfigOrHandler<
      A,
      FmTealAlphaFeedGetPlay.QueryParams,
      FmTealAlphaFeedGetPlay.HandlerInput,
      FmTealAlphaFeedGetPlay.HandlerOutput
    >,
  ) {
    const nsid = 'fm.teal.alpha.feed.getPlay' // @ts-ignore
    return this._server.xrpc.method(nsid, cfg)
  }
}

export class FmTealAlphaStatsNS {
  _server: Server

  constructor(server: Server) {
    this._server = server
  }

  getLatest<A extends Auth = void>(
    cfg: MethodConfigOrHandler<
      A,
      FmTealAlphaStatsGetLatest.QueryParams,
      FmTealAlphaStatsGetLatest.HandlerInput,
      FmTealAlphaStatsGetLatest.HandlerOutput
    >,
  ) {
    const nsid = 'fm.teal.alpha.stats.getLatest' // @ts-ignore
    return this._server.xrpc.method(nsid, cfg)
  }

  getTopArtists<A extends Auth = void>(
    cfg: MethodConfigOrHandler<
      A,
      FmTealAlphaStatsGetTopArtists.QueryParams,
      FmTealAlphaStatsGetTopArtists.HandlerInput,
      FmTealAlphaStatsGetTopArtists.HandlerOutput
    >,
  ) {
    const nsid = 'fm.teal.alpha.stats.getTopArtists' // @ts-ignore
    return this._server.xrpc.method(nsid, cfg)
  }

  getTopReleases<A extends Auth = void>(
    cfg: MethodConfigOrHandler<
      A,
      FmTealAlphaStatsGetTopReleases.QueryParams,
      FmTealAlphaStatsGetTopReleases.HandlerInput,
      FmTealAlphaStatsGetTopReleases.HandlerOutput
    >,
  ) {
    const nsid = 'fm.teal.alpha.stats.getTopReleases' // @ts-ignore
    return this._server.xrpc.method(nsid, cfg)
  }

  getUserTopArtists<A extends Auth = void>(
    cfg: MethodConfigOrHandler<
      A,
      FmTealAlphaStatsGetUserTopArtists.QueryParams,
      FmTealAlphaStatsGetUserTopArtists.HandlerInput,
      FmTealAlphaStatsGetUserTopArtists.HandlerOutput
    >,
  ) {
    const nsid = 'fm.teal.alpha.stats.getUserTopArtists' // @ts-ignore
    return this._server.xrpc.method(nsid, cfg)
  }

  getUserTopReleases<A extends Auth = void>(
    cfg: MethodConfigOrHandler<
      A,
      FmTealAlphaStatsGetUserTopReleases.QueryParams,
      FmTealAlphaStatsGetUserTopReleases.HandlerInput,
      FmTealAlphaStatsGetUserTopReleases.HandlerOutput
    >,
  ) {
    const nsid = 'fm.teal.alpha.stats.getUserTopReleases' // @ts-ignore
    return this._server.xrpc.method(nsid, cfg)
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
