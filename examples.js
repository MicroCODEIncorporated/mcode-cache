// MicroCODE: define this module's name for  our 'mcode-cache' package
const MODULE_NAME = 'examples.js';
const cache = require('./index.js');
const mcode = require('mcode-log');
const fs = require('fs').promises;


async function testCache()
{
    // 0) dump from Redis if already there..
    const count = await cache.fileDrop('./example.htmx');

    mcode.log(`Dropped ${count} keys from Redis...`, MODULE_NAME);

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

    mcode.log(`Cached file and read 4 times from Redis...`, MODULE_NAME);

    mcode.log({fileContent}, MODULE_NAME);
    mcode.log({fileCached5}, MODULE_NAME);

    const filesMatch = fileContent === fileCached2 && fileCached2 === fileCached3 && fileCached3 === fileCached4 && fileCached4 === fileCached5;

    mcode.log(`All file reads match: ${filesMatch}`, MODULE_NAME);

    // 6) create a custome key:value in Redis...
    const key = "myKey";
    const value = "myValue";
    cache.redisSet(key, value);

    // 7) read the custom key:value from Redis...
    const cacheValue = await cache.redisGet(key, () => {return "myDefaultValue";});

    mcode.log(`Cached custom key:value and read from Redis... ${key}:${cacheValue}`, MODULE_NAME);
}

// run the tests
testCache();

// exit the process after the tests are done...
setTimeout(() =>
{
    process.exit(0);

}, 2000);