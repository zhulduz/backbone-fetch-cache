/*!
  backbone.fetch-cache v0.1.0
  by Andy Appleton - https://github.com/mrappleton/backbone-fetch-cache.git
 */

(function() {
  // Setup
  var modelFetch = Backbone.Model.prototype.fetch,
      collectionFetch = Backbone.Collection.prototype.fetch,
      supportLocalStorage = typeof window.localStorage !== 'undefined';

  Backbone.fetchCache = (Backbone.fetchCache || {});
  Backbone.fetchCache._cache = (Backbone.fetchCache._cache || {});

  if (typeof Backbone.fetchCache.localStorage === 'undefined') {
    Backbone.fetchCache.localStorage = true;
  }

  // Shared methods
  function setCache(instance, opts) {
    opts = (opts || {});
    var url = _.isFunction(instance.url) ? instance.url() : instance.url,
        expires = false;

    // need url to use as cache key so return if we can't get it
    if (!url) { return; }

    if (opts.expires !== false) {
      expires = (new Date()).getTime() + ((opts.expires || 5 * 60) * 1000);
    }

    Backbone.fetchCache._cache[url] = {
      expires: expires,
      value: instance.toJSON()
    };

    Backbone.fetchCache.setLocalStorage();
  }

  function setLocalStorage() {
    if (!supportLocalStorage || !Backbone.fetchCache.localStorage) { return; }
    localStorage.setItem('backboneCache', JSON.stringify(Backbone.fetchCache._cache));
  }

  function getLocalStorage() {
    if (!supportLocalStorage || !Backbone.fetchCache.localStorage) { return; }
    Backbone.fetchCache._cache = JSON.parse(localStorage.getItem('backboneCache')) || {};
  }

  // Instance methods
  Backbone.Model.prototype.fetch = function(opts) {
    opts = (opts || {});
    var url = _.isFunction(this.url) ? this.url() : this.url,
        data = Backbone.fetchCache._cache[url],
        expired = false,
        attributes = false;

    if (data) {
      expired = data.expires;
      expired = expired && data.expires < (new Date()).getTime();
      attributes = data.value;
    }

    if (!expired && opts.cache && attributes) {
      this.set(attributes, opts);
      if (_.isFunction(opts.success)) { opts.success(this); }
      // Mimic actual fetch behaviour buy returning a fulfulled promise
      return ( new $.Deferred() ).resolve(this);
    }

    // Delegate to the actual fetch method and store the attibutes in the cache
    return modelFetch.apply(this, arguments).done(
      _.bind(Backbone.fetchCache.setCache, null, this, opts)
    );
  };

  Backbone.Collection.prototype.fetch = function(opts) {
    opts = (opts || {});
    var url = _.isFunction(this.url) ? this.url() : this.url,
        data = Backbone.fetchCache._cache[url],
        expired = false,
        attributes = false;

    if (data) {
      expired = data.expires;
      expired = expired && data.expires < (new Date()).getTime();
      attributes = data.value;
    }

    if (!expired && opts.cache && attributes) {
      this[opts.add ? 'add' : 'reset'](this.parse(attributes), opts);
      if (_.isFunction(opts.success)) { opts.success(this); }
      // Mimic actual fetch behaviour buy returning a fulfulled promise
      return ( new $.Deferred() ).resolve(this);
    }

    // Delegate to the actual fetch method and store the attibutes in the cache
    return collectionFetch.apply(this, arguments).done(
      _.bind(Backbone.fetchCache.setCache, null, this, opts)
    );
  };

  // Prime the cache from localStorage on initialization
  getLocalStorage();

  // Exports
  Backbone.fetchCache.setCache = setCache;
  Backbone.fetchCache.setLocalStorage = setLocalStorage;
  Backbone.fetchCache.getLocalStorage = getLocalStorage;
})();