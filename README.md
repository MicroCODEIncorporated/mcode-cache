# MicroCODE's 'mcode-cache' package
A public NPM Package of our internal data caching tools for Frontend and Backend JavaScript NodeJS projects.

This is an extremely 'light weight' package with dependencies on our internal 'data' and 'log' packages and on node-cache and Redis for an optional caches.


## Description

This is our own internal data caching code for common operations like caching files contents, data structures, lists (for out mcode-list processing), and automatic key creation and standardization.


* To demo, from the CLI in the package folder...

```
> node examples
```

* Example of package use...

<p align="left"><img src=".\.github\images\mcode-cache-example-calls.png" width="720" title="List Calls..." border=1px></p>

* Corresponding results (logged to console by our **mcode-log** functions)...

<p align="left"><img src=".\.github\images\mcode-cache-example-results.png" width="720" title="List Results..." border=1px></p>


## Dependencies

* **Production**
1) mcode-log - our standard logging package (_just for displaying errors or test results_)
2) node-cache - an in memory local/app private cache from Node.js.
3) Redis - Remote Dictionary Server, the standard community addition.

* **Development**
1) Node.js - standard runtime environment
2) JSDocs - our preferred JavaScript documentation system
3) Jest.js - our preferred JavaScript testing framework


## Usage

When using data caching it's best to start with a good definition of the objects your App will cache and why.
<br>
<br>
**USE CASE #1**: Files, for speed. When a Web App frequently goes to disk, HDD or SSD, to serve clients
there is inherent latency. Automatically caching these frequenlty used files in RAM and serving them from there is typically 10X faster.

Normal, uncached code retrieving a file...
```
        const iconContent = await fs.fileRead(iconPath, 'utf8');
                                  -----------
```
To cache for repeated usage with our package, just chnage "fs.readFile()" to "mcode.fileRead()"...
```
        const iconContent = await mcode.fileRead(iconPath, 'utf8');
                                  --------------
```
...this does four (4) things within one line change:
1) Automatically generates a unique Cache Key under your App's namespace representing this file.
2) Reads and returns the file contents.
3) Caches the file for subsequent use.
4) Retrieves the file from cache in the future with the exact same line of code in your app.
<br>
<br>
Note what you did **not** have to do...

* No creation of a unique key required in your code.
* No explicit code to conditionally retrieve from cache vs. read the file.
* No storage of the key in your code to benefit from the caching, just read the same file path again with "mcode.fileRead()"
<br>
<br>

**USE CASE #2**: Context, for speed. When building a rich App a large part of the UX is context,
the feeling that the App knows (and remembers) what you are doing. This is held in two forms of memory analogous tohuman 'short term' and 'long term' memory...

* CONTEXT - 'short term' memory - breadcrumbs, App module, forward/back navigation, etc.
* CONFIGURATION - 'long term' memory - user preferences, app settings, etc.

Both of these shoudl be cached, with different Time-To-Live (TTL), and different invalidation schemes.
This is all handling in a standard way in our package, for our App designs.
<br>
<br>

**USE CASE #3**: Database, for speed. Because anything you can retrieve from RAM instead of the disk based DB
will be at 10X to 50X faster.
<br>
<br>
## Installing

* Get to a terminal session in the local repo folder of your project.
* Use 'npm install' to load the package. It can be used 'stand-alone'...
```
npm install mcode-cache
```


## Testing

This package includes a simple demo module: **examples.js**.
Running it directly will show you a set of examples for using **fileRead()** and **fileChange()**.

* From your project directory after installation...
```
node .\node_modules\mcode-cache\examples
```
...this will demonstrate thru console logging various uses of the mcode-cache functions.

* To test with **JEST**:
* From the **mcode-cache** package directory...
```
npm install --save-dev jest
npm test
```

* A view of the JEST tests in the console...

<p align="left"><img src=".\.github\images\mcode-cache-jest.png" width="720" title="Jest Results..." border=1px></p>


## Included Functions

These are the functions we want at the ready in any module for development and debug.

