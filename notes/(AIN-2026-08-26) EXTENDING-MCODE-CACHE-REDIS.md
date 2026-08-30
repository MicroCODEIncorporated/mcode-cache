# AIN - FEATURE - EXTENDING-MCODE-CACHE-REDIS

> **Workspace structure:** This AIN belongs to the standalone MicroCODE-owned
> `mcode-cache` package. The consuming MicroCODE App workspace is the Git
> supermodule at `D:\MicroCODE\App`, with independent `.core`, `regatta-rc`, and
> other submodule repositories. The current App AIN and primary App source files
> were inspected read-only to derive this package contract. Package
> implementation, testing, versioning, and human-final publication happen here
> before any App dependency or source migration.

## Metadata

- **Type**: FEATURE
- **Issue #**: n/a — package capability handoff from the Regatta RC AIS cache AIN
- **Created**: 2026-08-26
- **Updated**: 2026-08-26 — final README, examples, JSDoc, and package documentation completed
- **A.I.**: GPT-5.6 Sol
- **Status**: DOCUMENT COMPLETE — AWAITING HUMAN PUBLICATION

<!-- {AIN-2026-08-26:GPT-5.6 Sol} -- package contract follows native Redis commands only -->

---

## 0: CONCEPT/CHANGE/CORRECTION - Discuss ideas without generating code

### Why this exists

Regatta RC and shared `.core` code currently use `ioredis` directly for AIS,
health, and Bull queue behavior that `mcode-cache` v0.8.1 does not expose.
MicroCODE App derivatives need one cache API: App-owned code consumes
`mcode-cache`; the package privately owns its standard Redis client.

This package release must provide the generic capabilities needed before the App
can:

1. remove every App-owned `require('ioredis')` or import from `ioredis`;
2. remove direct App manifest declarations of `ioredis`;
3. move every AIS Redis value behind an isolated `ais` namespace handle;
4. replace custom Redis scripts with Redis 8.4 native conditional commands and
   optimistic transactions;
5. preserve Bull 4 through Bull's own supported constructor and transitive
   `ioredis`, without coupling Bull to `mcode-cache`;
6. replace client-specific Redis health/status logic with package-neutral
   package operations.

### Source handoff

The source contract is the current primary App document:

- `D:\MicroCODE\App\.issue\AINs\(AIN-2026-08-26) MIGRATING-AIS-CACHE-TO-MCODE.md`

The earlier attached copy is superseded where it differs from that live AIN.

The App AIN establishes:

- one Redis namespace named `ais`;
- one MMSI maps to one canonical vessel object;
- each vessel object contains static data, latest position, and retained track;
- one disposable `ais:geo` projection remains for viewport candidate lookup;
- semaphore, health, reset guard, viewports, generation, and events are
  operational values in the same namespace;
- App coordination remains App-owned;
- Redis executes native commands only;
- the old hash/track/lease shape is discarded, not migrated or dual-read.

This package supplies generic namespaced cache capabilities only. AIS names,
MMSI validation, vessel schemas, track thinning, semaphore policy, viewport
policy, reset sequencing, provider lifecycle, authorization, and UI behavior
remain in the App.

### Current package state

`mcode-cache` v0.8.1 is a CommonJS singleton implemented in one `index.js`.

It provides:

- node-cache-backed file and value caching;
- a mutable process-global `cacheNamespace`;
- namespace registration for `node` and `redis`;
- namespaced GET, SET, DEL, KEYS/list, and drop-all operations;
- one shared node-redis v4 connection;
- basic statistics and close behavior.

It lacks:

- immutable scoped namespace handles;
- strict namespace/logical-key validation;
- typed Redis value serialization;
- SET conditions and per-write expiry;
- Redis 8.4 `IFEQ` and `DELEX`;
- TTL/PTTL, EXISTS, multi-get, PING, INFO, and Redis TIME;
- geo and sorted-set operations;
- native WATCH/UNWATCH/MULTI/EXEC transaction sessions;
- guarded namespace generation reset;
- dedicated pub/sub clients;
- stable package-neutral connection status;
- Redis version/capability readiness checks;
- real-Redis integration and released-artifact tests.

### Corrections from the prior package workflow

The prior package workflow was based on the earlier source contract and is
replaced completely:

1. Remove every planned Lua, `EVAL`, `EVALSHA`, script-load, SHA-cache, and
   registered-script API.
2. Replace script-based ownership with `SET NX PX`, `SET IFEQ PX`, and
   `DELEX IFEQ`.
3. Replace script-based multi-key coordination with bounded
   WATCH/MULTI/EXEC transactions.
4. Replace script-based generation reset with a native reset guard, bounded
   namespace enumeration, guarded transactions, and post-commit verification.
5. Remove Bull policy, Bull client, and Bull status APIs from `mcode-cache`.
6. Add Redis 8.4 minimum-version enforcement and Redis 8.6.1 test coverage.
7. Add strict namespace/key grammar and length limits.
8. Add the required LICENSE artifact correction.
9. Remove the proposed `lib/` and multi-test-file expansion; keep the package's
   existing one-source/one-test structure.

### Decisions

1. **DECIDED:** Keep node-redis as the package's only production Redis client.
2. **DECIDED:** Upgrade node-redis from v4 to the current v6 line that supports
   Redis 8.4 CAS/CAD. Live NPM metadata on 2026-08-26 reports `redis` v6.2.1 with
   Node `>=20`; the exact installed version is locked during implementation.
3. **DECIDED:** Redis 8.4.0 is the minimum backend because `IFEQ` and `DELEX`
   were introduced there. Integration and artifact gates run on Redis 8.6.1,
   matching DEVELOPMENT and Railway.
4. **DECIDED:** Startup/readiness fails explicitly below Redis 8.4 or when
   required commands are unavailable. There is no script or legacy transaction
   fallback.
5. **DECIDED:** Do not add `ioredis` as a production dependency.
6. **DECIDED:** Do not expose Bull-specific package APIs. Bull owns its
   transitive client through Bull's supported construction contract.
7. **DECIDED:** Retain the disposable geo projection and generic geo methods.
8. **DECIDED:** Add immutable namespace handles; new code never mutates the
   process-global `cacheNamespace`.
9. **DECIDED:** Preserve the singleton CommonJS export and the package's existing
   one-production-file pattern. All implementation remains in `index.js`,
   organized by its established regions and private class methods/helpers.
10. **DECIDED:** Use strict canonical typed encoding so `IFEQ` and `DELEX IFEQ`
    compare the same bytes used for storage.
11. **DECIDED:** Disable is non-destructive. Reset owns deletion explicitly.
12. **DECIDED:** No generic hash API is required. The App deletes the old
    `ais:latest` hash during cutover.
13. **DECIDED:** The first release supports standalone/single-database Redis.
    Cluster mode is rejected until a deliberate same-slot key design exists for
    multi-key WATCH/MULTI/EXEC.
14. **DECIDED:** Use Testcontainers for Redis 8.6.1 integration, outage,
    restart, recovery, and isolated artifact proof.
15. **DECIDED:** Keep all regression, unit, real-Redis, recovery, Bull
    coexistence, and artifact tests in `index.test.js`, organized by `describe`
    blocks. No permanent test helper or fixture files are added.

### Boundary

- `mcode-cache` owns generic namespacing, typed encoding, Redis connections,
  native conditional commands, transaction sessions, geo, sorted sets,
  pub/sub, inspection, status, and guarded namespace generation mechanics.
- Callers provide logical keys such as `vessel:366123456`, `geo`, or
  `ops:semaphore`.
- The package alone produces physical keys such as
  `ais:vessel:366123456`, `ais:geo`, or `ais:ops:semaphore`.
- Already-prefixed, empty, control-containing, wildcard-containing,
  unsupported-separator, and oversized names/keys are rejected.
- The package exposes no physical-key API, raw Redis command API, Redis client,
  `EVAL`, `EVALSHA`, or script registration.
- The package may use fixed private adapter calls needed to implement a
  documented typed operation. Consumers never provide command names or tokens.
- Browser builds continue to exclude `mcode-cache`.
- Console Cache Tool UI work is outside this AIN.
- Regatta RC, `.core`, `mcode-package`, App manifests, the one-time App
  `FLUSHDB` cutover, and NPM publication are outside this package implementation.

