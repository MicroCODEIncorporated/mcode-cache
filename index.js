// #region  F I L E
// <copyright file="mcode-cache/index.js" company="MicroCODE Incorporated">Copyright © 2022-2024 MicroCODE, Inc. Troy, MI</copyright><author>Timothy J. McGuire</author>
// #region  M O D U L E

// #region  D O C U M E N T A T I O N
/*
 *      Title:    MicroCODE Shared Function Library
 *      Module:   modules (node_modules/mcode-cache/index.js)
 *      Project:  MicroCODE MERN Applications
 *      Customer: Internal+MIT xPRO Course
 *      Creator:  MicroCODE Incorporated
 *      Date:     January 2022-2024
 *      Author:   Timothy McGuire
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
 *
 *      REFERENCES:
 *      -----------
 *
 *      1. MIT xPRO Course: Professional Certificate in Coding: Full Stack Development with MERN
 *
 *      2. LADDERS® source code: MACRO-11, MACRO-32, C#, and JavaScript.
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
 *
 * NOTE: This module follow's MicroCODE's JavaScript Style Guide and Template JS file, see:
 *
 *       o  https://github.com/MicroCODEIncorporated/JavaScriptSG
 *       o  https://github.com/MicroCODEIncorporated/TemplatesJS
 *
 */

// #endregion

// #region  I M P O R T S

const mcode = require('mcode-log');
const data = require('mcode-data');
const list = require('mcode-list');
const packageJson = require('./package.json');

// #endregion

// #region  T Y P E S

// #endregion

// #region  I N T E R F A C E S

// #endregion

// #region  C O N S T A N T S

// MicroCODE: define this module's name for our 'mcode-log' package
const MODULE_NAME = 'mcode-cache.js';

// define local copy of 'getEnvVar()' for use before 'mcode' is loaded
// this same function is available in 'mcode-env.js' but we need it here without that package

/**
 * @function getEnvVar
 * @memberof mcode
 * @desc a private helper function that returns the value of an environment variable, or a default value if not found.
 * @param {any} key the name of the environment variable to get.
 * @param {any} defaultValue the default value to return if the environment variable is not found.
 * @returns {any} the value of the environment variable, or the default value if not found.
 */
function getEnvVar(key, defaultValue)
{
    if (typeof process !== 'undefined' && process.env && key in process.env)
    {
        return process.env[key];
    }
    return defaultValue;
};

// get our environment variables if we're on a Node.js platform
const theme = getEnvVar('THEME', 'dark'); // default to dark mode
const mode = getEnvVar('NODE_ENV', 'development'); // default to development mode

/**
 * @namespace mcode
 * @desc mcode namespace containing functions and constants
 * - to collect our library into "mcode." within Web Apps via mcode-package.
 */
