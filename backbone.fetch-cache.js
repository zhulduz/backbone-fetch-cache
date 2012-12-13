// Backbone.Model
(function() {
  var superFetch = Backbone.Model.prototype.fetch;

  Backbone.Model.attributeCache = {};

  Backbone.Model.setCache = function(instance, opts) {
    opts = (opts || {});
    var url = _.isFunction(instance.url) ? instance.url() : instance.url;
   // need url to use as cache key so return if we can't get it
    if (!url) { return; }

    this.attributeCache[url] = {
      expires: (new Date()).getTime() + ((opts.expires || 5 * 60) * 1000),
      value: instance.toJSON()
    };
  };

  // Return cached model attributes if opts.cache == true and the data has
  // already been fetched.
  Backbone.Model.prototype.fetch = function(opts) {
    opts = (opts || {});
    var url = _.isFunction(this.url) ? this.url() : this.url,
        expired = Backbone.Model.attributeCache[url].expired < (new Date()).getTime(),
        attributes = Backbone.Model.attributeCache[url].value;

    if (!expired && opts.cache && attributes) {
      this.set(attributes, opts);
      if (_.isFunction(opts.success)) { opts.success(this); }
      // Mimic actual fetch behaviour buy returning a fulfulled promise
      return ( new $.Deferred() ).resolve(this);
    }

    // Delegate to the actual fetch method and store the attibutes in the cache
    return superFetch.apply(this, arguments).done(
      _.bind(Backbone.Model.setCache, Backbone.Model, this)
    );
  };
})();

// Backbone.Collection
(function() {
  var superFetch = Backbone.Collection.prototype.fetch;

  Backbone.Collection.attributeCache = {};

  // Class methods
  Backbone.Collection.setCache = function(instance, opts) {
    var url = _.isFunction(instance.url) ? instance.url() : instance.url;
   // need url to use as cache key so return if we can't get it
    if (!url) { return; }
    this.attributeCache[url] = instance.toJSON();
  };

  // Instance methods
  Backbone.Collection.prototype.fetch = function(opts) {
    opts = (opts || {});
    var url = _.isFunction(this.url) ? this.url() : this.url,
        attributes = Backbone.Collection.attributeCache[url];

    if (opts.cache && attributes) {
      this[opts.add ? 'add' : 'reset'](this.parse(attributes), opts);
      if (_.isFunction(opts.success)) { opts.success(this); }
      // Mimic actual fetch behaviour buy returning a fulfulled promise
      return ( new $.Deferred() ).resolve(this);
    }

    // Delegate to the actual fetch method and store the attibutes in the cache
    return superFetch.apply(this, arguments).done(
      _.bind(Backbone.Collection.setCache, Backbone.Collection, this)
    );
  };
})();