### Native-command rule

Redis stores values and applies native data commands only. No custom code
executes inside Redis.

Package source, public API, package fixture source, and monitored integration
traffic must contain no consumer-facing:

- `EVAL`;
- `EVALSHA`;
- script loading;
- registered scripts;
- raw command escape.

The implementation may call typed node-redis APIs such as `set`, `delEx`,
`watch`, `multi`, `exec`, geo, sorted-set, scan, and pub/sub operations.

### Timeout truth

Disabling the offline command queue prevents an expired operation from replaying
later. A local timeout cannot cancel a command already written to Redis.

The package therefore guarantees:

- no command is sent after its original caller deadline has already expired;
- no timed-out offline command is queued for later replay;
- native conditional writes preserve owner safety;
- ambiguous post-dispatch timeout returns a stable `outcome unknown` error and
  fails closed so the caller can reconcile by reading current state.

The package and App must not claim command cancellation or Redis transaction
rollback that Redis does not provide.

### Success definition

The package phase is complete when:

- existing accepted file/node-cache behavior remains supported or carries an
  explicit reviewed correction;
- the complete scoped native Redis API passes unit and Redis 8.6.1 integration
  tests;
- a below-8.4 Redis fixture fails readiness explicitly;
- namespace isolation and generation reset preserve every other namespace;
- source and runtime audits prove no script execution;
- native `IFEQ`, `DELEX`, TTL/PTTL, WATCH contention, transactions, geo,
  sorted sets, and pub/sub pass;
- cold start, disconnect, restart, recovery, and close are bounded and leak-free;
- Bull coexistence passes without any Bull production API in `mcode-cache`;
- `LICENSE` identifies `MicroCODE.mcode-cache`;
- the packed and human-published package artifacts pass isolated fixtures;
- publishing remains a human-final action.

---

## 1: CONSIDER - Deep investigation of codebase before DESIGN

<!-- {AIN-2026-08-26:GPT-5.6 Sol} -- native-command planning must begin from the actual package and live App contract -->

### Package evidence

#### `index.js`

The package is approximately 1,700 lines in one class and exports an auto-bound
singleton.

As-built behavior:

- construction creates a default `MicroCODE` node namespace;
- `addNamespace` accepts `node` or `redis`, supplies localhost/default Redis
  configuration, and permits duplicate registry entries;
- the first Redis namespace creates one shared node-redis client;
- later Redis namespaces implicitly reuse the first connection configuration;
- `cacheMakeKey` prefixes through mutable `cacheNamespace`;
- Redis GET/SET use raw strings while node-cache retains JavaScript types;
- Redis drop/list/statistics use blocking `KEYS`;
- Redis listing asks the node-cache helper for values, so previews are wrong;
- `cacheOff` starts destructive deletion without awaiting it;
- `_withTimeout` leaves the losing timer active and cannot cancel Redis I/O;
- readiness is one boolean set on `connect`, without version, `ready`, `end`,
  capability, or recovery gating;
- close owns one command client and no subscriber/transaction clients.

#### `package.json` and lockfile

- current version: `0.8.1`;
- production Redis dependency: `redis ^4.7.0`;
- no production `ioredis`;
- `npm test` invokes Jest, but Jest is not declared as a development dependency;
- no Testcontainers, Redis version fixtures, artifact fixture, package-content
  gate, engine baseline, or full integration script exists.

Live NPM metadata inspected on 2026-08-26 reports:

- current `redis` package: `6.2.1`;
- required Node engine: `>=20.0.0`;
- node-redis exposes typed Redis 8.4 CAS/CAD methods using
  `set(..., { condition: 'IFEQ', matchValue })` and
  `delEx(..., { condition: 'IFEQ', matchValue })`.

Implementation must verify the exact installed API and lock it; it must not
invent a raw consumer command escape if an adapter gap remains.

#### `index.test.js`

The current suite focuses on:

- file read/cache behavior;
- namespace statistics;
- timeout helper behavior;
- graceful list degradation;
- value previews.

It does not exercise a real Redis server or the updated contract. It also
contains timing-relative expectations and at least one unawaited asynchronous
cache write that must be stabilized without concealing regressions.

#### `LICENSE`

The package declares MIT, but line 1 currently reads:

`MIT License: MicroCODE.mcode-list`

The release artifact must instead identify `MicroCODE.mcode-cache`. Ownership
and copyright provenance are otherwise unchanged unless the Dev directs a
separate correction.

### App evidence informing this package

Current AIS Redis behavior is centralized in:

- `D:\MicroCODE\App\regatta-rc\helper\ais-cache.js`

Consumers include:

- `regatta-rc/server/controller/ais.controller.js`;
- `regatta-rc/server/worker/ais-ingest/index.js`;
- `regatta-rc/server/worker/ais-ingest/coverage.js`;
- `regatta-rc/helper/ais-ingest.js`.

The old module directly constructs ioredis command/subscriber clients and
defines ten custom scripts for lease, health, viewport, and generation behavior.
Those scripts are behavior evidence only; every script and runner is removed in
the later App phase.

The retained native command requirements are:

- GET and ordered multi-get;
- SET with EX/PX, NX, XX, IFEQ, KEEPTTL, and no expiry;
- DEL and `DELEX IFEQ`;
- EXISTS, TTL, PTTL, PING, INFO, and TIME;
- GEO add/update, BYBOX search, and member removal;
- sorted-set add, ranges, score ranges, removal, count, and expiry;
- WATCH/UNWATCH/MULTI/EXEC with bounded contention retries;
- namespaced publish and dedicated subscriber lifecycle;
- bounded namespace inspection;
- guarded namespace generation reset.

### Shared `.core` evidence

Direct App-owned `ioredis` imports currently exist in:

- `.core/server/api/health.route.js`;
- `.core/server/controller/job.controller.js`;
- `.core/server/controller/notification.controller.js`;
- `.core/server/controller/cron-monitor.controller.js`.

Client-specific helpers exist in:

- `.core/helper/redis-client-status.js`;
- `.core/helper/redis-job-opts.js`.

Bull 4 appears throughout Core controller, Admin, and worker code. Bull already
supports ordinary URL/options construction and owns its transitive ioredis
clients. The package must not import Bull/ioredis, construct Bull clients, share
its private node-redis client, or inspect Bull internals.

Gate A retains a development-only Bull coexistence fixture. That fixture proves
Bull and `mcode-cache` can use the same Redis service, survive restart, report
their own supported statuses, and close cleanly. It creates no package Bull API.

### Required namespace and key contract

1. `addNamespace` is idempotent.
2. Same-name/same-config returns the same handle.
3. Same-name/conflicting-config throws.
4. Every new operation is bound to an immutable handle.
5. Logical keys are prefixed exactly once.
6. Physical/already-prefixed keys are rejected.
7. Redis URL, type, credentials, retry, readiness, command deadline, and
   offline-queue behavior are explicit.
8. Missing Redis configuration never falls back to localhost.
9. Namespace names and logical keys reject:
    - empty strings;
    - leading/trailing whitespace;
    - control characters;
    - `*`, `?`, `[`, and `]`;
    - backslash and path separators;
    - embedded copies of the namespace prefix;
    - unsupported separators;
    - values above documented UTF-8 byte limits.
10. The DESIGN fixes and tests exact namespace, logical-key, pattern, and channel
    limits before implementation.
11. Inspection patterns use a separate validated pattern type; ordinary key APIs
    never accept wildcards.
12. Subscriber channels follow the same namespace isolation and validation.
13. Listing, inspection, reset, enable, disable, readiness, statistics, and close
    work without a mutable global default.

### Required typed value contract

1. Scoped Redis values round-trip strings, finite numbers, booleans, null,
   arrays, and plain JSON objects without caller serialization.
2. Missing returns `undefined`; stored null returns `null`.
3. Multi-get preserves request order and missing entries.
4. Unsupported, circular, non-finite, or oversized values reject before I/O.
5. Values use a versioned canonical encoding:
    - object keys sort recursively;
    - array order is preserved;
    - type distinctions remain exact;
    - stored and comparison values use identical bytes.
