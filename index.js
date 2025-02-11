// #region  H E A D E R
// <copyright file="mcode-cache/index.js" company="MicroCODE Incorporated">Copyright © 2022-2024 MicroCODE Incorporated Troy, MI</copyright><author>Timothy J. McGuire</author>
// #region  M O D U L E
// #region  D O C U M E N T A T I O N
/*
 *      Title:    MicroCODE Data Caching Module
 *      Module:   modules (node_modules/mcode-cache/index.js)
 *      Project:  MicroCODE Common Library
 *      Customer: Internal
 *      Creator:  MicroCODE Incorporated
 *      Date:     February 2024
 *      Author:   Timothy J McGuire
 *
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
 *
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
 *
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
 *
 *  Date:         By-Group:   Rev:    Description:
 *
 *  30-Jan-2024   TJM-MCODE  {0001}   New module for common reusable JavaScript data caching functions.
 *  01-Feb-2024   TJM-MCODE  {0002}   Changed to the Universal Module Definition (UMD) pattern to support AMD,
 *                                    CommonJS/Node.js, and browser global in our exported module.
 *  15-Sep-2024   TJM-MCODE  {0003}   Extended to support *node-cache* package for caching local information
 *                                    to avoid network latency, this is now the default cache provider.
 *
 *
 *
 */

// #endregion
// #endregion
// #endregion

// #region  I N C L U D E S

const mcode = require('mcode-log');
const path = require('path');
const fs = require('fs').promises;

const Redis = require('redis');
const NodeCache = require('node-cache');
const {ifError} = require('assert');

// #endregion

// #region  C O N S T A N T S

// MicroCODE: define this module's name for our 'mcode-log' package
const MODULE_NAME = 'mcode-cache.js';

// #endregion

// #region  C L A S S

/**
 * @class cache Class to provide transparent data caching for MicroCODE applications.
 *
 */
class cache
{
    // #region  C O N S T A N T S

    static CACHE_TTL = 60 * 60 * 24;  // 24 hours in seconds
    static CLASS_TYPE = 'cache';
    static REDIS_URL = 'redis://127.0.0.1:6379';
    static REDIS_PORT = 6379;
    static REDIS_USER = 'user';
    static REDIS_PASSWORD = 'password';

    // #endregion

    // #region  P R I V A T E   F I E L D S

    // node-cache instance
    #cache = null;
    #cacheTTL = cache.CACHE_TTL;
    #cacheNamespace = '';
    #cacheNamespaces = {};
    #cacheEnabled = true;

    // Redis instance
    #redis = null;
    #redisURL = cache.REDIS_URL;
    #redisPort = cache.REDIS_PORT;
    #redisUser = cache.REDIS_USER;
    #redisPassword = cache.REDIS_PASSWORD;
    #redisConnected = false;
    #redisEnabled = true;

    #privateExample = 'PRIVATE PROPERTY';

    // #endregion

    // #region  C O N S T R U C T O R

    /**
     * @constructor cache class constructor.
     */
    constructor ()
    {
        // Create a Singleton instance
        if (!cache.instance)
        {
            this.#cacheTTL = cache.CACHE_TTL;
            this.#redisURL = `${cache.REDIS_URL}`;
            this.#redisPort = `${cache.REDIS_PORT}`;
            this.#redisUser = `${cache.REDIS_USER}`;
            this.#redisPassword = `${cache.REDIS_PASSWORD}`;

            this._cacheInit();

            // add the default namespace as a node-cache namespace
            this.addNamespace({name: 'MicroCODE', type: 'node'});

            // make it current
            this.#cacheNamespace = 'MicroCODE';

            // generate a default cache key for the current namespace
            this.cacheSet('Default', 'node-cache');

            cache.instance = this;
        }

        mcode.done(`mcode-cache initialized with namespace: ${this.#cacheNamespace}`, MODULE_NAME);

        return cache.instance;
    }

    // #endregion

    // #region  E N U M E R A T I O N S

