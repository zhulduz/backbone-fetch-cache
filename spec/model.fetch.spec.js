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
    Backbone.Model.attributeCache = {};
    localStorage.clear('modelCache');
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
      expect(Backbone.Model.attributeCache[this.model.url].value).toEqual(this.model.toJSON());
    });

    it('calls setLocalStorage', function() {
      spyOn(Backbone.Model, 'setLocalStorage');
      Backbone.Model.setCache(this.model);
      expect(Backbone.Model.setLocalStorage).toHaveBeenCalled();
    });

    describe('cache expiry', function() {
      beforeEach(function() {
        this.clock = sinon.useFakeTimers();
      });

      afterEach(function() {
        this.clock.restore();
      });

      it('sets default expiry times for cache keys', function() {
        Backbone.Model.setCache(this.model, { cache: true });
        expect(Backbone.Model.attributeCache[this.model.url].expires)
          .toEqual((new Date()).getTime() + (5* 60 * 1000));
      });

      it('sets expiry times for cache keys', function() {
        var opts = { cache: true, expires: 1000 };
        Backbone.Model.setCache(this.model, opts);
        expect(Backbone.Model.attributeCache[this.model.url].expires)
          .toEqual((new Date()).getTime() + (opts.expires * 1000));
      });

      it('is not set if expires: false is set', function() {
        var opts = { cache: true, expires: false };
        Backbone.Model.setCache(this.model, opts);
        expect(Backbone.Model.attributeCache[this.model.url].expires)
          .toEqual(false);
      });
    });
  });

  describe('.setLocalStorage', function() {
    it('puts the cache into localStorage', function() {
      var cache = Backbone.Model.attributeCache = {
        '/url1': { expires: false, value: { bacon: 'sandwich' } },
        '/url2': { expires: false, value: { egg: 'roll' } }
      };
      Backbone.Model.setLocalStorage();
      expect(localStorage.getItem('modelCache')).toEqual(JSON.stringify(cache));
    });

    it('does not put the cache into localStorage if localStorageCache = false', function() {
      var cache = Backbone.Model.attributeCache = {
        '/url1': { expires: false, value: { bacon: 'sandwich' } },
        '/url2': { expires: false, value: { egg: 'roll' } }
      };
      Backbone.Model.localStorageCache = false;
      Backbone.Model.setLocalStorage();

      expect(localStorage.getItem('modelCache')).toEqual(null);

      Backbone.Model.localStorageCache = true; // restore
    });
  });


  describe('.getLocalStorage', function() {
    it('primes the cache from localStorage', function() {
      var cache = {
        '/url1': { expires: false, value: { bacon: 'sandwich' } },
        '/url2': { expires: false, value: { egg: 'roll' } }
      };
      localStorage.setItem('modelCache', JSON.stringify(cache));
      Backbone.Model.getLocalStorage();
      expect(Backbone.Model.attributeCache).toEqual(cache);
    });
  });

  describe('.prototype.fetch', function() {
    it('saves returned attributes to the attributeCache', function() {
      this.model.fetch();
      this.server.respond();
      expect(Backbone.Model.attributeCache[this.model.url].value).toEqual(this.model.toJSON());
    });

    it('passes the instance and options through to setCache', function() {
      var opts = { banana: 'bread' };
      spyOn(Backbone.Model, 'setCache');

      this.model.fetch(opts);
      this.server.respond();

      expect(Backbone.Model.setCache.calls[0].args[0]).toEqual(this.model);
      expect(Backbone.Model.setCache.calls[0].args[1]).toEqual(opts);
    });

    it('returns data from the cache if cache: true is set', function() {
      var cacheData = { cheese: 'pickle' };
      Backbone.Model.attributeCache[this.model.url] = {
        value: cacheData,
        expires: (new Date()).getTime() + (5* 60 * 1000)
      };
      this.model.fetch({ cache: true });
      expect(this.model.toJSON()).toEqual(cacheData);
    });

    it('does not return cache data if cache: true is not set', function() {
      var cacheData = { cheese: 'pickle' };
      Backbone.Model.attributeCache[this.model.url] = {
        value: cacheData,
        expires: (new Date()).getTime() + (5* 60 * 1000)
      };

      this.model.fetch();
      this.server.respond();

      expect(this.model.toJSON()).not.toEqual(cacheData);
      expect(this.model.toJSON()).toEqual(this.response);
    });

    it('does not return cache data if the cache item is stale', function() {
      var cacheData = { cheese: 'pickle' };
      Backbone.Model.attributeCache[this.model.url] = {
        value: cacheData,
        expires: (new Date()).getTime() - (5* 60 * 1000)
      };

      this.model.fetch();
      this.server.respond();

      expect(this.model.toJSON()).not.toEqual(cacheData);
      expect(this.model.toJSON()).toEqual(this.response);
    });

    it('returns cache data if the item has expires: false', function() {
      var cacheData = { cheese: 'pickle' };
      Backbone.Model.attributeCache[this.model.url] = {
        value: cacheData,
        expires: false
      };

      this.model.fetch({ cache: true });

      expect(this.model.toJSON()).toEqual(cacheData);
    });

    it('calls success callback on a cache hit', function() {
      var success = jasmine.createSpy('success'),
          cacheData = { cheese: 'pickle' };
      Backbone.Model.attributeCache[this.model.url] = {
        value: cacheData,
        expires: (new Date()).getTime() + (5* 60 * 1000)
      };

      this.model.fetch({ cache: true, success: success });

      expect(success).toHaveBeenCalledWith(this.model);
    });

    it('returns a fulfilled promise on a cache hit', function() {
      var cacheData = { cheese: 'pickle' },
          promise;
      Backbone.Model.attributeCache[this.model.url] = {
        value: cacheData,
        expires: (new Date()).getTime() + (5* 60 * 1000)
      };
      promise = this.model.fetch({ cache: true });

      expect(promise).toBeAPromise();
      expect(promise).toBeResolved();
    });

    it('returns an unfulfilled promise on a cache miss', function() {
      var promise = this.model.fetch();
      expect(promise).toBeAPromise();
      expect(promise).toBeUnresolved();
    });

    it('returns a promise with the correct context on a cache hit', function() {
      var cacheData = { cheese: 'pickle' },
          spy = jasmine.createSpy('success'),
          opts = { cache: true };

      Backbone.Model.attributeCache[this.model.url] = {
        value: cacheData,
        expires: (new Date()).getTime() + (5* 60 * 1000)
      };

      this.model.fetch(opts).done(spy);

      expect(spy).toHaveBeenCalledWith(this.model);
    });
  });
});