// Backbone.Model
(function() {
  var superFetch = Backbone.Model.prototype.fetch;

  Backbone.Model.attributeCache = {};

  Backbone.Model.setCache = function(instance) {
    var url = _.isFunction(instance.url) ? instance.url() : instance.url;
   // need url to use as cache key so return if we can't get it
    if (!url) { return; }
    this.attributeCache[url] = instance.toJSON();
  };

  // Return cached model attributes if opts.cache == true and the data has
  // already been fetched.
  Backbone.Model.prototype.fetch = function(opts) {
    opts = (opts || {});
    var url = _.isFunction(this.url) ? this.url() : this.url,
        attributes = Backbone.Model.attributeCache[url];

    if (opts.cache && attributes) {
      this.set(attributes, opts);
      if (_.isFunction(opts.success)) { opts.success(this); }
      // Mimic actual fetch behaviour buy returning a fulfulled promise
      return ( new $.Deferred() ).resolve(this);
    }

    // Delegate to the actual fetch method and store the attibutes in the cache
    superFetch.apply(this, arguments).done(
      _.bind(Backbone.Model.setCache, Backbone.Model, this)
    )
  };
})();

// Backbone.Collection
(function() {
  var superFetch = Backbone.Collection.fetch;

  Backbone.Collection.attributeCache = {};

  // Class methods
  Backbone.Collection.setCache = function() {

  };

  // Instance methods
  Backbone.Collection.prototype.fetch = function() {
    superFetch.apply(this, arguments);
  };
})();