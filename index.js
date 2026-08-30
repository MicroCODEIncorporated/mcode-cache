// #region  F I L E
// <copyright file="mcode-cache/index.js" company="MicroCODE Incorporated">Copyright © 2022-2024 MicroCODE Incorporated Troy, MI</copyright><author>Timothy J. McGuire</author>
// #region  M O D U L E
// #region  D O C U M E N T A T I O N
/**
 *      Project:  MicroCODE MERN Applications
 *      Customer: Internal + MIT xPRO Course
 *      @module   'mcode-cache.js'
 *      @memberof mcode
 *      @created  January 2022-2024
 *      @author   Timothy McGuire, MicroCODE, Inc.
 *      @description >
 *      MicroCODE File and Data Caching Library
 *
 *      LICENSE:
 *      --------
 *      MIT License: MicroCODE.mcode-cache
 *
 *      Copyright (c) 2022-2024 Timothy McGuire, MicroCODE, Inc.
 *
 *      Permission is hereby granted, free of charge, to any person obtaining a copy
 *      of this software and associated documentation files (the "Software"), to deal
 *      in the Software without restriction, including without limitation the rights
 *      to use, copy, modify, merge, publish, distribute, sublicense, and/or sell
 *      copies of the Software, and to permit persons to whom the Software is
 *      furnished to do so, subject to the following conditions:
 *
 *      The above copyright notice and this permission notice shall be included in all
 *      copies or substantial portions of the Software.
 *
 *      THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR
 *      IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY,
 *      FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE
 *      AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER
 *      LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING FROM,
 *      OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN THE
 *      SOFTWARE.
 *
 *
 *      DESCRIPTION:
 *      ------------
 *      This module implements the MicroCODE's Common JavaScript functions for data caching.
 *
 *      NOTE:
 *
 *      o  'key' in this code refers to the Application Key or File Path.
 *
 *      o  'cacheKey' in this code refers to a fully qualified cache Key.
 *
 *      o  'cacheKeys' are made from 'key' values by the 'cacheMakeKey()' method,
 *                     which formats the 'key' into a cache Key with a prefix
 *                     based on the current Namespace.
 *
 *      o  '_cache*()' are private methods that are not exposed to the caller,
 *                     these expect 'cacheKey' values, not 'key' values.
 *
 *        <key> - application 'key' format
 *        <namespace>:<key> - 'cacheKey' format
 *
 *      Examples:
 *
 *         key:      '/backend/components/app/tool/tool.template.htmx'
 *         cacheKey: 'GM-GPS-eMITS-UI:backend:components:app:tool:tool.template.htmx'
 *
 *         key:      'myKey'
 *         cacheKey: 'MicroCODE:myKey'
 *
 *
 *      REFERENCES:
 *      -----------
 *      1. MIT xPRO Course: Professional Certificate in Coding: Full Stack Development with MERN
 *
 *      2. MicroCODE JavaScript Style Guide
 *         Local File: MCX-S02 (Internal JS Style Guide).docx
 *         https://github.com/MicroCODEIncorporated/JavaScriptSG
 *
 *
 *
 *
 *      MODIFICATIONS:
 *      --------------
 *      Date:         By-Group:   Rev:    Description:
 *
 *      30-Jan-2024   TJM-MCODE  {0001}   New module for common reusable JavaScript data caching functions.
 *      01-Feb-2024   TJM-MCODE  {0002}   Changed to the Universal Module Definition (UMD) pattern to support AMD,
 *                                        CommonJS/Node.js, and browser global in our exported module.
 *      15-Sep-2024   TJM-MCODE  {0003}   Extended to support *node-cache* package for caching local information
 *                                        to avoid network latency, this is now the default cache provider.
 *      26-Aug-2026   TJM-MCODE  {0004}   Added immutable namespace handles and native Redis 8.4+ contracts for
 *                                        typed values, transactions, geo, generation reset, and pub/sub.
 *
 *
 *
 *
 * NOTE: This module follow's MicroCODE's JavaScript Style Guide and Template JS file, see:
 *
 *       o  https://github.com/MicroCODEIncorporated/JavaScriptSG
 *       o  https://github.com/MicroCODEIncorporated/TemplatesJS
 *
 * ...be sure to check out the CTRL-SHIFT+K, +L, +J keybaord shortcuts in Visual Studio Code
 *    for taking advance of the #regions in this file and our templates.
 *
 */

// #endregion
// #endregion
// #endregion

/**
 * @namespace mcode
 * @desc MicroCODE namespace containing reusable package classes and functions.
 */

// #region  I N C L U D E S

const _log = require('mcode-log');

const path = require('path');
const fs = require('fs').promises;

const Redis = require('redis');
const NodeCache = require('node-cache');

// #endregion

// #region  C O N S T A N T S

// MicroCODE: define this module's name for our 'mcode-log' package
const MODULE_NAME = 'mcode-cache.js';

// #endregion

// #region  C L A S S

/**
 * @class cache Class to provide transparent data caching for MicroCODE applications.
 * @memberof mcode
 */
class cache
{
    // #region  C O N S T A N T S

    static CACHE_TTL = 60 * 60 * 24;  // 24 hours in seconds
    static REDIS_URL = null;
    static REDIS_PORT = null;
    static REDIS_USER = null;
    static REDIS_PASSWORD = null;
    static REDIS_MIN_VERSION = '8.4.0';
    static REDIS_VALUE_PREFIX = 'MCACHE1:';
    static MAX_NAMESPACE_BYTES = 64;
    static MAX_LOGICAL_KEY_BYTES = 512;
    static MAX_CHANNEL_BYTES = 256;
    static MAX_VALUE_BYTES = 5 * 1024 * 1024;
    // {ISSUE#0149:Grok-4.6} -- process-local hits hid every other consumer
    static ACCESS_STATS_KEY = 'ops:access';
    static TRANSACTION_DELETE_BATCH_SIZE = 100;
    static INFO_SECTIONS = Object.freeze(new Set([
        'server',
        'clients',
        'memory',
        'persistence',
        'stats',
        'replication',
        'cpu',
        'cluster'
    ]));
    static GEO_UNITS = Object.freeze(new Set(['m', 'km', 'mi', 'ft']));
    static REDIS_STATUS = Object.freeze({
        NOT_CONFIGURED: 'not configured',
        IDLE: 'idle',
        CONNECTING: 'connecting',
        CONNECTED: 'connected',
        DISCONNECTED: 'disconnected'
    });
    static ERROR_CODES = Object.freeze({
        CONFIG_REQUIRED: 'CACHE_CONFIG_REQUIRED',
        INVALID_CONFIG: 'CACHE_INVALID_CONFIG',
        INVALID_NAMESPACE: 'CACHE_INVALID_NAMESPACE',
        INVALID_TYPE: 'CACHE_INVALID_TYPE',
        NAMESPACE_CONFLICT: 'CACHE_NAMESPACE_CONFLICT',
        NAMESPACE_NOT_FOUND: 'CACHE_NAMESPACE_NOT_FOUND',
        INVALID_KEY: 'CACHE_INVALID_KEY',
        INVALID_CHANNEL: 'CACHE_INVALID_CHANNEL',
        ALREADY_PREFIXED: 'CACHE_ALREADY_PREFIXED',
        VALUE_UNSUPPORTED: 'CACHE_VALUE_UNSUPPORTED',
        VALUE_TOO_LARGE: 'CACHE_VALUE_TOO_LARGE',
        VALUE_FORMAT: 'CACHE_VALUE_FORMAT',
        REDIS_REQUIRED: 'CACHE_REDIS_REQUIRED',
        REDIS_CAPABILITY: 'CACHE_REDIS_CAPABILITY',
        REDIS_VERSION: 'CACHE_REDIS_VERSION',
        REDIS_MODE: 'CACHE_REDIS_MODE',
        DISABLED: 'CACHE_DISABLED',
        INVALID_OPTIONS: 'CACHE_INVALID_OPTIONS',
        INVALID_PATTERN: 'CACHE_INVALID_PATTERN',
        SCAN_LIMIT: 'CACHE_SCAN_LIMIT',
        INVALID_MEMBER: 'CACHE_INVALID_MEMBER',
        INVALID_COORDINATE: 'CACHE_INVALID_COORDINATE',
        INVALID_SCORE: 'CACHE_INVALID_SCORE',
        TIMEOUT: 'CACHE_TIMEOUT',
        OUTCOME_UNKNOWN: 'CACHE_OUTCOME_UNKNOWN',
        TRANSACTION_CLOSED: 'CACHE_TRANSACTION_CLOSED',
        TRANSACTION_DEFERRED: 'CACHE_TRANSACTION_DEFERRED',
        TRANSACTION_COMMAND: 'CACHE_TRANSACTION_COMMAND',
        TRANSACTION_PLAN: 'CACHE_TRANSACTION_PLAN',
        WATCH_CONTENTION: 'CACHE_WATCH_CONTENTION',
        GENERATION_GUARD: 'CACHE_GENERATION_GUARD',
        GENERATION_LIMIT: 'CACHE_GENERATION_LIMIT',
        GENERATION_VERIFY: 'CACHE_GENERATION_VERIFY',
        SUBSCRIBER_CLOSED: 'CACHE_SUBSCRIBER_CLOSED',
        // {AIN-2026-08-26:Grok-4.6} -- connected Redis can stay up while statistics collection fails
        STATS_UNAVAILABLE: 'CACHE_STATS_UNAVAILABLE'
    });

    // #endregion

    // #region  P R I V A T E   F I E L D S

    // node-cache instance
    #cache = null;
    #cacheTTL = cache.CACHE_TTL;
    #cacheNamespace = '';
    #cacheNamespaces = [];

    // Redis instance
    #redis = null;
    #redisURL = cache.REDIS_URL;
    #redisPort = cache.REDIS_PORT;
    #redisUser = cache.REDIS_USER;
    #redisPassword = cache.REDIS_PASSWORD;
    #redisConnected = false;
    #redisContexts = new Map();
    #namespaceHandles = new Map();
    #multiOperations = new WeakMap();

    // #endregion

    // #region  C O N S T R U C T O R

    /**
     * @constructor
     * @desc Creates or returns the singleton cache instance.
     * @returns {cache} the singleton cache instance.
     */
    constructor ()
    {
        // Create a Singleton instance
        if (!cache.instance)
        {
            this.#cacheTTL = cache.CACHE_TTL;
            this.#redisURL = cache.REDIS_URL;
            this.#redisPort = cache.REDIS_PORT;
            this.#redisUser = cache.REDIS_USER;
            this.#redisPassword = cache.REDIS_PASSWORD;

            this._cacheInit();

            // add the default namespace as a node-cache namespace
            this.addNamespace({name: 'MicroCODE', type: 'node'});

            // make it current
            this.#cacheNamespace = 'MicroCODE';

            cache.instance = this;
        }

        _log.done(`mcode-cache initialized with namespace: ${this.#cacheNamespace}`, MODULE_NAME);

        return cache.instance;
    }

    // #endregion

    // #region  P R O P E R T I E S

    /**
     * @property {boolean} cacheReady whether the cache instance and configured Redis namespaces are ready.
     */
    get cacheReady()
    {
        if (this.#redisContexts.size > 0)
        {
            return this.#cache != null &&
                Array.from(this.#redisContexts.values()).every(context =>
                    context.status === cache.REDIS_STATUS.CONNECTED);
        }

        return this.#cache != null;
    }

    /**
     * @property {number} cacheTTL the cache Time-To-Live property, in seconds.
     */
    get cacheTTL()
    {
        return this.#cacheTTL;
    }

    /**
     * @property cacheTTL
     * @memberof mcode.cache
     * @desc Sets the default cache Time-To-Live in seconds.
     * @param {number} value the cache Time-To-Live in seconds.
     * @returns {void}
     */
    set cacheTTL(value)
    {
        this.#cacheTTL = value;
    }

    /**
     * @property {array} cacheNamespaces returns an array containing all the namespaces defined in the cache server.
     * The array contains objects with name, type (node or redis), enabled properties, and current statistics for each namespace.
     */
    get cacheNamespaces()
    {
        // Update statistics for each namespace before returning
        this._updateNamespaceStatistics();
        return this.#cacheNamespaces;
    }

    /**
     * @property {string} cacheNamespace the 'prefix' used to group our keys in the cache Server.
     * This property switches to a new namespace, to be used for all subsequent cache operations as the default.
     * The namespace must already exist in the cache servers 'namespace' list, see addNamespace().
     */
    get cacheNamespace()
    {
        return this.#cacheNamespace;
    }

    /**
     * @property cacheNamespace
     * @memberof mcode.cache
     * @desc Sets the default namespace for subsequent singleton cache operations.
     * @param {string} value the registered namespace name.
     * @returns {void}
     */
    set cacheNamespace(value)
    {
        this.#cacheNamespace = value;
        _log.success(`Switched to namespace: '${this.#cacheNamespace}`, MODULE_NAME);
    }

    /**
     * @property {string} redisURL the URL to the Redis Server.
     */
    get redisURL()
    {
        return this.#redisURL;
    }

    /**
     * @property redisURL
     * @memberof mcode.cache
     * @desc Sets the legacy Redis server URL.
     * @param {string} value the Redis server URL.
     * @returns {void}
     */
    set redisURL(value)
    {
        this.#redisURL = value;
    }

    /**
     * @property {string} redisPort the PORT to the Redis Server.
     */
    get redisPort()
    {
        return this.#redisPort;
    }

    /**
     * @property redisPort
     * @memberof mcode.cache
     * @desc Sets the legacy Redis server port.
     * @param {string|number} value the Redis server port.
     * @returns {void}
     */
    set redisPort(value)
    {
        this.#redisPort = value;
    }

    /**
     * @property {string} redisUser the User to the Redis Server.
     */
    get redisUser()
    {
        return this.#redisUser;
    }

    /**
     * @property redisUser
     * @memberof mcode.cache
     * @desc Sets the legacy Redis username.
     * @param {string} value the Redis username.
     * @returns {void}
     */
    set redisUser(value)
    {
        this.#redisUser = value;
    }

    /**
     * @property {string} redisPassword the Password to the Redis Server.
     */
    get redisPassword()
    {
        return this.#redisPassword;
    }

    /**
     * @property redisPassword
     * @memberof mcode.cache
     * @desc Sets the legacy Redis password.
     * @param {string} value the Redis password.
     * @returns {void}
     */
    set redisPassword(value)
    {
        this.#redisPassword = value;
    }

    // #endregion

    // #region  M E T H O D S – P U B L I C

    /**
     * @function addNamespace
     * @memberof mcode.cache
     * @desc Adds a new namespace to the cache server.
     * @param {object} namespace the namespace and configuration to be added to the cache server.
     * @returns {object} the immutable namespace handle.
     * @api public
     * @example
     *     const namespace = {name: 'MicroCODE', type: 'node', user: 'username', password: '...'};
     */
    addNamespace(namespace)
    {
        if (namespace && typeof namespace === 'object' && namespace.name && namespace.type)
        {
            const existingType = this._getNamespaceInfo(this._validateNamespaceName(namespace.name));
            if (existingType && existingType.type !== namespace.type)
            {
                throw this._cacheError('CACHE_NAMESPACE_CONFLICT',
                    `Namespace '${namespace.name}' is already registered as '${existingType.type}'.`);
            }
        }

        const config = this._normalizeNamespaceConfig(namespace);
        const existingNamespace = this._getNamespaceInfo(config.name);

        if (existingNamespace)
        {
            if (existingNamespace.type !== config.type)
            {
                throw this._cacheError('CACHE_NAMESPACE_CONFLICT',
                    `Namespace '${config.name}' is already registered as '${existingNamespace.type}'.`);
            }

            if (config.type === 'redis')
            {
                const context = this.#redisContexts.get(config.name);
                if (!context || context.signature !== this._redisConfigSignature(config) ||
                    context.config.clientFactory !== config.clientFactory)
                {
                    throw this._cacheError('CACHE_NAMESPACE_CONFLICT',
                        `Namespace '${config.name}' is already registered with different Redis configuration.`);
                }
            }

            return this._createNamespaceHandle(config.name);
        }

        this.#cacheNamespaces.push({
            name: config.name,
            type: config.type,
            enabled: true,
            hits: 0,        // Number of successful cache retrievals
            misses: 0,      // Number of failed cache retrievals (key not found/expired)
            keys: 0,        // Current number of keys in cache
            ksize: 0,       // Current key size in bytes
            vsize: 0        // Current value size in bytes
        });

        if (config.type === 'redis')
        {
            const context = this._createRedisContext(config);
            this.#redisContexts.set(config.name, context);

            if (this.#redisContexts.size === 1)
            {
                this.#redisURL = config.url;
                this.#redisPort = new URL(config.url).port || null;
                this.#redisUser = config.username;
                this.#redisPassword = config.password;
            }

            const connectPromise = this._connectRedisContext(context);
            connectPromise.catch(() => undefined);
        }

        _log.success(`Added namespace: '${config.name}'`, MODULE_NAME);
        return this._createNamespaceHandle(config.name);
    }

    /**
     * @function getNamespace
     * @memberof mcode.cache
     * @desc Returns an immutable handle for an existing cache namespace.
     * @param {string} name the registered namespace name.
     * @returns {object} the immutable namespace handle.
     * @throws {Error} when the namespace is not registered.
     * @api public
     */
    getNamespace(name)
    {
        this._validateNamespaceName(name);
        if (!this._getNamespaceInfo(name))
        {
            throw this._cacheError('CACHE_NAMESPACE_NOT_FOUND', `Namespace '${name}' is not registered.`);
        }

        return this._createNamespaceHandle(name);
    }

    /**
     * @function probeNamespace
     * @memberof mcode.cache
     * @desc Performs a bounded Redis readiness and capability probe without registering a namespace.
     * @param {object} config explicit Redis namespace configuration.
     * @returns {object} probe status and server version.
     * @api public
     */
    async probeNamespace(config)
    {
        const normalized = this._normalizeNamespaceConfig(config);
        if (normalized.type !== 'redis')
        {
            throw this._cacheError('CACHE_REDIS_REQUIRED', 'probeNamespace requires type redis.');
        }

        const client = normalized.clientFactory(this._buildRedisClientOptions(normalized));
        client.on('error', () => undefined);
        try
        {
            await this._withTimeout(client.connect(), normalized.readyTimeoutMs, 'Redis probe connection');
            await this._withTimeout(this._verifyRedisCapabilities(client, normalized),
                normalized.readyTimeoutMs, 'Redis probe capability check');
            const info = await client.info('server');
            const version = info.match(/^redis_version:([^\r\n]+)$/m)?.[1];
            return {ok: true, version};
        }
        finally
        {
            await this._closeRedisClient(client, normalized.commandTimeoutMs);
        }
    }

    /**
     * @property {object} redisStatus the frozen stable Redis namespace status constants.
     */
    get redisStatus()
    {
        return cache.REDIS_STATUS;
    }

    /**
     * @property {string} redisMinimumVersion the minimum supported Redis server version.
     */
    get redisMinimumVersion()
    {
        return cache.REDIS_MIN_VERSION;
    }

    /**
     * @property {object} cacheErrors the frozen stable package error codes for operational branching.
     */
    get cacheErrors()
    {
        return cache.ERROR_CODES;
    }

