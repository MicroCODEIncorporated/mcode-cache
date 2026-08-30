# MicroCODE `mcode-cache`

A public NPM package of MicroCODE caching tools for Node.js applications.

`mcode-cache` provides an in-process `node-cache` backend, optional Redis
namespaces through `node-redis`, file caching, typed values, native conditional
writes, transactions, geo and sorted-set operations, pub/sub, and explicit
connection lifecycle management. Version 0.9.0 requires Node.js 22.14 or newer
and Redis 8.4 or newer for Redis-backed namespaces.

## Description

This package centralizes common cache operations such as caching file contents,
data structures, and application values with consistent key construction.
Applications should use immutable namespace handles for new code. The older
singleton methods remain available for compatibility.

## Requirements

- Node.js `>=22.14.0`.
- Redis `>=8.4.0` when using Redis namespaces. Redis 8.4 is required for native
  `SET IFEQ` and `DELEX IFEQ`.
- Standalone Redis using one logical database. Redis Cluster is not supported
  by the v0.9.0 transaction contract.
- Explicit Redis connection, retry, readiness, deadline, and offline-queue
  policy. The package does not assume localhost or credentials.

## Quick Start

Install the package:

```bash
npm install mcode-cache
```

The package exports one CommonJS singleton:

```javascript
const cache = require('mcode-cache');
```

The default `MicroCODE` namespace uses `node-cache`. New code can register and
retain a scoped handle without changing the process-global namespace:

```javascript
const local = cache.addNamespace({
    name: 'MyApp',
    type: 'node',
});

await local.cacheSet('settings:theme', { name: 'dark' }, { noExpiry: true });
const theme = await local.cacheGet('settings:theme');
```

`addNamespace()` is idempotent only when the name, type, and Redis
configuration are identical. A conflicting registration throws
`CACHE_NAMESPACE_CONFLICT`. `getNamespace(name)` returns an existing immutable
handle and never changes `cache.cacheNamespace`.

## Redis Namespace

Redis configuration is deliberately explicit:

```javascript
const appMemory = cache.addNamespace({
    name: 'AppMemeory',
    type: 'redis',
    url: process.env.REDIS_URL,
    username: process.env.REDIS_USERNAME ?? null,
    password: process.env.REDIS_PASSWORD ?? null,
    retry: {
        baseDelayMs: 100,
        maxDelayMs: 2000,
        maxAttempts: 20,
    },
    readyTimeoutMs: 10000,
    commandTimeoutMs: 5000,
    disableOfflineQueue: true,
});

await appMemory.ready();
await appMemory.cacheSet(
    'user:42',
    {
        name: 'Ada',
        active: true,
    },
    {
        ttlSeconds: 300,
    }
);

const user = await appMemory.cacheGet('user:42');
```

Use `rediss://` for TLS. `username` and `password` must be strings or `null`.
Every timeout, retry value, and retry attempt count must be a positive integer.
`retry.baseDelayMs` cannot exceed `retry.maxDelayMs`.

Use `cache.probeNamespace(config)` for a bounded connection and capability check
without registering a namespace:

```javascript
const probe = await cache.probeNamespace({
    name: 'HealthProbe',
    type: 'redis',
    url: process.env.REDIS_URL,
    username: null,
    password: process.env.REDIS_PASSWORD ?? null,
    retry: { baseDelayMs: 100, maxDelayMs: 1000, maxAttempts: 3 },
    readyTimeoutMs: 5000,
    commandTimeoutMs: 3000,
    disableOfflineQueue: true,
});

// {ok: true, version: '8.6.1'}
```

### Typed Values

Scoped value methods accept `null`, booleans, finite numbers, strings, arrays,
and plain objects. Object keys are sorted before encoding so native equality
conditions compare deterministic bytes. Missing keys return JavaScript
`undefined`; stored `null` remains `null`.

Unsupported values include `undefined`, `NaN`, infinities, `Buffer`, `Date`,
class instances, functions, symbols, circular references, and nested
`undefined`. Encoded values are limited to 5 MiB.

```javascript
await appMemory.cacheSet(
    'lease:worker-1',
    { owner: 'worker-1' },
    {
        ifMissing: true,
        ttlMilliseconds: 15000,
    }
);

await appMemory.cacheSet(
    'lease:worker-1',
    { owner: 'worker-1' },
    {
        ifEqual: { owner: 'worker-1' },
        keepTTL: true,
    }
);

await appMemory.cacheDropIfEqual('lease:worker-1', { owner: 'worker-1' });
```

