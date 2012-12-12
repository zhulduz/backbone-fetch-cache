// Backbone.Model
(function() {
  var superFetch = Backbone.Model.prototype.fetch;

  Backbone.Model.attributeCache = {};

  // Class methods
  Backbone.Model.setCache = function() {

  };

  // Instance methods
  Backbone.Model.prototype.fetch = function() {
    superFetch.apply(this, arguments);
  };
})();

// Backbone.Collection
(function() {
  var superFetch = Backbone.Collection.fetch;

  Backbone.Collection.attributeCache = {};

  // Class methods
  Backbone.Model.setCache = function() {

  };

  // Instance methods
  Backbone.Collection.prototype.fetch = function() {
    superFetch.apply(this, arguments);
  };
})();