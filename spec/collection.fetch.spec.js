describe('Backbone.Collection', function() {
  beforeEach(function() {
    this.collection = new Backbone.Collection();
    this.collection.url = '/collection-cache-test';

    // Mock xhr resposes
    this.server = sinon.fakeServer.create();
    this.response = [{ sausages: 'bacon' }, { rice: 'peas' }];
    this.server.respondWith('GET', this.collection.url, [
      200,
      { "Content-Type": "application/json" },
      JSON.stringify(this.response)
    ]);
  });

  afterEach(function() {
    Backbone.Collection.attributeCache = {};
    this.server.restore();
  });

  describe('.setCache', function() {
    it('noops if the instance does not have a url', function() {
      this.collection.url = null;
      Backbone.Collection.setCache(this.collection);
      expect(Backbone.Collection.attributeCache).toEqual({});
    });

    it('keys cache items by URL', function() {
      Backbone.Collection.setCache(this.collection);
      expect(Backbone.Collection.attributeCache[this.collection.url].value)
        .toEqual(this.collection.toJSON());
    });

    describe('cache expiry', function() {
      beforeEach(function() {
        this.clock = sinon.useFakeTimers();
      });

      afterEach(function() {
        this.clock.restore();
      });

      it('sets default expiry times for cache keys', function() {
        Backbone.Collection.setCache(this.collection, { cache: true });
        expect(Backbone.Collection.attributeCache[this.collection.url].expires)
          .toEqual((new Date()).getTime() + (5* 60 * 1000));
      });

      it('sets expiry times for cache keys', function() {
        var opts = { cache: true, expires: 1000 };
        Backbone.Collection.setCache(this.collection, opts);
        expect(Backbone.Collection.attributeCache[this.collection.url].expires)
          .toEqual((new Date()).getTime() + (opts.expires * 1000));
      });
    });
  });

  describe('.prototype.fetch', function() {
    it('saves returned attributes to the attributeCache', function() {
      this.collection.fetch();
      this.server.respond();
      expect(Backbone.Collection.attributeCache[this.collection.url].value)
        .toEqual(this.collection.toJSON());
    });

    it('returns data from the cache if cache: true is set', function() {
      var cacheData = [{ cheese: 'pickle' }, { salt: 'vinegar' }];
      Backbone.Collection.attributeCache[this.collection.url] = {
        value: cacheData,
        expires: (new Date()).getTime() + (5* 60 * 1000)
      };
      this.collection.fetch({ cache: true });
      expect(this.collection.toJSON()).toEqual(cacheData);
    });

    it('does not return cache data if cache: true is not set', function() {
      var cacheData = [{ cheese: 'pickle' }, { salt: 'vinegar' }];
      Backbone.Collection.attributeCache[this.collection.url] = {
        value: cacheData,
        expires: (new Date()).getTime() + (5* 60 * 1000)
      };

      this.collection.fetch();
      this.server.respond();

      expect(this.collection.toJSON()).not.toEqual(cacheData);
      expect(this.collection.toJSON()).toEqual(this.response);
    });

    it('does not return cache data if the cache item is stale', function() {
      var cacheData = { cheese: 'pickle' };
      Backbone.Collection.attributeCache[this.collection.url] = {
        value: cacheData,
        expires: (new Date()).getTime() - (5* 60 * 1000)
      };

      this.collection.fetch();
      this.server.respond();

      expect(this.collection.toJSON()).not.toEqual(cacheData);
      expect(this.collection.toJSON()).toEqual(this.response);
    });

    it('calls add according to options on a cache hit', function() {
      var cacheData = [{ cheese: 'pickle' }, { salt: 'vinegar' }],
          options = { cache: true, add: true };

      spyOn(this.collection, 'add');
      Backbone.Collection.attributeCache[this.collection.url] = {
        value: cacheData,
        expires: (new Date()).getTime() + (5* 60 * 1000)
      };

      this.collection.fetch(options);

      expect(this.collection.add).toHaveBeenCalledWith(cacheData, options);
    });

    it('calls reset according to options on a cache hit', function() {
      var cacheData = [{ cheese: 'pickle' }, { salt: 'vinegar' }],
          options = { cache: true, add: false };

      spyOn(this.collection, 'reset');
      Backbone.Collection.attributeCache[this.collection.url] = {
        value: cacheData,
        expires: (new Date()).getTime() + (5* 60 * 1000)
      };

      this.collection.fetch(options);

      expect(this.collection.reset).toHaveBeenCalledWith(cacheData, options);
    });

    it('calls success callback on a cache hit', function() {
      var success = jasmine.createSpy('success'),
          cacheData = [{ cheese: 'pickle' }, { salt: 'vinegar' }];

      Backbone.Collection.attributeCache[this.collection.url] = {
        value: cacheData,
        expires: (new Date()).getTime() + (5* 60 * 1000)
      };

      this.collection.fetch({ cache: true, success: success });

      expect(success).toHaveBeenCalledWith(this.collection);
    });

    it('returns a fulfilled promise on a cache hit', function() {
      var cacheData = [{ cheese: 'pickle' }, { salt: 'vinegar' }],
          promise;

      Backbone.Collection.attributeCache[this.collection.url] = {
        value: cacheData,
        expires: (new Date()).getTime() + (5* 60 * 1000)
      };
      promise = this.collection.fetch({ cache: true });

      expect(promise).toBeAPromise();
      expect(promise).toBeResolved();
    });

    it('returns an unfulfilled promise on a cache miss', function() {
      var promise = this.collection.fetch();
      expect(promise).toBeAPromise();
      expect(promise).toBeUnresolved();
    });

    it('returns a promise with the correct context on a cache hit', function() {
      var cacheData = [{ cheese: 'pickle' }, { salt: 'vinegar' }],
          spy = jasmine.createSpy('success');

      Backbone.Collection.attributeCache[this.collection.url] = {
        value: cacheData,
        expires: (new Date()).getTime() + (5* 60 * 1000)
      };

      this.collection.fetch({ cache: true }).done(spy);

      expect(spy).toHaveBeenCalledWith(this.collection);
    });

  });
});