// MicroCODE: define this module's name for our 'mcode' package
const MODULE_NAME = 'index.test.js';
const cache = require('./index.js');
const mcode = require('mcode-log');
const testFile = './index.js';

// T E S T S
// 1) read file multiple times with time keeping...
describe('mcode-cache: file read and cache operations', () =>
{
    let consoleSpy;
    let time1, time2, time3, time4;

    beforeAll(async () =>
    {
        // Create a spy on console.log
        consoleSpy = jest.spyOn(console, 'log');

        // wait for the cache to be ready...
        const maxRetries = 30;
        let retries = 0;

        while (!cache.redisReady && retries < maxRetries)
        {
            mcode.log('Waiting for cache to be ready...', MODULE_NAME);
            await new Promise(resolve => setTimeout(resolve, 1000));
            retries++;
        }

        if (!cache.redisReady)
        {
            throw new Error('Cache not ready after waiting for 30 seconds.');
        }
        else
        {
            mcode.log('Cache is ready!', MODULE_NAME);
        }
    });

    afterAll(async () =>
    {
        // Restore the original console.log function after all tests
        consoleSpy.mockRestore();

        // Close connections
        if (cache.redisReady)
        {
            await cache.redisClose();
        }
    });

    it('cache.fileRead() should read faster the 2nd time.', async () =>
    {
        // Drop the file from the cache if it is already there
        const count = await cache.fileDrop(testFile);
        if (count > 0)
        {
            mcode.info(`Dropped file, '${testFile}', ${count} key(s) from Redis...`, MODULE_NAME);
        }

        // Capture the time it takes to read the file the 1st time
        const start1 = Date.now();
        const data1 = await cache.fileRead(testFile);
        const end1 = Date.now();
        time1 = end1 - start1;
        mcode.info(`Time to read file the 1st time: ${time1}ms`, MODULE_NAME);

        // Capture the time it takes to read the file the 2nd time
        const start2 = Date.now();
        const data2 = await cache.fileRead(testFile);
        const end2 = Date.now();
        time2 = end2 - start2;
        mcode.info(`Time to read file the 2nd time: ${time2}ms`, MODULE_NAME);

        expect(time2).toBeLessThan(time1);
    });

    it('cache.fileRead() should read faster the 3rd time.', async () =>
    {
        // Capture the time it takes to read the file the 3rd time
        const start3 = Date.now();
        const data3 = await cache.fileRead(testFile);
        const end3 = Date.now();
        time3 = end3 - start3;
        mcode.info(`Time to read file the 3rd time: ${time3}ms`, MODULE_NAME);

        expect(time3).toBeLessThan(time1);
    });

    it('cache.fileRead() should read faster the 4th time.', async () =>
    {
        // Capture the time it takes to read the file the 3rd time
        const start4 = Date.now();
        const data4 = await cache.fileRead(testFile);
        const end4 = Date.now();
        time4 = end4 - start4;
        mcode.info(`Time to read file the 4th time: ${time4}ms`, MODULE_NAME);

        expect(time4).toBeLessThan(time1);
    });

    it('create a custome key:value and get it back.', async () =>
    {
        const key = "myKey";
        const value = "myValue";
        cache.redisSet(key, value);

        const cacheValue = await cache.redisGet(key, () => {return "myDefaultValue";});
        mcode.info(`Cached custom key:value and read from Redis... ${key}:${cacheValue}`, MODULE_NAME);

        expect(cacheValue).toBe(value);
    });
});
