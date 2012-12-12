describe('Backbone.Model', function() {
  beforeEach(function() {
    this.model = new Backbone.Model();
    this.model.url = '/model-cache-test';
    // TODO: Use sinon to fake xhr requests
  });

  describe('.setCache', function() {
    it('noops if the instance does not have a url', function() {
      this.model.url = null;
      Backbone.Model.setCache(this.model);
      expect(Backbone.Model.attributeCache[this.model.constructor.name]).toBeUndefined();
    });

    it('separates cache keys by Class name', function() {
      Backbone.Model.setCache(this.model);
      expect(Backbone.Model.attributeCache[this.model.constructor.name]).toBeDefined();
    });

    it('keys cache items by URL',function() {
      Backbone.Model.setCache(this.model);
      expect(Backbone.Model.attributeCache[this.model.constructor.name][this.model.url])
        .toEqual(this.model.toJSON());
    });


  });

  describe('.prototype.fetch', function() {
    it('saves returned attributes to the attributeCache', function() {
      this.model.fetch();
      expect(Backbone.Model.attributeCache[this.model.constructor.name][this.model.url])
        .toEqual(this.model.toJSON());
    });

    it('returns data from the cache if cache: true is set', function() {
      var cacheData = { cheese: 'pickle' };
      Backbone.Model.attributeCache[this.model.constructor.name][this.model.url] = cacheData;
      this.model.fetch({ cache: true });
      expect(this.model.toJSON()).toEqual(cacheData);
    });

    it('does not return cache data if cache: false is set', function() {
      var cacheData = { cheese: 'pickle' };
      Backbone.Model.attributeCache[this.model.constructor.name][this.model.url] = cacheData;
      this.model.fetch({ cache: false });
      expect(this.model.toJSON()).not.toEqual(cacheData);
    });

    it('calls success callback on a cache hit', function() {
      var success = jasmine.createSpy('success'),
          cacheData = { cheese: 'pickle' };
      Backbone.Model.attributeCache[this.model.constructor.name][this.model.url] = cacheData;

      this.model.fetch({ cache: true, success: success });

      expect(success).toHaveBeenCalledWith(this.model);
    });

    it('returns a fulfilled promise on a cache hit', function() {
      var cacheData = { cheese: 'pickle' },
          promise;
      Backbone.Model.attributeCache[this.model.constructor.name][this.model.url] = cacheData;
      promise = this.model.fetch({ cache: true });

      expect(promise).toBeAPromise();
      expect(promise).toBeResolved();
    });

    it('returns a promise with the correct context on a cache hit', function() {
      var cacheData = { cheese: 'pickle' },
          spy = jasmine.createSpy('success');

      Backbone.Model.attributeCache[this.model.constructor.name][this.model.url] = cacheData;

      this.model.fetch({ cache: true }).done(spy);

      expect(spy).toHaveBeenCalledWith(this.model);
    });
  });
});