6. SET conditions are mutually validated:
    - one of NX, XX, or IFEQ;
    - one of EX, PX, or KEEPTTL;
    - explicit no-expiry is distinguishable from omission.
7. `IFEQ` returns an exact package boolean indicating whether Redis stored the
   new value.
8. `DELEX IFEQ` returns whether Redis deleted the compared value.
9. Delete returns an exact count; exists returns a boolean.
10. TTL/PTTL preserve Redis sentinel meanings in documented package results.
11. Legacy top-level behavior remains isolated from the strict scoped codec.

### Required transaction contract

WATCH state is bound to one physical Redis connection. It cannot safely share a
concurrent general command client.

The package needs an exclusive transaction session that:

1. checks the original absolute caller deadline;
2. acquires one exclusive pooled connection;
3. WATCHes only package-prefixed logical keys;
4. performs fresh reads through that same session;
5. lets the caller return a whitelisted transaction plan;
6. queues only typed namespaced operations;
7. EXECutes once;
8. retries the complete planner only on watch contention;
9. bounds attempts, duration, and queued operation count;
10. never retries validation, runtime-command, connection, or ambiguous timeout
    errors;
11. UNWATCHes on early exit;
12. discards a dirty/ambiguous connection rather than returning it to the pool;
13. returns one ordered `{ result, error }` entry per queued command;
14. never claims rollback for runtime command errors;
15. documents that the planner may rerun and may not perform external side
    effects.

### Required generation-reset contract

The package exposes generic mechanics; the App owns worker/provider/reset-route
sequencing.

The generic operation receives logical marker/guard keys, an expected guard
token, the target generation, limits, and one caller deadline.

It must:

1. require an already-owned guard or acquire it with `SET NX PX` when explicitly
   requested;
2. renew only the same token using `SET IFEQ PX`;
3. compare the current generation;
4. return current without deletion when already ready;
5. SCAN only the exact namespace while compliant writers remain fenced;
6. exclude the active guard;
7. enforce key-count, argument-byte, transaction-size, and deadline limits;
8. WATCH and re-read the guard through an exclusive transaction connection;
9. verify the same token and sufficient remaining guard TTL;
10. queue native UNLINK/DEL groups and a pending generation marker in MULTI;
11. surface every EXEC reply/error and keep readiness closed on any uncertainty;
12. verify that only the guard and generation marker remain;
13. promote the marker from pending to ready through native IFEQ;
14. release only the matching guard through `DELEX IFEQ` when requested;
15. verify the ready marker and guard state before returning success.

The pending/ready marker prevents another process from treating a marker written
after a partial runtime transaction error as complete. No Lua or manual normal
runtime `FLUSHDB` path exists.

The Dev-approved one-time App deployment `FLUSHDB` is separate: all Redis writers
stop first, and the maintenance operation intentionally deletes AIS, Bull, and
every namespace. It is not a package namespace-reset API.

### Required connection contract

Stable package statuses:

- `not configured`;
- `idle`;
- `connecting`;
- `connected`;
- `disconnected`.

Every newly connected or reconnected physical client remains `connecting` until:

1. PING succeeds;
2. INFO reports Redis version `>=8.4.0`;
3. required Redis 8.4 commands/capabilities are present;
4. standalone/supported deployment mode is confirmed.

Connections support:

- long-lived command connections;
- exclusive transaction connections;
- independent subscriber connections;
- explicit disabled offline queue for authority profiles;
- bounded readiness and command deadlines;
- configurable capped reconnect delay;
- no unhandled EventEmitter `error`;
- one unavailable and one restored transition per outage;
- recreation after close/end;
- listener, timer, socket, and pool cleanup;
- package-owned adapter/factory injection for tests.

### Risks to prove

1. Concurrent namespaces never observe global namespace bleed.
2. Key validation rejects every prohibited form before Redis I/O.
3. Canonical encoding makes NX/XX/IFEQ/DELEX behavior deterministic.
4. Redis 8.6.1 passes and a below-8.4 fixture fails readiness.
5. WATCH contention reruns only the safe planner and stops at its bounds.
6. Runtime transaction errors preserve ordered evidence and never report
   rollback or ready.
7. Generation reset preserves unrelated namespaces and cannot publish a false
   ready marker.
8. An expired offline operation never replays.
9. A post-dispatch timeout returns outcome-unknown and forces reconciliation.
10. Inspection is bounded and cannot return another namespace.
11. Subscribers do not leak listeners, timers, callbacks, or sockets.
12. Source/runtime evidence contains no scripts.
13. Bull coexistence creates no package production coupling.
14. The packed and released artifacts contain the corrected LICENSE and intended
    package files only.

---

## 2: DESIGN - Design detailed solution

<!-- {AIN-2026-08-26:GPT-5.6 Sol} -- fixed native APIs preserve namespace and ownership invariants without a raw command escape -->

### Existing package pattern

The repository has one production source file, `index.js`, and one test file,
`index.test.js`. `index.js` already uses extensive folding regions, one cache
class, private fields/methods, and automatic public export binding. `index.test.js`
already organizes behavior in `describe` blocks.

The implementation follows that pattern:

- `index.js` remains the only production source and CommonJS entry point;
- the existing `cache` singleton remains the owner of namespaces and Redis
  resources;
- immutable namespace handles are frozen closure/facade objects created by
  private cache methods, not a new public module hierarchy;
- validation, canonical encoding, deadlines, connection state, transactions,
  generation, pub/sub, and probing remain private regions/method groups in the
  same file;
- command, exclusive WATCH, and subscriber clients are held in private maps and
  sets on the singleton;
- fixed node-redis adaptation remains private to `index.js`;
- `index.test.js` remains the only test source and contains all unit,
  Testcontainers, recovery, coexistence, and artifact `describe` blocks;
- isolated package fixtures use temporary directories created and removed by
  `index.test.js`; no fixture tree is committed.

There is no `lib/`, `src/`, `test/`, scripts module, Bull module, or permanent
fixture directory.

### Public exports

The package keeps existing top-level file/node-cache exports.

Add:

- `addNamespace(config)` returning an immutable handle;
- `getNamespace(name)`;
- `probeNamespace(config)`;
- `closeNamespace()`;
- package error/status constants.

The singleton's `addNamespace` becomes idempotent and returns the handle.
Existing callers that ignore its return continue to work.

No export accepts or returns:

- physical Redis keys;
- Redis command names;
- node-redis clients;
- Bull/ioredis clients or options;
- script source or SHA;
- generic raw arguments.

### Namespace handle API

Connection and lifecycle:

- `ready(options)`;
- `status`;
- `ping()`;
- `info(section)`;
- `time()`;
- `statistics()`;
- `enable()`;
- `disable()`;
- `close()`.

Basic values:

- `cacheGet(key)`;
- `cacheGetMany(keys)`;
- `cacheSet(key, value, options)`;
- `cacheDrop(keyOrKeys)`;
- `cacheDropIfEqual(key, expectedValue)`;
- `cacheExists(key)`;
- `cacheTTL(key)`;
- `cachePTTL(key)`;
- `cacheExpire(key, options)`.

`cacheSet` options support:

- `ttlSeconds`;
- `ttlMilliseconds`;
- `ifMissing`;
- `ifExisting`;
- `ifEqual`;
- `keepTTL`;
- `noExpiry`.

The package maps those typed options to native Redis tokens internally. Callers
do not supply `NX`, `XX`, `IFEQ`, `EX`, `PX`, or `KEEPTTL` strings.

Geo:

- `geoAdd(key, entries)`;
- `geoSearchBox(key, options)`;
- `geoRemove(key, members)`.

Geo search returns the stored logical member identifiers. For AIS these are raw
MMSI members; the App maps them to `vessel:{mmsi}` canonical keys and rechecks
exact latitude/longitude bounds.

Sorted sets:

- `sortedSetAdd(key, entries, options)`;
- `sortedSetRange(key, start, stop, options)`;
- `sortedSetRangeByScore(key, min, max, options)`;
- `sortedSetRemove(key, members)`;
- `sortedSetRemoveByScore(key, min, max)`;
- `sortedSetCount(key, min, max)`.

