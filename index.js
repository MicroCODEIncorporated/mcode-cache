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
 *      o  'key' in this code refers to the Application Key or Fiel Path.
 *      o  'redisKey' in this code refers to a fully qualified Redis Key.
 *      o  '_redis*()' are private methods that are not exposed to the caller,
 *                     these expected 'redisKey' values, not 'key' values.
 *      o  'redisKeys' are made from 'key' values by the 'redisMakeKey()' method,
 *                     which formats the 'key' into a Redis Key with a prefix
 *                     based on the current namespace.
 *
 *        <key> - application 'key' format
 *        <namespace>:<key> - 'redisKey' format
 *
 *      Examples:
 *
 *         key: '/backend/components/app/tool/tool.template.htmx'
 *         redisKey: 'GM-GPS-eMITS-UI:backend:components:app:tool:tool.template.htmx'
 *
 *         key: 'myKey'
 *         redisKey: 'MicroCODE:myKey'
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
 *
 *
 */

// #endregion
// #endregion
// #endregion

// #region  I N C L U D E S

const mcode = require('mcode-log');
const Redis = require('redis');
const path = require('path');
const fs = require('fs').promises;

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

    static REDIS_TTL = 60 * 60 * 24;  // 24 hours in seconds
    static REDIS_URL = 'redis://127.0.0.1:6379';
    static CLASS_TYPE = 'cache';

    // #endregion

    // #region  P R I V A T E   F I E L D S

    #redis = null;
    #redisConnected = false;
    #redisTTL = cache.REDIS_TTL;
    #redisURL = cache.REDIS_URL;
    #redisNamespace = 'MicroCODE';
    #privateExample = 'TEMPLATE';

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
            this.#redisTTL = cache.REDIS_TTL;
            this.#redisURL = `${cache.REDIS_URL}`;

            this._redisInit();

            cache.instance = this;
        }

        mcode.done(`mcode-cache initialized with namespace: ${this.#redisNamespace}`, MODULE_NAME);

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
     * @property {number} redisReady the Redis connection and default namespace has been established successfully.
     */
    get redisReady()
    {
        return this.#redisConnected;
    }

    /**
     * @property {number} redisTTL the Redis Time-To-Live property, in seconds.
     */
    get redisTTL()
    {
        return this.#redisTTL;
    }
    set redisTTL(value)
    {
        this.#redisTTL = value;
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
     * @property {string} redisNamespace the 'prefix' used to group our keys in the Redis Server.
     */
    get redisNamespace()
    {
        return this.#redisNamespace;
    }
    set redisNamespace(value)
    {
        mcode.debug(`Setting Redis Namespace to: ${value}`, MODULE_NAME);
        this.#redisNamespace = value;
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
     * @func redisMakeKey
     * @memberof mcode.cache
     * @desc Converts a 'key source' into a Redis Key by replacing slashes with colons and removing spaces.
     * @param {string} keySource the path to the key to be converted.
     * @returns {string} the Redis Key.
     * @api public
     * @example
     *     const keyPath = 'components/app/tool/tool.template.htmx';
     *     returns 'GM-GPS-eMITS-UI:components:app:tool:tool.template.htmx';
     */
    redisMakeKey(keySource)
    {
        // convert the file path into a Redis Key
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
        return `${this.redisNamespace}:${key}`;
    }

    /**
     * @function redisGet
     * @memberof mcode.cache
     * @desc Caches the results of a callback function in REDIS under the current namespace and returns the key's value.
     * @param {string} key the app key to get from the current namespace.
     * @param {function} cb the callback function to get fresh value.
     * @returns {Promise} the cached value.
     */
    async redisGet(key, cb)
    {
        // make the auto-generated Redis key for the 'key' - get from current namespace, add if not cached
        const redisKey = this.fileMakeKey(key);
        return await this._redisGet(redisKey, cb);
    }

    /**
     * @function redisSet
     * @memberof mcode.cache
     * @desc Sets a key value in the Redis cache.
     * @param {string} key the app key to be set into current namespace.
     * @param {string} value the value to be set in the Redis cache.
     * @returns {string} the value set in the Redis cache.
     */
    async redisSet(key, value)
    {
        // make the auto-generated Redis key for the 'key' - set into current namespace
        const redisKey = this.fileMakeKey(key);
        return await this._redisSet(redisKey, value);
    }

    /**
     * @func redisDrop
     * @memberof mcode.cache
     * @desc Drops a key value from the Redis cache based on the 'key' name.
     * @param {string} key the app key to be droppped.
     * @returns {number} the number of keys deleted from the Redis cache.
     * @api public
     * @example
     *     const count = await mcode.redisDrop(keyName);
     */
    async redisDrop(key)
    {
        // make the auto-generated Redis key for the 'key' - drop from current namespace
        const redisKey = this.fileMakeKey(key);
        return await this._redisDrop(redisKey);
    }

    /**
     * @func redisDropAll
     * @memberof mcode.cache
     * @desc Drops all keys from the Redis cache based on the App's namespace.
     * @returns {number} the number of keys deleted from the Redis cache.
     * @api public
     * @example
     *    const result = await mcode.redisDropAll();
     */
    async redisDropAll(keyPattern = `${this.redisNamespace}:*`)
    {
        // Find all keys that match the pattern
        const keys = await this.#redis.keys(keyPattern);

        // If no keys found, return 0
        if (keys.length === 0)
        {
            return 0;
        }

        // Delete all keys using Promise.all
        const results = await Promise.all(keys.map(key => this.#redis.del(key)));

        // Return the number of keys deleted
        return results.length;
    }

    /**
     * @func redisListAll
     * @memberof mcode.cache
     * @desc Lists all keys from the Redis cache based on the App's namespace.
     * @returns {Array} an array of namespace keys in the Redis cache.
     * @api public
     * @example
     *    const result = await mcode.redisListAll();
     */
    async redisListAll(keyStar = `${this.redisNamespace}:*`)
    {
        // return all keys in this namespace
        return await this.#redis.keys(keyStar);
    }

    /**
     * @func redisClose
     * @memberof mcode.cache
     * @desc Closes the Redis connection.
     * @returns {status} the Redis client connection.
     * @api public
     * @example
     *   const result = await mcode.redisClose();
     */
    async redisClose()
    {
        if (this.#redis)
        {
            this.#redis.quit();
            this.#redis = null;
        }
    }

    /**
     * @func fileRead
     * @memberof mcode
     * @desc Reads a file from 'path' and caches its for future reference. The Redis 'key' generated
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
        // make the auto-generated Redis key for the file
        const redisKey = this.fileMakeKey(filePath);

        return this._redisGet(redisKey, async () =>
        {
            mcode.debug(`Caching file: ${filePath}`, MODULE_NAME);
            return await fs.readFile(filePath, fileEncoding);
        });
    }

    /**
     * @func fileWrite
     * @memberof mcode.cache
     * @desc Writes 'fileData' to 'filePath' and caches it in the Redis cache.
     * @param {string} filePath a standard file system reference to the file to be read.
     * @param {string} fileData the data to be written to the file.
     * @param {string} fileEncoding the encoding of the file to be written (default is 'utf8').
     * @returns {Promise} the file data written to disk.
     */
    async fileWrite(filePath, fileData, fileEncoding = 'utf8')
    {
        try
        {
            // make the auto-generated Redis key for the file
            const redisKey = this.fileMakeKey(filePath);

            // the cached value is no longer valid, so drop it
            this.redisDrop(redisKey);

            // cache the new value
            this._redisSet(redisKey, fileData);

            // write the file to disk
            return await fs.writeFile(filePath, fileData, {encoding: fileEncoding});
        }
        catch (exp)
        {
            mcode.exp(`Exception writing to disk and caching Redis, file: ${filePath}`, MODULE_NAME, exp);
            return null;
        }
    }

    /**
     * @func fileDrop
     * @memberof mcode.cache
     * @desc Drops a file from the Redis cache based on the 'filePath'.
     * @param {string} filePath a standard file system reference to the file to be read.
     * @returns {number} the number of keys deleted from the Redis cache.
     * @api public
     * @example
     *     const filePath = './data.json';
     *     const result = await mcode.fileDrop(path.join(__dirname, filePath));
     */
    async fileDrop(filePath)
    {
        const redisKey = this.fileMakeKey(filePath);

        return await this._redisDrop(redisKey);
    }

    /**
     * @func fileMakeKey
     * @memberof mcode.cache
     * @desc Generates a unique key for the file in the Redis cache based on the 'filePath'.
     * @param {string} filePath a standard file system reference to the file to be read.
     * @returns {string} the key for the file in the Redis cache.
     */
    fileMakeKey(filePath)
    {
        // remove 'rootKey' from the 'filePath'
        const keyPath = filePath.replace(this.fileGetRoot(), '');
        const key = this.redisMakeKey(keyPath);

        return key;
    }

    /**
     * @func fileGetRoot
     * @memberof mcode.cache
     * @desc Gets the root directory for Redis Keys based on the server's execution path.
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
     * @function _redisInit
     * @api private
     * @memberof mcode.cache
     * @desc Initializes the internals of mcode-cache, including the instantiation of the Redis client.
     * @returns {status} the Redis client connection.
     */
    _redisInit()
    {
        // if a client already exists, close it and start a new one
        if (this.#redis)
        {
            this.#redis.quit();
            this.#redis = null;
        }

        if (!this.#redis)
        {
            this.#redis = Redis.createClient({url: this.#redisURL});

            this.#redis.on('connect', () =>
            {
                mcode.done(`REDIS client connected on: ${this.#redisURL} 📣`, MODULE_NAME);

                this.#redisConnected = true;
            });

            this.#redis.on('error', (err) =>
            {
                mcode.error(`REDIS client could not connect on: ${this.#redisURL}`, MODULE_NAME, err);
            });

            this.#redis.connect();
        }
    }

    /**
     * @function _redisGet
     * @memberof mcode.cache
     * @desc Caches the results of a callback function in REDIS under the current namespace and returns the key's value.
     * @param {string} redisKey the key to the Redis cache.
     * @param {function} cb the callback function to get fresh value.
     * @returns {Promise} the cached value.
     */
    async _redisGet(redisKey, cb)
    {
        try
        {
            let value = await this.#redis.get(redisKey);

            if (value === null)
            {
                // if the key does not exist in Redis, use the callback to get the actual data...
                value = await cb();

                // ...and then Set the key:value in the Redis cache
                await this.#redis.set(redisKey, value);
            }

            return value;
        }
        catch (exp)
        {
            mcode.exp(`Exception getting and caching ${redisKey} key value in Redis.`, MODULE_NAME, exp);

            return cb();  // get the actual data from the data-specific callback function
        }
    }

    /**
     * @function _redisSet
     * @memberof mcode.cache
     * @desc Sets a key value in the Redis cache.
     * @param {string} redisKey the Redis key to be set.
     * @param {string} value the value to be set in the Redis cache.
     * @returns {string} the value set in the Redis cache.
     */
    async _redisSet(redisKey, value)
    {
        try
        {
            return await this.#redis.set(redisKey, value);
        }
        catch (exp)
        {
            mcode.exp(`Exception setting ${redisKey} value in Redis.`, MODULE_NAME, exp);
        }
    }

    /**
     * @func _redisDrop
     * @memberof mcode.cache
     * @desc Drops a key value from the Redis cache based on the 'key' name.
     * @param {string} redisKey the Redis key to be droppped.
     * @returns {number} the number of keys deleted from the Redis cache.
     * @api public
     * @example
     *     const count = await mcode.redisDrop(keyName);
     */
    async _redisDrop(redisKey)
    {
        return await this.#redis.del(redisKey);
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