`cacheSet(key, value, options)` supports:

- one condition: `ifMissing`, `ifExisting`, or `ifEqual`;
- one expiry policy: `ttlSeconds`, `ttlMilliseconds`, `keepTTL`, or
  `noExpiry`.

Conflicting or invalid options throw `CACHE_INVALID_OPTIONS`.

### Keys, Channels, and Isolation

- Namespace names are 1–64 UTF-8 bytes and use letters, digits, `.`, `_`, or
  `-`; the first character must be a letter or digit.
- Logical keys are 1–512 UTF-8 bytes.
- Logical pub/sub channels are 1–256 UTF-8 bytes.
- Logical key and channel segments use letters, digits, `.`, `_`, or `-`,
  separated by `:`.
- Callers pass logical names such as `user:42`; the package privately produces
  `MyRedisApp:user:42`.
- Already-prefixed keys, wildcards in logical keys, empty segments, control
  characters, and unsupported separators are rejected.

Namespace handles never expose the physical Redis client or a raw-command
escape. Operations cannot cross into another namespace.

### Scoped Value and Inspection API

Every handle exposes:

- `ready({timeoutMs})`, `close()`, and the `name`, `type`, `enabled`, and
  `status` properties;
- `cacheGet(key)`, `cacheGetMany(keys)`, `cacheSet(key, value, options)`,
  `cacheDrop(keyOrKeys)`, and `cacheDropIfEqual(key, expectedValue)`;
- `cacheExists(key)`, `cacheTTL(key)`, `cachePTTL(key)`, and
  `cacheExpire(key, {seconds})` or `cacheExpire(key, {milliseconds})`;
- `ping()`, `info(section)`, and `time()` for bounded health information;
- `scan({cursor, pattern, count})` and
  `inspect({cursor, pattern, count, limit, includeValue})`.

`scan()` returns logical keys and a next cursor. It is bounded and never uses
Redis `KEYS`. `info()` accepts only package-approved sections such as `server`,
`clients`, `memory`, `persistence`, `stats`, `replication`, `cpu`, and
`cluster`.

<!-- {AIN-2026-08-26:GPT-5.6 Sol} -- administration reads must preserve complete results and honest metrics -->

`scan()` and `inspect()` support both Node and Redis namespaces. `inspect()`
returns one cursor-safe page and does not increment namespace hit or miss
counters. Node inspection can include any supported cached value; Redis
inspection includes decoded values for string keys and type metadata for native
Redis structures. `limit` bounds the requested scan count, but Redis treats
`COUNT` as a hint, so the complete returned Redis page is preserved rather than
truncated.

### Geo and Sorted Sets

```javascript
await appMemory.geoAdd('geo:vessels', [
    { longitude: -80.1918, latitude: 25.7617, member: 'vessel-a' },
    { longitude: -80.13, latitude: 26.12, member: 'vessel-b' },
]);

const nearby = await appMemory.geoSearch('geo:vessels', {
    from: { longitude: -80.1918, latitude: 25.7617 },
    radius: 100,
    unit: 'km',
    sort: 'ASC',
});

await appMemory.sortedSetAdd('rank:vessels', [
    { member: 'vessel-a', score: 10 },
    { member: 'vessel-b', score: 20 },
]);

const ranked = await appMemory.sortedSetRange('rank:vessels', {
    start: 0,
    stop: -1,
    withScores: true,
});
```

Geo methods are `geoAdd`, `geoRemove`, and `geoSearch`. Sorted-set methods are
`sortedSetAdd`, `sortedSetRemove`, `sortedSetRemoveByScore`, `sortedSetCount`,
`sortedSetRange`, `sortedSetRangeByScore`, `sortedSetRank`, and
`sortedSetScore`.
`geoSearch` accepts an origin member or coordinates, one radius or width/height
shape, `m`, `km`, `mi`, or `ft`, optional `ASC`/`DESC` sorting, and optional
`count`/`any`. `sortedSetAdd` accepts `ifMissing`, `ifExisting`, and `changed`.
Range methods support optional scores; score ranges can also use bounded
`offset` and `count`.

<!-- {AIN-2026-08-26:GPT-5.6 Sol} -- consumers need the complete sorted-set contract before adoption -->

### Transactions

`multi()` builds a typed transaction. `exec()` returns one
`{result, error}` envelope per queued operation:

