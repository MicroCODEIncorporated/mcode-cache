// MicroCODE: define this module's name for  our 'mcode' package
const MODULE_NAME = 'index.test.js';
const list = require('./index.js');
const mcode = require('mcode-log');

// T E S T S
// 1) read file multiple times with time keeping...
describe('mcode.fileRead', () =>
{
    it('mcode.fileRead() should read faster the 2nd time.', () =>
    {
        // Create a spy on console.log
        const consoleSpy = jest.spyOn(console, 'log');

        // Capture the time it takes to read the file the 1st time
        const start1 = Date.now();
        const data1 = mcode.fileRead('index.js');
        const end1 = Date.now();
        const time1 = end - start;
        mcode.info(`Time to read file the 1st time: ${time1}ms`, MODULE_NAME);

        // Capture the time it takes to read the file the 2nd time
        const start2 = Date.now();
        const data2 = mcode.fileRead('index.js');
        const end2 = Date.now();
        const time2 = end - start;
        mcode.info(`Time to read file the 2nd time: ${time2}ms`, MODULE_NAME);

        // Capture the time it takes to read the file the 3rd time
        const start3 = Date.now();
        const data3 = mcode.fileRead('index.js');
        const end3 = Date.now();
        const time3 = end - start;
        mcode.info(`Time to read file the 3rd time: ${time3}ms`, MODULE_NAME);

        // Check that time3 and time2 are less than time1
        expect(time2).toBeLessThan(time1);
        expect(time3).toBeLessThan(time1);

        // Restore the original console.log function
        consoleSpy.mockRestore();
    });
});