Transactions:

- `multi()` creates a non-WATCH typed namespaced transaction builder;
- `watchTransaction(options, planner)` creates an exclusive bounded optimistic
  transaction session.

Inspection and generation:

- `scan({ pattern, cursor, count, limit })`;
- `inspect({ pattern, cursor, count, limit, includeValue })`;
- `ensureGeneration(options)`;
- `resetGeneration(options)`.

Pub/sub:

- `publish(channel, value)`;
- `createSubscriber(options)`;
- subscriber `subscribe(channel, callback)`;
- subscriber `unsubscribe(channel, callback)`;
- subscriber `close()`.

### Value and comparison design

Every new scoped value uses one canonical versioned byte encoding.

The codec:

1. validates the JavaScript value;
2. recursively sorts plain-object keys;
3. preserves array order;
4. JSON-encodes the canonical value;
5. prefixes the encoding version;
6. enforces the configured byte limit.

The same codec encodes:

- the value stored by SET;
- the expected value for IFEQ;
- the expected value for DELEX IFEQ;
- typed values queued in transactions.

This distinguishes missing, null, `"null"`, `42`, and `"42"` and makes
equivalent plain objects compare consistently.

### Native conditional design

The private adapter maps:

- `ifMissing + ttlMilliseconds` to native `SET ... NX PX`;
- `ifExisting` to native `SET ... XX`;
- `ifEqual + ttlMilliseconds` to native `SET ... IFEQ ... PX`;
- `cacheDropIfEqual` to native `DELEX ... IFEQ`.

Native nil/OK/integer replies become documented package booleans/counts.
Conflicting options reject before I/O.

Large generic values still use exact IFEQ bytes for this contract. Digest-based
IFDEQ/IFDNE and DIGEST are not required by the App handoff and are not exposed
in this release.

### Transaction design

`multi()` queues a fixed whitelist of typed handle methods and returns ordered
results. It does not expose `addCommand`.

`watchTransaction`:

1. acquires an exclusive pooled connection;
2. checks the absolute deadline;
3. prefixes and WATCHes declared logical keys;
4. supplies same-connection typed reads to the planner;
5. receives a whitelisted mutation plan;
6. rechecks the deadline;
7. queues and EXECutes the plan;
8. retries from fresh reads only on watch contention;
9. maps every reply/error by command index;
10. UNWATCHes and releases a clean connection;
11. destroys a dirty or outcome-unknown connection.

Planner functions may rerun and therefore must be deterministic with respect to
their Redis reads and must not cause external side effects.

### Generation design

Generation reset uses native package operations only.

Marker values are typed package objects:

- pending: `{ generation, state: 'pending', resetId }`;
- ready: `{ generation, state: 'ready', resetId }`.

The generic reset:

1. proves/acquires the configured logical guard with NX and TTL;
2. renews only the matching token through IFEQ;
3. returns current only for a verified ready marker;
4. enumerates the exact namespace under the writer guard;
5. enforces configured limits;
6. WATCHes and confirms the same guard token/remaining TTL;
7. queues stale-key deletion and the pending marker in MULTI;
8. checks every EXEC result;
9. verifies only guard and marker remain;
10. promotes pending to ready through IFEQ;
11. conditionally releases the matching guard when requested;
12. verifies marker/guard state before returning ready.

Any contention, timeout, runtime error, guard mismatch, incomplete enumeration,
or ambiguous result leaves readiness closed. Recovery reruns from observable
guard/marker/key state; it never assumes rollback.

### Connection design

Handles with identical canonical connection policy share a long-lived command
connection. Transaction sessions and subscribers use independently owned
connections because WATCH and subscribed mode are connection-scoped.

On connect and reconnect, the package:

1. attaches an error listener before connecting;
2. PINGs;
3. parses INFO server version;
4. requires Redis `>=8.4.0`;
5. confirms required capabilities;
6. rejects cluster/unsupported deployment mode;
7. only then reports `connected`.

Offline queue behavior is explicit per namespace profile. Authority operations
require it disabled.

Close is idempotent and:

- rejects new work;
- clears package timers;
- unsubscribes subscribers;
- UNWATCHes/discards transaction sessions;
- removes listeners/callbacks;
- attempts bounded graceful close;
- destroys clients that do not close in time;
- removes resources from manager registries.

### Inspection and disable design

Normal inspection uses SCAN with exact namespace prefixing, validated patterns,
and package/caller bounds. Returned keys are logical only. Optional values are
typed and bounded.

Ordinary Redis APIs never use `KEYS`. Guarded generation reset also uses SCAN;
its safety comes from the writer guard, limits, transaction, and verification.

Disable changes local handle state and is non-destructive. Reset is explicit,
scoped, guarded, and separately auditable.

### Bull non-coupling design

Production `mcode-cache`:

- does not import Bull or ioredis;
- does not create or configure Bull clients;
- does not expose its node-redis client;
- does not inspect Bull client status.

The development fixture creates Bull through Bull's documented URL/options
constructor and creates an independent `mcode-cache` namespace handle. It proves
coexistence and restart/close behavior only.

### Test design

All tests remain in `index.test.js`. Focused npm scripts select named `describe`
groups when a smaller gate is needed; the full gate runs the complete file.

Unit test groups cover:

- namespace/key/channel/pattern validation and byte limits;
- canonical typed encoding and unsupported values;
- option conflict validation;
- status/version transitions;
- deadline and outcome-unknown classification;
- transaction planner/retry/error mapping;
- generation state transitions;
- cleanup ownership;
- legacy facade compatibility.

Testcontainers integration pins Redis 8.6.1 and includes a below-8.4 image or
capability-controlled fixture.

Real-Redis tests prove:

1. two concurrent namespaces with no prefix/read/delete/list bleed;
2. every accepted/rejected namespace and key form;
3. every typed value and a representative 48-hour vessel object;
4. EX, PX, NX, XX, IFEQ, KEEPTTL, no-expiry, DELEX IFEQ, TTL, and PTTL;
5. two competing UUIDs, same-owner renew, owner mismatch, conditional release,
   and stale-owner TTL recovery;
6. ordered multi-get and exact missing/null/delete/exists results;
7. geo add/update/BYBOX/unit/removal/isolation;
8. sorted-set add/range/score/remove/count/expiry;
9. mixed MULTI with deliberate runtime error evidence;
10. WATCH contention, bounded retry/abort, and planner side-effect restrictions;
11. guarded generation current/reset/pending recovery/isolation/verification;
12. dedicated pub/sub isolation, unsubscribe, reconnect, and zero leaked
    listeners/timers/sockets;
13. unavailable cold start, recovery, disconnect, restart, and second recovery;
14. no post-timeout offline replay and explicit outcome-unknown handling;
15. Redis 8.6.1 acceptance and below-8.4 readiness rejection;
16. PING, INFO, TIME, status, TTL/PTTL, and bounded inspection;
17. source and Redis command-monitor evidence showing no scripts;
18. Bull coexistence without package production coupling;
19. clean close of command, transaction, subscriber, and probe resources.

Artifact verification:

1. corrects and inspects LICENSE;
2. runs `npm pack --dry-run`;
3. reviews intended files;
4. installs the tarball in an isolated fixture;
5. repeats critical Redis 8.6.1 tests;
6. after human publication, installs the exact released version and repeats the
   release smoke fixture.

### Planned package file manifest

Existing files to modify:

- `(AIN-2026-08-26) EXTENDING-MCODE-CACHE-REDIS.md`;
- `index.js`;
- `index.test.js`;
- `package.json`;
- `package-lock.json`;
- `LICENSE`;
- `README.md`;
- `examples.js`;
- existing generated JSDoc output under `docs/` only during DOCUMENT.

Files created:

- none.

Any newly discovered necessary source, test, config, or package-content file must
be added to this manifest and approved before editing. A new file is not the
default response to implementation size.

### Compatibility and release design

- Existing file/node-cache APIs remain exported.
- Scoped handles are the supported concurrent Redis API.
- Mutable `cacheNamespace` is deprecated legacy behavior.
- Legacy wildcard Redis operations are not available to scoped handles.
- Duplicate registration and missing Redis configuration become explicit errors.
- `cacheOff` becomes non-destructive; deletion moves to explicit reset.
- Redis 8.4 is a deliberate new backend minimum.
- Node follows node-redis v6's Node `>=20` requirement; Node 22.14 is the App
  verification baseline.