```javascript
const replies = await appMemory
    .multi()
    .cacheSet('vessel:a', { version: 1 }, { noExpiry: true })
    .geoAdd('geo:vessels', {
        longitude: -80.1918,
        latitude: 25.7617,
        member: 'vessel-a',
    })
    .exec();
```

The builder accepts `cacheGet`, `cacheSet`, `cacheDrop`,
`cacheDropIfEqual`, `cacheExists`, `cacheExpire`, `geoAdd`, `geoRemove`,
`sortedSetAdd`, `sortedSetRemove`, and `publish`.

`watchTransaction(options, planner)` uses one exclusive Redis connection and
bounded `WATCH`/`MULTI`/`EXEC` retries:

```javascript
await appMemory.watchTransaction(
    {
        keys: ['vessel:a'],
        maxRetries: 3,
        deadlineMs: 10000,
    },
    async (session) => {
        const vessel = await session.cacheGet('vessel:a');
        return session.multi().cacheSet(
            'vessel:a',
            {
                ...vessel,
                version: vessel.version + 1,
            },
            { noExpiry: true }
        );
    }
);
```

The planner session provides `cacheGet`, `cacheGetMany`, `cacheExists`,
`cacheTTL`, `cachePTTL`, `sortedSetRange`, `sortedSetRangeByScore`,
`sortedSetCount`, and `multi`. The transaction builder also supports
`sortedSetRemoveByScore`. The planner must return the builder from
`session.multi()` and must not call `exec()` itself.

The planner can be retried after contention, so it must not perform external
side effects. A Redis transaction does not roll back commands that Redis
already executed.

### Generation Reset

Generation reset clears one namespace under a native expiring guard, writes a
pending marker in the guarded transaction, verifies the result, and promotes
the marker to ready with native `SET IFEQ`.

```javascript
await appMemory.resetGeneration({
    markerKey: 'generation:marker',
    generation: '2026-08-26T20:00:00Z',
    guardKey: 'generation:guard',
    guardToken: 'reset-owner-token',
    guardTtlMilliseconds: 30000,
    deadlineMs: 20000,
    scanCount: 100,
    maxKeys: 10000,
    maxRetries: 3,
    acquireGuard: true,
    releaseGuard: true,
    force: false,
});

const state = await appMemory.ensureGeneration({
    markerKey: 'generation:marker',
    generation: '2026-08-26T20:00:00Z',
});
```

The guard TTL must exceed the operation deadline. Reset is bounded by
`maxKeys`, never calls `FLUSHDB`, and never deletes another namespace.
Set `force: true` for an operator-requested reset of an already-current
generation.

<!-- {AIN-2026-08-26:GPT-5.6 Sol} -- operator reset must be distinct from startup generation checks -->

### Pub/Sub

Subscribers use dedicated Redis connections:

```javascript
const subscriber = await appMemory.createSubscriber({ timeoutMs: 5000 });

await subscriber.subscribe('events:vessels', (value, channel) => {
    // value is decoded with the same typed codec
});

await appMemory.publish('events:vessels', { id: 'vessel-a' });
await subscriber.unsubscribe('events:vessels');
await subscriber.close();
```

Duplicate subscription of the same callback is idempotent. Callback failures
are contained and logged. Always close subscriber handles when their owner
stops.

### Status, Errors, and Timeouts

`cache.redisStatus` contains the frozen values `NOT_CONFIGURED`, `IDLE`,
`CONNECTING`, `CONNECTED`, and `DISCONNECTED`.
`cache.redisMinimumVersion` is `8.4.0`. `cache.cacheErrors` exposes frozen
`CACHE_` error-code constants for every scoped-contract package error,
including configuration, validation, Redis capability, timeout, transaction,
generation, and subscriber failures.

The offline queue is explicitly configurable and should normally be disabled.
A local timeout cannot cancel a command already sent to Redis. A timed-out
mutation therefore rejects with `CACHE_OUTCOME_UNKNOWN`; reconcile by reading
current state before retrying. Call `handle.close()` for one Redis namespace or
`cache.closeNamespace()` during process shutdown. Both are idempotent.

### Bull 4 Coexistence

`mcode-cache` does not expose Bull-specific APIs and does not depend directly
on `ioredis`. Bull 4 can continue to use its own documented URL/options
constructor and transitive `ioredis` dependency alongside an independent
`mcode-cache` namespace.

