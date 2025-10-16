/**
 * GENERATED CODE - DO NOT MODIFY
 */
import {
  createServer as createXrpcServer,
  Server as XrpcServer,
  type AuthVerifier,
  type StreamAuthVerifier,
  type Options as XrpcOptions,
} from "@atproto/xrpc-server";

import { schemas } from "./lexicons.js";

export function createServer(options?: XrpcOptions): Server {
  return new Server(options);
}

export class Server {
  xrpc: XrpcServer;
  net: NetNS;

  constructor(options?: XrpcOptions) {
    this.xrpc = createXrpcServer(schemas, options);
    this.net = new NetNS(this);
  }
}

export class NetNS {
  _server: Server;
  mmatt: NetMmattNS;

  constructor(server: Server) {
    this._server = server;
    this.mmatt = new NetMmattNS(server);
  }
}

export class NetMmattNS {
  _server: Server;
  right: NetMmattRightNS;
  vitals: NetMmattVitalsNS;

  constructor(server: Server) {
    this._server = server;
    this.right = new NetMmattRightNS(server);
    this.vitals = new NetMmattVitalsNS(server);
  }
}

export class NetMmattRightNS {
  _server: Server;

  constructor(server: Server) {
    this._server = server;
  }
}

export class NetMmattVitalsNS {
  _server: Server;

  constructor(server: Server) {
    this._server = server;
  }
}

type SharedRateLimitOpts<T> = {
  name: string;
  calcKey?: (ctx: T) => string | null;
  calcPoints?: (ctx: T) => number;
};
type RouteRateLimitOpts<T> = {
  durationMs: number;
  points: number;
  calcKey?: (ctx: T) => string | null;
  calcPoints?: (ctx: T) => number;
};
type HandlerOpts = { blobLimit?: number };
type HandlerRateLimitOpts<T> = SharedRateLimitOpts<T> | RouteRateLimitOpts<T>;
type ConfigOf<Auth, Handler, ReqCtx> =
  | Handler
  | {
      auth?: Auth;
      opts?: HandlerOpts;
      rateLimit?: HandlerRateLimitOpts<ReqCtx> | HandlerRateLimitOpts<ReqCtx>[];
      handler: Handler;
    };
type ExtractAuth<
  AV extends AuthVerifier<any, any> | StreamAuthVerifier<any, any>,
> = Extract<Awaited<ReturnType<AV>>, { credentials: unknown }>;