    /**
     * @enum namedEnum1 - a description of this enum, its use, and meaning. TEMPLATE.
     */
    static namedEnum1 = Object.freeze
        ({
            name1: 0,
            name2: 1,
            name3: 2,
            name4: 3,
            name5: 4,
            name6: 5,
            name7: 6
        });

    // #endregion

    // #region  P R O P E R T I E S

    /**
     * @property {number} cacheReady the cache instance and default namespace has=ve been established successfully.
     */
    get cacheReady()
    {
        if (this.#redis)
        {
            return (this.#cache != null && this.#redisConnected);
        }
        else
        {
            return this.#cache != null;
        }
    }

    /**
     * @property {number} cacheTTL the cache Time-To-Live property, in seconds.
     */
    get cacheTTL()
    {
        return this.#cacheTTL;
    }
    set cacheTTL(value)
    {
        this.#cacheTTL = value;
    }

    /**
     * @property {string} cacheNamespaces the 'prefix' used to group our keys in the cache Server.
     * This property switches to a new namespace, to be used for all subsequent cache operations as the default.
     * The namespace must already exist in the cache servers 'namespace' list, see addNamespace().
     */
    get cacheNamespaces()
    {
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
    set cacheNamespace(value)
    {
        this.#cacheNamespace = value;
        mcode.success(`Switched to namespace: '${this.#cacheNamespace}`, MODULE_NAME);
    }

    /**
     * @property {number} cacheEnabled returns a value indicating whether or not the Node Caches are caching the namespaces.
     */
    get cacheEnabled()
    {
        return this.#cacheEnabled;
    }

    /**
     * @property {number} redisEnabled returns a value indicating whether or not Redis Caches is caching the namespaces.
     */
    get redisEnabled()
    {
        return this.#redisEnabled;
    }

    /**
     * @property {string} redisURL the URL to the Redis Server.
     */
    get redisURL()
    {
        return this.#redisURL;
    }
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
    set redisPassword(value)
    {
        this.#redisPassword = value;
    }

    /**
     * @property {string} _privateExample an example of a private property.
     */
    get _privateExample()
    {
        return this.#privateExample;
    }
    set _privateExample(value)
    {
        this.#privateExample = value;
    }

    // #endregion

    // #region  S Y M B O L S

    /**
     * iterator1 - a description of this iterator, its use, and meaning.
     */
    [Symbol('iterator1')]()
    {
        // method with computed name (symbol here) TEMPLATE
    }

    // #endregion

    // #region  M E T H O D S – S T A T I C

    /**
     * static1() – description of public static method, called by prototype not object.
     *             This does not operate on a specific copy of a Class object.
     * @api public
     *
     * @param {type} param1 description of param1.
     * @returns {type} description of return value.
     *
     * @example
     *
     *      cache.static1('param1');
     */
    static static1(param1)
    {
        // ... TEMPLATE

        return value;
    }

    // #endregion

    // #region  M E T H O D S – P U B L I C

    /**
     * @func addNamespace
     * @memberof mcode.cache
     * @desc Adds a new namespace to the cache server.
     * @param {object} namespace the namespace and configuration to be added to the cache server.
     * @api public
     * @example
     *     const namespace = {name: 'MicroCODE', type: 'node', user: 'username', password: '...'};
     */
    addNamespace(namespace)
    {
        // get the namespace name and type
        if (!namespace || !namespace.name || !namespace.type)
        {
            mcode.warn(`Invalid namespace: it must have a 'name' and 'type' defined.`, MODULE_NAME);
            return;
        }

        // only allow 'node' or 'redis' cache types
        if (namespace.type !== 'node' && namespace.type !== 'redis')
        {
            mcode.warn(`Invalid cache type: ${namespace.type}, selected for namespace: ${namespace.name}, must be 'node' or 'redis'.`, MODULE_NAME);
            return;
        }

        // When we add the 1st Redis namespace, initialize the Redis client
        if (namespace.type === 'redis' && !this.#redis)
        {
            // if no Redis url is provided, use the default
            if (!namespace.url)
            {
                namespace.url = this.#redisURL;
            }

            // if no port is provided, use the default
            if (!namespace.port)
            {
                namespace.port = 6379;
            }

            // if no user is provided, use the default
            if (!namespace.user)
            {
                namespace.user = null;
            }

            // if no password is provided, use the default
            if (!namespace.password)
            {
                namespace.password = null;
            }

            this.#redisURL = `${namespace.url}`;
            this.#redisPort = `${namespace.port}`;
            this.#redisUser = `${namespace.user}`;
            this.#redisPassword = `${namespace.password}`;

            this._redisInit();
        }

        // add the namespace to the cache server
        this.#cacheNamespaces[namespace.name] = namespace.type;

        mcode.success(`Added namespace: '${namespace.name}`, MODULE_NAME);
    }

    /**
     * @func cacheMakeKey
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
    async cacheGet(key, cb = () => {return "<not defined>";})
    {
        // make the auto-generated cache key for the 'key' - get from current namespace, add if not cached
        const cacheKey = this.fileMakeKey(key);

        // get the value from the cache associated with the current namespace
        if (this.#cacheNamespaces[this.#cacheNamespace] === 'redis')
        {
            // use the Redis client
            return await this.#redis.get(cacheKey);
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

        // set the value in the cache associated with the current namespace
        if (this.#cacheNamespaces[this.#cacheNamespace] === 'redis')
        {
            // use the Redis client
            return await this.#redis.set(cacheKey, value);
        }

        return await this._cacheSet(cacheKey, value);
    }

    /**
     * @func cacheDrop
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

        // delete the value from the cache associated with the current namespace
        if (this.#cacheNamespaces[this.#cacheNamespace] === 'redis')
        {
            // use the Redis client
            return await this._redisDrop(cacheKey);
        }

        return await this._cacheDrop(cacheKey);
    }

    /**
     * @func cacheDropAll
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
    async cacheDropAll({cache = '*', namespace = '*', pattern = '*'})
    {
        let result = 0;

        for (const thisNamespace in this.#cacheNamespaces)
        {
            if (thisNamespace === namespace || namespace === '*')
            {
                const cacheType = this.#cacheNamespaces[thisNamespace];

                if (cacheType === 'node' && (cache === 'node' || cache === '*'))
                {
                    // Get keys from the Node cache
                    const nodeKeys = await this._cacheKeys(`${thisNamespace}:${pattern}`);
                    result += nodeKeys.length;

                    // Delete all keys from the Node cache
                    await Promise.all(nodeKeys.map(key => this.#cache.del(key)));
                }

                if (cacheType === 'redis' && (cache === 'redis' || cache === '*'))
                {
                    // Get keys from the Redis client
                    const redisKeys = await this.#redis.keys(`${thisNamespace}:${pattern}`);
                    result += redisKeys.length;

                    // Delete all keys from the Redis cache
                    await Promise.all(redisKeys.map(key => this.#redis.del(key)));
                }
            }
        }

        // Return the total number of keys deleted
        return result;
    }

    /**
     * @func cacheListAll
     * @memberof mcode.cache
     * @desc Lists all keys from the cache based on the App's namespace.
     * @param {string} cache the cache to list all keys from.
     * @param {string} namespace the namespace to list all keys from.
     * @param {string} pattern the key pattern to list all keys from.
     * @returns {Array} an array of namespace keys in the cache.
     * @api public
     * @example
     *    const result = await mcode.cacheListAll();
     *    const result = await mcode.cacheListAll({cache: 'node', namespace: '*', keyStar: '*'});
     */
    async cacheListAll({cache = '*', namespace = '*', pattern = '*'})
    {
        let keys = [];

        for (const thisNamespace in this.#cacheNamespaces)
        {
            if (thisNamespace === namespace || namespace === '*')
            {
                const cacheType = this.#cacheNamespaces[thisNamespace];

                if (cacheType === cache || cache === '*')
                {
                    if (cacheType === 'node')
                    {
                        // use the Node cache - NOTE: node-cache.keys() does not support wildcards
                        keys = keys.concat(await this._cacheKeys(`${thisNamespace}:${pattern}`));
                    }
                    if (cacheType === 'redis')
                    {
                        // use the Redis client
                        keys = keys.concat(await this.#redis.keys(`${thisNamespace}:${pattern}`));
                    }
                }
            }
        }

        return keys;
    }

    /**
     * @func cacheOn
     * @memberof mcode.cache
     * @desc Turns ON caching in the Node caches.
     * @api public
     */
    async cacheOn()
    {
        this.#cacheEnabled = true;
    }

    /**
     * @func cacheOff
     * @memberof mcode.cache
     * @desc Turns OFF caching in the Node caches.
     * @api public
     */
    async cacheOff()
    {
        this.#cacheEnabled = false;
        this.cacheDropAll({cache: 'node', namespace: '*', pattern: '*'});
    }

    /**
     * @func redisOn
     * @memberof mcode.redis
     * @desc Turns ON caching in the Redis caches.
     * @api public
     */
    async redisOn()
    {
        this.#redisEnabled = true;
    }

    /**
     * @func redisOff
     * @memberof mcode.redis
     * @desc Turns OFF caching in the Redis caches.
     * @api public
     */
    async redisOff()
    {
        this.#redisEnabled = false;
        this.cacheDropAll({cache: 'redis', namespace: '*', pattern: '*'});
    }

    /**
     * @func cacheClose
     * @memberof mcode.cache
     * @desc Closes the cache connection.
     * @returns {status} the cache client connection.
     * @api public
     * @example
     *   const result = await mcode.cacheClose();
     */
    async cacheClose()
    {
        if (this.#cache)
        {
            this.#cache = null;
        }

        if (this.#redis)
        {
            this.#redis.quit();
            this.#redis = null;
        }
    }

    /**
     * @func fileRead
     * @memberof mcode
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
                    mcode.exp(`File is NOT READ accessible: ${filePath}`, MODULE_NAME, exp);
                    throw new Error(`File READ access error: ${filePath}`);
                }

                return await fs.readFile(filePath, fileEncoding);
            });
        }
        catch (exp)
        {
            mcode.exp(`Exception reading from disk for cache, file: ${filePath}`, MODULE_NAME, exp);
            return null;
        }
    }

    /**
     * @func fileWrite
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
                mcode.exp(`File is NOT WRITE accessible: ${filePath}`, MODULE_NAME, exp);
                throw new Error(`File WRITE access error: ${filePath}`);
            }

            // write the file to disk
            return await fs.writeFile(filePath, fileData, {encoding: fileEncoding});
        }
        catch (exp)
        {
            mcode.exp(`Exception writing to disk and cache, file: ${filePath}`, MODULE_NAME, exp);
            return null;
        }
    }

    /**
     * @func fileDrop
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
     * @func fileMakeKey
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
     * @func fileGetRoot
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

    // #region  M E T H O D S - G E N E R A T O R S

    /**
     * getValue() - returns all values in 'enums'. TEMPLATE marked private '_' for now.
     *
     */
    *_getValue()
    {
        for (const enumValue of this.enums)
        {
            yield value;
        }
    }

    // #endregion

    // #region  M E T H O D S – P R I V A T E

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
            this.#cache = new NodeCache({stdTTL: cache.CACHE_TTL});
            mcode.done(`mcode-cache initialized with TTL: ${cache.CACHE_TTL} 📣`, MODULE_NAME);
        }
    }

    /**
     * @function _redisInit
     * @api private
     * @memberof mcode.cache
     * @desc Initializes the internals of mcode-cache, including the instantiation of the Redis client.
     * @returns {status} the Redis client connection.
     */
    _redisInit()
    {
        if (this.#redisConnected)
        {
            mcode.warn(`Redis client is already connected to: ${this.#redisURL}`, MODULE_NAME);
            return;
        }

        if (this.#redis)
        {
            mcode.info('Closing existing Redis client before reinitializing.', MODULE_NAME);
            this.#redis.quit();
            this.#redis = null;
        }

        if (!this.#redis)
        {
            // Set-up Redis client configuration based on security
            const clientOptions = this.#redisUser && this.#redisPassword
                ? {url: this.#redisURL, username: this.#redisUser, password: this.#redisPassword}
                : {url: this.#redisURL};

            // Create Redis Client
            this.#redis = Redis.createClient(clientOptions);

            this.#redis.on('connect', () =>
            {
                mcode.done(`REDIS client connected on: ${this.#redisURL} 📣`, MODULE_NAME);

                this.#redisConnected = true;
            });

            this.#redis.on('error', (err) =>
            {
                mcode.error(`REDIS client error on: ${this.#redisURL}`, MODULE_NAME, err);
            });

            this.#redis.connect();
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
            // if the cache is not enabled, just get the data from the callback
            if (!this.#cacheEnabled)
            {
                return cb();
            }

            let value = this.#cache.get(cacheKey);

            if (!value)
            {
                // if the key does not exist in cache, use the callback to get the actual data...
                value = await cb();

                // ...and then Set the key:value in the cache
                await this.#cache.set(cacheKey, value);
            }

            return value;
        }
        catch (exp)
        {
            mcode.exp(`Exception getting cached '${cacheKey}' key value in NODE cache.`, MODULE_NAME, exp);

            return cb();  // get the actual data from the data-specific callback function
        }
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
            // if the cache is not enabled, just get the data from the callback
            if (!this.#redisEnabled)
            {
                return cb();
            }

            let value = this.#redis.get(cacheKey);

            if (!value)
            {
                // if the key does not exist in cache, use the callback to get the actual data...
                value = await cb();

                // ...and then Set the key:value in the cache
                await this.#redis.set(cacheKey, value);
            }

            return value;
        }
        catch (exp)
        {
            mcode.exp(`Exception getting cached '${cacheKey}' key value in REDIS cache.`, MODULE_NAME, exp);

            return cb();  // get the actual data from the data-specific callback function
        }
    }

    /**
     * @function _cacheSet
     * @memberof mcode.cache
     * @desc Sets a key value in the cache.
     * @param {string} cacheKey the cache key to be set.
     * @param {string} value the value to be set in the cache.
     */
    async _cacheSet(cacheKey, value)
    {
        try
        {
            // if the cache is not enabled, just return
            if (!this.#cacheEnabled)
            {
                return;
            }

            await this.#cache.set(cacheKey, value);
        }
        catch (exp)
        {
            mcode.exp(`Exception setting ${cacheKey} value in NODE cache.`, MODULE_NAME, exp);
        }
    }

    /**
     * @function _redisSet
     * @memberof mcode.cache
     * @desc Sets a key value in the cache.
     * @param {string} cacheKey the cache key to be set.
     * @param {string} value the value to be set in the cache.
     */
    async _redisSet(cacheKey, value)
    {
        try
        {
            // if the cache is not enabled, just return
            if (!this.#redisEnabled)
            {
                return;
            }

            await this.#redis.set(cacheKey, value);
        }
        catch (exp)
        {
            mcode.exp(`Exception setting ${cacheKey} value in REDIS cache.`, MODULE_NAME, exp);
        }
    }

    /**
     * @func _cacheDrop
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
     * @func _redisDrop
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
        return await this.#redis.del(cacheKey);
    }

    /**
     * @func _cacheKeys
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

    // Convert Redis glob pattern to RegExp
    _convertGlobToRegExp(globPattern)
    {
        const escapedPattern = globPattern
            .replace(/\*/g, '.*')  // Replace * with .* (matches any characters)
            .replace(/\?/g, '.')   // Replace ? with . (matches any single character)
            .replace(/\[/g, '\\[') // Escape [
            .replace(/\]/g, '\\]'); // Escape ]

        return new RegExp(`^${escapedPattern}$`); // Create a RegExp from the glob pattern
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