- The semantic version is selected from package policy after compatibility
  review.
- Publishing remains human-final.

---

## 3: PLAN - Create implementation plan

<!-- {AIN-2026-08-26:GPT-5.6 Sol} -- implement the package before App consumers target the new contract -->

### Step 1 — Establish the release and regression harness

1. Record current Node/npm versions and run the existing suite before edits.
2. Stabilize flaky timing-relative tests and await asynchronous writes through
   explicit reviewed contract corrections.
3. Add Jest, Testcontainers, and Bull as development-only dependencies.
4. Upgrade and lock node-redis v6 after verifying typed IFEQ/DELEX support.
5. Add unit, Redis 8.6.1 integration, below-8.4 rejection, recovery, artifact,
   and full-gate npm scripts that select groups in `index.test.js`.
6. Add package-content controls; artifact fixtures are temporary data created by
   `index.test.js`, not repository files.
7. Correct `LICENSE` from `MicroCODE.mcode-list` to
   `MicroCODE.mcode-cache` without changing provenance.

**Verify:** baseline results are recorded; development Redis resolves to 8.6.1;
below-8.4 fixture is available; package dependency tree contains no production
Bull or ioredis.

### Step 2 — Extend the existing one-file architecture

1. Preserve `index.js` as the only production source and CommonJS singleton.
2. Add private regions/method groups for validation, typed encoding, deadlines,
   Redis 8.4 adaptation, connection state, transactions, generation, pub/sub,
   probing, and resource cleanup.
3. Add immutable frozen namespace handles as private singleton-created facades.
4. Make namespace registration idempotent and conflict-aware.
5. Keep mutable `cacheNamespace` only for deprecated legacy calls.
6. Keep package-defined adapter/factory injection inside the existing
   `addNamespace` configuration contract; do not add a second manager API.
7. Keep all new tests in `index.test.js`, grouped by behavior.

**Verify:** existing accepted regressions pass and concurrent scoped calls never
read the mutable global.

### Step 3 — Implement strict namespace/key/value contracts

1. Finalize documented UTF-8 byte limits for namespaces, logical keys,
   inspection patterns, channels, and values.
2. Reject empty, whitespace, control, wildcard, prefixed, path-separator,
   unsupported-separator, and oversized inputs before I/O.
3. Implement exact-once prefixing and logical-only returned keys.
4. Implement canonical versioned encoding for accepted values.
5. Preserve missing/null/type distinctions and ordered multi-get results.
6. Validate conditional/expiry option exclusivity.

**Verify:** unit and real-Redis tests prove every accepted/rejected shape and
deterministic typed IFEQ byte comparison.

### Step 4 — Implement Redis 8.4 connection and basic native operations

1. Add node-redis v6 adapter, command connection pooling, package status, and
   explicit offline-queue policy.
2. Gate every connect/reconnect on PING, Redis version, required commands, and
   supported standalone mode.
3. Add bounded readiness, deadlines, reconnect delay, transition de-duplication,
   recreation, and idempotent close.
4. Add GET, multi-get, SET options, DEL, EXISTS, TTL, PTTL, expiry, PING, INFO,
   and TIME.
5. Add native typed `IFEQ` and `DELEX IFEQ`.
6. Add bounded probe and SCAN inspection.
7. Return stable outcome-unknown errors after ambiguous post-dispatch timeout;
   never replay expired offline work.

**Verify:** Redis 8.6.1 passes; below 8.4 fails explicitly; competing token,
TTL-recovery, no-replay, and outcome-reconciliation tests pass.

### Step 5 — Implement geo and sorted sets

1. Add generic geo add/update, BYBOX search, units, and member removal.
2. Return logical stored members without inventing AIS key shapes.
3. Add sorted-set add, index/score ranges, member/score removal, count, and
   expiry.
4. Enforce namespace isolation and input/value bounds.

**Verify:** real Redis proves ordering, boundaries, units, expiry, removal, and
cross-namespace isolation.

### Step 6 — Implement native transactions

1. Add whitelisted non-WATCH MULTI builder.
2. Add exclusive transaction-connection pool.
3. Add same-connection WATCH reads, typed planner, MULTI/EXEC, and UNWATCH.
4. Retry the complete planner only on watch contention.
5. Bound attempts, duration, watched keys, queued commands, and bytes.
6. Map ordered replies/runtime errors and destroy dirty/ambiguous sessions.
7. Enforce no external side effects in retryable planner documentation/tests.

**Verify:** mixed transactions, deliberate runtime errors, concurrent WATCH
changes, exhausted retries, deadline expiry, early UNWATCH, and cleanup pass
without false rollback claims.

### Step 7 — Implement guarded generation reset

1. Implement generic native guard acquire/renew/compare/release.
2. Implement ready/pending generation marker values.
3. Enumerate the exact namespace through bounded SCAN under the writer guard.
4. Exclude and verify the active guard.
5. Enforce key-count, byte, transaction, TTL, and deadline limits.
6. Commit stale-key deletion plus pending marker through guarded MULTI/EXEC.
7. Inspect every reply and keep readiness closed on error/ambiguity.
8. Verify the post-commit key set.
9. Promote pending to ready through IFEQ.
10. Release only the matching guard through DELEX IFEQ and verify final state.
11. Add interrupted-reset recovery for pre-commit, partial/unknown, and
    post-commit/pre-release states.

**Verify:** current generation is idempotent; missing/changed generation resets;
unrelated namespaces survive; contention and initiator interruption never
publish false readiness.

### Step 8 — Implement namespaced pub/sub and resource cleanup

1. Add namespaced typed publish.
2. Add one dedicated connection per subscriber handle.
3. Track channel callbacks, subscribe/unsubscribe, reconnect, and ownership.
4. Make close idempotent and bounded, with graceful close then forced destroy.
5. Remove every callback, listener, timer, socket, transaction session, and pool
   reference.

**Verify:** multiple namespaces/subscribers receive only intended events,
recover after Redis restart, unsubscribe cleanly, and leave zero package-owned
resources.

### Step 9 — Prove no scripts and Bull non-coupling

1. Scan source/public exports/fixtures for EVAL, EVALSHA, script loading,
   registered scripts, raw command escapes, Bull APIs, and exposed clients.
2. Monitor Redis commands during the native integration suite and verify no
   script execution.
3. Run Bull coexistence through Bull's normal URL/options constructor while
   `mcode-cache` uses an independent namespace handle.
4. Restart Redis and prove both systems recover/close through their own APIs.

**Verify:** production dependency/API audit contains no Bull or ioredis coupling;
the only fixture ioredis is Bull-transitive.

### Step 10 — Verify packed and released artifacts

1. Run the complete legacy, unit, Redis 8.6.1, below-8.4, recovery, no-script,
   Bull coexistence, and cleanup suites.
2. Run `npm pack --dry-run` and review every included file.
3. Verify package metadata and LICENSE both identify `mcode-cache`.
4. Build the tarball without publishing.
5. Install it in an isolated fixture and repeat critical namespace, typed value,
   IFEQ/DELEX, WATCH, geo, generation, pub/sub, probe, and close tests.
6. Select the semantic version according to package policy.
7. Stop for Dev publication.
8. After human publication, install the exact released version and rerun the
   release smoke fixture.

**Verify:** record exact package identity, Node/npm/Redis versions, dependency
tree, commands, pass/fail counts, resource counts, and every PENDING row.

### Step 11 — Document package and App handoff

1. Update README usage from global switching to scoped handles.
2. Document key grammar/limits, canonical encoding, every method/option/return,
   Redis 8.4 minimum, Redis 8.6.1 verification, transaction planner rules,
   generation states, timeout uncertainty, and cleanup.
3. Document explicitly that the package exposes no scripts, raw command escape,
   Bull policy, or Redis client.
4. Update examples, inline JSDoc, generated reference output, and version history.
5. Return the exact released package version and Gate A evidence to the App AIN.
6. Leave `mcode-package`, App manifests/locks, App source, App benchmark, and
   one-time App cutover for their own workflow phases.