### Migration Notes

- New code should retain the handle returned by `addNamespace()` instead of
  mutating `cache.cacheNamespace`.
- Remove App-owned direct Redis clients after replacing their operations with
  scoped handle methods.
- Pass logical keys only; remove manually added namespace prefixes.
- Replace custom scripts with native conditional value methods or bounded
  `watchTransaction()`.
- Treat the stored Redis representation as package-private because scoped
  values use the versioned `MCACHE1:` codec.
- Do not mix scoped handle methods and compatibility singleton methods on the
  same key: singleton Redis methods use the legacy raw-string representation.
- Existing singleton `cacheGet`, `cacheSet`, `cacheDrop`, `cacheDropAll`, and
  `cacheListAll` remain for compatibility, but scoped handles are the v0.9.0
  contract.
- Deprecated `cacheListAll` and `cacheDropAll` retain their complete all-key
  semantics for existing applications while using Redis `SCAN` instead of
  `KEYS`.

- To demo, from the CLI in the package folder...

```
> node examples
```

- Example of package use...

<p align="left"><img src=".\.github\images\mcode-cache-example-calls.png" width="720" title="List Calls..." border=1px></p>

- Corresponding results (logged to console by our **mcode-log** functions)...

<p align="left"><img src=".\.github\images\mcode-cache-example-results.png" width="720" title="List Results..." border=1px></p>

## Dependencies

### Production

1. `mcode-log` — MicroCODE's standard logging package.
2. `node-cache` — in-process Node.js caching.
3. `redis` — the node-redis client for optional Redis namespaces.

### Development

1. Bull 4 — Redis-client coexistence verification.
2. Jest — unit and integration testing.
3. JSDoc — generated API reference.
4. Testcontainers — real-Redis integration testing.

> **Note:** `ioredis` is not a direct dependency. It appears only transitively
> through the Bull 4 development fixture.

## Usage

When using data caching it's best to start with a good definition of the objects your App will cache and why.
<br>
<br>
**USE CASE #1**: Files, for speed. When a Web App frequently goes to disk, HDD or SSD, to serve clients
there is inherent latency. Automatically caching these frequenlty used files in RAM and serving them from there is typically 10X faster.

Normal, uncached code retrieving a file...

```
        const iconContent = await fs.readFile(iconPath, 'utf8');
                                  -----------
```

To cache for repeated usage with our package, just change "fs.readFile()" to "mcode.fileRead()"...

```
        const iconContent = await mcode.fileRead(iconPath, 'utf8');
                                  --------------
```

...this does four (4) things within one line change:

1. Automatically generates a unique Cache Key under your App's namespace representing this file.
2. Reads and returns the file contents.
3. Caches the file for subsequent use.
4. Retrieves the file from cache in the future with the exact same line of code in your app.
   <br>
   <br>
   Note what you did **not** have to do...

- No creation of a unique key required in your code.
- No explicit code to conditionally retrieve from cache vs. read the file.
- No storage of the key in your code to benefit from the caching, just read the same file path again with "mcode.fileRead()"
  <br>
  <br>

**USE CASE #2**: Context, for speed. When building a rich App a large part of the UX is context,
the feeling that the App knows (and remembers) what you are doing. This is held in two forms of memory analogous tohuman 'short term' and 'long term' memory...

- CONTEXT - 'short term' memory - breadcrumbs, App module, forward/back navigation, etc.
- CONFIGURATION - 'long term' memory - user preferences, app settings, etc.

Both of these shoudl be cached, with different Time-To-Live (TTL), and different invalidation schemes.
This is all handling in a standard way in our package, for our App designs.
<br>
<br>

**USE CASE #3**: Database, for speed. Because anything you can retrieve from RAM instead of the disk based DB
will be at 10X to 50X faster.
<br>
<br>

## Testing

This package includes `examples.js` for local `node-cache` and scoped namespace
examples:

```powershell
node .\node_modules\mcode-cache\examples
```

From the package workspace:

```bash
npm test
npm run test:unit
npm run test:redis
npm run test:artifact
```

`npm run test:redis` requires Docker. It starts Redis 8.6.1 and Redis 7.4.2
containers to prove supported behavior and minimum-version rejection. The
artifact suite packs the package and installs it into a temporary consumer.

A view of the Jest tests in the console:

<p align="left"><img src=".\.github\images\mcode-cache-jest-1.png" width="720" title="Jest Results..." border=1px></p>

