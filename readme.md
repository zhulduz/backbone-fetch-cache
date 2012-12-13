# Backbone fetch cache

[![Build Status](https://travis-ci.org/mrappleton/backbone-fetch-cache.png?branch=master)](https://travis-ci.org/mrappleton/backbone-fetch-cache)

A Backbone plugin to cache calls to `Backbone.Model.prototype.fetch` and
`Backbone.Model.prototype.fetch` in memory and `localStorage`.

## Usage
Add the script to the page after backbone.js has been included:

```html
<script src="/path/to/backbone.js"></script>
<script src="/path/to/backbone.fetch-cache.js"></script>
```

## Options
### `cache`
Whenever you make a call to `modelInstance.fetch` or `collectionInstance.fetch`
it can be cached by passing `cache: true` in the options hash:

```js
myModel.fetch({ cache: true });
myCollection.fetch({ cache: true });
```

### `expires` (Not yet implemented)

Cache vales expire after 5 minutes by default. You can adjust this by passing
`expires: <seconds>` to the fetch call:

```js
myModel.fetch({ cache: true, expires: 60000 });
myCollection.fetch({ cache: expires: 60000 });
```

### `localStorage` (Not yet implemented)
By default the cache is pesisted in localStorage (if available). Pass
`localStorage: false` in the options hash to disable this:

```js
myModel.fetch({ cache: true, localStorage: false });
myCollection.fetch({ cache: true, localStorage: false });
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