**Verify:** a consumer can implement the App handoff from public documentation
without reading package internals or importing a Redis client.

---

## 4: REVIEW - Review and validate the implementation plan

<!-- {AIN-2026-08-26:GPT-5.6 Sol} -- review follows the package's existing one-source/one-test pattern -->

### Review status

- **Contract source:** current primary App AIN at
  `D:\MicroCODE\App\.issue\AINs\(AIN-2026-08-26) MIGRATING-AIS-CACHE-TO-MCODE.md`
- **Package evidence:** `index.js`, `index.test.js`, `package.json`,
  `package-lock.json`, `README.md`, and `LICENSE`
- **External command evidence:** Redis 8.4 SET/DELEX documentation and live NPM
  metadata for node-redis v6.2.1
- **Confidence:** 98%
- **Approval:** PASS — package design and plan align with the updated native
  Redis contract; implementation and all test/artifact rows remain PENDING

### Corrections applied during REVIEW

1. Replaced the stale attached contract with the live App AIN.
2. Removed every Lua/script module, method, SHA, deadline-script, and script-test
   plan.
3. Added Redis 8.4 `IFEQ`, `DELEX IFEQ`, TTL/PTTL, and Redis 8.6.1 proof.
4. Added strict namespace/key/channel/pattern validation and documented limits.
5. Replaced shared WATCH use with exclusive transaction connections and bounded
   planner retries.
6. Added native guarded generation reset with pending/ready markers,
   post-transaction verification, and interrupted-reset recovery.
7. Removed Bull policy/status/client exports and retained coexistence testing
   only.
8. Added explicit below-8.4 readiness rejection and standalone deployment scope.
9. Added outcome-unknown semantics because a sent command cannot be cancelled by
   a local timeout.
10. Added no-script source/runtime monitoring gates.
11. Added the LICENSE-name correction.
12. Rejected the proposed 12-file `lib/` decomposition because it contradicted
    the repository's one-source/one-test pattern.
13. Reduced the manifest to existing package files only and kept every test
    group in `index.test.js`.
14. Retained released-artifact verification through temporary test-created
    fixtures rather than committed scaffolding.

### What looks good

- The package remains generic; no AIS term or App policy enters production code.
- Native CAS/CAD gives owner-safe single-key acquisition, renewal, and release
  without custom Redis code.
- Canonical encoding makes typed IFEQ comparisons deterministic.
- Exclusive transaction sessions respect Redis WATCH connection affinity.
- Generation readiness cannot be inferred from a potentially partial transaction
  because pending and ready states are distinct and verified.
- Subscriber, transaction, command, and probe resources have explicit ownership
  and close paths.
- Bull remains outside the production package API and dependency tree.
- The plan proves the packed and released artifact rather than trusting only the
  working tree.
- The implementation now follows the repository's established `index.js` plus
  `index.test.js` structure and existing region/`describe` organization.

### Contract clarifications recorded

1. **Normal reset versus cutover:** package namespace reset is scoped and never
   calls FLUSHDB. The Dev-approved one-time App cutover is a separate maintenance
   operation that intentionally destroys every Redis namespace after all writers
   stop.
2. **Bull gate:** Bull integration proves coexistence only. It does not require
   `mcode-cache` to configure, construct, expose, or inspect a Bull client.
3. **Geo results:** package geo methods return stored logical members. Regatta
   stores MMSIs and maps them to canonical vessel keys in App code.
4. **Timeouts:** an expired pre-dispatch operation does not mutate; an ambiguous
   post-dispatch timeout fails closed with outcome-unknown and requires
   reconciliation.
5. **Transactions:** WATCH contention may retry the planner; runtime command
   errors do not roll back already executed Redis commands.
6. **Deployment mode:** this release supports standalone/single-database Redis,
   matching DEVELOPMENT/Railway evidence. Cluster support requires a separate
   hash-slot design.

### Review checklist

- **Completeness:** PASS — public APIs, compatibility, implementation order,
  testing, packaging, documentation, and release handoff are covered.
- **Dependencies:** PASS — node-redis upgrade and harness changes precede Redis
  implementation; package proof precedes App adoption.
- **Security:** PASS — strict namespace/key/value validation, no raw client or
  command escape, bounded operations, and sanitized package errors are planned.
- **Consistency:** PASS — one `index.js`, one `index.test.js`, existing regions,
  existing `describe` organization, CommonJS, Allman braces, and package JSDoc
  remain the reference patterns.
- **Architecture:** PASS — new behavior extends the existing singleton instead
  of replacing it with an unproven module hierarchy.
- **Validators/database:** N/A — this package has no MongoDB schema or validator.
- **File naming:** PASS — no new repository files are planned.
- **Test coverage:** PASS at plan level — every contract gate maps to a named
  test group in `index.test.js`; execution evidence remains PENDING.
- **`.core` purity/overlays:** N/A — this phase edits only the standalone
  `mcode-cache` package.
- **Remaining questions:** none.

### Remaining implementation risks

- The node-redis v6 migration is a production dependency change and must pass
  all legacy behavior plus reconnect/close tests.
- Redis 8.4 CAS/CAD compares encoded bytes; every compare path must use the same
  canonical codec.
- Generation reset transaction/key-size limits must be measured on Redis 8.6.1,
  not guessed.
- `index.js` and `index.test.js` will grow substantially; implementation must use
  the existing regions and `describe` groups, then HARDEN must remove accidental
  duplication without inventing new files.
- The App's 10,000-vessel × 2,880-point capacity benchmark remains an App gate;
  this package proves representative large-object handling but cannot approve
  the App data shape.
- Human publication and released-version verification remain PENDING.

### REVIEW verdict

The revised workflow satisfies the updated package handoff:

- native Redis commands only;
- no script or raw command surface;
- Redis 8.4 minimum and 8.6.1 proof;
- isolated scoped namespaces;
- typed CAS/CAD;
- bounded optimistic transactions;
- guarded, verified generation reset;
- dedicated pub/sub;
- stable status and cleanup;
- no Bull production coupling;
- one production source and one test source, matching the repository;
- corrected license and artifact gates.

**Verdict:** PASS — ready for the next manually requested workflow phase.

---

## 5: BRANCH - Create Git branches for required repos

Skipped by explicit Dev direction on 2026-08-26. This standalone workspace is
not currently detected as a Git repository.

---

## 6: IMPLEMENT - Execute the plan

### Status

COMPLETE — implementation authorized and completed 2026-08-26. Awaiting the
next manually requested workflow phase.

### Progress

- [x] Establish dependencies, regression harness, and LICENSE correction.
- [x] Extend `index.js` with the scoped native Redis contract.
- [x] Extend `index.test.js` with unit and real-Redis contract coverage.
- [x] Verify focused implementation tests.
- [x] Record implementation deviations and final file manifest.

### Implemented

- Preserved the package's one-production-file/one-test-file architecture.
- Added immutable, idempotent namespace handles with explicit Redis connection
  configuration and no localhost, credential, retry, readiness, deadline, or
  offline-queue fallback.
- Added stable status/error constants, bounded readiness/probe behavior,
  Redis 8.4 minimum-version and DELEX capability gates, standalone-mode
  enforcement, reconnect recovery, and idempotent close/recreation.
- Added strict logical namespace/key/channel validation and the canonical
  `MCACHE1:` typed JSON codec that distinguishes missing values from `null`.
- Added native GET/MGET/SET conditions, DEL/DELEX, EXISTS, TTL/PTTL, expiry,
  PING/INFO/TIME, bounded SCAN inspection, geo, sorted-set, MULTI/EXEC,
  bounded WATCH transactions, guarded generation reset, and typed pub/sub.
- Preserved deprecated singleton calls while replacing their Redis `KEYS`
  usage with bounded SCAN paths.
- Kept Bull and ioredis out of production dependencies and APIs; Bull 4 exists
  only as an integration-test dependency.
- Raised the package to `0.9.0`, node-redis to `6.2.1`, and the declared Node
  baseline to `>=22.14.0`.
- Corrected the LICENSE package name and restricted packed files through the
  package manifest.

### Verification evidence