<p align="left"><img src=".\.github\images\mcode-cache-jest-2.png" width="720" title="Jest Results..." border=1px></p>

- A view of the JSON now returned for cacheNamespaces() and cacheListAll()...

<p align="left"><img src=".\.github\images\mcode-cache-namespaces-json.png" width="720" title="Namespaces JSON..." border=1px></p>

<p align="left"><img src=".\.github\images\mcode-cache-keys-json.png" width="720" title="Keys JSON..." border=1px></p>

## Included Functions

| Function               | Description                                                                  | Usage                                                                  |
| ---------------------- | ---------------------------------------------------------------------------- | ---------------------------------------------------------------------- |
| _Namespace management_ |                                                                              |                                                                        |
| **addNamespace**       | Registers a node or Redis namespace and returns its immutable handle.        | `const handle = cache.addNamespace(config)`                            |
| **getNamespace**       | Returns an existing immutable namespace handle.                              | `const handle = cache.getNamespace(name)`                              |
| **probeNamespace**     | Performs a bounded Redis capability probe without registration.              | `const result = await cache.probeNamespace(config)`                    |
| **closeNamespace**     | Closes all namespace-owned cache resources.                                  | `await cache.closeNamespace()`                                         |
| _Singleton methods_    |                                                                              |                                                                        |
| **cacheGet**           | Gets a key from the current namespace, optionally using a fallback callback. | `const value = await cache.cacheGet(key, callback)`                    |
| **cacheSet**           | Sets a key in the current namespace.                                         | `await cache.cacheSet(key, value)`                                     |
| **cacheDrop**          | Deletes a key from the current namespace.                                    | `const count = await cache.cacheDrop(key)`                             |
| **cacheDropAll**       | Deletes matching keys from selected cache namespaces.                        | `await cache.cacheDropAll({cache, namespace, pattern})`                |
| **cacheListAll**       | Lists matching keys with optional error details.                             | `await cache.cacheListAll({cache, namespace, pattern, includeErrors})` |
| **cacheMakeKey**       | Builds a namespace-prefixed compatibility key.                               | `const cacheKey = cache.cacheMakeKey(key)`                             |
| **cacheOn**            | Enables a registered namespace.                                              | `await cache.cacheOn(name)`                                            |
| **cacheOff**           | Deletes a namespace's keys, then disables it.                                | `await cache.cacheOff(name)`                                           |
| **cacheEnabled**       | Reports whether a namespace is enabled.                                      | `const enabled = cache.cacheEnabled(name)`                             |
| _File methods_         |                                                                              |                                                                        |
| **fileRead**           | Reads and caches a file.                                                     | `const contents = await cache.fileRead(path, encoding)`                |
| **fileWrite**          | Writes a file and updates its cached value.                                  | `await cache.fileWrite(path, contents, encoding)`                      |
| **fileDrop**           | Invalidates a cached file.                                                   | `await cache.fileDrop(path)`                                           |
| **fileMakeKey**        | Creates a cache key from a file path.                                        | `const key = cache.fileMakeKey(path)`                                  |
| **fileGetRoot**        | Resolves the root used for file cache keys.                                  | `const root = cache.fileGetRoot()`                                     |

`cacheOff(name)` preserves legacy behavior: it deletes that namespace's keys
before disabling it.

File methods always use the in-process node cache, regardless of the current
Redis namespace.

`redisOn`, `redisOff`, and `redisEnabled` remain deprecated. Use the namespace
handle's `ready`, `status`, and `close` contract.

## Included Properties

These properties are available on the singleton:

| Property                | Description                                                              | Usage                                      |
| ----------------------- | ------------------------------------------------------------------------ | ------------------------------------------ |
| **cacheNamespaces**     | Registered namespace summaries and statistics.                           | `const namespaces = cache.cacheNamespaces` |
| **cacheReady**          | Whether the local cache and all registered Redis contexts are connected. | `if (cache.cacheReady)`                    |
| **cacheTTL**            | Default local cache Time-To-Live in seconds.                             | `cache.cacheTTL = 300`                     |
| **cacheNamespace**      | Mutable default used by compatibility singleton methods.                 | `cache.cacheNamespace = 'MyApp'`           |
| **redisURL**            | Legacy Redis server URL property.                                        | `cache.redisURL`                           |
| **redisPort**           | Legacy Redis server port property.                                       | `cache.redisPort`                          |
| **redisUser**           | Legacy Redis username property.                                          | `cache.redisUser`                          |
| **redisPassword**       | Legacy Redis password property.                                          | `cache.redisPassword`                      |
| **redisStatus**         | Frozen stable Redis status constants.                                    | `cache.redisStatus.CONNECTED`              |
| **redisMinimumVersion** | Minimum supported Redis version (`8.4.0`).                               | `cache.redisMinimumVersion`                |
| **cacheErrors**         | Frozen stable package error-code constants.                              | `cache.cacheErrors.INVALID_OPTIONS`        |

