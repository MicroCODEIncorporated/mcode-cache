// MicroCODE: define this module's name for  our 'mcode-cache' package
const MODULE_NAME = 'examples.js';
const cache = require('./index.js');
const mcode = require('mcode-log');
const fs = require('fs').promises;


/**
 * @function testCache
 * @memberof examples
 * @desc Demonstrates file caching and immutable scoped node-cache handles.
 * @returns {Promise<void>}
 */
async function testCache()
{
    // 0) remove the file from Cache if already there...
    const count = await cache.fileDrop('./example.htmx');

    mcode.log(`Dropped ${count} keys from Cache...`, MODULE_NAME);

    // 1) straight read of a file...
    const fileContent = await fs.readFile('./example.htmx', 'utf8');

    // 2) read a file and cache it with an automatic key...
    const fileCached2 = await cache.fileRead('./example.htmx', 'utf8');

    // 3) read a file and cache it with an automatic key...
    const fileCached3 = await cache.fileRead('./example.htmx', 'utf8');

    // 4) read a file and cache it with an automatic key...
    const fileCached4 = await cache.fileRead('./example.htmx', 'utf8');

    // 5) read a file and cache it with an automatic key...
    const fileCached5 = await cache.fileRead('./example.htmx', 'utf8');

    mcode.log(`Cached file and read 4 times from Cache...`, MODULE_NAME);

    mcode.log({fileContent}, MODULE_NAME);
    mcode.log({fileCached5}, MODULE_NAME);

    const filesMatch = fileContent === fileCached2 && fileCached2 === fileCached3 && fileCached3 === fileCached4 && fileCached4 === fileCached5;

    mcode.log(`All file reads match: ${filesMatch}`, MODULE_NAME);

    // 6) create an immutable scoped namespace handle for new code...
    const exampleCache = cache.addNamespace({
        name: 'Example',
        type: 'node'
    });

    // 7) write and read a typed value without changing cache.cacheNamespace...
    await exampleCache.cacheSet('myKey', {
        value: 'myValue',
        cached: true
    }, {
        noExpiry: true
    });
    const cacheValue = await exampleCache.cacheGet('myKey');

    mcode.log({cacheValue}, MODULE_NAME);

    // 8) close all package-owned resources during application shutdown...
    await cache.closeNamespace();
}

// Run the examples and report an actionable failure without forcing process exit.
testCache().catch(error =>
{
    mcode.exp('mcode-cache examples failed.', MODULE_NAME, error);
    process.exitCode = 1;
});
