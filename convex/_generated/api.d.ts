/* eslint-disable */
/**
 * Generated `api` utility.
 *
 * THIS CODE IS AUTOMATICALLY GENERATED.
 *
 * To regenerate, run `npx convex dev`.
 * @module
 */

import type * as ai from "../ai.js";
import type * as auth from "../auth.js";
import type * as authHelpers from "../authHelpers.js";
import type * as cleanupAuth from "../cleanupAuth.js";
import type * as debug from "../debug.js";
import type * as entries from "../entries.js";
import type * as http from "../http.js";
import type * as migrations from "../migrations.js";
import type * as routines from "../routines.js";
import type * as settings from "../settings.js";
import type * as tasks from "../tasks.js";
import type * as timeBlocks from "../timeBlocks.js";

import type {
  ApiFromModules,
  FilterApi,
  FunctionReference,
} from "convex/server";

declare const fullApi: ApiFromModules<{
  ai: typeof ai;
  auth: typeof auth;
  authHelpers: typeof authHelpers;
  cleanupAuth: typeof cleanupAuth;
  debug: typeof debug;
  entries: typeof entries;
  http: typeof http;
  migrations: typeof migrations;
  routines: typeof routines;
  settings: typeof settings;
  tasks: typeof tasks;
  timeBlocks: typeof timeBlocks;
}>;

/**
 * A utility for referencing Convex functions in your app's public API.
 *
 * Usage:
 * ```js
 * const myFunctionReference = api.myModule.myFunction;
 * ```
 */
export declare const api: FilterApi<
  typeof fullApi,
  FunctionReference<any, "public">
>;

/**
 * A utility for referencing Convex functions in your app's internal API.
 *
 * Usage:
 * ```js
 * const myFunctionReference = internal.myModule.myFunction;
 * ```
 */
export declare const internal: FilterApi<
  typeof fullApi,
  FunctionReference<any, "internal">
>;

export declare const components: {};