<p>&nbsp;</p>

## Documentation

We believe in explicit code documentation for other users and our future
selves. JSDoc produces three primary outputs:

1. Inline documentation for the coder.
2. Intellisense popup documentation for the coder for every function.
3. External 'reference manual' documentation for your entire code base, if used consistently.

Every class method has a standard JSDoc header. Regenerate the published
reference from the package root:

```bash
npm run docs
```

Then open `docs/index.html`.
The complete class reference is generated at `docs/mcode.cache.html`.

<p align="left"><img src=".\.github\images\mcode-cache-jsdocs.png" width="720" title="JSDocs..."></p>

## Help

Contact Timothy McGuire, support@mcode.com.

## Terminology

| Word or Acronym | Description/Definition                                                                                                                       |
| --------------- | -------------------------------------------------------------------------------------------------------------------------------------------- |
| **NPM**         | Node Package Manager, actually “Node PM”, “Node pkgmakeinst” a system to deploy, install, and maintain NodeJS Apps. (PM was a BASH utility). |
| **NVM**         | Node Version Manager, a tool that supports changing NodeJS versions.                                                                         |
| **MERN**        | MongoDB, Express, React, Node JS.                                                                                                            |
| **MongoDB**     | A ‘NoSQL’ database designed for Cloud applications, also referred to as a ‘Document Store’.                                                  |
| **Express**     | Express is _not_ a database but rather an ‘extensible routing language’ for communication between a Client and a Server.                     |
| **React**       | A Web UI development system, a JavaScript library developed by Facebook and made public—and Open Source—since 2013.                          |
| **Redis**       | A Remote Dictionary Server, a standard through the web development industry.                                                                 |
| **node-cache**  | The Node.js Cache for 'in app' caching on the App's own server.                                                                              |
| **Node.js**     | A development stack that executes from a local file store—on a local Server—instead of from a network of servers.                            |
| **JSDocs**      | A toolset to automatically generate API-style documentation from source code tagging.                                                        |

## Authors

Contributor's names and contact info...