- `npm test` — PASS, 41/41 tests.
- `npm run test:unit` — PASS, 31 tests; 10 Redis tests skipped by filter.
- `npm run test:redis` — PASS, 10 Redis 8.6.1 integration tests, including
  Redis 7.4.2 rejection, cold unavailability, restart recovery, native CAS/CAD,
  132 KiB payloads, 250-key generation reset, pub/sub, and Bull 4 coexistence.
- `npm run test:artifact` — PASS, 2 tests; the tarball installs in a temporary
  consumer and exports version `0.9.0` with Redis minimum `8.4.0`.
- `npm audit --omit=dev` — PASS, zero production vulnerabilities.
- IDE diagnostics — PASS, no errors in edited source, test, or manifest files.

### Implementation decisions and deviations

- Testcontainers is pinned to `11.14.0`. Version 12.1.0 requires Node 22.22,
  which is stricter than both this environment (22.21) and the approved
  package baseline (22.14).
- WATCH uses a fresh exclusive duplicated node-redis connection per bounded
  transaction and closes it in `finally`, rather than retaining an idle
  transaction pool. This preserves connection isolation and zero-leak cleanup
  while avoiding a second pool abstraction in the one-file package.
- The restart test uses a fixed host-port binding because a changing
  Testcontainers endpoint would test endpoint reconfiguration rather than
  reconnecting to a restarted Redis service.
- README, examples, generated JSDoc, App migration edits, publication, and the
  App-scale 10,000-vessel benchmark remain for their later workflow phases.

### File manifest

- Modified `index.js`.
- Modified `index.test.js`.
- Modified `package.json`.
- Modified `package-lock.json`.
- Modified `LICENSE`.
- Modified this AIN.
- Added no production or test source files.

---

## 7: HARDEN - Review and improve code quality

### Status

COMPLETE — hardening authorized and completed 2026-08-26. Awaiting the next
manually requested workflow phase.

### Scope

- Remove duplication and dead implementation paths without changing the
  approved one-file architecture or public contract.
- Strengthen comments, lifecycle cleanup, and defensive validation.
- Preserve all legacy, Redis 8.6.1, artifact, Bull 4, and production-audit
  verification gates.

### Hardening completed

- Removed unused template enum, symbol, static-method, generator, private-field,
  Redis-initializer, and global connection-tracking scaffolding.
- Removed the unused direct `mcode-data` production dependency.
- Split the large private implementation into navigable contract, connection,
  value/inspection, geo, transaction/generation, and cleanup regions.
- Corrected guarded reset ordering: bounded SCAN now precedes one guarded
  MULTI/EXEC containing grouped deletes plus a pending marker; verification
  precedes native `SET IFEQ` promotion to ready.
- Required guard TTL to cover the reset deadline, verified remaining guard TTL
  inside WATCH, checked transaction reply envelopes, deduplicated scanned keys,
  and kept failed resets pending.
- Made WATCH deadlines include command readiness and eliminated post-deadline
  connection dispatch from transaction steps.
- Made command-connection and subscriber close operations concurrency-safe and
  idempotent; failed subscriber setup now closes its duplicate client.
- Made duplicate subscriptions idempotent and contained synchronous/asynchronous
  subscriber callback failures.
- Eliminated stale connect-promise races, removed listeners on forced destroy,
  and added one deduplicated recovery transition after an outage.
- Routed deprecated singleton Redis calls through the selected namespace
  context, corrected Redis listing reads, made Redis statistics use bounded
  SCAN plus MEMORY USAGE, and removed the remaining Redis KEYS path.
- Applied typed codec and option validation consistently to scoped node handles,
  preserved node TTL for `keepTTL`, and made namespace disable await cleanup
  before changing state.
- Made global test teardown unconditional so intentionally closed or failed
  namespaces cannot suppress resource cleanup.
- Added the standard house JSDoc header to every scoped Redis method and
  corrected incomplete legacy class-member headers, return tags, accessor
  metadata, and the undocumented glob conversion helper.

### Added hardening coverage

- Scoped node conditional, invalid-option, and invalid-value behavior.
- Deprecated Redis singleton routing and listing.
- Guard TTL/deadline rejection.
- Duplicate subscriber idempotence and concurrent subscriber close.
- Concurrent namespace close followed by connection recreation.
- Source-level enforcement that every class function retains an immediately
  preceding house JSDoc header with function, member, description, and return
  metadata; constructors and accessors retain their corresponding standard
  tags.

### Hardening verification

- `node --check index.js` — PASS.
- `npm run test:unit` — PASS, 33 tests; 12 Redis tests skipped by filter.
- `npm run test:redis` — PASS, 12 Redis integration tests; 33 tests skipped by
  filter.
- `npm run test:artifact` — PASS, 3 tests, including the JSDoc house-rule gate.
- `npm test` — PASS, 45/45 tests with no open-handle warning.
- `npm audit --omit=dev` — PASS, zero production vulnerabilities.
- IDE diagnostics — PASS, no errors in edited source, test, or manifest files.

### HARDEN verdict

PASS — the implementation remains one production file and one test file, now
matches the approved native generation-reset ordering, and is ready for the
next manually requested workflow phase.

---

## 8: TEST - Run tests

### Status

COMPLETE — final post-HARDEN verification authorized and completed 2026-08-26.
Awaiting the next manually requested workflow phase.

### Final verification scope

- Run the complete package suite against the simplified last-green source.
- Run the focused non-Redis, Redis 8.6.1 integration, and packed-artifact
  scripts independently.
- Reconfirm syntax, production dependency security, namespace isolation,
  validation, stable error behavior, Redis recovery, Bull coexistence, and
  resource cleanup.
- Record every command and exact result without modifying tests to obtain a
  pass.

### Commands and results

- `node --check index.js` — PASS with no syntax errors.
- `npm run test:unit` — PASS, 33 tests; 12 Redis integration tests skipped by
  the intended filter.
- `npm run test:redis` — PASS, 12 Redis 8.6.1 integration tests; 33 tests
  skipped by the intended filter.
- `npm run test:artifact` — PASS, 3 package-artifact tests; 42 tests skipped by
  the intended filter.
- `npm test` — PASS, 45/45 tests in one suite with no snapshots and no
  open-handle warning.
- `npm audit --omit=dev` — PASS, zero production vulnerabilities.
- `npm pack --dry-run --json` — PASS, package `mcode-cache@0.9.0`, 38 declared
  entries, 438,709-byte archive, and no test or `node_modules` content.
- `npm ls --omit=dev --depth=0` — PASS; production tree is `mcode-log@0.8.0`,
  `node-cache@5.1.2`, and `redis@6.2.1`.

### Behavior confirmed

- Namespace registration, isolation, immutable handles, strict logical-name
  and options validation, canonical typed values, and stable error codes.
- Redis 8.4 minimum/capability rejection, bounded readiness, outage/restart
  recovery, concurrent close, and connection recreation.
- Native conditional SET/DELEX, TTL, bounded multi-get/SCAN, representative
  payloads, geo, sorted sets, MULTI normalization, and bounded WATCH retries.
- Guarded generation reset deletes only the selected namespace and verifies
  its pending-to-ready promotion.
- Typed pub/sub uses isolated subscriber connections and closes resources
  cleanly.
- Deprecated singleton operations continue through namespace-owned clients.
- Bull 4 coexists through its own transitive ioredis dependency without adding
  Bull or ioredis to the production dependency tree.
- The source-level JSDoc gate confirms every class function retains the house
  header pattern.

### Failures and fixes

None. The final TEST commands passed on the first execution and no source or
test changes were made to obtain the result.

### Packaging observation

The dry-run package correctly includes the declared `docs/` tree. Those
generated pages predate this implementation and remain scheduled for the
manually requested `9: DOCUMENT` phase, as already recorded in IMPLEMENT.
This does not affect the tested runtime artifact.

### TEST verdict

PASS — the final post-HARDEN source is syntactically valid, all 45 tests pass,
the Redis 8.6.1 and isolated package gates pass independently, the production
dependency tree has zero reported vulnerabilities, and the package is ready
for the next manually requested workflow phase.

---

## 9: DOCUMENT - Document the solution

### Status