| Function	        | Description                                                                | Usage                     |
|-------------------|----------------------------------------------------------------------------|---------------------------|
|                   |                                                                            |
| General           |                                                                            |                           |
| **addNamespace**  | Creates a new Namespace--in Node or Redis--for caching or accessing data.  | mcode.addNamespace(({name: 'MicroCODE', type: 'node'})
| **cacheGet**      | Gets the value of a Key from the Cache, from App's namespace.              | value = mcode.cacheGet(key, defaultCallback)
| **cacheSet**      | Sets the value of a Key from the Cache, in App's namespace.                | mcode.cacheSet(key, value)
| **cacheDrop**     | Drops a key from the Cache.                                                | count = mcode.cacheDrop(key)
| **cacheDropAll**  | Drops all keys from a namespace in the Cache, defaults to current.         | count = mcode.cacheDropAll({cache: 'redis', namespace: 'GM-GPS-eMITS-DB', pattern: '*'})
| **cacheListAll**  | Lists all keys from a namespace in the Cache, defaults to current.         | array = mcode.cacheListAll({cache: 'node', namespace: '*', pattern: '*'})
| **cacheMakeKey**  | Generates a well formatted Cache Key form a resource key.                  | key = mcode.cacheMakeKey(key)
| **cacheOn**       | Turns the caching of Node data ON. (The default state).                    | void mcode.cacheOn()
| **cacheOff**      | Turns the caching of Node data OFF. (For active development).              | void mcode.cacheOff()
| **redisOn**       | Turns the caching of Redis data ON. (The default state).                   | void mcode.redisOn()
| **redisOff**      | Turns the caching of Redis data OFF. (For active development).             | void mcode.redisOff()
| **cacheClose**    | Closes the Node and Redis caches, and the connection to the Redis Server.  | void mcode.cacheClose(path)
|                   |                                                                            |
| File Specific     | These directly replace fs.readFile('filepath', 'encoding')                 |                           |
| **fileRead**      | Reads a file from storage with a standard 'path' and caches it.            | contents = mcode.fileRead(path, encoding)
| **fileWrite**     | Writes a file to storage with a standard 'path' and caches it.             | state = mcode.writeRead(path, contents, encoding)
| **fileDrop**      | Invalidates a standard 'path', forcing a fresh read/cache on next access.  | count = mcode.fileDrop(path)
| **fileMakeKey**   | Generates a well formatted Cache Key from a standard file path.            | key = mcode.fileMakeKey(path)
| **fileGetRoot**   | Gets the root directory for Cache Keys based on app's execution path.      | path = mcode.fileGetRoot(path)


## Included Properties

These are the properties for interacting with the mcode-cache instance.

| Property	         | Description                                                                | Usage                     |
|--------------------|----------------------------------------------------------------------------|---------------------------|
| **cacheNamespaces**| The active namespaces and there types (Node or Redis).                     | const namespaces = await mcode.cacheNamespaces;
| **cacheReady**     | The Cache is ready for use, Redis online, Namespace is established.        | if (mcode.cacheReady)     |
| **cacheTTL**       | The current Time-To-Live, the expiration in milliseconds of current tags.  | mcode.cacheTTL = 30000    |
| **redisURL**       | The network address of the Redis Server, 'redis://<ip>:<port>.             | mcode.redisURL = 'redis://127.0.0.1:6379'
| **cacheNamespace** | The namespace for all tags until changed, defaults to 'MicroCODE'.         | mcode.cacheNamespace = 'MyAppName'
| **cacheEnabled**   | The current state of Node namespace caching, True = Caching is ON.         | if (mcode.cacheEnabled)
| **redisEnabled**   | The current state of Redis namespace caching, True = Caching is ON.        | if (mcode.redisEnabled)


<p>&nbsp;</p>

## Documentation

We believe is explicit code documentation, for other users, and for our 'future selves'.<br>
JSDocs is a standardized system for documenting functions and data structures that produces three (3) primary outputs:

1) Inline documentation for the coder.
2) Intellisense popup documentation for the coder for every function.
3) External 'reference manual' documentation for your entire code base, if used consistently.

* This entire project--like all our projects--is documented with **JSDocs**.

