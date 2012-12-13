describe('Backbone.Model', function() {
  beforeEach(function() {
    this.model = new Backbone.Model();
    this.model.url = '/model-cache-test';

    // Mock xhr resposes
    this.server = sinon.fakeServer.create();
    this.response = { sausages: 'bacon' };
    this.server.respondWith('GET', this.model.url, [
      200,
      { "Content-Type": "application/json" },
      JSON.stringify(this.response)
    ]);
  });

  afterEach(function() {
    this.server.restore();
  });

  describe('.setCache', function() {
    it('noops if the instance does not have a url', function() {
      this.model.url = null;
      Backbone.Model.setCache(this.model);
      expect(Backbone.Model.attributeCache[this.model.url]).toBeUndefined();
    });

    it('keys cache items by URL',function() {
      Backbone.Model.setCache(this.model);
      expect(Backbone.Model.attributeCache[this.model.url]).toEqual(this.model.toJSON());
    });


  });

  describe('.prototype.fetch', function() {
    it('saves returned attributes to the attributeCache', function() {
      this.model.fetch();
      this.server.respond();
      expect(Backbone.Model.attributeCache[this.model.url]).toEqual(this.model.toJSON());
    });

    it('returns data from the cache if cache: true is set', function() {
      var cacheData = { cheese: 'pickle' };
      Backbone.Model.attributeCache[this.model.url] = cacheData;
      this.model.fetch({ cache: true });
      expect(this.model.toJSON()).toEqual(cacheData);
    });

    it('does not return cache data if cache: true is not set', function() {
      var cacheData = { cheese: 'pickle' };
      Backbone.Model.attributeCache[this.model.url] = cacheData;

      this.model.fetch();
      this.server.respond();

      expect(this.model.toJSON()).not.toEqual(cacheData);
      expect(this.model.toJSON()).toEqual(this.response);
    });

    it('calls success callback on a cache hit', function() {
      var success = jasmine.createSpy('success'),
          cacheData = { cheese: 'pickle' };
      Backbone.Model.attributeCache[this.model.url] = cacheData;

      this.model.fetch({ cache: true, success: success });

      expect(success).toHaveBeenCalledWith(this.model);
    });

    it('returns a fulfilled promise on a cache hit', function() {
      var cacheData = { cheese: 'pickle' },
          promise;
      Backbone.Model.attributeCache[this.model.url] = cacheData;
      promise = this.model.fetch({ cache: true });

      expect(promise).toBeAPromise();
      expect(promise).toBeResolved();
    });

    it('returns a promise with the correct context on a cache hit', function() {
      var cacheData = { cheese: 'pickle' },
          spy = jasmine.createSpy('success');

      Backbone.Model.attributeCache[this.model.url] = cacheData;

      this.model.fetch({ cache: true }).done(spy);

      expect(spy).toHaveBeenCalledWith(this.model);
    });
  });
});