- Timothy McGuire [@TimothyMcGuire](https://twitter.com/TimothyMcGuire) - Founder, President-CEO of MicroCODE, Inc. a software and controls engineering company in Detroit, Michigan USA.

## Version History

<!-- {AIN-2026-08-26:GPT-5.6 Sol} -- reset must close scoped work until cache is ready -->

- v0.9.1
    - Serializes namespace resets, waits for active operations, and holds new
      scoped cache, transaction, pub/sub, and subscriber work until completion.
    - Prevents access statistics from being recreated during reset and makes
      guard-release failures reject instead of reporting false success.
    - Adds reset contention, failure recovery, and cleanup coverage; 52 tests
      pass against Redis 8.6.1.
- v0.9.0
    - Added immutable node and Redis namespace handles.
    - Added strict typed values with native Redis 8.4 `IFEQ` and `DELEX IFEQ`
      conditions.
    - Added TTL/PTTL, bounded multi-get and SCAN inspection, geo, sorted sets,
      typed transactions, guarded generation reset, and isolated pub/sub.
    - Added bounded readiness, minimum-version checks, stable status/error
      constants, outage recovery, and idempotent cleanup.
    - Added Redis 8.6.1 Testcontainers coverage, Redis 7.4 rejection, Bull 4
      coexistence proof, and packed-package installation tests.
    - Removed the unused `mcode-data` and direct `ioredis` production dependencies.
- 0.8.1
    - Updated dependencies to mcode-data v0.6.4 and mcode-log v0.8.0.
- 0.8.0

    - NOTE: This is a BREAKING CHANGE, several functions now require parameters for distinguishing which cache is being referenced.
    - Updated 'cacheNamespaces' and 'cacheListAll' to include more detailed type and stats information and return proper JSON structure.
    - This record structure is different from previous versions.
    - REDIS is just treated as a common CACHE type now without specific API Endpoints.
    - Add 20+ Test cases for the new and updated functions.

- v0.7.1
    - Moved to \_<mcode-package> naming for all internal use of our packages from within another package.
    - Corrected 'get' functions to return true 'undefined' if the key is not found in the cache, instead of a
      string '<undefined>'.
- v0.7.0
    - Added more standardized JSDoc module headers for inclusion in end-product documentation.
    - upgraded to mcode-data v0.6.0, mcode-log v0.6.0
    - Corrected internal usage of mcode-log to use log.<func>() instead of mcode.log.<func>() -- all are in mcode.
    - Corrected intenral usage of mcode-data to use data.<func>() instead of mcode.data.<func>() -- all are in mcode.
    - Removed dependency on mcode-package, this belongs to that, not the other way around.
- v0.6.10
    - Updated to mcode-data v0.5.10 and mcode-log v0.5.10, corrected internal use of mcode-log ==> log.<func>(),
      after adding mcode-data (for data.default()) I saw I was using it as mcode.log() instead of log.<func>().
- v0.6.9
    - Updated to mcode-data v0.5.9 and mcode-log v0.5.9.
- v0.6.8
    - Updated to mcode-data v0.5.8 and mcode-log v0.5.8.
- v0.6.7
    - Minor bug fixes and performance improvements.
- v0.6.6
    - Enhanced error handling for cache operations.
- v0.6.5
    - Added file access verification to Read and Write with condition handlers.
    - Corrected cache enable/disable switch on REDIS Cache
    - Corrected REDIS defaults for Port, Username and Password
- v0.6.4
    - Corrected cross-spawn 7.0.0 - 7.0.4; Severity: high; Regular Expression Denial of Service
    - Update mcode-log, mcode-data to v0.5.7 similar corrections.
- v0.6.3
    - Added USER and PASSWORD to optional REDIS Params for connection.
- v0.6.2
    - Updated mcode-data to v0.5.5 and mcode-log to v0.5.5
- v0.6.1
    - Corrected 'cacheGet()' and documented the optional callback for a default methd.
- v0.6.0
    - Added support for multiple caches: node-cache (new default), and kept Redis as an option.
    - One of the original purposes of this package was easy/fast data caching within an App,
      having to go to a network connected Redis defeats that purpose and so we added node-cache as the default.
    - This is BREAKING change, several functions now require parameters for distinguishing which cache is being referenced.
- v0.5.5
    - Remove debug logging.
- v0.5.4
    - Added Cache control for testing and debug: redisCaching, appMemoryOn(), appMemoryOff().
- v0.5.3
    - Corrected a namespace prefixing error.
- v0.5.0 - 0.5.2
    - All 'mcode-\*' packages updated with 'ready()' only implemented in 'mcode-log'.
- v0.4.0
    - made public and synchronized into mcode-package along with mcode-data, mcode-log, mcode-list.
- v0.0.5
    - made public to test integration - NOT READY FOR USE.
- v0.0.4
    - Updated README, uninstalled JSDocs and Jest for publishing.
- v0.0.3
    - Corrected JSDocs and Jest to DEV ONLY dependencies.
- v0.0.2
    - Added JSDocs, Jest and updated README.
- v0.0.1
    - Initial movement of our internal code into an NPM package for ease of use in other projects.

## Known Limitations and Future Development

- Redis Cluster is not supported because multi-key WATCH operations require a
  deliberate same-slot key design.
- The package supports one logical Redis database per namespace configuration.
- Generation reset is intentionally bounded and rejects namespaces larger than
  the configured `maxKeys`.
- A local timeout cannot prove whether an already-dispatched mutation reached
  Redis; callers must reconcile `CACHE_OUTCOME_UNKNOWN`.
- Future releases may add a reviewed Redis Cluster key-slot contract. No raw
  Redis command or script escape is planned.

## License

This project is licensed under the MIT License; see `LICENSE`.

## MicroCODE Mantra

MicroCODE, Inc. was founded in 1987 as a controls engineering and software development company.<br>
We specialize in manufacturing and quality control applications that must run 24x7x365 for years at a time.

Our slogan, distilled from over three decades of developing, testing, installing, and supporting 24x7x365
manufacturing applications, is..

<p align="left"><img src=".\.github\images\hail-caesar.png" width="720" title="Hail Caesar!"></p>