const mcode = {

    /**
     * @func ready
     * @memberof mcode
     * @desc Logs a message to the Console when the module is loaded to show version.
     */
    ready: function ()
    {
        log.success(`MicroCODE ${MODULE_NAME} v${packageJson.version} is loaded, mode: ${mode}, theme: ${theme}.`, MODULE_NAME);
    },

    /**
     * @func fileRead
     * @memberof mcode
     * @desc Reads a file from 'path' and caches its for future reference. The Redis 'key' generated
     * is based on the 'path' and the server's base URL (which is removed from the 'key' before caching).
     * @api public
     * @param {string} path a standard file system reference to the file to be read..
     * @returns {string} the contents of the file read from 'path'.
     *
     * @example
     *      const path = './data.json';
     *      const data = mcode.fileRead(path);
     *
     * The 1st time 'mcode.fileRead()' is called, the file is read from disk and cached.
     * The 2nd time 'mcode.fileRead()' is called, the file is read from the cache.
     * The 'key' used to cache the file is based on the 'path' and the server's base URL
     * and does not need to be provided by the caller, nor stored by the caller, it is transparent.
     *
     */
    readFile: async function (path)
    {
        // convert the file path into a Redis Key
        const key = filePath.replace(/[\\/]/g, ':'); // Handle both forward and backward slashes

        mcode.debug({filePath}, MODULE_NAME);
        mcode.debug({key}, MODULE_NAME);

        return await redisCache(key, async () =>
        {
            mcode.debug(`Reading file: ${filePath}`, MODULE_NAME);
            return await fs.readFile(filePath, 'utf8');  // direct file system read
        });
    },

    /**
     * @function redisCache
     * @memberof routes.view
     * @desc Caches the results of a callback function in REDIS.
     * @param {string} key - the key to cache.
     * @param {function} cb - the callback function to get fresh value.
     * @returns {Promise} the cached value.
     */
    redisCache: function (key, cb)
    {
        mcode.debug({redis}, MODULE_NAME);

        return new Promise(async (resolve, reject) =>
        {
            mcode.debug({key}, MODULE_NAME);

            if (!redis.connected)
            {
                mcode.error(`Redis client is not connected. Bypassing cache for key: ${key}`, MODULE_NAME);

                // Redis is not connected; directly return the result from the callback
                try
                {
                    const res = await cb();
                    return resolve(res);
                }
                catch (exp)
                {
                    return reject(exp);
                }
            }

            try
            {
                redis.get(key, async (err, data) =>
                {
                    if (err)
                    {
                        mcode.error(`Failed to get REDIS key ${key}:`, MODULE_NAME, err);

                        // Redis error; directly return the result from the callback
                        const fallbackResult = await cb();
                        return resolve(fallbackResult);
                    }

                    if (data)
                    {
                        // Cache hit
                        return resolve(JSON.parse(data));
                    }

                    // Cache miss: execute the callback to get fresh data
                    try
                    {
                        const res = await cb();
                        resolve(res);

                        // Set the key:value into REDIS cache with TTL (Time To Live) expiration
                        redis.setex(key, REDIS_TTL, JSON.stringify(res), (err) =>
                        {
                            if (err)
                            {
                                mcode.error(`Failed to set REDIS key ${key}:`, MODULE_NAME, err);
                            }
                        });
                    }
                    catch (exp)
                    {
                        mcode.exp(`Crashed while executing callback for key ${key}:`, MODULE_NAME, exp);
                        return reject(exp); // Reject if callback execution fails
                    }
                });
            }
            catch (exp)
            {
                mcode.exp(`Crashed accessing REDIS for key ${key}:`, MODULE_NAME, exp);

                // Fallback to callback if Redis access fails
                cb().then(resolve).catch(reject);
            }
        });
    },

};

// #endregion

// #region  M E T H O D - E X P O R T S

// Immediately Invoked Function Expression (IIFE) invoked on 'this' which
// represents the global object(window in a browser, global in Node.js).
// This IIFE returns the 'mcode' object to be assigned to the global object.
// The Universal Module Definition (UMD) pattern supports Asynchronous Module Definition (AMD),
// CommonJS / Node.js, and Browser 'global' usage.
(
    /**
     * @function (IIFE)
     * @description Universal Module Definition (UMD) to support AMD, CommonJS/Node.js, and browser global
     * @param {any} root the global object (window, self, global, etc.) being updated.
     * @param {any} factory a function that returns the exports of the module. This function is invoked in
     * the context of the global object when the module is loaded. The return value of this function is used
     * as the exported value of the module when it's not being used with AMD or Node.js module systems.
     * This function is where you define what your module exports.
     */
    function (root, factory)
    {
        if (typeof define === 'function' && define.amd)
        {
            // AMD. Register as an anonymous module.
            define([], factory);
        }
        else if (typeof module === 'object' && module.exports)
        {
            // Node. Does not work with strict CommonJS, but
            // only CommonJS-like environments that support module.exports, like Node.
            module.exports = factory();
        }
        else
        {
            // Browser globals (root is 'window')
            root.mcode = factory();
        }

    }(  // root: the global object (window, self, global, etc.)
        (typeof self !== 'undefined') ? self : this,

        // factory: a function that returns the exports of the module
        function () {return mcode;})
);

// #endregion

// #endregion
// #endregion