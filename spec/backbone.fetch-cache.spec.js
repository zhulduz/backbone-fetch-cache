describe('Backbone.fetchCache', function() {
  beforeEach(function() {
    this.model = new Backbone.Model();
    this.model.url = '/model-cache-test';
    this.collection = new Backbone.Collection();
    this.collection.url = '/collection-cache-test';

    // Mock xhr resposes
    this.server = sinon.fakeServer.create();
    this.modelResponse = { sausages: 'bacon' };
    this.collectionResponse = [{ sausages: 'bacon' }, { rice: 'peas' }];
    this.server.respondWith('GET', this.model.url, [
      200,
      { "Content-Type": "application/json" },
      JSON.stringify(this.modelResponse)
    ]);
    this.server.respondWith('GET', this.collection.url, [
      200,
      { "Content-Type": "application/json" },
      JSON.stringify(this.collectionResponse)
    ]);
  });

  afterEach(function() {
    Backbone.fetchCache._cache = {};
    localStorage.clear('backboneCache');
    this.server.restore();
  });


  describe('.setCache', function() {
    it('noops if the instance does not have a url', function() {
      this.model.url = null;
      Backbone.fetchCache.setCache(this.model, null, this.modelResponse);
      expect(Backbone.fetchCache._cache[this.model.url]).toBeUndefined();
    });

    it('keys cache items by URL',function() {
      Backbone.fetchCache.setCache(this.model, null, this.modelResponse);
      expect(Backbone.fetchCache._cache[this.model.url].value)
        .toEqual(this.modelResponse);
    });

    it('calls setLocalStorage', function() {
      spyOn(Backbone.fetchCache, 'setLocalStorage');
      Backbone.fetchCache.setCache(this.model);
      expect(Backbone.fetchCache.setLocalStorage).toHaveBeenCalled();
    });

    describe('cache expiry', function() {
      beforeEach(function() {
        this.clock = sinon.useFakeTimers();
      });

      afterEach(function() {
        this.clock.restore();
      });

      it('sets default expiry times for cache keys', function() {
        Backbone.fetchCache.setCache(this.model, { cache: true }, this.modelResponse);
        expect(Backbone.fetchCache._cache[this.model.url].expires)
          .toEqual((new Date()).getTime() + (5* 60 * 1000));
      });

      it('sets expiry times for cache keys', function() {
        var opts = { cache: true, expires: 1000 };
        Backbone.fetchCache.setCache(this.model, opts, this.modelResponse);
        expect(Backbone.fetchCache._cache[this.model.url].expires)
          .toEqual((new Date()).getTime() + (opts.expires * 1000));
      });

      it('is not set if expires: false is set', function() {
        var opts = { cache: true, expires: false };
        Backbone.fetchCache.setCache(this.model, opts, this.modelResponse);
        expect(Backbone.fetchCache._cache[this.model.url].expires)
          .toEqual(false);
      });
    });
  });

  describe('.setLocalStorage', function() {
    it('puts the cache into localStorage', function() {
      var cache = Backbone.fetchCache._cache = {
        '/url1': { expires: false, value: { bacon: 'sandwich' } },
        '/url2': { expires: false, value: { egg: 'roll' } }
      };
      Backbone.fetchCache.setLocalStorage();
      expect(localStorage.getItem('backboneCache')).toEqual(JSON.stringify(cache));
    });

    it('does not put the cache into localStorage if localStorage is false', function() {
      var cache = Backbone.fetchCache._cache = {
        '/url1': { expires: false, value: { bacon: 'sandwich' } },
        '/url2': { expires: false, value: { egg: 'roll' } }
      };
      Backbone.fetchCache.localStorage = false;
      Backbone.fetchCache.setLocalStorage();

      expect(localStorage.getItem('backboneCache')).toEqual();

      Backbone.fetchCache.localStorage = true; // restore
    });
  });

  describe('.getLocalStorage', function() {
    it('primes the cache from localStorage', function() {
      var cache = {
        '/url1': { expires: false, value: { bacon: 'sandwich' } },
        '/url2': { expires: false, value: { egg: 'roll' } }
      };
      localStorage.setItem('backboneCache', JSON.stringify(cache));
      Backbone.fetchCache.getLocalStorage();
      expect(Backbone.fetchCache._cache).toEqual(cache);
    });
  });

  describe('Backbone.Model', function() {
    describe('.prototype.fetch', function() {
      it('saves returned attributes to the attributeCache', function() {
        this.model.fetch();
        this.server.respond();
        expect(Backbone.fetchCache._cache[this.model.url].value).toEqual(this.model.toJSON());
      });

      it('passes the instance and options through to setCache', function() {
        var opts = { banana: 'bread' };
        spyOn(Backbone.fetchCache, 'setCache');

        this.model.fetch(opts);
        this.server.respond();

        expect(Backbone.fetchCache.setCache.calls[0].args[0]).toEqual(this.model);
        expect(Backbone.fetchCache.setCache.calls[0].args[1]).toEqual(opts);
      });

      it('returns data from the cache if cache: true is set', function() {
        var cacheData = { cheese: 'pickle' };
        Backbone.fetchCache._cache[this.model.url] = {
          value: cacheData,
          expires: (new Date()).getTime() + (5* 60 * 1000)
        };
        this.model.fetch({ cache: true });
        expect(this.model.toJSON()).toEqual(cacheData);
      });

      it('does not return cache data if cache: true is not set', function() {
        var cacheData = { cheese: 'pickle' };
        Backbone.fetchCache._cache[this.model.url] = {
          value: cacheData,
          expires: (new Date()).getTime() + (5* 60 * 1000)
        };

        this.model.fetch();
        this.server.respond();

        expect(this.model.toJSON()).not.toEqual(cacheData);
        expect(this.model.toJSON()).toEqual(this.modelResponse);
      });

      it('does not return cache data if the cache item is stale', function() {
        var cacheData = { cheese: 'pickle' };
        Backbone.fetchCache._cache[this.model.url] = {
          value: cacheData,
          expires: (new Date()).getTime() - (5* 60 * 1000)
        };

        this.model.fetch();
        this.server.respond();

        expect(this.model.toJSON()).not.toEqual(cacheData);
        expect(this.model.toJSON()).toEqual(this.modelResponse);
      });

      it('returns cache data if the item has expires: false', function() {
        var cacheData = { cheese: 'pickle' };
        Backbone.fetchCache._cache[this.model.url] = {
          value: cacheData,
          expires: false
        };

        this.model.fetch({ cache: true });

        expect(this.model.toJSON()).toEqual(cacheData);
      });

      it('calls success callback on a cache hit', function() {
        var success = jasmine.createSpy('success'),
            cacheData = { cheese: 'pickle' };
        Backbone.fetchCache._cache[this.model.url] = {
          value: cacheData,
          expires: (new Date()).getTime() + (5* 60 * 1000)
        };

        this.model.fetch({ cache: true, success: success });

        expect(success).toHaveBeenCalledWith(this.model);
      });

      it('returns a fulfilled promise on a cache hit', function() {
        var cacheData = { cheese: 'pickle' },
            promise;
        Backbone.fetchCache._cache[this.model.url] = {
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

        Backbone.fetchCache._cache[this.model.url] = {
          value: cacheData,
          expires: (new Date()).getTime() + (5* 60 * 1000)
        };

        this.model.fetch(opts).done(spy);

        expect(spy).toHaveBeenCalledWith(this.model);
      });
    });
  });

  describe('Backbone.Collection', function() {
    describe('.prototype.fetch', function() {
      it('saves returned attributes to the attributeCache', function() {
        this.collection.fetch();
        this.server.respond();
        expect(Backbone.fetchCache._cache[this.collection.url].value)
          .toEqual(this.collection.toJSON());
      });

      it('passes the instance and options through to setCache', function() {
        var opts = { banana: 'bread' };
        spyOn(Backbone.fetchCache, 'setCache');

        this.collection.fetch(opts);
        this.server.respond();

        expect(Backbone.fetchCache.setCache.calls[0].args[0]).toEqual(this.collection);
        expect(Backbone.fetchCache.setCache.calls[0].args[1]).toEqual(opts);
      });

      it('returns data from the cache if cache: true is set', function() {
        var cacheData = [{ cheese: 'pickle' }, { salt: 'vinegar' }];
        Backbone.fetchCache._cache[this.collection.url] = {
          value: cacheData,
          expires: (new Date()).getTime() + (5* 60 * 1000)
        };
        this.collection.fetch({ cache: true });
        expect(this.collection.toJSON()).toEqual(cacheData);
      });

      it('does not return cache data if cache: true is not set', function() {
        var cacheData = [{ cheese: 'pickle' }, { salt: 'vinegar' }];
        Backbone.fetchCache._cache[this.collection.url] = {
          value: cacheData,
          expires: (new Date()).getTime() + (5* 60 * 1000)
        };

        this.collection.fetch();
        this.server.respond();

        expect(this.collection.toJSON()).not.toEqual(cacheData);
        expect(this.collection.toJSON()).toEqual(this.collectionResponse);
      });

      it('does not return cache data if the cache item is stale', function() {
        var cacheData = { cheese: 'pickle' };
        Backbone.fetchCache._cache[this.collection.url] = {
          value: cacheData,
          expires: (new Date()).getTime() - (5* 60 * 1000)
        };

        this.collection.fetch();
        this.server.respond();

        expect(this.collection.toJSON()).not.toEqual(cacheData);
        expect(this.collection.toJSON()).toEqual(this.collectionResponse);
      });

      it('returns cache data if the item has expires: false', function() {
        var cacheData = [{ cheese: 'pickle' }];
        Backbone.fetchCache._cache[this.collection.url] = {
          value: cacheData,
          expires: false
        };

        this.collection.fetch({ cache: true });

        expect(this.collection.toJSON()).toEqual(cacheData);
      });

      it('calls add according to options on a cache hit', function() {
        var cacheData = [{ cheese: 'pickle' }, { salt: 'vinegar' }],
            options = { cache: true, add: true };

        spyOn(this.collection, 'add');
        Backbone.fetchCache._cache[this.collection.url] = {
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
        Backbone.fetchCache._cache[this.collection.url] = {
          value: cacheData,
          expires: (new Date()).getTime() + (5* 60 * 1000)
        };

        this.collection.fetch(options);

        expect(this.collection.reset).toHaveBeenCalledWith(cacheData, options);
      });

      it('calls success callback on a cache hit', function() {
        var success = jasmine.createSpy('success'),
            cacheData = [{ cheese: 'pickle' }, { salt: 'vinegar' }];

        Backbone.fetchCache._cache[this.collection.url] = {
          value: cacheData,
          expires: (new Date()).getTime() + (5* 60 * 1000)
        };

        this.collection.fetch({ cache: true, success: success });

        expect(success).toHaveBeenCalledWith(this.collection);
      });

      it('returns a fulfilled promise on a cache hit', function() {
        var cacheData = [{ cheese: 'pickle' }, { salt: 'vinegar' }],
            promise;

        Backbone.fetchCache._cache[this.collection.url] = {
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

        Backbone.fetchCache._cache[this.collection.url] = {
          value: cacheData,
          expires: (new Date()).getTime() + (5* 60 * 1000)
        };

        this.collection.fetch({ cache: true }).done(spy);

        expect(spy).toHaveBeenCalledWith(this.collection);
      });
    });
  });
});