* To install JSDocs use, get to a terminal session in the project folder...
```
npm install --save-dev jsdoc
```
* Configure JSDoc processing in...
```
jsdoc.json
```
* To regenerate the JSDocs from all source code, use the following command (from the project root directory)...
```
jsdoc -c .jsdoc.json
```

...then open ./docs/index.html

<p align="left"><img src=".\.github\images\mcode-cache-jsdocs.png" width="720" title="JSDocs..."></p>


## Help

Contact Timothy McGuire, support@mcode.com.


## Terminology

| Word or Acronym	| Description/Definition                                |
|-------------------|-------------------------------------------------------|
|  **NPM**	        | Node Package Manager, actually “Node PM”, “Node pkgmakeinst” a system to deploy, install, and maintain NodeJS Apps. (PM was a BASH utility).
|  **NVM**	        | Node Version Manager, a tool that supports changing NodeJS versions.
|  **MERN**         | MongoDB, Express, React, Node JS.
|  **MongoDB**      | A ‘NoSQL’ database designed for Cloud applications, also referred to as a ‘Document Store’.
|  **Express**      | Express is *not* a database but rather an ‘extensible routing language’ for communication between a Client and a Server.
|  **React**        | A Web UI development system, a JavaScript library developed by Facebook and made public—and Open Source—since 2013.
|  **Redis**        | A Remote Dictionary Server, a standard through the web development industry.
|  **node-cache**   | The Node.js Cache for 'in app' caching on the App's own server.
|  **Node.js**      | A development stack that executes from a local file store—on a local Server—instead of from a network of servers.
|  **JSDocs**       | A toolset to automatically generate API-style documentation from source code tagging.


## Authors

Contributor's names and contact info...

* Timothy McGuire [@TimothyMcGuire](https://twitter.com/TimothyMcGuire) - Founder, President-CEO of MicroCODE, Inc. a software and controls engineering company in Detroit, Michigan USA.


## Version History

* v0.6.3
    - Added USER and PASSWORD to optional REDIS Params for connection.
* v0.6.2
    - Updated mcode-data to v0.5.5 and mcode-log to v0.5.5
* v0.6.1
    - Corrected 'cacheGet()' and documented the optional callback for a default methd.
* v0.6.0
   - Added support for multiple caches: node-cache (new default), and kept Redis as an option.
   - One of the original purposes of this package was easy/fast data caching within an App,
     having to go to a network connected Redis defeats that purpose and so we added node-cache as the default.
   - This is BREAKING change, several functions now require parameters for distinguishing which cache is being referenced.
* v0.5.5
   - Remove debug logging.
* v0.5.4
   - Added Cache control for testing and debug: redisCaching, redisCacheOn(), redisCacheOff().
* v0.5.3
   - Corrected a namespace prefixing error.
* v0.5.0 - 0.5.2
    - All 'mcode-*' packages updated with 'ready()' only implemented in 'mcode-log'.
* v0.4.0
    - made public and synchronized into mcode-package along with mcode-data, mcode-log, mcode-list.
* v0.0.5
    - made public to test integration - NOT READY FOR USE.
* v0.0.4
    - Updated README, uninstalled JSDocs and Jest for publishing.
* v0.0.3
    - Corrected JSDocs and Jest to DEV ONLY dependencies.
* v0.0.2
    - Added JSDocs, Jest and updated README.
* v0.0.1
    - Initial movement of our internal code into an NPM package for ease of use in other projects.

## Future Development

* v0.1.*
    - Any additional core code we will develop for general list processing work.
    - Complex function execution with passed arguments or passed functions.


## License

This project is licensed under the MIT License - see the LICENSE.md file for details


## MicroCODE Mantra

MicroCODE, Inc. was founded in 1987 as a controls engineering and software development company.<br>
We specialize in manufacturing and quality control applications that must run 24x7x365 for years at a time.

Our slogan, distilled from over three decades of developing, testing, installing, and supporting 24x7x365
manufacturing applications, is..

<p align="left"><img src=".\.github\images\hail-caesar.png" width="720" title="Hail Caesar!"></p>