COMPLETE — final package documentation authorized and completed 2026-08-26.
The package is awaiting human publication and released-artifact handoff.

### Documentation scope

- Update `README.md` for the implemented v0.9.0 scoped namespace and native
  Redis contract.
- Update package examples to show immutable namespace-handle usage.
- Regenerate the published JSDoc reference from the final source.
- Record API, configuration, compatibility, migration, limitations,
  dependencies, verification, and documentation artifacts in this AIN.
- Close with the mandatory standalone Executive Summary after all other
  documentation work is complete.

### Documentation completed

- Reworked `README.md` around the v0.9.0 contract while retaining the package's
  established file-cache use cases and history.
- Added requirements, installation, node namespace, explicit Redis
  configuration, capability probe, typed values, key/channel grammar, value
  limits, conditional writes, TTL, inspection, geo, sorted sets, transactions,
  guarded generation reset, pub/sub, lifecycle, errors, timeouts, Bull
  coexistence, migration, limitations, tests, and version-history guidance.
- Updated `examples.js` to demonstrate an immutable scoped node namespace,
  typed values, awaited operations, package cleanup, and actionable async error
  handling without requiring Redis.
- Added JSDoc 4.0.5 as a repeatable development dependency and added
  `npm run docs`.
- Replicated the App workspace's Markdown save behavior: local Prettier,
  matching `.prettierrc`, Prettier as the Markdown workspace formatter,
  ESLint fixes disabled for Markdown, and Prettier/ESLint extension
  recommendations in `mcode-cache.code-workspace`.
- Added the `mcode` namespace linkage required for generated class-member
  references and normalized remaining `@func` tags to the house-standard
  `@function` tag.
- Regenerated `docs/index.html`, the complete `docs/mcode.cache.html` class
  reference, source reference, module page, namespace page, and supporting
  assets from the final source.
- Restricted the published docs manifest to current generated entry points and
  assets, excluding obsolete unlinked historical pages without deleting local
  files.
- Extended the artifact gate to require current generated references and reject
  obsolete generated pages from the package.
- Updated the package description to describe the shipped namespace, typed
  Redis, transaction, geo, sorted-set, and pub/sub capabilities.
- Completed the exported `cacheErrors` catalog so every scoped-contract error
  used for configuration, validation, Redis capability, timeout, transaction,
  generation, and subscriber handling is available for programmatic branching.
- Corrected the README's conditional option to the implemented `ifExisting`
  name and documented singleton/scoped codec separation, destructive legacy
  `cacheOff`, and node-only file caching.

### Public API and configuration

- `addNamespace(config)` now returns immutable idempotent node or Redis handles;
  `getNamespace(name)` returns existing handles; `probeNamespace(config)` performs
  a bounded readiness and capability check.
- Redis namespace configuration requires explicit URL, nullable credentials,
  retry delays/attempts, readiness timeout, command timeout, and offline-queue
  policy.
- Scoped handles expose typed value/expiry methods, bounded health and
  inspection, geo, sorted sets, typed MULTI, bounded WATCH transactions,
  generation reset, typed pub/sub, status, readiness, and close.
- Namespace handles accept logical keys/channels only and never expose raw
  clients, physical keys, arbitrary commands, scripts, or Bull policy.
- Stable status values, Redis minimum version, and package error constants are
  available from the singleton.
- Existing singleton value, file, listing, and namespace control methods remain
  documented as compatibility APIs.

### Database and application changes

- Database schema, migration, and MongoDB validator changes: N/A.
- OpenAPI/Swagger changes: N/A; this is a CommonJS NPM package with no HTTP
  endpoints.
- App user/admin readmes and changelogs: N/A in this standalone package phase;
  App behavior and App documentation remain owned by the Regatta RC migration
  workflow.

### Compatibility and migration

- Redis-backed consumers must run Redis 8.4 or newer and Node.js 22.14 or
  newer.
- Existing callers can continue using singleton methods, but new code should
  retain scoped handles instead of mutating `cacheNamespace`.
- Redis values written through scoped handles use the private versioned
  `MCACHE1:` canonical codec; direct raw reads/writes are not compatible with
  that storage representation.
- Callers must remove manually prefixed keys, pass logical names, and replace
  direct Redis scripts/clients with typed operations or bounded
  `watchTransaction`.
- Bull 4 retains its supported independent constructor and transitive ioredis;
  no Bull or ioredis dependency enters the production package.
- Human NPM publication and exact released-tarball installation remain outside
  AI authority. The released package version must be returned to the App
  migration workflow after publication.

### Important notes and limitations

- Standalone/single-database Redis is the supported topology. Redis Cluster
  requires a separately reviewed same-slot transaction design.
- Generation reset is namespace-scoped and bounded by caller limits; it never
  calls `FLUSHDB`.
- Post-dispatch mutation timeouts return outcome-unknown because local timeout
  cannot cancel an already-sent Redis command.
- The complete development audit reports four moderate findings in the
  Bull/Testcontainers fixture chain through `uuid`. They are development-only;
  the production audit reports zero vulnerabilities. Available fixes require
  incompatible major fixture changes, including a Testcontainers release above
  the approved Node baseline, so no force update was applied.

### Documentation verification

- `node --check index.js` — PASS.
- `node --check examples.js` — PASS.
- `node examples.js` — PASS, including file-cache equality, scoped typed-value
  round trip, and clean shutdown.
- `npm run docs` — PASS with JSDoc 4.0.5; generated navigation links the current
  `mcode.cache` reference and final source.
- `npx prettier --write README.md .prettierrc mcode-cache.code-workspace`
  followed by `npx prettier --check` — PASS; all three files use the replicated
  Prettier style.
- `npm test` — PASS, 45/45 tests.
- `npm run test:artifact` — PASS, 3 artifact tests including current-doc and
  obsolete-page exclusions.
- `npm pack --dry-run --json` — PASS for `mcode-cache@0.9.0`, 35 entries,
  471,957-byte archive, with the current README, examples, and generated
  reference.
- `npm audit --omit=dev` — PASS, zero production vulnerabilities.
- IDE diagnostics — PASS for edited JavaScript and package metadata.

### Documentation checklist

- [x] Solution summary written in `9: DOCUMENT`.
- [x] API and configuration changes documented.
- [x] Database, validator, and OpenAPI applicability recorded.
- [x] Usage instructions and examples provided.
- [x] Compatibility and migration notes provided.
- [x] Breaking requirements and storage-format implications identified.
- [x] Dependencies, limitations, security notes, and future work documented.
- [x] `README.md` updated.
- [x] Package examples updated and executed.
- [x] Generated JSDoc reference updated and package contents verified.
- [x] App user/admin readmes and changelogs marked N/A for this package phase.
- [x] Executive Summary written as a standalone final paragraph.
- [x] Executive Summary re-read; no placeholder remains.
- [x] Metadata status updated.

### DOCUMENT verdict

PASS — package consumers can configure and use the final v0.9.0 API from the
README and generated reference without reading implementation internals. The
workflow is complete through DOCUMENT and is ready for human NPM publication;
no commit, PR, or publication was created.

## Executive Summary

`mcode-cache` v0.9.0 now provides the generic scoped Redis capabilities needed
for MicroCODE applications to remove App-owned Redis clients while preserving
the package's simple one-source/one-test architecture. The package adds
immutable namespace handles, strict typed values, native Redis 8.4 conditional
commands, bounded optimistic transactions, geo and sorted sets, guarded
generation reset, typed pub/sub, stable lifecycle status, and explicit cleanup
with a complete programmatic error catalog and without adding scripts, Bull
policy, or a direct ioredis dependency. Legacy
singleton and file-cache APIs remain available so existing consumers can
migrate deliberately, while new Redis consumers must provide explicit
connection policy and use logical namespace-owned keys. The README, runnable
examples, Markdown-on-save workspace configuration, package metadata, and
generated JSDoc reference now document the implemented contract, requirements,
migration path, limitations, and failure semantics. Verification passed with
45 of 45 tests, Redis 8.6.1 integration,
an isolated installable package artifact, a working example, and zero reported
production vulnerabilities. The package is ready for human publication and
subsequent adoption by the Regatta RC migration workflow.
