# Backbone fetch cache

[![Build Status](https://travis-ci.org/mrappleton/backbone-fetch-cache.png?branch=master)](https://travis-ci.org/mrappleton/backbone-fetch-cache)

A Backbone plugin to cache calls to `Backbone.Model.prototype.fetch` and
`Backbone.Model.prototype.fetch` in memory and `localStorage`.

## How it works
This plugin intercepts calls to `fetch` and stores the results in a cache object (`Backbone.fetchCache._cache`). If fetch is called with `{ cache: true }` in the options and the URL has already been cached the AJAX call will be skipped.

The local cache is persisted in `localStorage` if available for faster initial page loads.

## What's wrong with browser caching for AJAX responses?
Nothing. This plugin is primarily for working with an API where you don't have control over response cache headers.

## Usage
Add the script to the page after backbone.js has been included:

```html
<script src="/path/to/backbone.js"></script>
<script src="/path/to/backbone.fetch-cache.js"></script>
```

## Options
### `cache`
Calls to `modelInstance.fetch` or `collectionInstance.fetch` will be fulfilled from the cache (if possible) when `cache: true` is set in the options hash:

```js
myModel.fetch({ cache: true });
myCollection.fetch({ cache: true });
```

### `expires`

Cache vales expire after 5 minutes by default. You can adjust this by passing
`expires: <seconds>` to the fetch call. Set to `false` to never expire:

```js
myModel.fetch({ cache: true, expires: 60000 });
myCollection.fetch({ cache: expires: 60000 });

// These will never expire
myModel.fetch({ cache: true, expires: false });
myCollection.fetch({ cache: expires: false });
```

### `localStorage`
By default the cache is persisted in localStorage (if available). Set `Backbone.fetchCache.localStorage = false` to disable this:

```js
Backbone.fetchCache.localStorage = false;
```

## Tests
You can run the tests by cloning the repo, installing the dependencies and
running `grunt jasmine`:

```
$ npm install
$ grunt jasmine
```

To see the tests in a browser, run:

```
$ grunt jasmine-server
```

The default grunt task runs tests and lints the code.

```
$ grunt
```