    /**
     * @function cacheMakeKey
     * @memberof mcode.cache
     * @desc Converts a 'key source' into a cache Key by replacing slashes with colons and removing spaces.
     * @param {string} keySource the path to the key to be converted.
     * @returns {string} the cache Key.
     * @api public
     * @example
     *     const keyPath = 'components/app/tool/tool.template.htmx';
     *     returns 'GM-GPS-eMITS-UI:components:app:tool:tool.template.htmx';
     */
    cacheMakeKey(keySource)
    {
        // convert the file path into a cache Key
        let key = keySource.replace(/[\\/]/g, ':'); // Handle both forward and backward slashes

        // remove spaces ' '
        key = key.replace(/\s/g, ' ');

        // remove double-dots '..'
        key = key.replace(/\.\./g, '.');

        // remove leading '.' and trailing '.'
        key = key.replace(/^\.+|\.+$/g, '');

        // remove leading and trailing colons
        key = key.replace(/^:+|:+$/g, '');

        // now, make it specific to the caller's namespace..
        return `${this.cacheNamespace}:${key}`;
    }

    /**
     * @function cacheGet
     * @memberof mcode.cache
     * @desc Caches the results of a callback function in cache under the current namespace and returns the key's value.
     * @param {string} key the app key to get from the current namespace.
     * @param {function} cb the callback function to get fresh value.
     * @returns {Promise} the cached value.
     */
    async cacheGet(key, cb = () => {return undefined;})
    {
        // make the auto-generated cache key for the 'key' - get from current namespace, add if not cached
        const cacheKey = this.fileMakeKey(key);

        // get the namespace info for the current namespace
        const namespaceInfo = this._getNamespaceInfo(this.#cacheNamespace);
        if (!namespaceInfo)
        {
            _log.warn(`Current namespace '${this.#cacheNamespace}' not found`, MODULE_NAME);
            return cb();
        }

        // get the value from the cache associated with the current namespace
        if (namespaceInfo.type === 'redis')
        {
            return await this._redisGet(cacheKey, cb);
        }

        return await this._cacheGet(cacheKey, cb);
    }

    /**
     * @function cacheSet
     * @memberof mcode.cache
     * @desc Sets a key value in the cache.
     * @param {string} key the app key to be set into current namespace.
     * @param {string} value the value to be set in the cache.
     * @returns {string} the value set in the cache.
     */
    async cacheSet(key, value)
    {
        // make the auto-generated cache key for the 'key' - set into current namespace
        const cacheKey = this.fileMakeKey(key);

        // get the namespace info for the current namespace
        const namespaceInfo = this._getNamespaceInfo(this.#cacheNamespace);
        if (!namespaceInfo)
        {
            _log.warn(`Current namespace '${this.#cacheNamespace}' not found`, MODULE_NAME);
            return;
        }

        // set the value in the cache associated with the current namespace
        if (namespaceInfo.type === 'redis')
        {
            return await this._redisSet(cacheKey, value);
        }

        return await this._cacheSet(cacheKey, value);
    }

    /**
     * @function cacheDrop
     * @memberof mcode.cache
     * @desc Drops a key value from the cache based on the 'key' name.
     * @param {string} key the app key to be droppped.
     * @returns {number} the number of keys deleted from the cache.
     * @api public
     * @example
     *     const count = await mcode.cacheDrop(keyName);
     */
    async cacheDrop(key)
    {
        // make the auto-generated cache key for the 'key' - drop from current namespace
        const cacheKey = this.fileMakeKey(key);

        // get the namespace info for the current namespace
        const namespaceInfo = this._getNamespaceInfo(this.#cacheNamespace);
        if (!namespaceInfo)
        {
            _log.warn(`Current namespace '${this.#cacheNamespace}' not found`, MODULE_NAME);
            return 0;
        }

        // delete the value from the cache associated with the current namespace
        if (namespaceInfo.type === 'redis')
        {
            // use the Redis client
            return await this._redisDrop(cacheKey);
        }

        return await this._cacheDrop(cacheKey);
    }

    /**
     * @function cacheDropAll
     * @memberof mcode.cache
     * @desc Drops all keys from the cache based on the App's namespace.
     * @param {string} cache the cache to drop all keys from.
     * @param {string} namespace the namespace to drop all keys from.
     * @param {string} pattern the key pattern to drop all keys from.
     * @returns {number} the number of keys deleted from the cache.
     * @api public
     * @example
     *    const result = await mcode.cacheDropAll();
     *    const result = await mcode.cacheDropAll({cache: 'redis', namespace: 'GM-GPS-eMITS-DB', pattern: '*'});
     */
    async cacheDropAll({cache = '*', namespace = '*', pattern = '*'} = {})
    {
        let result = 0;

        for (const namespaceInfo of this.#cacheNamespaces)
        {
            if (namespaceInfo.name === namespace || namespace === '*')
            {
                if (namespaceInfo.type === 'node' && (cache === 'node' || cache === '*'))
                {
                    // Get keys from the Node cache
                    const nodeKeys = await this._cacheKeys(`${namespaceInfo.name}:${pattern}`);
                    result += nodeKeys.length;

                    // Delete all keys from the Node cache
                    await Promise.all(nodeKeys.map(key => this.#cache.del(key)));
                }

                if (namespaceInfo.type === 'redis' && (cache === 'redis' || cache === '*'))
                {
                    // {AIN-2026-08-26:GPT-5.6 Sol} -- legacy flush-all semantics cannot stop at an arbitrary key count
                    const redisKeys = await this._legacyRedisScanKeys(namespaceInfo.name, pattern);
                    result += redisKeys.length;

                    for (let index = 0; index < redisKeys.length; index += this.constructor.TRANSACTION_DELETE_BATCH_SIZE)
                    {
                        const batch = redisKeys.slice(index, index + this.constructor.TRANSACTION_DELETE_BATCH_SIZE);
                        const context = this.#redisContexts.get(namespaceInfo.name);
                        await this._executeRedis(namespaceInfo.name, 'DEL',
                            client => client.del(batch), true, context.config.commandTimeoutMs);
                    }
                }
            }
        }

        // Return the total number of keys deleted
        return result;
    }

    /**
     * @function cacheListAll
     * @memberof mcode.cache
     * @desc Lists all keys from the cache based on the App's namespace.
     * Includes timeout protection to prevent hanging on non-responsive caches (especially Redis).
     * Provides graceful degradation - continues processing other namespaces if one fails.
     * @param {string} cache the cache to list all keys from.
     * @param {string} namespace the namespace to list all keys from.
     * @param {string} pattern the key pattern to list all keys from.
     * @param {boolean} includeErrors whether to include error information in the response.
     * @returns {Array|Object} returns an array of keys, or an object with keys and errors if includeErrors=true.
     * @api public
     * @example
     *    const result = await mcode.cacheListAll();
     *    const result = await mcode.cacheListAll({cache: 'node', namespace: '*', pattern: '*'});
     *    const {keys, errors} = await mcode.cacheListAll({includeErrors: true});
     */
    async cacheListAll({cache = '*', namespace = '*', pattern = '*', includeErrors = false} = {})
    {
        let keys = [];
        let errors = [];
        let processedNamespaces = 0;
        let failedNamespaces = 0;

        _log.info(`Starting cacheListAll for cache: ${cache}, namespace: ${namespace}, pattern: ${pattern}`, MODULE_NAME);

        for (const namespaceInfo of this.#cacheNamespaces)
        {
            if (namespaceInfo.name === namespace || namespace === '*')
            {
                if (namespaceInfo.type === cache || cache === '*')
                {
                    processedNamespaces++;
                    _log.debug(`Processing namespace: ${namespaceInfo.name} (${namespaceInfo.type})`, MODULE_NAME);

                    try
                    {
                        let cacheKeys = [];
                        const startTime = Date.now();

                        // Get keys from the appropriate cache type with timeout protection
                        if (namespaceInfo.type === 'node')
                        {
                            // use the Node cache - NOTE: node-cache.keys() does not support wildcards
                            cacheKeys = await this._cacheKeys(`${namespaceInfo.name}:${pattern}`);
                        }
                        else if (namespaceInfo.type === 'redis')
                        {
                            // Check if Redis is connected before attempting operation
                            if (!this.#redisConnected)
                            {
                                throw new Error('Redis not connected');
                            }

                            // {AIN-2026-08-26:GPT-5.6 Sol} -- deprecated list-all callers still require complete results
                            cacheKeys = await this._legacyRedisScanKeys(namespaceInfo.name, pattern);
                        }

                        const keysTime = Date.now() - startTime;
                        _log.debug(`Retrieved ${cacheKeys.length} keys from ${namespaceInfo.name} in ${keysTime}ms`, MODULE_NAME);

                        // Process the keys using common logic with timeout protection
                        const listKeysPromise = this._listKeys(cacheKeys, namespaceInfo.name, namespaceInfo.type);
                        const keyList = await this._withTimeout(listKeysPromise, 10000, `Cache list processing for ${namespaceInfo.name}`);

                        keys = keys.concat(keyList);

                        const totalTime = Date.now() - startTime;
                        _log.debug(`Successfully processed ${keyList.length} keys from namespace ${namespaceInfo.name} in ${totalTime}ms`, MODULE_NAME);
                    }
                    catch (exp)
                    {
                        failedNamespaces++;
                        const errorInfo = {
                            namespace: namespaceInfo.name,
                            type: namespaceInfo.type,
                            error: exp.message,
                            timestamp: new Date().toISOString()
                        };

                        errors.push(errorInfo);
                        _log.warn(`Failed to get keys for namespace '${namespaceInfo.name}' (${namespaceInfo.type}): ${exp.message}`, MODULE_NAME);

                        // Add a placeholder entry to indicate this namespace had issues
                        if (includeErrors)
                        {
                            keys.push({
                                namespace: namespaceInfo.name,
                                key: '<ERROR>',
                                cache: namespaceInfo.type,
                                type: 'error',
                                preview: `Failed to retrieve keys: ${exp.message}`,
                                error: true,
                                errorDetails: errorInfo
                            });
                        }

                        // Continue with other namespaces instead of failing completely
                    }
                }
            }
        }

        const summary = `Processed ${processedNamespaces} namespaces, ${failedNamespaces} failed, returned ${keys.length} keys`;
        _log.info(`cacheListAll completed: ${summary}`, MODULE_NAME);

        // Return keys with optional error information
        if (includeErrors)
        {
            return {
                keys: keys,
                errors: errors,
                summary: {
                    totalNamespaces: processedNamespaces,
                    failedNamespaces: failedNamespaces,
                    successfulNamespaces: processedNamespaces - failedNamespaces,
                    totalKeys: keys.filter(k => !k.error).length,
                    errorKeys: keys.filter(k => k.error).length
                }
            };
        }

        return keys;
    }

    /**
     * @function cacheOn
     * @memberof mcode.cache
     * @desc Turns ON caching for a specific namespace.
     * @param {string} cacheName the name of the cache namespace to enable.
     * @returns {boolean} true if the namespace was found and enabled, false otherwise.
     * @api public
     */
    async cacheOn(cacheName)
    {
        const namespace = this.#cacheNamespaces.find(ns => ns.name === cacheName);
        if (namespace)
        {
            namespace.enabled = true;
            _log.success(`Enabled caching for namespace: ${cacheName}`, MODULE_NAME);
            return true;
        }
        else
        {
            _log.warn(`Namespace '${cacheName}' not found`, MODULE_NAME);
            return false;
        }
    }

    /**
     * @function cacheOff
     * @memberof mcode.cache
     * @desc Turns OFF caching for a specific namespace.
     * @param {string} cacheName the name of the cache namespace to disable.
     * @returns {boolean} true if the namespace was found and disabled, false otherwise.
     * @api public
     */
    async cacheOff(cacheName)
    {
        const namespace = this.#cacheNamespaces.find(ns => ns.name === cacheName);
        if (namespace)
        {
            // Drop all keys from this specific namespace
            await this.cacheDropAll({cache: namespace.type, namespace: cacheName, pattern: '*'});
            namespace.enabled = false;
            _log.success(`Disabled caching for namespace: ${cacheName}`, MODULE_NAME);
            return true;
        }
        else
        {
            _log.warn(`Namespace '${cacheName}' not found`, MODULE_NAME);
            return false;
        }
    }

    /**
     * @function cacheEnabled
     * @memberof mcode.cache
     * @desc Checks if caching is enabled for a specific namespace.
     * @param {string} cacheName the name of the cache namespace to check.
     * @returns {boolean} true if caching is enabled for the namespace, false otherwise.
     * @api public
     * @example
     *   const isEnabled = mcode.cacheEnabled('MicroCODE');
     */
    cacheEnabled(cacheName)
    {
        const namespace = this.#cacheNamespaces.find(ns => ns.name === cacheName);
        if (namespace)
        {
            return namespace.enabled;
        }
        else
        {
            _log.warn(`Namespace '${cacheName}' not found`, MODULE_NAME);
            return false;
        }
    }

    /**
     * @function refreshCacheStatistics
     * @memberof mcode.cache
     * @desc Refreshes cache statistics for all Redis namespaces (async operation).
     * @returns {Promise<Array<object>>} per-namespace refresh outcomes.
     * @api public
     * @example
     *   await mcode.refreshCacheStatistics();
     */
    async refreshCacheStatistics()
    {
        const outcomes = [];
        for (const namespace of this.#cacheNamespaces)
        {
            if (namespace.type !== 'redis')
            {
                outcomes.push({
                    name: namespace.name,
                    status: 'refreshed',
                    error_code: null
                });
                continue;
            }

            try
            {
                // {AIN-2026-08-26:GPT-5.6 Sol} -- namespace statistics must not report a capped subset as complete
                const namespaceKeys = await this._legacyRedisScanKeys(namespace.name, '*');
                namespace.keys = namespaceKeys.length;
                const ksize = namespaceKeys.reduce((size, key) =>
                    size + Buffer.byteLength(key, 'utf8'), 0);
                let vsize = 0;
                for (let index = 0; index < namespaceKeys.length; index += 100)
                {
                    const batch = namespaceKeys.slice(index, index + 100);
                    const sizes = await this._executeRedis(namespace.name, 'MEMORY USAGE',
                        client => Promise.all(batch.map(key => client.memoryUsage(key))));
                    vsize += sizes.reduce((size, value) => size + (value || 0), 0);
                }
                namespace.ksize = ksize;
                namespace.vsize = vsize;
                await this._loadAccessStatistics(namespace);
                outcomes.push({
                    name: namespace.name,
                    status: 'refreshed',
                    error_code: null
                });
            }
            catch (error)
            {
                // {AIN-2026-08-26:Grok-4.6} -- stale Redis sizes must not survive a failed refresh
                namespace.keys = null;
                namespace.ksize = null;
                namespace.vsize = null;
                namespace.hits = null;
                namespace.misses = null;
                _log.warn(`Could not refresh statistics for Redis namespace '${namespace.name}'`, MODULE_NAME);
                outcomes.push({
                    name: namespace.name,
                    status: 'unavailable',
                    error_code: cache.ERROR_CODES.STATS_UNAVAILABLE
                });
            }
        }

        return outcomes;
    }

    /**
     * @function closeNamespace
     * @memberof mcode.cache
     * @desc Closes all namespace-owned cache resources.
     * @returns {Promise<void>} resolves after all namespace resources close.
     * @api public
     * @example
     *   await mcode.closeNamespace();
     */
    async closeNamespace()
    {
        await Promise.allSettled(Array.from(this.#redisContexts.keys())
            .map(name => this._closeRedisNamespace(name)));

        if (this.#cache)
        {
            this.#cache.close();
            this.#cache = null;
        }
        this.#redis = null;
        this.#redisConnected = false;
    }

    /**
     * @function fileRead
     * @memberof mcode.cache
     * @desc Reads a file from 'path' and caches its for future reference. The cache 'key' generated
     * is based on the 'path' and the server's base URL (which is removed from the 'key' before caching).
     * @api public
     * @param {string} filePath a standard file system reference to the file to be read,
     * @param {string} fileEncoding the encoding of the file to be read (default is 'utf8').
     *
     * NOTE: 'filePath' is reduced to the unique sub-folder path to the file being read on the server.
     *       Explicit paths to files outside the server's root directory are supported with
     *       the 'complete path' parameter becoming the unique key for the file.
     *
     * @returns {string} the contents of the file read from 'path'.
     *
     * @example
     *      const filePath = './data.json';
     *      const fileData = mcode.fileRead(path.join(__dirname, filePath);
     *
     *      filePath: "D:\MicroCODE\GM-GPS-eMITS-UI\Source\backend\components\app\tool\tool.template.htmx",
     *      rootDir: "D:\MicroCODE\GM-GPS-eMITS-UI\Source\backend",
     *      keyPath: "\components\app\tool\tool.template.htmx",
     *      key: "GM-GPS-eMITS-UI:components:app:tool:tool.template.htmx"
     *
     * The 1st time 'mcode.fileRead()' is called, the file is read from disk and cached.
     * The 2nd time 'mcode.fileRead()' is called, the file is read from the cache.
     * The 'key' used to cache the file is based on the 'path' and the server's base URL
     * and does not need to be provided by the caller, nor stored by the caller, it is transparent.
     *
     */
    async fileRead(filePath, fileEncoding = 'utf8')
    {
        try
        {
            // make the auto-generated cache key for the file
            const cacheKey = this.fileMakeKey(filePath);

            return this._cacheGet(cacheKey, async () =>
            {
                try
                {
                    // Check if the file exists and is accessible
                    await fs.access(filePath, fs.constants.R_OK);
                }
                catch (exp)
                {
                    _log.exp(`File is NOT READ accessible: ${filePath}`, MODULE_NAME, exp);
                    throw new Error(`File READ access error: ${filePath}`);
                }

                return await fs.readFile(filePath, fileEncoding);
            });
        }
        catch (exp)
        {
            _log.exp(`Exception reading from disk for cache, file: ${filePath}`, MODULE_NAME, exp);
            return null;
        }
    }

    /**
     * @function fileWrite
     * @memberof mcode.cache
     * @desc Writes 'fileData' to 'filePath' and caches it in the cache.
     * @param {string} filePath a standard file system reference to the file to be read.
     * @param {string} fileData the data to be written to the file.
     * @param {string} fileEncoding the encoding of the file to be written (default is 'utf8').
     * @returns {Promise} the file data written to disk.
     */
    async fileWrite(filePath, fileData, fileEncoding = 'utf8')
    {
        try
        {
            // make the auto-generated cache key for the file
            const cacheKey = this.fileMakeKey(filePath);

            // the cached value is no longer valid, so drop it
            this.cacheDrop(cacheKey);

            // cache the new value
            this._cacheSet(cacheKey, fileData);

            try
            {
                // Check if the file exists and is accessible
                await fs.access(filePath, fs.constants.W_OK);
            }
            catch (exp)
            {
                _log.exp(`File is NOT WRITE accessible: ${filePath}`, MODULE_NAME, exp);
                throw new Error(`File WRITE access error: ${filePath}`);
            }

            // write the file to disk
            return await fs.writeFile(filePath, fileData, {encoding: fileEncoding});
        }
        catch (exp)
        {
            _log.exp(`Exception writing to disk and cache, file: ${filePath}`, MODULE_NAME, exp);
            return null;
        }
    }

    /**
     * @function fileDrop
     * @memberof mcode.cache
     * @desc Drops a file from the cache based on the 'filePath'.
     * @param {string} filePath a standard file system reference to the file to be read.
     * @returns {number} the number of keys deleted from the cache.
     * @api public
     * @example
     *     const filePath = './data.json';
     *     const result = await mcode.fileDrop(path.join(__dirname, filePath));
     */
    async fileDrop(filePath)
    {
        const cacheKey = this.fileMakeKey(filePath);

        return await this._cacheDrop(cacheKey);
    }

    /**
     * @function fileMakeKey
     * @memberof mcode.cache
     * @desc Generates a unique key for the file in the cache based on the 'filePath'.
     * @param {string} filePath a standard file system reference to the file to be read.
     * @returns {string} the key for the file in the cache.
     */
    fileMakeKey(filePath)
    {
        // remove 'rootKey' from the 'filePath'
        const keyPath = filePath.replace(this.fileGetRoot(), '');
        const key = this.cacheMakeKey(keyPath);

        return key;
    }

    /**
     * @function fileGetRoot
     * @memberof mcode.cache
     * @desc Gets the root directory for cache Keys based on the server's execution path.
     * @returns {string} the root directory for the server.
     * @api public
     * @example
     *    const rootDir = mcode.fileGetRoot();
     */
    fileGetRoot()
    {
        // get the execution root directory
        const mainDir = path.dirname(require.main.filename);

        // Determine the common base path
        const rootDir = path.resolve(path.join(mainDir, '..'));

        return rootDir;
    }

    // #endregion

    // #region  M E T H O D S – P R I V A T E

    /**
     * @function _getNamespaceInfo
     * @api private
     * @memberof mcode.cache
     * @desc Gets namespace information by name.
     * @param {string} namespaceName the name of the namespace to find.
     * @returns {object|null} the namespace object or null if not found.
     */
    _getNamespaceInfo(namespaceName)
    {
        return this.#cacheNamespaces.find(ns => ns.name === namespaceName) || null;
    }

    // #region  S C O P E D   C O N T R A C T   A N D   C O D E C

    /**
     * @function _cacheError
     * @memberof mcode.cache
     * @desc Creates an Error with a stable package error code and optional cause.
     * @param {string} code the stable package error code.
     * @param {string} message the human-readable error message.
     * @param {Error} cause the optional underlying error.
     * @returns {Error} the coded cache error.
     * @api private
     */
    _cacheError(code, message, cause)
    {
        const error = new Error(message, cause ? {cause} : undefined);
        error.code = code;
        return error;
    }

    /**
     * @function _validateNamespaceName
     * @memberof mcode.cache
     * @desc Validates a namespace name against the scoped cache contract.
     * @param {string} name the namespace name to validate.
     * @returns {string} the validated namespace name.
     * @api private
     */
    _validateNamespaceName(name)
    {
        if (typeof name !== 'string' || !name ||
            Buffer.byteLength(name, 'utf8') > cache.MAX_NAMESPACE_BYTES ||
            !/^[A-Za-z0-9][A-Za-z0-9._-]*$/.test(name))
        {
            throw this._cacheError('CACHE_INVALID_NAMESPACE',
                'Namespace names must be 1-64 bytes and contain only letters, digits, dot, underscore, or hyphen.');
        }

        return name;
    }

    /**
     * @function _validateLogicalName
     * @memberof mcode.cache
     * @desc Validates a logical key or channel without a namespace prefix.
     * @param {string} value the logical name to validate.
     * @param {string} kind the logical-name kind, either key or channel.
     * @returns {string} the validated logical name.
     * @api private
     */
    _validateLogicalName(value, kind = 'key')
    {
        const maximum = kind === 'channel' ? cache.MAX_CHANNEL_BYTES : cache.MAX_LOGICAL_KEY_BYTES;
        if (typeof value !== 'string' || !value || Buffer.byteLength(value, 'utf8') > maximum)
        {
            throw this._cacheError(`CACHE_INVALID_${kind.toUpperCase()}`,
                `Logical ${kind} must be a non-empty string no larger than ${maximum} bytes.`);
        }

        const segments = value.split(':');
        if (segments.some(segment => !/^[A-Za-z0-9][A-Za-z0-9._-]*$/.test(segment)))
        {
            throw this._cacheError(`CACHE_INVALID_${kind.toUpperCase()}`,
                `Logical ${kind} segments may contain only letters, digits, dot, underscore, or hyphen.`);
        }

        return value;
    }

    /**
     * @function _physicalKey
     * @memberof mcode.cache
     * @desc Builds a namespace-owned Redis key from a validated logical key.
     * @param {string} namespaceName the namespace that owns the key.
     * @param {string} logicalKey the unprefixed logical key.
     * @returns {string} the physical Redis key.
     * @api private
     */
    _physicalKey(namespaceName, logicalKey)
    {
        this._validateLogicalName(logicalKey);
        if (logicalKey === namespaceName || logicalKey.startsWith(`${namespaceName}:`))
        {
            throw this._cacheError('CACHE_ALREADY_PREFIXED',
                `Logical key '${logicalKey}' must not include namespace '${namespaceName}'.`);
        }

        return `${namespaceName}:${logicalKey}`;
    }

    /**
     * @function _physicalChannel
     * @memberof mcode.cache
     * @desc Builds a namespace-owned Redis channel from a validated logical channel.
     * @param {string} namespaceName the namespace that owns the channel.
     * @param {string} logicalChannel the unprefixed logical channel.
     * @returns {string} the physical Redis channel.
     * @api private
     */
    _physicalChannel(namespaceName, logicalChannel)
    {
        this._validateLogicalName(logicalChannel, 'channel');
        if (logicalChannel === namespaceName || logicalChannel.startsWith(`${namespaceName}:`))
        {
            throw this._cacheError('CACHE_ALREADY_PREFIXED',
                `Logical channel '${logicalChannel}' must not include namespace '${namespaceName}'.`);
        }

        return `${namespaceName}:${logicalChannel}`;
    }

    /**
     * @function _normalizeNamespaceConfig
     * @memberof mcode.cache
     * @desc Validates and freezes an explicit node or Redis namespace configuration.
     * @param {object} namespace the namespace configuration to normalize.
     * @returns {object} the normalized namespace configuration.
     * @api private
     */
    _normalizeNamespaceConfig(namespace)
    {
        if (!namespace || typeof namespace !== 'object')
        {
            throw this._cacheError('CACHE_INVALID_NAMESPACE', 'Namespace configuration must be an object.');
        }

        const name = this._validateNamespaceName(namespace.name);
        if (namespace.type !== 'node' && namespace.type !== 'redis')
        {
            throw this._cacheError('CACHE_INVALID_TYPE', `Namespace '${name}' type must be 'node' or 'redis'.`);
        }

        if (namespace.type === 'node')
        {
            return {name, type: 'node'};
        }

        const required = [
            'url',
            'username',
            'password',
            'retry',
            'readyTimeoutMs',
            'commandTimeoutMs',
            'disableOfflineQueue'
        ];
        const missing = required.filter(property => !Object.prototype.hasOwnProperty.call(namespace, property));
        if (missing.length > 0)
        {
            throw this._cacheError('CACHE_CONFIG_REQUIRED',
                `Redis namespace '${name}' is missing explicit configuration: ${missing.join(', ')}.`);
        }

        let parsedURL;
        try
        {
            parsedURL = new URL(namespace.url);
        }
        catch (error)
        {
            throw this._cacheError('CACHE_INVALID_CONFIG', `Redis namespace '${name}' has an invalid URL.`, error);
        }

        if (parsedURL.protocol !== 'redis:' && parsedURL.protocol !== 'rediss:')
        {
            throw this._cacheError('CACHE_INVALID_CONFIG', 'Redis URL protocol must be redis: or rediss:.');
        }

        if (namespace.username !== null && typeof namespace.username !== 'string')
        {
            throw this._cacheError('CACHE_INVALID_CONFIG', 'Redis username must be a string or null.');
        }
        if (namespace.password !== null && typeof namespace.password !== 'string')
        {
            throw this._cacheError('CACHE_INVALID_CONFIG', 'Redis password must be a string or null.');
        }
        if (typeof namespace.disableOfflineQueue !== 'boolean')
        {
            throw this._cacheError('CACHE_INVALID_CONFIG', 'disableOfflineQueue must be an explicit boolean.');
        }

        this._validatePositiveInteger(namespace.readyTimeoutMs, 'readyTimeoutMs');
        this._validatePositiveInteger(namespace.commandTimeoutMs, 'commandTimeoutMs');
        if (!namespace.retry || typeof namespace.retry !== 'object')
        {
            throw this._cacheError('CACHE_INVALID_CONFIG', 'retry must be an explicit configuration object.');
        }
        this._validatePositiveInteger(namespace.retry.baseDelayMs, 'retry.baseDelayMs');
        this._validatePositiveInteger(namespace.retry.maxDelayMs, 'retry.maxDelayMs');
        this._validatePositiveInteger(namespace.retry.maxAttempts, 'retry.maxAttempts');
        if (namespace.retry.baseDelayMs > namespace.retry.maxDelayMs)
        {
            throw this._cacheError('CACHE_INVALID_CONFIG',
                'retry.baseDelayMs must not exceed retry.maxDelayMs.');
        }
        if (namespace.clientFactory !== undefined && typeof namespace.clientFactory !== 'function')
        {
            throw this._cacheError('CACHE_INVALID_CONFIG', 'clientFactory must be a function when provided.');
        }

        return Object.freeze({
            name,
            type: 'redis',
            url: namespace.url,
            username: namespace.username,
            password: namespace.password,
            retry: Object.freeze({...namespace.retry}),
            readyTimeoutMs: namespace.readyTimeoutMs,
            commandTimeoutMs: namespace.commandTimeoutMs,
            disableOfflineQueue: namespace.disableOfflineQueue,
            clientFactory: namespace.clientFactory || Redis.createClient
        });
    }

    /**
     * @function _validatePositiveInteger
     * @memberof mcode.cache
     * @desc Requires a configuration value to be a positive safe integer.
     * @param {number} value the numeric value to validate.
     * @param {string} name the configuration field name.
     * @returns {void}
     * @api private
     */
    _validatePositiveInteger(value, name)
    {
        if (!Number.isSafeInteger(value) || value <= 0)
        {
            throw this._cacheError('CACHE_INVALID_CONFIG', `${name} must be a positive integer.`);
        }
    }

    /**
     * @function _validateOptionsObject
     * @memberof mcode.cache
     * @desc Requires an operation's options value to be a non-array object.
     * @param {object} options the options value to validate.
     * @param {string} operation the operation name used in errors.
     * @returns {object} the validated options object.
     * @api private
     */
    _validateOptionsObject(options, operation)
    {
        if (!options || typeof options !== 'object' || Array.isArray(options))
        {
            throw this._cacheError('CACHE_INVALID_OPTIONS', `${operation} options must be an object.`);
        }
        return options;
    }

    /**
     * @function _remainingDeadline
     * @memberof mcode.cache
     * @desc Calculates remaining bounded operation time and rejects expired work.
     * @param {number} expiresAt the absolute deadline in epoch milliseconds.
     * @param {string} operation the operation name used in errors.
     * @returns {number} the remaining deadline in milliseconds.
     * @api private
     */
    _remainingDeadline(expiresAt, operation)
    {
        const remaining = expiresAt - Date.now();
        if (remaining <= 0)
        {
            throw this._cacheError('CACHE_TIMEOUT', `${operation} deadline expired.`);
        }
        return remaining;
    }

    /**
     * @function _redisConfigSignature
     * @memberof mcode.cache
     * @desc Creates the stable comparison signature for Redis namespace idempotence.
     * @param {object} config the normalized Redis namespace configuration.
     * @returns {string} the serialized non-function configuration signature.
     * @api private
     */
    _redisConfigSignature(config)
    {
        return JSON.stringify({
            url: config.url,
            username: config.username,
            password: config.password,
            retry: config.retry,
            readyTimeoutMs: config.readyTimeoutMs,
            commandTimeoutMs: config.commandTimeoutMs,
            disableOfflineQueue: config.disableOfflineQueue
        });
    }

    /**
     * @function _createNamespaceHandle
     * @memberof mcode.cache
     * @desc Creates or returns the immutable scoped handle for a namespace.
     * @param {string} name the registered namespace name.
     * @returns {object} the immutable namespace handle.
     * @api private
     */
    _createNamespaceHandle(name)
    {
        if (this.#namespaceHandles.has(name))
        {
            return this.#namespaceHandles.get(name);
        }

        const namespace = this._getNamespaceInfo(name);
        const owner = this;
        const handle = {
            name,
            type: namespace.type,
            get enabled()
            {
                return owner._getNamespaceInfo(name)?.enabled === true;
            },
            get status()
            {
                if (namespace.type === 'node')
                {
                    return owner.#cache ? cache.REDIS_STATUS.CONNECTED : cache.REDIS_STATUS.DISCONNECTED;
                }
                return owner.#redisContexts.get(name)?.status || cache.REDIS_STATUS.NOT_CONFIGURED;
            },
            ready: options => owner._namespaceReady(name, options),
            cacheGet: key => owner._namespaceCacheGet(name, key),
            cacheGetMany: keys => owner._namespaceCacheGetMany(name, keys),
            cacheSet: (key, value, options) => owner._namespaceCacheSet(name, key, value, options),
            cacheDrop: keyOrKeys => owner._namespaceCacheDrop(name, keyOrKeys),
            cacheDropIfEqual: (key, expectedValue) => owner._namespaceCacheDropIfEqual(name, key, expectedValue),
            cacheExists: key => owner._namespaceCacheExists(name, key),
            cacheTTL: key => owner._namespaceCacheTTL(name, key, false),
            cachePTTL: key => owner._namespaceCacheTTL(name, key, true),
            cacheExpire: (key, options) => owner._namespaceCacheExpire(name, key, options),
            ping: () => owner._namespacePing(name),
            info: section => owner._namespaceInfo(name, section),
            time: () => owner._namespaceTime(name),
            scan: options => owner._namespaceScan(name, options),
            inspect: options => owner._namespaceInspect(name, options),
            geoAdd: (key, members) => owner._namespaceGeoAdd(name, key, members),
            geoRemove: (key, members) => owner._namespaceGeoRemove(name, key, members),
            geoSearch: (key, options) => owner._namespaceGeoSearch(name, key, options),
            sortedSetAdd: (key, members, options) => owner._namespaceSortedSetAdd(name, key, members, options),
            sortedSetRemove: (key, members) => owner._namespaceSortedSetRemove(name, key, members),
            // {AIN-2026-08-26:GPT-5.6 Sol} -- viewport expiry needs the documented bounded score APIs
            sortedSetRemoveByScore: (key, options) => owner._namespaceSortedSetRemoveByScore(name, key, options),
            sortedSetCount: (key, options) => owner._namespaceSortedSetCount(name, key, options),
            sortedSetRange: (key, options) => owner._namespaceSortedSetRange(name, key, options),
            sortedSetRangeByScore: (key, options) => owner._namespaceSortedSetRangeByScore(name, key, options),
            sortedSetRank: (key, member, reverse) => owner._namespaceSortedSetRank(name, key, member, reverse),
            sortedSetScore: (key, member) => owner._namespaceSortedSetScore(name, key, member),
            multi: () => owner._createMultiBuilder(name),
            watchTransaction: (options, planner) => owner._watchTransaction(name, options, planner),
            ensureGeneration: options => owner._ensureGeneration(name, options),
            resetGeneration: options => owner._resetGeneration(name, options),
            publish: (channel, value) => owner._namespacePublish(name, channel, value),
            createSubscriber: options => owner._createSubscriber(name, options),
            close: () => owner._closeRedisNamespace(name)
        };

        Object.freeze(handle);
        this.#namespaceHandles.set(name, handle);
        return handle;
    }

    /**
     * @function _canonicalize
     * @memberof mcode.cache
     * @desc Recursively validates and key-sorts a supported typed cache value.
     * @param {*} value the value to canonicalize.
     * @param {Set} seen the object references in the current recursion path.
     * @returns {*} the canonical JSON-compatible value.
     * @api private
     */
    _canonicalize(value, seen = new Set())
    {
        if (value === null || typeof value === 'string' || typeof value === 'boolean')
        {
            return value;
        }
        if (typeof value === 'number')
        {
            if (!Number.isFinite(value))
            {
                throw this._cacheError('CACHE_VALUE_UNSUPPORTED', 'Cache numbers must be finite.');
            }
            return value;
        }
        if (typeof value !== 'object' || Buffer.isBuffer(value) || value instanceof Date)
        {
            throw this._cacheError('CACHE_VALUE_UNSUPPORTED',
                'Cache values support null, booleans, finite numbers, strings, arrays, and plain objects.');
        }
        if (seen.has(value))
        {
            throw this._cacheError('CACHE_VALUE_UNSUPPORTED', 'Cache values must not contain circular references.');
        }

        seen.add(value);
        let result;
        if (Array.isArray(value))
        {
            result = value.map(item =>
            {
                if (item === undefined)
                {
                    throw this._cacheError('CACHE_VALUE_UNSUPPORTED', 'Undefined array values are not supported.');
                }
                return this._canonicalize(item, seen);
            });
        }
        else
        {
            const prototype = Object.getPrototypeOf(value);
            if (prototype !== Object.prototype && prototype !== null)
            {
                throw this._cacheError('CACHE_VALUE_UNSUPPORTED', 'Only plain object cache values are supported.');
            }
            result = {};
            for (const key of Object.keys(value).sort())
            {
                if (value[key] === undefined)
                {
                    throw this._cacheError('CACHE_VALUE_UNSUPPORTED', 'Undefined object values are not supported.');
                }
                result[key] = this._canonicalize(value[key], seen);
            }
        }
        seen.delete(value);
        return result;
    }

    /**
     * @function _encodeValue
     * @memberof mcode.cache
     * @desc Encodes a supported value with the versioned canonical cache codec.
     * @param {*} value the value to encode.
     * @returns {string} the versioned encoded Redis value.
     * @api private
     */
    _encodeValue(value)
    {
        if (value === undefined)
        {
            throw this._cacheError('CACHE_VALUE_UNSUPPORTED', 'Undefined is reserved for a missing cache value.');
        }

        const encoded = `${cache.REDIS_VALUE_PREFIX}${JSON.stringify(this._canonicalize(value))}`;
        if (Buffer.byteLength(encoded, 'utf8') > cache.MAX_VALUE_BYTES)
        {
            throw this._cacheError('CACHE_VALUE_TOO_LARGE',
                `Encoded cache values must not exceed ${cache.MAX_VALUE_BYTES} bytes.`);
        }
        return encoded;
    }

    /**
     * @function _decodeValue
     * @memberof mcode.cache
     * @desc Decodes a versioned cache value while preserving missing-value semantics.
     * @param {string|null|undefined} value the stored Redis value.
     * @returns {*} the decoded value, or undefined when missing.
     * @api private
     */
    _decodeValue(value)
    {
        if (value === null || value === undefined)
        {
            return undefined;
        }
        if (!value.startsWith(cache.REDIS_VALUE_PREFIX))
        {
            throw this._cacheError('CACHE_VALUE_FORMAT', 'Stored value does not use the mcode-cache typed codec.');
        }

        try
        {
            return JSON.parse(value.slice(cache.REDIS_VALUE_PREFIX.length));
        }
        catch (error)
        {
            throw this._cacheError('CACHE_VALUE_FORMAT', 'Stored cache value is malformed.', error);
        }
    }

    // #endregion

    // #region  R E D I S   C O N N E C T I O N   A N D   D E A D L I N E S

    /**
     * @function _createRedisContext
     * @memberof mcode.cache
     * @desc Creates the private lifecycle state for one Redis namespace.
     * @param {object} config the normalized Redis namespace configuration.
     * @returns {object} the mutable private Redis context.
     * @api private
     */
    _createRedisContext(config)
    {
        return {
            config,
            signature: this._redisConfigSignature(config),
            status: cache.REDIS_STATUS.IDLE,
            client: null,
            connectPromise: null,
            closePromise: null,
            subscribers: new Set(),
            transactionClients: new Set(),
            lastError: null,
            outageLogged: false,
            closing: false
        };
    }

    /**
     * @function _buildRedisClientOptions
     * @memberof mcode.cache
     * @desc Maps explicit namespace policy to node-redis client options.
     * @param {object} config the normalized Redis namespace configuration.
     * @returns {object} the node-redis client options.
     * @api private
     */
    _buildRedisClientOptions(config)
    {
        return {
            url: config.url,
            username: config.username ?? undefined,
            password: config.password ?? undefined,
            disableOfflineQueue: config.disableOfflineQueue,
            socket: {
                connectTimeout: config.readyTimeoutMs,
                reconnectStrategy: retries =>
                {
                    if (retries >= config.retry.maxAttempts)
                    {
                        return new Error(`Redis reconnect attempts exceeded ${config.retry.maxAttempts}.`);
                    }
                    return Math.min(
                        config.retry.baseDelayMs * Math.pow(2, retries),
                        config.retry.maxDelayMs
                    );
                }
            }
        };
    }

    /**
     * @function _transitionRedisContext
     * @memberof mcode.cache
     * @desc Applies a deduplicated Redis lifecycle transition and outage log state.
     * @param {object} context the Redis namespace context.
     * @param {string} status the stable package status value.
     * @param {Error} error the optional transition error.
     * @returns {void}
     * @api private
     */
    _transitionRedisContext(context, status, error)
    {
        if (error)
        {
            context.lastError = error;
        }
        if (context.status === status)
        {
            return;
        }

        context.status = status;
        this.#redisConnected = Array.from(this.#redisContexts.values())
            .some(item => item.status === cache.REDIS_STATUS.CONNECTED);

        if (status === cache.REDIS_STATUS.CONNECTED)
        {
            if (context.outageLogged)
            {
                _log.success(`Redis namespace '${context.config.name}' recovered.`, MODULE_NAME);
            }
            context.lastError = null;
            context.outageLogged = false;
        }
        else if (status === cache.REDIS_STATUS.DISCONNECTED && !context.outageLogged)
        {
            context.outageLogged = true;
            _log.warn(`Redis namespace '${context.config.name}' is unavailable: ${error?.message || 'disconnected'}`,
                MODULE_NAME);
        }
    }

    /**
     * @function _attachRedisClientListeners
     * @memberof mcode.cache
     * @desc Attaches guarded lifecycle and required error listeners to a Redis client.
     * @param {object} context the Redis namespace context.
     * @param {object} client the node-redis client.
     * @returns {void}
     * @api private
     */
    _attachRedisClientListeners(context, client)
    {
        client.on('error', error =>
            this._transitionRedisContext(context, cache.REDIS_STATUS.DISCONNECTED, error));
        client.on('reconnecting', () =>
            this._transitionRedisContext(context, cache.REDIS_STATUS.CONNECTING));
        client.on('end', () =>
        {
            if (!context.closing)
            {
                this._transitionRedisContext(context, cache.REDIS_STATUS.DISCONNECTED);
            }
        });
        client.on('ready', () =>
        {
            if ((context.status === cache.REDIS_STATUS.DISCONNECTED ||
                context.status === cache.REDIS_STATUS.CONNECTING) &&
                !context.connectPromise && !context.closing)
            {
                const connectPromise = this._verifyRedisCapabilities(client, context.config)
                    .then(() => this._transitionRedisContext(context, cache.REDIS_STATUS.CONNECTED))
                    .catch(error =>
                    {
                        this._transitionRedisContext(context, cache.REDIS_STATUS.DISCONNECTED, error);
                        this._destroyRedisClient(client);
                        throw error;
                    })
                    .finally(() =>
                    {
                        if (context.connectPromise === connectPromise)
                        {
                            context.connectPromise = null;
                        }
                    });
                context.connectPromise = connectPromise;
                context.connectPromise.catch(() => undefined);
            }
        });
    }

    /**
     * @function _connectRedisContext
     * @memberof mcode.cache
     * @desc Creates, connects, and capability-gates a namespace command client.
     * @param {object} context the Redis namespace context.
     * @returns {Promise<object>} the ready node-redis client.
     * @api private
     */
    _connectRedisContext(context)
    {
        if (context.status === cache.REDIS_STATUS.CONNECTED && context.client?.isReady)
        {
            return context.client;
        }
        if (context.connectPromise)
        {
            return context.connectPromise;
        }

        const connectPromise = (async () =>
        {
            context.closing = false;
            this._transitionRedisContext(context, cache.REDIS_STATUS.CONNECTING);
            if (!context.client || !context.client.isOpen)
            {
                context.client = context.config.clientFactory(this._buildRedisClientOptions(context.config));
                this._attachRedisClientListeners(context, context.client);
            }

            try
            {
                if (!context.client.isOpen)
                {
                    await this._withTimeout(context.client.connect(), context.config.readyTimeoutMs,
                        `Redis readiness for '${context.config.name}'`);
                }
                await this._withTimeout(
                    this._verifyRedisCapabilities(context.client, context.config),
                    context.config.readyTimeoutMs,
                    `Redis capability check for '${context.config.name}'`
                );
                this._transitionRedisContext(context, cache.REDIS_STATUS.CONNECTED);
                if (this.#redisContexts.size === 1)
                {
                    this.#redis = context.client;
                }
                return context.client;
            }
            catch (error)
            {
                this._transitionRedisContext(context, cache.REDIS_STATUS.DISCONNECTED, error);
                if (context.client)
                {
                    this._destroyRedisClient(context.client);
                }
                throw error;
            }
        })().finally(() =>
        {
            if (context.connectPromise === connectPromise)
            {
                context.connectPromise = null;
            }
        });

        context.connectPromise = connectPromise;
        return connectPromise;
    }

    /**
     * @function _verifyRedisCapabilities
     * @memberof mcode.cache
     * @desc Verifies PING, Redis version, DELEX support, and standalone mode.
     * @param {object} client the connected node-redis client.
     * @param {object} config the normalized Redis namespace configuration.
     * @returns {Promise<void>}
     * @api private
     */
    async _verifyRedisCapabilities(client, config)
    {
        const pong = await client.ping();
        if (pong !== 'PONG')
        {
            throw this._cacheError('CACHE_REDIS_CAPABILITY', 'Redis PING did not return PONG.');
        }

        const serverInfo = await client.info('server');
        const versionMatch = serverInfo.match(/^redis_version:([^\r\n]+)$/m);
        const version = versionMatch?.[1];
        if (!version || this._compareVersions(version, cache.REDIS_MIN_VERSION) < 0)
        {
            throw this._cacheError('CACHE_REDIS_VERSION',
                `Redis ${cache.REDIS_MIN_VERSION} or newer is required; server reported '${version || 'unknown'}'.`);
        }

        const commandInfo = await client.sendCommand(['COMMAND', 'INFO', 'DELEX']);
        if (!Array.isArray(commandInfo) || !commandInfo[0])
        {
            throw this._cacheError('CACHE_REDIS_CAPABILITY',
                'Redis DELEX support is required for compare-and-delete.');
        }

        const clusterInfo = await client.info('cluster');
        if (/^cluster_enabled:1$/m.test(clusterInfo))
        {
            throw this._cacheError('CACHE_REDIS_MODE',
                `Redis namespace '${config.name}' requires a standalone server, not cluster mode.`);
        }
    }

    /**
     * @function _compareVersions
     * @memberof mcode.cache
     * @desc Compares the first three numeric components of two server versions.
     * @param {string} left the reported server version.
     * @param {string} right the minimum required server version.
     * @returns {number} -1, 0, or 1 for less than, equal, or greater than.
     * @api private
     */
    _compareVersions(left, right)
    {
        const leftParts = String(left).split(/[.-]/).slice(0, 3).map(part => Number.parseInt(part, 10) || 0);
        const rightParts = String(right).split(/[.-]/).slice(0, 3).map(part => Number.parseInt(part, 10) || 0);
        for (let index = 0; index < 3; index++)
        {
            if (leftParts[index] !== rightParts[index])
            {
                return leftParts[index] > rightParts[index] ? 1 : -1;
            }
        }
        return 0;
    }

    /**
     * @function _namespaceReady
     * @memberof mcode.cache
     * @desc Waits within a deadline for a namespace handle to become ready.
     * @param {string} name the registered namespace name.
     * @param {object} options the bounded readiness options.
     * @returns {Promise<object>} the immutable ready namespace handle.
     * @api private
     */
    async _namespaceReady(name, options = {})
    {
        this._validateOptionsObject(options, 'ready');
        const namespace = this._getNamespaceInfo(name);
        if (namespace.type === 'node')
        {
            return this._createNamespaceHandle(name);
        }

        const context = this.#redisContexts.get(name);
        const timeoutMs = options.timeoutMs ?? context.config.readyTimeoutMs;
        this._validatePositiveInteger(timeoutMs, 'timeoutMs');
        const expiresAt = Date.now() + timeoutMs;

        if (context.closePromise)
        {
            await this._withTimeout(context.closePromise,
                this._remainingDeadline(expiresAt, `Redis close for '${name}'`),
                `Redis close for '${name}'`);
        }

        if (context.status === cache.REDIS_STATUS.CONNECTED && context.client?.isReady)
        {
            return this._createNamespaceHandle(name);
        }

        if (context.connectPromise)
        {
            try
            {
                await this._withTimeout(context.connectPromise,
                    this._remainingDeadline(expiresAt, `Redis readiness for '${name}'`),
                    `Redis readiness for '${name}'`);
            }
            catch (error)
            {
                if (['CACHE_REDIS_VERSION', 'CACHE_REDIS_MODE', 'CACHE_REDIS_CAPABILITY']
                    .includes(error.code))
                {
                    throw error;
                }
                if (context.client?.isOpen)
                {
                    this._destroyRedisClient(context.client);
                }
                context.client = null;
                context.connectPromise = null;
                await this._withTimeout(this._connectRedisContext(context),
                    this._remainingDeadline(expiresAt, `Redis readiness for '${name}'`),
                    `Redis readiness for '${name}'`);
            }
        }
        else
        {
            if (context.client)
            {
                this._destroyRedisClient(context.client);
                context.client = null;
            }
            await this._withTimeout(this._connectRedisContext(context),
                this._remainingDeadline(expiresAt, `Redis readiness for '${name}'`),
                `Redis readiness for '${name}'`);
        }

        return this._createNamespaceHandle(name);
    }

    /**
     * @function _executeRedis
     * @memberof mcode.cache
     * @desc Executes one Redis task with readiness, deadline, and ambiguity handling.
     * @param {string} name the Redis namespace name.
     * @param {string} operation the operation name used in errors.
     * @param {function} task the function receiving the ready command client.
     * @param {boolean} mutation whether a post-dispatch timeout is outcome-unknown.
     * @param {number} timeoutMs the optional operation timeout override.
     * @returns {Promise<*>} the Redis operation result.
     * @api private
     */
    async _executeRedis(name, operation, task, mutation = false, timeoutMs)
    {
        const namespace = this._getNamespaceInfo(name);
        if (!namespace || namespace.type !== 'redis')
        {
            throw this._cacheError('CACHE_REDIS_REQUIRED', `Namespace '${name}' is not Redis-backed.`);
        }
        if (!namespace.enabled)
        {
            throw this._cacheError('CACHE_DISABLED', `Namespace '${name}' is disabled.`);
        }

        const context = this.#redisContexts.get(name);
        const timeout = timeoutMs ?? context.config.commandTimeoutMs;
        this._validatePositiveInteger(timeout, 'command timeout');
        const expiresAt = Date.now() + timeout;
        await this._namespaceReady(name, {timeoutMs: Math.min(timeout, context.config.readyTimeoutMs)});
        const remaining = expiresAt - Date.now();
        if (remaining <= 0)
        {
            throw this._cacheError('CACHE_TIMEOUT', `${operation} deadline expired before dispatch.`);
        }

        let timeoutId;
        const timeoutError = new Promise((_, reject) =>
        {
            timeoutId = setTimeout(() =>
            {
                reject(this._cacheError(
                    mutation ? 'CACHE_OUTCOME_UNKNOWN' : 'CACHE_TIMEOUT',
                    mutation ?
                        `${operation} timed out after dispatch; outcome is unknown and must be reconciled.` :
                        `${operation} timed out after ${timeout}ms.`
                ));
            }, remaining);
        });

        try
        {
            return await Promise.race([
                Promise.resolve().then(() => task(context.client)),
                timeoutError
            ]);
        }
        finally
        {
            clearTimeout(timeoutId);
        }
    }

    // #endregion

    // #region  S C O P E D   V A L U E   A N D   I N S P E C T I O N

    /**
     * @function _recordAccess
     * @memberof mcode.cache
     * @desc Records one consumer lookup against process and shared Redis counters.
     * @param {string} name the namespace name.
     * @param {string} key the logical key.
     * @param {boolean} found whether the lookup returned a value.
     * @returns {Promise<void>}
     * @api private
     */
    // {ISSUE#0149:Grok-4.6} -- process-local hits hid every other consumer
    async _recordAccess(name, key, found)
    {
        if (key === cache.ACCESS_STATS_KEY)
        {
            return;
        }
        await this._persistAccessCounts(name, found ? 1 : 0, found ? 0 : 1);
    }

    /**
     * @function _recordAccessMany
     * @memberof mcode.cache
     * @desc Records ordered consumer lookups against process and shared Redis counters.
     * @param {string} name the namespace name.
     * @param {Array<string>} keys the logical keys.
     * @param {Array} values the ordered decoded values.
     * @returns {Promise<void>}
     * @api private
     */
    async _recordAccessMany(name, keys, values)
    {
        let hits = 0;
        let misses = 0;
        keys.forEach((key, index) =>
        {
            if (key === cache.ACCESS_STATS_KEY)
            {
                return;
            }
            if (values[index] === undefined)
            {
                misses += 1;
            }
            else
            {
                hits += 1;
            }
        });
        await this._persistAccessCounts(name, hits, misses);
    }

    /**
     * @function _persistAccessCounts
     * @memberof mcode.cache
     * @desc Applies hit/miss deltas locally and, for Redis, to the shared access hash.
     * @param {string} name the namespace name.
     * @param {number} hits successful lookup count.
     * @param {number} misses missing-key lookup count.
     * @returns {Promise<void>}
     * @api private
     */
    async _persistAccessCounts(name, hits, misses)
    {
        if (!hits && !misses)
        {
            return;
        }
        const namespace = this._getNamespaceInfo(name);
        if (typeof namespace.hits === 'number')
        {
            namespace.hits += hits;
        }
        else
        {
            namespace.hits = hits;
        }
        if (typeof namespace.misses === 'number')
        {
            namespace.misses += misses;
        }
        else
        {
            namespace.misses = misses;
        }
        if (namespace.type !== 'redis')
        {
            return;
        }
        try
        {
            const physicalKey = this._physicalKey(name, cache.ACCESS_STATS_KEY);
            await this._executeRedis(name, 'HINCRBY', async (redisClient) =>
            {
                if (hits)
                {
                    await redisClient.hIncrBy(physicalKey, 'hits', hits);
                }
                if (misses)
                {
                    await redisClient.hIncrBy(physicalKey, 'misses', misses);
                }
            }, true);
        }
        catch (error)
        {
            _log.warn(`Could not persist access statistics for namespace '${name}'`, MODULE_NAME);
        }
    }

    /**
     * @function _loadAccessStatistics
     * @memberof mcode.cache
     * @desc Replaces process hit/miss counters with the shared Redis totals.
     * @param {object} namespace the namespace statistics object.
     * @returns {Promise<void>}
     * @api private
     */
    async _loadAccessStatistics(namespace)
    {
        const access = await this._executeRedis(namespace.name, 'HGETALL',
            redisClient => redisClient.hGetAll(this._physicalKey(namespace.name, cache.ACCESS_STATS_KEY)));
        namespace.hits = Number.parseInt(access?.hits, 10) || 0;
        namespace.misses = Number.parseInt(access?.misses, 10) || 0;
    }

    /**
     * @function _namespaceCacheGet
     * @memberof mcode.cache
     * @desc Gets and decodes one logical key while updating namespace statistics.
     * @param {string} name the namespace name.
     * @param {string} key the logical key.
     * @param {object} client the optional exclusive Redis client.
     * @returns {Promise<*>} the cached value, or undefined when missing.
     * @api private
     */
    async _namespaceCacheGet(name, key, client)
    {
        const physicalKey = this._physicalKey(name, key);
        const namespace = this._getNamespaceInfo(name);
        let value;
        if (namespace.type === 'node')
        {
            value = this.#cache.get(physicalKey);
        }
        else if (client)
        {
            value = this._decodeValue(await client.get(physicalKey));
        }
        else
        {
            value = await this._executeRedis(name, 'GET',
                redisClient => redisClient.get(physicalKey));
            value = this._decodeValue(value);
        }

        await this._recordAccess(name, key, value !== undefined);
        return value;
    }

    /**
     * @function _namespaceCacheGetMany
     * @memberof mcode.cache
     * @desc Gets and decodes multiple ordered logical keys.
     * @param {string} name the namespace name.
     * @param {Array<string>} keys the logical keys.
     * @param {object} client the optional exclusive Redis client.
     * @returns {Promise<Array>} the ordered cached values.
     * @api private
     */
    async _namespaceCacheGetMany(name, keys, client)
    {
        if (!Array.isArray(keys) || keys.length === 0)
        {
            throw this._cacheError('CACHE_INVALID_KEY', 'cacheGetMany requires at least one logical key.');
        }
        const physicalKeys = keys.map(key => this._physicalKey(name, key));
        const namespace = this._getNamespaceInfo(name);
        let values;
        if (namespace.type === 'node')
        {
            values = physicalKeys.map(key => this.#cache.get(key));
        }
        else
        {
            const rawValues = client ?
                await client.mGet(physicalKeys) :
                await this._executeRedis(name, 'MGET', redisClient => redisClient.mGet(physicalKeys));
            values = rawValues.map(value => this._decodeValue(value));
        }

        await this._recordAccessMany(name, keys, values);
        return values;
    }

    /**
     * @function _buildSetOptions
     * @memberof mcode.cache
     * @desc Validates package SET options and maps them to native Redis modifiers.
     * @param {object} options the package cacheSet options.
     * @returns {object} the node-redis SET options.
     * @api private
     */
    _buildSetOptions(options = {})
    {
        this._validateOptionsObject(options, 'cacheSet');

        const expirationCount = [
            options.ttlSeconds !== undefined,
            options.ttlMilliseconds !== undefined,
            options.keepTTL === true,
            options.noExpiry === true
        ].filter(Boolean).length;
        if (expirationCount > 1)
        {
            throw this._cacheError('CACHE_INVALID_OPTIONS', 'Select only one cacheSet expiration policy.');
        }
        const conditionCount = [
            options.ifMissing === true,
            options.ifExisting === true,
            options.ifEqual !== undefined
        ].filter(Boolean).length;
        if (conditionCount > 1)
        {
            throw this._cacheError('CACHE_INVALID_OPTIONS', 'Select only one cacheSet condition.');
        }

        const redisOptions = {};
        if (options.ttlSeconds !== undefined)
        {
            this._validatePositiveInteger(options.ttlSeconds, 'ttlSeconds');
            redisOptions.EX = options.ttlSeconds;
        }
        else if (options.ttlMilliseconds !== undefined)
        {
            this._validatePositiveInteger(options.ttlMilliseconds, 'ttlMilliseconds');
            redisOptions.PX = options.ttlMilliseconds;
        }
        else if (options.keepTTL)
        {
            redisOptions.KEEPTTL = true;
        }

        if (options.ifMissing)
        {
            redisOptions.NX = true;
        }
        else if (options.ifExisting)
        {
            redisOptions.XX = true;
        }
        else if (options.ifEqual !== undefined)
        {
            redisOptions.condition = 'IFEQ';
            redisOptions.matchValue = this._encodeValue(options.ifEqual);
        }

        return redisOptions;
    }

    /**
     * @function _namespaceCacheSet
     * @memberof mcode.cache
     * @desc Canonically sets a scoped value with optional native conditions and expiry.
     * @param {string} name the namespace name.
     * @param {string} key the logical key.
     * @param {*} value the supported typed value.
     * @param {object} options the package SET options.
     * @param {object} client the optional exclusive Redis client.
     * @param {number} timeoutMs the optional operation timeout override.
     * @returns {Promise<boolean>} true when the value was set.
     * @api private
     */
    async _namespaceCacheSet(name, key, value, options = {}, client, timeoutMs)
    {
        const physicalKey = this._physicalKey(name, key);
        const namespace = this._getNamespaceInfo(name);
        const encoded = this._encodeValue(value);
        const redisOptions = this._buildSetOptions(options);
        if (namespace.type === 'node')
        {
            if (options.ifMissing && this.#cache.has(physicalKey))
            {
                return false;
            }
            if (options.ifExisting && !this.#cache.has(physicalKey))
            {
                return false;
            }
            const current = this.#cache.get(physicalKey);
            if (options.ifEqual !== undefined && (current === undefined ||
                this._encodeValue(current) !== redisOptions.matchValue))
            {
                return false;
            }
            let ttl = options.ttlSeconds ??
                (options.ttlMilliseconds ? Math.ceil(options.ttlMilliseconds / 1000) : 0);
            if (options.keepTTL && current !== undefined)
            {
                const expiration = this.#cache.getTtl(physicalKey);
                ttl = expiration ? Math.max(1, Math.ceil((expiration - Date.now()) / 1000)) : 0;
            }
            this.#cache.set(physicalKey, this._decodeValue(encoded), ttl);
            return true;
        }

        const reply = client ?
            await client.set(physicalKey, encoded, redisOptions) :
            await this._executeRedis(name, 'SET',
                redisClient => redisClient.set(physicalKey, encoded, redisOptions), true, timeoutMs);
        return reply === 'OK';
    }

    /**
     * @function _namespaceCacheDrop
     * @memberof mcode.cache
     * @desc Deletes one or more scoped logical keys.
     * @param {string} name the namespace name.
     * @param {string|Array<string>} keyOrKeys the logical key or keys.
     * @param {object} client the optional exclusive Redis client.
     * @returns {Promise<number>} the number of deleted keys.
     * @api private
     */
    async _namespaceCacheDrop(name, keyOrKeys, client)
    {
        const keys = Array.isArray(keyOrKeys) ? keyOrKeys : [keyOrKeys];
        if (keys.length === 0)
        {
            return 0;
        }
        const physicalKeys = keys.map(key => this._physicalKey(name, key));
        const namespace = this._getNamespaceInfo(name);
        if (namespace.type === 'node')
        {
            return this.#cache.del(physicalKeys);
        }

        return client ?
            client.del(physicalKeys) :
            this._executeRedis(name, 'DEL', redisClient => redisClient.del(physicalKeys), true);
    }

    /**
     * @function _namespaceCacheDropIfEqual
     * @memberof mcode.cache
     * @desc Deletes one scoped key only when its encoded value matches.
     * @param {string} name the namespace name.
     * @param {string} key the logical key.
     * @param {*} expectedValue the expected typed value.
     * @param {object} client the optional exclusive Redis client.
     * @returns {Promise<boolean>} true when the key was deleted.
     * @api private
     */
    async _namespaceCacheDropIfEqual(name, key, expectedValue, client)
    {
        const physicalKey = this._physicalKey(name, key);
        const encoded = this._encodeValue(expectedValue);
        const namespace = this._getNamespaceInfo(name);
        if (namespace.type === 'node')
        {
            const current = this.#cache.get(physicalKey);
            if (current === undefined || this._encodeValue(current) !== encoded)
            {
                return false;
            }
            return this.#cache.del(physicalKey) === 1;
        }

        const options = {condition: 'IFEQ', matchValue: encoded};
        const reply = client ?
            await client.delEx(physicalKey, options) :
            await this._executeRedis(name, 'DELEX',
                redisClient => redisClient.delEx(physicalKey, options), true);
        return reply === 1;
    }

    /**
     * @function _namespaceCacheExists
     * @memberof mcode.cache
     * @desc Checks whether one scoped logical key exists.
     * @param {string} name the namespace name.
     * @param {string} key the logical key.
     * @param {object} client the optional exclusive Redis client.
     * @returns {Promise<boolean>} true when the key exists.
     * @api private
     */
    async _namespaceCacheExists(name, key, client)
    {
        const physicalKey = this._physicalKey(name, key);
        const namespace = this._getNamespaceInfo(name);
        if (namespace.type === 'node')
        {
            return this.#cache.has(physicalKey);
        }
        const reply = client ?
            await client.exists(physicalKey) :
            await this._executeRedis(name, 'EXISTS', redisClient => redisClient.exists(physicalKey));
        return reply === 1;
    }

    /**
     * @function _namespaceCacheTTL
     * @memberof mcode.cache
     * @desc Reads a scoped key TTL in seconds or milliseconds.
     * @param {string} name the namespace name.
     * @param {string} key the logical key.
     * @param {boolean} milliseconds whether to return PTTL milliseconds.
     * @param {object} client the optional exclusive Redis client.
     * @returns {Promise<number>} the Redis-compatible TTL result.
     * @api private
     */
    async _namespaceCacheTTL(name, key, milliseconds = false, client)
    {
        const physicalKey = this._physicalKey(name, key);
        const namespace = this._getNamespaceInfo(name);
        if (namespace.type === 'node')
        {
            if (!this.#cache.has(physicalKey))
            {
                return -2;
            }
            const expiration = this.#cache.getTtl(physicalKey);
            if (!expiration)
            {
                return -1;
            }
            const ttl = Math.max(0, expiration - Date.now());
            return milliseconds ? ttl : Math.ceil(ttl / 1000);
        }
        const command = milliseconds ? 'PTTL' : 'TTL';
        return client ?
            client[milliseconds ? 'pTTL' : 'ttl'](physicalKey) :
            this._executeRedis(name, command,
                redisClient => redisClient[milliseconds ? 'pTTL' : 'ttl'](physicalKey));
    }

    /**
     * @function _namespaceCacheExpire
     * @memberof mcode.cache
     * @desc Applies an explicit seconds or milliseconds expiry to a scoped key.
     * @param {string} name the namespace name.
     * @param {string} key the logical key.
     * @param {object} options the explicit expiry options.
     * @param {object} client the optional exclusive Redis client.
     * @returns {Promise<boolean>} true when expiry was applied.
     * @api private
     */
    async _namespaceCacheExpire(name, key, options = {}, client)
    {
        this._validateOptionsObject(options, 'cacheExpire');
        const physicalKey = this._physicalKey(name, key);
        const hasSeconds = options.seconds !== undefined;
        const hasMilliseconds = options.milliseconds !== undefined;
        if (hasSeconds === hasMilliseconds)
        {
            throw this._cacheError('CACHE_INVALID_OPTIONS',
                'cacheExpire requires exactly one of seconds or milliseconds.');
        }
        const amount = hasSeconds ? options.seconds : options.milliseconds;
        this._validatePositiveInteger(amount, hasSeconds ? 'seconds' : 'milliseconds');

        const namespace = this._getNamespaceInfo(name);
        if (namespace.type === 'node')
        {
            return this.#cache.ttl(physicalKey, hasSeconds ? amount : Math.ceil(amount / 1000));
        }
        const method = hasSeconds ? 'expire' : 'pExpire';
        const reply = client ?
            await client[method](physicalKey, amount) :
            await this._executeRedis(name, method.toUpperCase(),
                redisClient => redisClient[method](physicalKey, amount), true);
        return reply === 1;
    }

    /**
     * @function _namespacePing
     * @memberof mcode.cache
     * @desc Pings the Redis server for a namespace.
     * @param {string} name the Redis namespace name.
     * @returns {Promise<string>} the Redis PING reply.
     * @api private
     */
    _namespacePing(name)
    {
        return this._executeRedis(name, 'PING', client => client.ping());
    }

    /**
     * @function _namespaceInfo
     * @memberof mcode.cache
     * @desc Reads an allowlisted Redis INFO section.
     * @param {string} name the Redis namespace name.
     * @param {string} section the allowlisted INFO section.
     * @returns {Promise<string>} the Redis INFO response.
     * @api private
     */
    _namespaceInfo(name, section = 'server')
    {
        if (!cache.INFO_SECTIONS.has(section))
        {
            throw this._cacheError('CACHE_INVALID_OPTIONS', `Unsupported INFO section '${section}'.`);
        }
        return this._executeRedis(name, 'INFO', client => client.info(section));
    }

    /**
     * @function _namespaceTime
     * @memberof mcode.cache
     * @desc Reads Redis server time as numeric seconds and microseconds.
     * @param {string} name the Redis namespace name.
     * @returns {Promise<object>} the numeric Redis server time.
     * @api private
     */
    async _namespaceTime(name)
    {
        const reply = await this._executeRedis(name, 'TIME', client => client.time());
        return {
            seconds: Number.parseInt(reply[0], 10),
            microseconds: Number.parseInt(reply[1], 10)
        };
    }

    /**
     * @function _validateScanPattern
     * @memberof mcode.cache
     * @desc Validates a bounded logical SCAN pattern and rejects physical prefixes.
     * @param {string} name the namespace name.
     * @param {string} pattern the logical SCAN pattern.
     * @returns {string} the validated logical pattern.
     * @api private
     */
    _validateScanPattern(name, pattern)
    {
        if (typeof pattern !== 'string' || !pattern ||
            !/^[A-Za-z0-9*._:-]+$/.test(pattern) || pattern.includes('**'))
        {
            throw this._cacheError('CACHE_INVALID_PATTERN',
                'SCAN patterns support only safe logical key characters and single * wildcards.');
        }
        if (pattern === name || pattern.startsWith(`${name}:`))
        {
            throw this._cacheError('CACHE_ALREADY_PREFIXED', 'SCAN patterns must be logical, not namespaced.');
        }
        return pattern;
    }

    /**
     * @function _namespaceScan
     * @memberof mcode.cache
     * @desc Reads one bounded SCAN page and strips the namespace prefix.
     * @param {string} name the Redis namespace name.
     * @param {object} options the cursor, pattern, and count options.
     * @returns {Promise<object>} the next cursor and logical keys.
     * @api private
     */
    async _namespaceScan(name, options = {})
    {
        this._validateOptionsObject(options, 'scan');
        const pattern = this._validateScanPattern(name, options.pattern ?? '*');
        const count = options.count ?? 100;
        if (!Number.isSafeInteger(count) || count < 1 || count > 1000)
        {
            throw this._cacheError('CACHE_INVALID_OPTIONS', 'SCAN count must be between 1 and 1000.');
        }
        const cursor = options.cursor === undefined ? '0' : String(options.cursor);
        if (!/^\d+$/.test(cursor))
        {
            throw this._cacheError('CACHE_INVALID_OPTIONS', 'SCAN cursor must be a non-negative integer string.');
        }

        const prefix = `${name}:`;
        const namespace = this._getNamespaceInfo(name);
        // {AIN-2026-08-26:GPT-5.6 Sol} -- cache administration needs one scoped scan contract for Node and Redis
        if (namespace.type === 'node')
        {
            const offset = Number.parseInt(cursor, 10);
            const keys = await this._cacheKeys(`${prefix}${pattern}`);
            const page = keys
                .slice(offset, offset + count)
                .map(key => key.slice(prefix.length));
            const nextOffset = offset + page.length;
            return {
                cursor: nextOffset < keys.length ? String(nextOffset) : '0',
                keys: page
            };
        }

        const reply = await this._executeRedis(name, 'SCAN',
            client => client.scan(cursor, {MATCH: `${prefix}${pattern}`, COUNT: count}));
        return {
            cursor: String(reply.cursor),
            keys: reply.keys
                .filter(key => key.startsWith(prefix))
                .map(key => key.slice(prefix.length))
        };
    }

    /**
     * @function _legacyRedisScanKeys
     * @memberof mcode.cache
     * @desc Collects bounded physical keys for deprecated singleton operations.
     * @param {string} name the Redis namespace name.
     * @param {string} pattern the logical key pattern.
     * @param {number} [limit] the optional maximum number of keys to collect.
     * @returns {Promise<Array<string>>} the bounded physical Redis keys.
     * @api private
     */
    async _legacyRedisScanKeys(name, pattern, limit)
    {
        let cursor = '0';
        const keys = [];
        do
        {
            const page = await this._namespaceScan(name, {pattern, cursor, count: 1000});
            cursor = page.cursor;
            keys.push(...page.keys.map(key => `${name}:${key}`));
            if (limit !== undefined && keys.length > limit)
            {
                throw this._cacheError('CACHE_SCAN_LIMIT',
                    `Legacy Redis scan exceeded the bounded limit of ${limit} keys.`);
            }
        }
        while (cursor !== '0');
        return keys;
    }

    /**
     * @function _namespaceInspect
     * @memberof mcode.cache
     * @desc Inspects bounded scoped keys with type and optional string value.
     * @param {string} name the Redis namespace name.
     * @param {object} options the bounded inspection options.
     * @returns {Promise<object>} the next cursor and inspected entries.
     * @api private
     */
    async _namespaceInspect(name, options = {})
    {
        this._validateOptionsObject(options, 'inspect');
        const limit = options.limit ?? 100;
        if (!Number.isSafeInteger(limit) || limit < 1 || limit > 1000)
        {
            throw this._cacheError('CACHE_INVALID_OPTIONS', 'Inspection limit must be between 1 and 1000.');
        }

        // {AIN-2026-08-26:GPT-5.6 Sol} -- inspection must preserve cursors and leave performance counters untouched
        const namespace = this._getNamespaceInfo(name);
        const page = await this._namespaceScan(name, {
            pattern: options.pattern ?? '*',
            cursor: options.cursor === undefined ? '0' : String(options.cursor),
            count: Math.min(options.count ?? limit, limit)
        });
        const entries = [];
        for (const key of page.keys)
        {
            const physicalKey = this._physicalKey(name, key);
            if (namespace.type === 'node')
            {
                const value = this.#cache.get(physicalKey);
                const {type} = this._getTypeAndPreview(value);
                const entry = {key, type};
                if (options.includeValue === true)
                {
                    entry.value = value;
                }
                entries.push(entry);
            }
            else
            {
                const type = await this._executeRedis(name, 'TYPE',
                    client => client.type(physicalKey));
                const entry = {key, type};
                if (options.includeValue === true && type === 'string')
                {
                    const value = await this._executeRedis(name, 'GET',
                        client => client.get(physicalKey));
                    entry.value = this._decodeValue(value);
                }
                entries.push(entry);
            }
        }

        return {
            cursor: page.cursor,
            entries
        };
    }

    // #endregion

    // #region  G E O   A N D   S O R T E D   S E T S

    /**
     * @function _validateMember
     * @memberof mcode.cache
     * @desc Validates a geo or sorted-set member string.
     * @param {string} member the member to validate.
     * @returns {string} the validated member.
     * @api private
     */
    _validateMember(member)
    {
        if (typeof member !== 'string' || !member ||
            Buffer.byteLength(member, 'utf8') > cache.MAX_LOGICAL_KEY_BYTES ||
            /[\u0000-\u001f\u007f]/.test(member))
        {
            throw this._cacheError('CACHE_INVALID_MEMBER',
                'Members must be non-empty strings without control characters and no larger than 512 bytes.');
        }
        return member;
    }

    /**
     * @function _normalizeGeoMembers
     * @memberof mcode.cache
     * @desc Validates and normalizes one or more geo members.
     * @param {object|Array<object>} members the geo members to normalize.
     * @returns {Array<object>} the normalized geo members.
     * @api private
     */
    _normalizeGeoMembers(members)
    {
        const normalized = Array.isArray(members) ? members : [members];
        if (normalized.length === 0)
        {
            throw this._cacheError('CACHE_INVALID_OPTIONS', 'geoAdd requires at least one member.');
        }
        return normalized.map(item =>
        {
            if (!item || typeof item !== 'object' ||
                typeof item.longitude !== 'number' || !Number.isFinite(item.longitude) ||
                typeof item.latitude !== 'number' || !Number.isFinite(item.latitude) ||
                item.longitude < -180 || item.longitude > 180 ||
                item.latitude < -85.05112878 || item.latitude > 85.05112878)
            {
                throw this._cacheError('CACHE_INVALID_COORDINATE',
                    'Geo members require finite longitude [-180,180] and latitude [-85.05112878,85.05112878].');
            }
            return {
                longitude: item.longitude,
                latitude: item.latitude,
                member: this._validateMember(item.member)
            };
        });
    }

    /**
     * @function _namespaceGeoAdd
     * @memberof mcode.cache
     * @desc Adds one or more members to a scoped geo index.
     * @param {string} name the Redis namespace name.
     * @param {string} key the logical geo key.
     * @param {object|Array<object>} members the geo members.
     * @param {object} client the optional exclusive Redis client.
     * @returns {Promise<number>} the number of added members.
     * @api private
     */
    async _namespaceGeoAdd(name, key, members, client)
    {
        const physicalKey = this._physicalKey(name, key);
        const normalized = this._normalizeGeoMembers(members);
        return client ?
            client.geoAdd(physicalKey, normalized) :
            this._executeRedis(name, 'GEOADD',
                redisClient => redisClient.geoAdd(physicalKey, normalized), true);
    }

    /**
     * @function _namespaceGeoRemove
     * @memberof mcode.cache
     * @desc Removes one or more members from a scoped geo index.
     * @param {string} name the Redis namespace name.
     * @param {string} key the logical geo key.
     * @param {string|Array<string>} members the members to remove.
     * @param {object} client the optional exclusive Redis client.
     * @returns {Promise<number>} the number of removed members.
     * @api private
     */
    async _namespaceGeoRemove(name, key, members, client)
    {
        const physicalKey = this._physicalKey(name, key);
        const normalized = (Array.isArray(members) ? members : [members])
            .map(member => this._validateMember(member));
        if (normalized.length === 0)
        {
            return 0;
        }
        return client ?
            client.zRem(physicalKey, normalized) :
            this._executeRedis(name, 'ZREM',
                redisClient => redisClient.zRem(physicalKey, normalized), true);
    }

    /**
     * @function _namespaceGeoSearch
     * @memberof mcode.cache
     * @desc Searches a scoped geo index by member, radius, or box.
     * @param {string} name the Redis namespace name.
     * @param {string} key the logical geo key.
     * @param {object} options the bounded geo search options.
     * @returns {Promise<Array<string>>} the matching members.
     * @api private
     */
    async _namespaceGeoSearch(name, key, options = {})
    {
        this._validateOptionsObject(options, 'geoSearch');
        const physicalKey = this._physicalKey(name, key);
        let from;
        if (options.from?.member)
        {
            from = this._validateMember(options.from.member);
        }
        else if (options.from && Number.isFinite(options.from.longitude) &&
            Number.isFinite(options.from.latitude))
        {
            this._normalizeGeoMembers([{
                longitude: options.from.longitude,
                latitude: options.from.latitude,
                member: 'origin'
            }]);
            from = {longitude: options.from.longitude, latitude: options.from.latitude};
        }
        else
        {
            throw this._cacheError('CACHE_INVALID_OPTIONS',
                'geoSearch requires from.member or finite from.longitude/from.latitude.');
        }

        if (!cache.GEO_UNITS.has(options.unit))
        {
            throw this._cacheError('CACHE_INVALID_OPTIONS', 'geoSearch unit must be m, km, mi, or ft.');
        }

        let by;
        if (Number.isFinite(options.radius) && options.radius > 0)
        {
            by = {radius: options.radius, unit: options.unit};
        }
        else if (Number.isFinite(options.width) && options.width > 0 &&
            Number.isFinite(options.height) && options.height > 0)
        {
            by = {width: options.width, height: options.height, unit: options.unit};
        }
        else
        {
            throw this._cacheError('CACHE_INVALID_OPTIONS',
                'geoSearch requires a positive radius or positive width and height.');
        }

        const redisOptions = {};
        if (options.sort !== undefined)
        {
            if (options.sort !== 'ASC' && options.sort !== 'DESC')
            {
                throw this._cacheError('CACHE_INVALID_OPTIONS', 'geoSearch sort must be ASC or DESC.');
            }
            redisOptions.SORT = options.sort;
        }
        if (options.count !== undefined)
        {
            this._validatePositiveInteger(options.count, 'geoSearch count');
            redisOptions.COUNT = options.any ? {value: options.count, ANY: true} : options.count;
        }

        return this._executeRedis(name, 'GEOSEARCH',
            client => client.geoSearch(physicalKey, from, by, redisOptions));
    }

    /**
     * @function _normalizeSortedSetMembers
     * @memberof mcode.cache
     * @desc Validates and normalizes one or more sorted-set members.
     * @param {object|Array<object>} members the scored members to normalize.
     * @returns {Array<object>} the normalized node-redis members.
     * @api private
     */
    _normalizeSortedSetMembers(members)
    {
        const normalized = Array.isArray(members) ? members : [members];
        if (normalized.length === 0)
        {
            throw this._cacheError('CACHE_INVALID_OPTIONS', 'sortedSetAdd requires at least one member.');
        }
        return normalized.map(item =>
        {
            if (!item || !Number.isFinite(item.score))
            {
                throw this._cacheError('CACHE_INVALID_SCORE', 'Sorted-set scores must be finite numbers.');
            }
            return {score: item.score, value: this._validateMember(item.member ?? item.value)};
        });
    }

    /**
     * @function _buildSortedSetOptions
     * @memberof mcode.cache
     * @desc Maps package sorted-set conditions to native Redis modifiers.
     * @param {object} options the sortedSetAdd options.
     * @returns {object} the node-redis ZADD options.
     * @api private
     */
    _buildSortedSetOptions(options = {})
    {
        this._validateOptionsObject(options, 'sortedSetAdd');
        const conditionCount = [options.ifMissing, options.ifExisting].filter(Boolean).length;
        if (conditionCount > 1)
        {
            throw this._cacheError('CACHE_INVALID_OPTIONS',
                'sortedSetAdd accepts only one of ifMissing or ifExisting.');
        }
        const reply = {};
        if (options.ifMissing)
        {
            reply.NX = true;
        }
        if (options.ifExisting)
        {
            reply.XX = true;
        }
        if (options.changed)
        {
            reply.CH = true;
        }
        return reply;
    }

    /**
     * @function _namespaceSortedSetAdd
     * @memberof mcode.cache
     * @desc Adds scored members to a scoped sorted set.
     * @param {string} name the Redis namespace name.
     * @param {string} key the logical sorted-set key.
     * @param {object|Array<object>} members the scored members.
     * @param {object} options the package ZADD options.
     * @param {object} client the optional exclusive Redis client.
     * @returns {Promise<number>} the Redis ZADD result.
     * @api private
     */
    async _namespaceSortedSetAdd(name, key, members, options = {}, client)
    {
        const physicalKey = this._physicalKey(name, key);
        const normalized = this._normalizeSortedSetMembers(members);
        const redisOptions = this._buildSortedSetOptions(options);
        return client ?
            client.zAdd(physicalKey, normalized, redisOptions) :
            this._executeRedis(name, 'ZADD',
                redisClient => redisClient.zAdd(physicalKey, normalized, redisOptions), true);
    }

    /**
     * @function _namespaceSortedSetRemove
     * @memberof mcode.cache
     * @desc Removes members from a scoped sorted set.
     * @param {string} name the Redis namespace name.
     * @param {string} key the logical sorted-set key.
     * @param {string|Array<string>} members the members to remove.
     * @param {object} client the optional exclusive Redis client.
     * @returns {Promise<number>} the number of removed members.
     * @api private
     */
    async _namespaceSortedSetRemove(name, key, members, client)
    {
        const physicalKey = this._physicalKey(name, key);
        const normalized = (Array.isArray(members) ? members : [members])
            .map(member => this._validateMember(member));
        return client ?
            client.zRem(physicalKey, normalized) :
            this._executeRedis(name, 'ZREM',
                redisClient => redisClient.zRem(physicalKey, normalized), true);
    }

    /**
     * @function _namespaceSortedSetRemoveByScore
     * @memberof mcode.cache
     * @desc Removes members inside a score range from a scoped sorted set.
     * @param {string} name the Redis namespace name.
     * @param {string} key the logical sorted-set key.
     * @param {object} options the inclusive minimum and maximum score bounds.
     * @param {object} client the optional exclusive Redis client.
     * @returns {Promise<number>} the number of removed members.
     * @api private
     */
    async _namespaceSortedSetRemoveByScore(name, key, options = {}, client)
    {
        this._validateOptionsObject(options, 'sortedSetRemoveByScore');
        const physicalKey = this._physicalKey(name, key);
        const min = options.min ?? '-inf';
        const max = options.max ?? '+inf';
        return client ?
            client.zRemRangeByScore(physicalKey, min, max) :
            this._executeRedis(name, 'ZREMRANGEBYSCORE',
                redisClient => redisClient.zRemRangeByScore(physicalKey, min, max), true);
    }

    /**
     * @function _namespaceSortedSetCount
     * @memberof mcode.cache
     * @desc Counts members inside a score range in a scoped sorted set.
     * @param {string} name the Redis namespace name.
     * @param {string} key the logical sorted-set key.
     * @param {object} options the inclusive minimum and maximum score bounds.
     * @param {object} client the optional exclusive Redis client.
     * @returns {Promise<number>} the number of matching members.
     * @api private
     */
    async _namespaceSortedSetCount(name, key, options = {}, client)
    {
        this._validateOptionsObject(options, 'sortedSetCount');
        const physicalKey = this._physicalKey(name, key);
        const min = options.min ?? '-inf';
        const max = options.max ?? '+inf';
        return client ?
            client.zCount(physicalKey, min, max) :
            this._executeRedis(name, 'ZCOUNT',
                redisClient => redisClient.zCount(physicalKey, min, max));
    }

    /**
     * @function _namespaceSortedSetRange
     * @memberof mcode.cache
     * @desc Reads an index range from a scoped sorted set.
     * @param {string} name the Redis namespace name.
     * @param {string} key the logical sorted-set key.
     * @param {object} options the range, reverse, and score-return options.
     * @param {object} client the optional exclusive Redis client.
     * @returns {Promise<Array>} the members or member-score objects.
     * @api private
     */
    async _namespaceSortedSetRange(name, key, options = {}, client)
    {
        this._validateOptionsObject(options, 'sortedSetRange');
        const physicalKey = this._physicalKey(name, key);
        const start = options.start ?? 0;
        const stop = options.stop ?? -1;
        if (!Number.isSafeInteger(start) || !Number.isSafeInteger(stop))
        {
            throw this._cacheError('CACHE_INVALID_OPTIONS', 'Sorted-set range indexes must be integers.');
        }
        const redisOptions = options.reverse ? {REV: true} : {};
        const method = options.withScores ? 'zRangeWithScores' : 'zRange';
        const results = client ?
            await client[method](physicalKey, start, stop, redisOptions) :
            await this._executeRedis(name, 'ZRANGE',
                redisClient => redisClient[method](physicalKey, start, stop, redisOptions));
        return options.withScores ?
            results.map(item => ({member: item.value, score: item.score})) :
            results;
    }

    /**
     * @function _namespaceSortedSetRangeByScore
     * @memberof mcode.cache
     * @desc Reads a bounded score range from a scoped sorted set.
     * @param {string} name the Redis namespace name.
     * @param {string} key the logical sorted-set key.
     * @param {object} options the score bounds, limit, and score-return options.
     * @param {object} client the optional exclusive Redis client.
     * @returns {Promise<Array>} the members or member-score objects.
     * @api private
     */
    async _namespaceSortedSetRangeByScore(name, key, options = {}, client)
    {
        this._validateOptionsObject(options, 'sortedSetRangeByScore');
        const physicalKey = this._physicalKey(name, key);
        const min = options.min ?? '-inf';
        const max = options.max ?? '+inf';
        const redisOptions = {};
        if (options.offset !== undefined || options.count !== undefined)
        {
            if (!Number.isSafeInteger(options.offset) || options.offset < 0 ||
                !Number.isSafeInteger(options.count) || options.count <= 0)
            {
                throw this._cacheError('CACHE_INVALID_OPTIONS',
                    'Score range offset must be non-negative and count must be positive.');
            }
            redisOptions.LIMIT = {offset: options.offset, count: options.count};
        }
        const method = options.withScores ? 'zRangeByScoreWithScores' : 'zRangeByScore';
        const results = client ?
            await client[method](physicalKey, min, max, redisOptions) :
            await this._executeRedis(name, 'ZRANGEBYSCORE',
                redisClient => redisClient[method](physicalKey, min, max, redisOptions));
        return options.withScores ?
            results.map(item => ({member: item.value, score: item.score})) :
            results;
    }

    /**
     * @function _namespaceSortedSetRank
     * @memberof mcode.cache
     * @desc Reads the forward or reverse rank of a scoped sorted-set member.
     * @param {string} name the Redis namespace name.
     * @param {string} key the logical sorted-set key.
     * @param {string} member the member to rank.
     * @param {boolean} reverse whether to use reverse rank.
     * @returns {Promise<number|null>} the member rank, or null when missing.
     * @api private
     */
    async _namespaceSortedSetRank(name, key, member, reverse = false)
    {
        const physicalKey = this._physicalKey(name, key);
        const method = reverse ? 'zRevRank' : 'zRank';
        return this._executeRedis(name, reverse ? 'ZREVRANK' : 'ZRANK',
            client => client[method](physicalKey, this._validateMember(member)));
    }

    /**
     * @function _namespaceSortedSetScore
     * @memberof mcode.cache
     * @desc Reads the score of a scoped sorted-set member.
     * @param {string} name the Redis namespace name.
     * @param {string} key the logical sorted-set key.
     * @param {string} member the member to read.
     * @returns {Promise<number|null>} the member score, or null when missing.
     * @api private
     */
    async _namespaceSortedSetScore(name, key, member)
    {
        const physicalKey = this._physicalKey(name, key);
        return this._executeRedis(name, 'ZSCORE',
            client => client.zScore(physicalKey, this._validateMember(member)));
    }

    // #endregion

    // #region  T R A N S A C T I O N S   A N D   G E N E R A T I O N

    /**
     * @function _createMultiBuilder
     * @memberof mcode.cache
     * @desc Creates a typed transaction builder without exposing raw Redis commands.
     * @param {string} name the Redis namespace name.
     * @param {object} client the optional exclusive Redis client.
     * @param {boolean} deferred whether WATCH owns transaction execution.
     * @returns {object} the frozen typed transaction builder.
     * @api private
     */
    _createMultiBuilder(name, client = null, deferred = false)
    {
        const namespace = this._getNamespaceInfo(name);
        if (!namespace || namespace.type !== 'redis')
        {
            throw this._cacheError('CACHE_REDIS_REQUIRED', 'Transactions require a Redis namespace.');
        }

        const operations = [];
        let executed = false;
        const queue = (method, args) =>
        {
            if (executed)
            {
                throw this._cacheError('CACHE_TRANSACTION_CLOSED', 'This transaction builder was already executed.');
            }
            operations.push({method, args});
            return builder;
        };
        const builder = {
            cacheGet: key => queue('cacheGet', [key]),
            cacheSet: (key, value, options) => queue('cacheSet', [key, value, options]),
            cacheDrop: keyOrKeys => queue('cacheDrop', [keyOrKeys]),
            cacheDropIfEqual: (key, expectedValue) => queue('cacheDropIfEqual', [key, expectedValue]),
            cacheExists: key => queue('cacheExists', [key]),
            cacheExpire: (key, options) => queue('cacheExpire', [key, options]),
            geoAdd: (key, members) => queue('geoAdd', [key, members]),
            geoRemove: (key, members) => queue('geoRemove', [key, members]),
            sortedSetAdd: (key, members, options) => queue('sortedSetAdd', [key, members, options]),
            sortedSetRemove: (key, members) => queue('sortedSetRemove', [key, members]),
            // {AIN-2026-08-26:GPT-5.6 Sol} -- guarded expiry must commit from the watched index state
            sortedSetRemoveByScore: (key, options) => queue('sortedSetRemoveByScore', [key, options]),
            publish: (channel, value) => queue('publish', [channel, value]),
            exec: async () =>
            {
                if (deferred)
                {
                    throw this._cacheError('CACHE_TRANSACTION_DEFERRED',
                        'WATCH transaction planners must return the builder; they cannot execute it directly.');
                }
                executed = true;
                return this._executeMultiOperations(name, operations, client);
            }
        };
        Object.freeze(builder);
        this.#multiOperations.set(builder, operations);
        return builder;
    }

    /**
     * @function _appendMultiOperation
     * @memberof mcode.cache
     * @desc Validates and appends one typed operation to a node-redis MULTI.
     * @param {string} name the Redis namespace name.
     * @param {object} multi the node-redis MULTI builder.
     * @param {object} operation the queued typed operation.
     * @returns {function} the reply transformation function.
     * @api private
     */
    _appendMultiOperation(name, multi, operation)
    {
        const args = operation.args;
        switch (operation.method)
        {
            case 'cacheGet':
                multi.get(this._physicalKey(name, args[0]));
                return value => this._decodeValue(value);
            case 'cacheSet':
                multi.set(this._physicalKey(name, args[0]), this._encodeValue(args[1]),
                    this._buildSetOptions(args[2]));
                return value => value === 'OK';
            case 'cacheDrop':
            {
                const keys = (Array.isArray(args[0]) ? args[0] : [args[0]])
                    .map(key => this._physicalKey(name, key));
                multi.del(keys);
                return value => value;
            }
            case 'cacheDropIfEqual':
                multi.delEx(this._physicalKey(name, args[0]), {
                    condition: 'IFEQ',
                    matchValue: this._encodeValue(args[1])
                });
                return value => value === 1;
            case 'cacheExists':
                multi.exists(this._physicalKey(name, args[0]));
                return value => value === 1;
            case 'cacheExpire':
            {
                const options = args[1] || {};
                const hasSeconds = options.seconds !== undefined;
                const hasMilliseconds = options.milliseconds !== undefined;
                if (hasSeconds === hasMilliseconds)
                {
                    throw this._cacheError('CACHE_INVALID_OPTIONS',
                        'cacheExpire requires exactly one of seconds or milliseconds.');
                }
                const amount = hasSeconds ? options.seconds : options.milliseconds;
                this._validatePositiveInteger(amount, hasSeconds ? 'seconds' : 'milliseconds');
                multi[hasSeconds ? 'expire' : 'pExpire'](this._physicalKey(name, args[0]), amount);
                return value => value === 1;
            }
            case 'geoAdd':
                multi.geoAdd(this._physicalKey(name, args[0]), this._normalizeGeoMembers(args[1]));
                return value => value;
            case 'geoRemove':
                multi.zRem(this._physicalKey(name, args[0]),
                    (Array.isArray(args[1]) ? args[1] : [args[1]]).map(member => this._validateMember(member)));
                return value => value;
            case 'sortedSetAdd':
                multi.zAdd(this._physicalKey(name, args[0]), this._normalizeSortedSetMembers(args[1]),
                    this._buildSortedSetOptions(args[2]));
                return value => value;
            case 'sortedSetRemove':
                multi.zRem(this._physicalKey(name, args[0]),
                    (Array.isArray(args[1]) ? args[1] : [args[1]]).map(member => this._validateMember(member)));
                return value => value;
            case 'sortedSetRemoveByScore':
            {
                const options = args[1] || {};
                this._validateOptionsObject(options, 'sortedSetRemoveByScore');
                multi.zRemRangeByScore(this._physicalKey(name, args[0]),
                    options.min ?? '-inf', options.max ?? '+inf');
                return value => value;
            }
            case 'publish':
                multi.publish(this._physicalChannel(name, args[0]), this._encodeValue(args[1]));
                return value => value;
            default:
                throw this._cacheError('CACHE_TRANSACTION_COMMAND',
                    `Unsupported transaction operation '${operation.method}'.`);
        }
    }

    /**
     * @function _executeMultiOperations
     * @memberof mcode.cache
     * @desc Executes typed MULTI operations and normalizes every command reply.
     * @param {string} name the Redis namespace name.
     * @param {Array<object>} operations the queued typed operations.
     * @param {object} client the optional exclusive Redis client.
     * @returns {Promise<Array<object>>} the normalized result/error envelopes.
     * @api private
     */
    async _executeMultiOperations(name, operations, client)
    {
        if (operations.length === 0)
        {
            return [];
        }

        const execute = async redisClient =>
        {
            const multi = redisClient.multi();
            const transforms = operations.map(operation =>
                this._appendMultiOperation(name, multi, operation));
            let replies;
            try
            {
                replies = await multi.exec();
            }
            catch (error)
            {
                if (!Array.isArray(error.replies))
                {
                    throw error;
                }
                replies = error.replies;
            }

            return replies.map((reply, index) =>
            {
                if (reply instanceof Error)
                {
                    return {
                        result: undefined,
                        error: {code: reply.code || 'CACHE_TRANSACTION_COMMAND', message: reply.message}
                    };
                }
                return {result: transforms[index](reply), error: null};
            });
        };

        return client ?
            execute(client) :
            this._executeRedis(name, 'MULTI/EXEC', execute, true);
    }

    /**
     * @function _assertTransactionReplies
     * @memberof mcode.cache
     * @desc Throws the first normalized transaction command error.
     * @param {Array<object>} replies the normalized transaction replies.
     * @param {string} operation the transaction operation name.
     * @returns {Array<object>} the successful replies.
     * @api private
     */
    _assertTransactionReplies(replies, operation)
    {
        const failure = replies.find(reply => reply.error);
        if (failure)
        {
            throw this._cacheError(
                failure.error.code || 'CACHE_TRANSACTION_COMMAND',
                `${operation} failed: ${failure.error.message}`
            );
        }
        return replies;
    }

    /**
     * @function _watchTransaction
     * @memberof mcode.cache
     * @desc Executes a bounded optimistic transaction on an exclusive connection.
     * @param {string} name the Redis namespace name.
     * @param {object} options the watched keys, retry, and deadline options.
     * @param {function} planner the side-effect-free transaction planner.
     * @returns {Promise<Array<object>>} the normalized EXEC replies.
     * @api private
     */
    async _watchTransaction(name, options, planner)
    {
        if (!options || typeof options !== 'object' || !Array.isArray(options.keys) ||
            options.keys.length === 0)
        {
            throw this._cacheError('CACHE_INVALID_OPTIONS',
                'watchTransaction requires a non-empty logical keys array.');
        }
        this._validatePositiveInteger(options.deadlineMs, 'deadlineMs');
        if (!Number.isSafeInteger(options.maxRetries) || options.maxRetries < 0)
        {
            throw this._cacheError('CACHE_INVALID_OPTIONS', 'maxRetries must be a non-negative integer.');
        }
        if (typeof planner !== 'function')
        {
            throw this._cacheError('CACHE_INVALID_OPTIONS', 'watchTransaction planner must be a function.');
        }

        const context = this.#redisContexts.get(name);
        const expiresAt = Date.now() + options.deadlineMs;
        await this._namespaceReady(name, {
            timeoutMs: Math.min(this._remainingDeadline(expiresAt, 'WATCH transaction'),
                context.config.readyTimeoutMs)
        });
        const transactionClient = context.client.duplicate();
        transactionClient.on('error', () => undefined);
        context.transactionClients.add(transactionClient);

        try
        {
            await this._withTimeout(transactionClient.connect(),
                this._remainingDeadline(expiresAt, 'WATCH connection'),
                `WATCH connection for '${name}'`);
            await this._withTimeout(this._verifyRedisCapabilities(transactionClient, context.config),
                this._remainingDeadline(expiresAt, 'WATCH capability check'),
                `WATCH capability check for '${name}'`);
            const physicalKeys = options.keys.map(key => this._physicalKey(name, key));

            for (let attempt = 0; attempt <= options.maxRetries; attempt++)
            {
                if (Date.now() >= expiresAt)
                {
                    throw this._cacheError('CACHE_TIMEOUT', 'WATCH transaction deadline expired.');
                }

                try
                {
                    await this._withTimeout(transactionClient.watch(physicalKeys),
                        this._remainingDeadline(expiresAt, 'WATCH'), 'WATCH');
                    const builder = this._createMultiBuilder(name, transactionClient, true);
                    const session = Object.freeze({
                        cacheGet: key => this._namespaceCacheGet(name, key, transactionClient),
                        cacheGetMany: keys => this._namespaceCacheGetMany(name, keys, transactionClient),
                        cacheExists: key => this._namespaceCacheExists(name, key, transactionClient),
                        cacheTTL: key => this._namespaceCacheTTL(name, key, false, transactionClient),
                        cachePTTL: key => this._namespaceCacheTTL(name, key, true, transactionClient),
                        // {AIN-2026-08-26:GPT-5.6 Sol} -- WATCH decisions require same-connection index reads
                        sortedSetRange: (key, range) =>
                            this._namespaceSortedSetRange(name, key, range, transactionClient),
                        sortedSetRangeByScore: (key, range) =>
                            this._namespaceSortedSetRangeByScore(name, key, range, transactionClient),
                        sortedSetCount: (key, range) =>
                            this._namespaceSortedSetCount(name, key, range, transactionClient),
                        multi: () => builder
                    });
                    const planned = await this._withTimeout(Promise.resolve(planner(session, attempt)),
                        this._remainingDeadline(expiresAt, 'WATCH planner'), 'WATCH planner');
                    const operations = this.#multiOperations.get(planned);
                    if (!operations)
                    {
                        await transactionClient.unwatch();
                        throw this._cacheError('CACHE_TRANSACTION_PLAN',
                            'WATCH planner must return the builder created by session.multi().');
                    }
                    if (operations.length === 0)
                    {
                        await transactionClient.unwatch();
                        return [];
                    }
                    return await this._withTimeout(
                        this._executeMultiOperations(name, operations, transactionClient),
                        this._remainingDeadline(expiresAt, 'WATCH MULTI/EXEC'), 'WATCH MULTI/EXEC');
                }
                catch (error)
                {
                    const isWatchError = error.name === 'WatchError' ||
                        error.constructor?.name === 'WatchError' ||
                        /watched keys? (?:has|have) been changed/i.test(error.message);
                    if (!isWatchError)
                    {
                        throw error;
                    }
                    if (attempt === options.maxRetries)
                    {
                        throw this._cacheError('CACHE_WATCH_CONTENTION',
                            `WATCH transaction exceeded ${options.maxRetries} retries.`, error);
                    }
                }
            }
        }
        finally
        {
            context.transactionClients.delete(transactionClient);
            await this._closeRedisClient(transactionClient, context.config.commandTimeoutMs);
        }
    }

    /**
     * @function _validateGenerationOptions
     * @memberof mcode.cache
     * @desc Validates generation marker identity options shared by ensure and reset.
     * @param {object} options the generation options.
     * @returns {object} the validated generation options.
     * @api private
     */
    _validateGenerationOptions(options)
    {
        if (!options || typeof options !== 'object')
        {
            throw this._cacheError('CACHE_INVALID_OPTIONS', 'Generation options must be an object.');
        }
        this._validateLogicalName(options.markerKey);
        const validGeneration = (typeof options.generation === 'string' && options.generation.length > 0) ||
            (typeof options.generation === 'number' && Number.isFinite(options.generation));
        if (!validGeneration)
        {
            throw this._cacheError('CACHE_INVALID_OPTIONS',
                'Generation must be a non-empty string or finite number.');
        }
        return options;
    }

    /**
     * @function _ensureGeneration
     * @memberof mcode.cache
     * @desc Checks whether a namespace has the requested ready generation marker.
     * @param {string} name the Redis namespace name.
     * @param {object} options the generation marker options.
     * @returns {Promise<object>} the current flag and stored marker.
     * @api private
     */
    async _ensureGeneration(name, options)
    {
        this._validateGenerationOptions(options);
        const marker = await this._namespaceCacheGet(name, options.markerKey);
        return {
            current: marker?.state === 'ready' && marker?.generation === options.generation,
            marker
        };
    }

    /**
     * @function _resetGeneration
     * @memberof mcode.cache
     * @desc Performs a guarded, bounded, atomic, and verified namespace reset.
     * @param {string} name the Redis namespace name.
     * @param {object} options the explicit guard, generation, limit, and deadline options.
     * @returns {Promise<object>} the reset status, generation, and deleted-key count.
     * @api private
     */
    async _resetGeneration(name, options)
    {
        this._validateGenerationOptions(options);
        this._validateLogicalName(options.guardKey);
        if (options.guardKey === options.markerKey)
        {
            throw this._cacheError('CACHE_INVALID_OPTIONS', 'Generation guard and marker keys must differ.');
        }
        if (typeof options.guardToken !== 'string' || !options.guardToken)
        {
            throw this._cacheError('CACHE_INVALID_OPTIONS', 'Generation guardToken must be a non-empty string.');
        }
        this._validatePositiveInteger(options.guardTtlMilliseconds, 'guardTtlMilliseconds');
        this._validatePositiveInteger(options.deadlineMs, 'deadlineMs');
        this._validatePositiveInteger(options.scanCount, 'scanCount');
        this._validatePositiveInteger(options.maxKeys, 'maxKeys');
        if (options.guardTtlMilliseconds < options.deadlineMs)
        {
            throw this._cacheError('CACHE_INVALID_OPTIONS',
                'guardTtlMilliseconds must cover the complete generation reset deadline.');
        }
        if (!Number.isSafeInteger(options.maxRetries) || options.maxRetries < 0)
        {
            throw this._cacheError('CACHE_INVALID_OPTIONS', 'maxRetries must be a non-negative integer.');
        }
        if (typeof options.acquireGuard !== 'boolean' || typeof options.releaseGuard !== 'boolean')
        {
            throw this._cacheError('CACHE_INVALID_OPTIONS',
                'acquireGuard and releaseGuard must be explicit booleans.');
        }
        // {AIN-2026-08-26:GPT-5.6 Sol} -- operator resets must clear a current generation on demand
        if (options.force !== undefined && typeof options.force !== 'boolean')
        {
            throw this._cacheError('CACHE_INVALID_OPTIONS', 'Generation force must be a boolean.');
        }

        const expiresAt = Date.now() + options.deadlineMs;
        if (options.acquireGuard)
        {
            const guardAcquired = await this._namespaceCacheSet(name, options.guardKey, options.guardToken, {
                ifMissing: true,
                ttlMilliseconds: options.guardTtlMilliseconds
            }, undefined, this._remainingDeadline(expiresAt, 'Generation guard acquisition'));
            if (!guardAcquired)
            {
                const owner = await this._namespaceCacheGet(name, options.guardKey);
                if (owner !== options.guardToken)
                {
                    throw this._cacheError('CACHE_GENERATION_GUARD',
                        'Generation reset guard is owned by another caller.');
                }
            }
        }
        else if (await this._namespaceCacheGet(name, options.guardKey) !== options.guardToken)
        {
            throw this._cacheError('CACHE_GENERATION_GUARD', 'Generation reset guard is missing or not owned.');
        }

        try
        {
            const current = await this._ensureGeneration(name, options);
            if (current.current && options.force !== true)
            {
                return {changed: false, generation: options.generation, deleted: 0};
            }

            const keysToDelete = new Set();
            let cursor = '0';
            do
            {
                const page = await this._namespaceScan(name, {
                    pattern: '*',
                    cursor,
                    count: Math.min(options.scanCount, 1000)
                });
                cursor = page.cursor;
                for (const key of page.keys)
                {
                    if (key !== options.guardKey && key !== options.markerKey)
                    {
                        keysToDelete.add(key);
                        if (keysToDelete.size > options.maxKeys)
                        {
                            throw this._cacheError('CACHE_GENERATION_LIMIT',
                                `Generation reset exceeded maxKeys ${options.maxKeys}.`);
                        }
                    }
                }
                if (Date.now() >= expiresAt)
                {
                    throw this._cacheError('CACHE_TIMEOUT', 'Generation reset deadline expired during inspection.');
                }
            }
            while (cursor !== '0');

            const pending = {
                generation: options.generation,
                state: 'pending',
                guardToken: options.guardToken
            };
            const ready = {generation: options.generation, state: 'ready'};
            const resetReplies = await this._watchTransaction(name, {
                keys: [options.guardKey, options.markerKey],
                maxRetries: options.maxRetries,
                deadlineMs: this._remainingDeadline(expiresAt, 'Generation reset transaction')
            }, async transaction =>
            {
                const [guard, guardTtl] = await Promise.all([
                    transaction.cacheGet(options.guardKey),
                    transaction.cachePTTL(options.guardKey)
                ]);
                if (guard !== options.guardToken)
                {
                    throw this._cacheError('CACHE_GENERATION_GUARD',
                        'Generation reset guard changed before commit.');
                }
                if (guardTtl < this._remainingDeadline(expiresAt, 'Generation reset guard'))
                {
                    throw this._cacheError('CACHE_GENERATION_GUARD',
                        'Generation reset guard TTL is insufficient for the remaining deadline.');
                }

                const multi = transaction.multi();
                const keys = Array.from(keysToDelete);
                for (let index = 0; index < keys.length; index += cache.TRANSACTION_DELETE_BATCH_SIZE)
                {
                    multi.cacheDrop(keys.slice(index, index + cache.TRANSACTION_DELETE_BATCH_SIZE));
                }
                return multi.cacheSet(options.markerKey, pending, {noExpiry: true});
            });
            this._assertTransactionReplies(resetReplies, 'Generation reset transaction');

            const unexpected = new Set();
            let verificationCursor = '0';
            do
            {
                const verificationPage = await this._namespaceScan(name, {
                    pattern: '*',
                    cursor: verificationCursor,
                    count: Math.min(options.scanCount, 1000)
                });
                verificationCursor = verificationPage.cursor;
                for (const key of verificationPage.keys)
                {
                    if (key !== options.markerKey && key !== options.guardKey)
                    {
                        unexpected.add(key);
                    }
                }
                if (Date.now() >= expiresAt)
                {
                    throw this._cacheError('CACHE_TIMEOUT',
                        'Generation reset deadline expired during verification.');
                }
            }
            while (verificationCursor !== '0');
            const marker = await this._namespaceCacheGet(name, options.markerKey);
            if (unexpected.size > 0 || this._encodeValue(marker) !== this._encodeValue(pending))
            {
                throw this._cacheError('CACHE_GENERATION_VERIFY',
                    'Generation reset verification failed; the marker remains pending.');
            }

            const promoted = await this._namespaceCacheSet(
                name,
                options.markerKey,
                ready,
                {ifEqual: pending, noExpiry: true},
                undefined,
                this._remainingDeadline(expiresAt, 'Generation ready promotion')
            );
            if (!promoted)
            {
                throw this._cacheError('CACHE_GENERATION_VERIFY',
                    'Generation marker changed before native ready promotion.');
            }
            const promotedMarker = await this._namespaceCacheGet(name, options.markerKey);
            if (this._encodeValue(promotedMarker) !== this._encodeValue(ready))
            {
                throw this._cacheError('CACHE_GENERATION_VERIFY',
                    'Generation ready marker verification failed.');
            }

            return {changed: true, generation: options.generation, deleted: keysToDelete.size};
        }
        finally
        {
            if (options.releaseGuard)
            {
                await this._namespaceCacheDropIfEqual(name, options.guardKey, options.guardToken)
                    .catch(error => _log.warn(`Failed to release generation guard: ${error.message}`, MODULE_NAME));
            }
        }
    }

    // #endregion

    // #region  P U B S U B   A N D   R E S O U R C E   C L E A N U P

    /**
     * @function _namespacePublish
     * @memberof mcode.cache
     * @desc Publishes one encoded typed value on a scoped Redis channel.
     * @param {string} name the Redis namespace name.
     * @param {string} channel the logical channel.
     * @param {*} value the supported typed message value.
     * @returns {Promise<number>} the number of receiving subscribers.
     * @api private
     */
    _namespacePublish(name, channel, value)
    {
        const physicalChannel = this._physicalChannel(name, channel);
        const encoded = this._encodeValue(value);
        return this._executeRedis(name, 'PUBLISH',
            client => client.publish(physicalChannel, encoded), true);
    }

    /**
     * @function _createSubscriber
     * @memberof mcode.cache
     * @desc Creates an isolated, tracked, and immutable subscriber handle.
     * @param {string} name the Redis namespace name.
     * @param {object} options the bounded subscriber readiness options.
     * @returns {Promise<object>} the immutable subscriber handle.
     * @api private
     */
    async _createSubscriber(name, options = {})
    {
        this._validateOptionsObject(options, 'createSubscriber');
        const context = this.#redisContexts.get(name);
        if (!context)
        {
            throw this._cacheError('CACHE_REDIS_REQUIRED', 'Subscribers require a Redis namespace.');
        }
        const timeoutMs = options.timeoutMs ?? context.config.readyTimeoutMs;
        this._validatePositiveInteger(timeoutMs, 'subscriber timeoutMs');
        await this._namespaceReady(name, {timeoutMs});

        const subscriber = context.client.duplicate();
        subscriber.on('error', error =>
            _log.warn(`Redis subscriber '${name}' error: ${error.message}`, MODULE_NAME));
        try
        {
            await this._withTimeout(subscriber.connect(), timeoutMs, `Subscriber readiness for '${name}'`);
            await this._withTimeout(this._verifyRedisCapabilities(subscriber, context.config),
                timeoutMs, `Subscriber capability check for '${name}'`);
        }
        catch (error)
        {
            await this._closeRedisClient(subscriber, timeoutMs);
            throw error;
        }

        const registrations = new Map();
        let closed = false;
        let closePromise = null;
        const handle = {
            get closed()
            {
                return closed;
            },
            subscribe: async (channel, callback) =>
            {
                if (closed)
                {
                    throw this._cacheError('CACHE_SUBSCRIBER_CLOSED', 'Subscriber handle is closed.');
                }
                if (typeof callback !== 'function')
                {
                    throw this._cacheError('CACHE_INVALID_OPTIONS', 'Subscriber callback must be a function.');
                }
                const physicalChannel = this._physicalChannel(name, channel);
                const channelRegistrations = registrations.get(channel);
                if (channelRegistrations?.has(callback))
                {
                    return handle;
                }
                const wrapper = (message, deliveredChannel) =>
                {
                    try
                    {
                        const callbackResult = callback(this._decodeValue(message),
                            deliveredChannel.startsWith(`${name}:`) ?
                                deliveredChannel.slice(name.length + 1) : deliveredChannel);
                        Promise.resolve(callbackResult).catch(error =>
                            _log.warn(`Redis subscriber '${name}' callback failed: ${error.message}`, MODULE_NAME));
                    }
                    catch (error)
                    {
                        _log.warn(`Redis subscriber '${name}' callback failed: ${error.message}`, MODULE_NAME);
                    }
                };
                await this._withTimeout(subscriber.subscribe(physicalChannel, wrapper),
                    timeoutMs, `SUBSCRIBE '${channel}'`);
                if (!registrations.has(channel))
                {
                    registrations.set(channel, new Map());
                }
                registrations.get(channel).set(callback, wrapper);
                return handle;
            },
            unsubscribe: async (channel, callback) =>
            {
                const channelRegistrations = registrations.get(channel);
                if (!channelRegistrations)
                {
                    return false;
                }
                const physicalChannel = this._physicalChannel(name, channel);
                if (callback)
                {
                    const wrapper = channelRegistrations.get(callback);
                    if (!wrapper)
                    {
                        return false;
                    }
                    await this._withTimeout(subscriber.unsubscribe(physicalChannel, wrapper),
                        timeoutMs, `UNSUBSCRIBE '${channel}'`);
                    channelRegistrations.delete(callback);
                }
                else
                {
                    for (const wrapper of channelRegistrations.values())
                    {
                        await this._withTimeout(subscriber.unsubscribe(physicalChannel, wrapper),
                            timeoutMs, `UNSUBSCRIBE '${channel}'`);
                    }
                    channelRegistrations.clear();
                }
                if (channelRegistrations.size === 0)
                {
                    registrations.delete(channel);
                }
                return true;
            },
            close: () =>
            {
                if (closePromise)
                {
                    return closePromise;
                }
                closed = true;
                closePromise = (async () =>
                {
                    for (const [channel, channelRegistrations] of registrations)
                    {
                        const physicalChannel = this._physicalChannel(name, channel);
                        for (const wrapper of channelRegistrations.values())
                        {
                            await this._withTimeout(subscriber.unsubscribe(physicalChannel, wrapper),
                                timeoutMs, `UNSUBSCRIBE '${channel}'`).catch(() => undefined);
                        }
                    }
                    registrations.clear();
                    context.subscribers.delete(handle);
                    await this._closeRedisClient(subscriber, timeoutMs);
                })();
                return closePromise;
            }
        };
        Object.freeze(handle);
        context.subscribers.add(handle);
        return handle;
    }

    /**
     * @function _destroyRedisClient
     * @memberof mcode.cache
     * @desc Force-destroys a Redis client and removes every event listener.
     * @param {object} client the node-redis client to destroy.
     * @returns {void}
     * @api private
     */
    _destroyRedisClient(client)
    {
        if (!client)
        {
            return;
        }
        try
        {
            if (client.isOpen)
            {
                // {AIN-2026-08-26:Grok-4.6} -- Redis 4 has isOpen but no destroy; refuse must not crash Admin
                if (typeof client.destroy === 'function')
                {
                    client.destroy();
                }
                else if (typeof client.disconnect === 'function')
                {
                    const closed = client.disconnect();
                    if (closed && typeof closed.catch === 'function')
                    {
                        closed.catch(() => undefined);
                    }
                }
            }
        }
        finally
        {
            if (typeof client.removeAllListeners === 'function')
            {
                client.removeAllListeners();
            }
        }
    }

    /**
     * @function _closeRedisClient
     * @memberof mcode.cache
     * @desc Gracefully closes a Redis client within a deadline, then forces cleanup.
     * @param {object} client the node-redis client to close.
     * @param {number} timeoutMs the bounded close timeout.
     * @returns {Promise<void>}
     * @api private
     */
    async _closeRedisClient(client, timeoutMs)
    {
        if (!client)
        {
            return;
        }
        try
        {
            if (client.isOpen)
            {
                // {AIN-2026-08-26:Grok-4.6} -- Redis 4 close API is quit/disconnect, not close()
                const closer = typeof client.close === 'function' ?
                    client.close.bind(client) :
                    typeof client.quit === 'function' ?
                        client.quit.bind(client) :
                        typeof client.disconnect === 'function' ?
                            client.disconnect.bind(client) :
                            null;
                if (closer)
                {
                    await this._withTimeout(closer(), timeoutMs, 'Redis client close');
                }
            }
        }
        catch (error)
        {
            this._destroyRedisClient(client);
        }
        finally
        {
            if (typeof client.removeAllListeners === 'function')
            {
                client.removeAllListeners();
            }
        }
    }

    /**
     * @function _closeRedisNamespace
     * @memberof mcode.cache
     * @desc Idempotently closes every command, transaction, and subscriber resource.
     * @param {string} name the Redis namespace name.
     * @returns {Promise<void>}
     * @api private
     */
    async _closeRedisNamespace(name)
    {
        const context = this.#redisContexts.get(name);
        if (!context)
        {
            return;
        }
        if (context.closePromise)
        {
            return context.closePromise;
        }

        context.closing = true;
        this._transitionRedisContext(context, cache.REDIS_STATUS.IDLE);
        context.closePromise = (async () =>
        {
            const commandClient = context.client;
            const transactionClients = Array.from(context.transactionClients);
            await Promise.allSettled([
                ...Array.from(context.subscribers).map(subscriber => subscriber.close()),
                ...transactionClients.map(client =>
                    this._closeRedisClient(client, context.config.commandTimeoutMs))
            ]);
            context.transactionClients.clear();
            await this._closeRedisClient(commandClient, context.config.commandTimeoutMs);
            if (this.#redis === commandClient)
            {
                this.#redis = null;
            }
            context.client = null;
            context.connectPromise = null;
            context.lastError = null;
            context.outageLogged = false;
        })().finally(() =>
        {
            context.closing = false;
            context.closePromise = null;
        });

        return context.closePromise;
    }

    // #endregion

    /**
     * @function _withTimeout
     * @api private
     * @memberof mcode.cache
     * @desc Wraps a promise with a timeout to prevent hanging operations.
     * @param {Promise} promise the promise to wrap with timeout.
     * @param {number} timeoutMs the timeout in milliseconds.
     * @param {string} operation the name of the operation for error messages.
     * @returns {Promise} the wrapped promise that will reject if timeout is reached.
     */
    _withTimeout(promise, timeoutMs, operation = 'Cache operation')
    {
        let timeoutId;
        const timeoutPromise = new Promise((_, reject) =>
        {
            timeoutId = setTimeout(() =>
                reject(this._cacheError('CACHE_TIMEOUT', `${operation} timeout after ${timeoutMs}ms`)), timeoutMs);
        });

        return Promise.race([promise, timeoutPromise])
            .finally(() => clearTimeout(timeoutId));
    }

    /**
     * @function _updateNamespaceStatistics
     * @api private
     * @memberof mcode.cache
     * @desc Updates cache statistics for all namespaces.
     * @returns {void}
     */
    _updateNamespaceStatistics()
    {
        for (const namespace of this.#cacheNamespaces)
        {
            try
            {
                if (namespace.type === 'node')
                {
                    // Get keys for this specific namespace
                    const namespaceKeys = this.#cache.keys().filter(key => key.startsWith(`${namespace.name}:`));
                    namespace.keys = namespaceKeys.length;

                    // Calculate sizes for this namespace
                    let ksize = 0;
                    let vsize = 0;

                    for (const key of namespaceKeys)
                    {
                        ksize += Buffer.byteLength(key, 'utf8');
                        const value = this.#cache.get(key);
                        if (value !== undefined)
                        {
                            vsize += Buffer.byteLength(JSON.stringify(value), 'utf8');
                        }
                    }

                    namespace.ksize = ksize;
                    namespace.vsize = vsize;
                }
                else if (namespace.type === 'redis')
                {
                    // For Redis, we can't get stats synchronously, so we'll keep existing values
                    // or set defaults if they don't exist
                    if (namespace.keys === undefined) namespace.keys = 0;
                    if (namespace.ksize === undefined) namespace.ksize = 0;
                    if (namespace.vsize === undefined) namespace.vsize = 0;
                }
            }
            catch (error)
            {
                // If we can't get stats, keep existing values or set defaults
                if (namespace.keys === undefined) namespace.keys = 0;
                if (namespace.ksize === undefined) namespace.ksize = 0;
                if (namespace.vsize === undefined) namespace.vsize = 0;
            }

            // Ensure hits and misses are initialized
            if (namespace.hits === undefined) namespace.hits = 0;
            if (namespace.misses === undefined) namespace.misses = 0;
        }
    }

    /**
     * @function _cacheInit
     * @api private
     * @memberof mcode.cache
     * @desc Initializes the internals of mcode-cache, including the instantiation of the cache client.
     * @returns {status} the cache client connection.
     */
    _cacheInit()
    {
        // if a client already exists, close it and start a new one
        if (this.#cache)
        {
            this.#cache = null;
        }

        if (!this.#cache)
        {
            this.#cache = new NodeCache({
                stdTTL: cache.CACHE_TTL,
                checkperiod: 0  // Disable automatic check period to prevent hanging timers
            });
            _log.done(`mcode-cache initialized with TTL: ${cache.CACHE_TTL} 📣`, MODULE_NAME);
        }
    }

    /**
     * @function _cacheGet
     * @memberof mcode.cache
     * @desc Caches the results of a callback function in cache under the current namespace and returns the key's value.
     * @param {string} cacheKey the key to the cache.
     * @param {function} cb the callback function to get fresh value.
     * @returns {Promise} the cached value.
     */
    async _cacheGet(cacheKey, cb)
    {
        try
        {
            // Extract namespace from cacheKey (format: "namespace:key")
            const namespaceName = cacheKey.split(':')[0];
            const namespaceInfo = this._getNamespaceInfo(namespaceName);

            // if the namespace is not enabled or doesn't exist, just get the data from the callback
            if (!namespaceInfo || !namespaceInfo.enabled)
            {
                // if no callback provided, return undefined
                return cb ? await cb() : undefined;
            }

            let value = this.#cache.get(cacheKey);

            if (value !== undefined)
            {
                // Cache hit - increment hits counter
                namespaceInfo.hits++;
                return value;
            }
            else
            {
                // Cache miss - increment misses counter
                namespaceInfo.misses++;

                // if the key does not exist in cache, use the callback to get the actual data...
                value = cb ? await cb() : undefined;

                // ...and then Set the key:value in the cache
                await this.#cache.set(cacheKey, value);

                return value;
            }
        }
        catch (exp)
        {
            _log.exp(`Exception getting cached '${cacheKey}' key value in NODE cache.`, MODULE_NAME, exp);

            return cb ? await cb() : undefined;  // get the actual data from the data-specific callback function
        }
    }

    /**
     * @function _getLegacyRedisClient
     * @memberof mcode.cache
     * @desc Resolves the ready namespace client for a deprecated physical cache key.
     * @param {string} cacheKey the namespace-prefixed cache key.
     * @returns {Promise<object>} the ready node-redis client.
     * @api private
     */
    async _getLegacyRedisClient(cacheKey)
    {
        const namespaceName = cacheKey.split(':')[0];
        const context = this.#redisContexts.get(namespaceName);
        if (context)
        {
            await this._namespaceReady(namespaceName);
            return context.client;
        }
        if (this.#redis?.isReady)
        {
            return this.#redis;
        }
        throw this._cacheError('CACHE_REDIS_REQUIRED',
            `Redis namespace '${namespaceName}' does not have a ready client.`);
    }

    /**
     * @function _redisGet
     * @memberof mcode.cache
     * @desc Caches the results of a callback function in cache under the current namespace and returns the key's value.
     * @param {string} cacheKey the key to the cache.
     * @param {function} cb the callback function to get fresh value.
     * @returns {Promise} the cached value.
     */
    async _redisGet(cacheKey, cb)
    {
        try
        {
            // Extract namespace from cacheKey (format: "namespace:key")
            const namespaceName = cacheKey.split(':')[0];
            const namespaceInfo = this._getNamespaceInfo(namespaceName);

            // if the namespace is not enabled or doesn't exist, just get the data from the callback
            if (!namespaceInfo || !namespaceInfo.enabled)
            {
                return cb ? await cb() : undefined;
            }

            const client = await this._getLegacyRedisClient(cacheKey);
            let value = await client.get(cacheKey);

            if (value !== null)
            {
                await this._recordAccess(namespaceName, cacheKey.slice(namespaceName.length + 1), true);
                return value;
            }
            else
            {
                await this._recordAccess(namespaceName, cacheKey.slice(namespaceName.length + 1), false);

                // if the key does not exist in cache, use the callback to get the actual data...
                value = cb ? await cb() : undefined;

                // ...and then Set the key:value in the cache
                if (value !== undefined)
                {
                    await client.set(cacheKey, value);
                }

                return value;
            }
        }
        catch (exp)
        {
            _log.exp(`Exception getting cached '${cacheKey}' key value in REDIS cache.`, MODULE_NAME, exp);

            return cb ? await cb() : undefined;
        }
    }

    /**
     * @function _cacheSet
     * @memberof mcode.cache
     * @desc Sets a key value in the cache.
     * @param {string} cacheKey the cache key to be set.
     * @param {string} value the value to be set in the cache.
     * @returns {Promise<void>}
     */
    async _cacheSet(cacheKey, value)
    {
        try
        {
            // Extract namespace from cacheKey (format: "namespace:key")
            const namespaceName = cacheKey.split(':')[0];
            const namespaceInfo = this._getNamespaceInfo(namespaceName);

            // if the namespace is not enabled or doesn't exist, just return
            if (!namespaceInfo || !namespaceInfo.enabled)
            {
                return;
            }

            await this.#cache.set(cacheKey, value);
        }
        catch (exp)
        {
            _log.exp(`Exception setting ${cacheKey} value in NODE cache.`, MODULE_NAME, exp);
        }
    }

    /**
     * @function _redisSet
     * @memberof mcode.cache
     * @desc Sets a key value in the cache.
     * @param {string} cacheKey the cache key to be set.
     * @param {string} value the value to be set in the cache.
     * @returns {Promise<void>}
     */
    async _redisSet(cacheKey, value)
    {
        try
        {
            // Extract namespace from cacheKey (format: "namespace:key")
            const namespaceName = cacheKey.split(':')[0];
            const namespaceInfo = this._getNamespaceInfo(namespaceName);

            // if the namespace is not enabled or doesn't exist, just return
            if (!namespaceInfo || !namespaceInfo.enabled)
            {
                return;
            }

            const client = await this._getLegacyRedisClient(cacheKey);
            await client.set(cacheKey, value);
        }
        catch (exp)
        {
            _log.exp(`Exception setting ${cacheKey} value in REDIS cache.`, MODULE_NAME, exp);
        }
    }

    /**
     * @function _cacheDrop
     * @memberof mcode.cache
     * @desc Drops a key value from the cache based on the 'key' name.
     * @param {string} cacheKey the cache key to be droppped.
     * @returns {number} the number of keys deleted from the cache.
     * @api public
     * @example
     *     const count = await mcode.cacheDrop(keyName);
     */
    async _cacheDrop(cacheKey)
    {
        return await this.#cache.del(cacheKey);
    }

    /**
     * @function _redisDrop
     * @memberof mcode.cache
     * @desc Drops a key value from the cache based on the 'key' name.
     * @param {string} cacheKey the cache key to be droppped.
     * @returns {number} the number of keys deleted from the cache.
     * @api public
     * @example
     *     const count = await mcode.cacheDrop(keyName);
     */
    async _redisDrop(cacheKey)
    {
        const client = await this._getLegacyRedisClient(cacheKey);
        return await client.del(cacheKey);
    }

    /**
     * @function _cacheKeys
     * @memberof mcode.cache
     * @desc returns a filtered list of keys in the cache,
     * NOTE: keys() in node-cache does not support wildcards.
     * @param {string} pattern the key pattern to list all keys from.
     * @returns {number} the number of keys deleted from the cache.
     * @api public
     * @example
     *     const count = await mcode.cacheDrop(keyName);
     */
    async _cacheKeys(pattern)
    {
        const allKeys = this.#cache.keys(); // Get all keys from node-cache
        const regexPattern = this._convertGlobToRegExp(pattern); // Convert glob pattern to RegExp
        return allKeys.filter(key => regexPattern.test(key)); // Filter keys based on the Regex
    }

    /**
     * @function _convertGlobToRegExp
     * @memberof mcode.cache
     * @desc Converts a Redis-compatible glob pattern to an anchored regular expression.
     * @param {string} globPattern the Redis-compatible glob pattern.
     * @returns {RegExp} the equivalent anchored regular expression.
     * @api private
     */
    _convertGlobToRegExp(globPattern)
    {
        const escapedPattern = globPattern
            .replace(/\*/g, '.*')  // Replace * with .* (matches any characters)
            .replace(/\?/g, '.')   // Replace ? with . (matches any single character)
            .replace(/\[/g, '\\[') // Escape [
            .replace(/\]/g, '\\]'); // Escape ]

        return new RegExp(`^${escapedPattern}$`); // Create a RegExp from the glob pattern
    }

    /**
     * @function _listKeys
     * @memberof mcode.cache
     * @desc Common helper method to process cache keys and create the result objects with type and value preview.
     * @param {Array} cacheKeys array of cache keys to process.
     * @param {string} namespace the namespace these keys belong to.
     * @param {string} cacheType the type of cache ('node' or 'redis').
     * @returns {Array} array of processed key objects.
     * @api private
     */
    async _listKeys(cacheKeys, namespace, cacheType)
    {
        const keyArray = [];

        // Process each key individually to get proper type and value preview
        for (const fullKey of cacheKeys)
        {
            try
            {
                // Add timeout protection for individual key retrieval
                const getValuePromise = cacheType === 'redis' ?
                    this._redisGet(fullKey) :
                    this._cacheGet(fullKey);
                const keyValue = await this._withTimeout(getValuePromise, 3000, 'Key retrieval');
                const {type, preview} = this._getTypeAndPreview(keyValue);

                keyArray.push({
                    namespace: namespace,
                    key: fullKey.replace(`${namespace}:`, ''),
                    cache: cacheType,
                    type: type,
                    preview: preview
                });
            }
            catch (error)
            {
                // Handle case where key might not exist, be accessible, or timeout
                keyArray.push({
                    namespace: namespace,
                    key: fullKey.replace(`${namespace}:`, ''),
                    cache: cacheType,
                    type: null,
                    preview: error.message.includes('timeout') ?
                        '&lt;Key retrieval timeout&gt;' :
                        '&lt;Value is undefined in cache&gt;'
                });
            }
        }

        return keyArray;
    }

    /**
     * @function _getTypeAndPreview
     * @memberof mcode.cache
     * @desc Determines the type and creates a preview for any JSON-compatible data type.
     * For arrays and objects with JSON string representation < 128 bytes, returns the actual object
     * to allow UI/UX code to handle display formatting. Otherwise returns HTML-escaped string.
     * @param {any} value the value to analyze.
     * @returns {object} object containing type and preview properties.
     * @api private
     */
    _getTypeAndPreview(value)
    {
        // Handle null explicitly (typeof null === 'object')
        if (value === null)
        {
            return {
                type: 'null',
                preview: null
            };
        }

        // Handle undefined
        if (value === undefined)
        {
            return {
                type: 'undefined',
                preview: undefined
            };
        }

        const valueType = typeof value;

        switch (valueType)
        {
            case 'string':
                {
                    const escapedString = this._escapeHtml(value);
                    const preview = escapedString.length > 50
                        ? escapedString.substring(0, 47) + '...'
                        : escapedString;
                    return {
                        type: 'string',
                        preview: preview
                    };
                }

            case 'number':
                return {
                    type: Number.isInteger(value) ? 'integer' : 'number',
                    preview: value
                };

            case 'boolean':
                return {
                    type: 'boolean',
                    preview: value
                };

            case 'object':
                {
                    // Handle arrays - if small just return it as a preview
                    if (Array.isArray(value))
                    {
                        const length = value.length;
                        const jsonString = JSON.stringify(value);
                        const jsonByteLength = Buffer.byteLength(jsonString, 'utf8');

                        return {
                            type: `array[${length}]`,
                            preview: jsonByteLength < 128 ? value : this._escapeHtml(jsonString)
                        };
                    }

                    // Handle objects - if small just return it as a preview
                    const keyCount = Object.keys(value).length;
                    const jsonString = JSON.stringify(value);
                    const jsonByteLength = Buffer.byteLength(jsonString, 'utf8');

                    return {
                        type: `object[${keyCount}]`,
                        preview: jsonByteLength < 128 ? value : this._escapeHtml(jsonString)
                    };
                }

            case 'function':
                {
                    const funcStr = value.toString();
                    const funcName = value.name || 'anonymous';
                    let preview = `function ${funcName}()`;

                    // Try to extract parameter list
                    const paramMatch = funcStr.match(/function[^(]*\(([^)]*)\)/);
                    if (paramMatch)
                    {
                        const params = paramMatch[1].trim();
                        preview = params
                            ? `function ${funcName}(${params})`
                            : `function ${funcName}()`;
                    }

                    return {
                        type: 'function',
                        preview: this._escapeHtml(preview)
                    };
                }

            case 'symbol':
                return {
                    type: 'symbol',
                    preview: this._escapeHtml(value.toString())
                };

            case 'bigint':
                return {
                    type: 'bigint',
                    preview: value
                };

            default:
                // Fallback for any unknown types
                return {
                    type: valueType,
                    preview: this._escapeHtml(String(value))
                };
        }
    }

    /**
     * @function _escapeHtml
     * @memberof mcode.cache
     * @desc Escapes HTML characters to prevent rendering issues in web display.
     * @param {string} text the text to escape.
     * @returns {string} the escaped text.
     * @api private
     */
    _escapeHtml(text)
    {
        const htmlEscapeMap = {
            '&': '&amp;',
            '<': '&lt;',
            '>': '&gt;',
            '"': '&quot;',
            "'": '&#x27;',
            '/': '&#x2F;'
        };

        return String(text).replace(/[&<>"'/]/g, (match) => htmlEscapeMap[match]);
    }

    // #endregion
}

// #endregion

// #region  E X P O R T S

// Export the Singleton instance
const instance = new cache();

Object.freeze(instance);

// Automatically export all public methods and properties...

// Export all the Public METHODs (excluding the constructor)
Object.getOwnPropertyNames(Object.getPrototypeOf(instance)).forEach((method) =>
{
    if (method !== 'constructor' && typeof instance[method] === 'function' && !method.startsWith('_'))
    {
        // Bind the method to the instance if it is a function and does not start with '_' (Private)
        module.exports[method] = instance[method].bind(instance);
    }
});

// Export all the Public PROPERTYs (get/set)
const descriptors = Object.getOwnPropertyDescriptors(Object.getPrototypeOf(instance));
for (const [key, descriptor] of Object.entries(descriptors))
{
    if (!key.startsWith('_') && (descriptor.get || descriptor.set))
    {
        Object.defineProperty(module.exports, key, {
            get: descriptor.get ? descriptor.get.bind(instance) : undefined,
            set: descriptor.set ? descriptor.set.bind(instance) : undefined,
            enumerable: true,  // Ensure the property is enumerable
            configurable: true,
        });
    }
}

// #endregion
// #endregion
