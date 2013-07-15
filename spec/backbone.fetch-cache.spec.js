describe('Backbone.fetchCache', function() {
  var originalPriorityFn = Backbone.fetchCache.priorityFn;
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
    Backbone.fetchCache.priorityFn = originalPriorityFn;
    this.server.restore();
  });

  describe('AMD', function() {
    it('defines an AMD module if supported', function() {
      var s = document.createElement('script');
      s.src = '/backbone.fetch-cache.js';

      window.define = jasmine.createSpy('AMD define');
      window.define.amd = true;

      s.onload = function(){
        expect(window.define).toHaveBeenCalled();
      };

      document.body.appendChild(s);
    });
  });

  describe('.setCache', function() {
    beforeEach(function() {
      this.opts = { cache: true };
    });

    it('noops if the instance does not have a url', function() {
      this.model.url = null;
      Backbone.fetchCache.setCache(this.model, this.opts, this.modelResponse);
      expect(Backbone.fetchCache._cache[this.model.url]).toBeUndefined();
    });

    it('noops unless cache: true is passed', function() {
      Backbone.fetchCache.setCache(this.model, null, this.modelResponse);
      expect(Backbone.fetchCache._cache[this.model.url]).toBeUndefined();
    });

    it('keys cache items by the getCacheKey method',function() {
      spyOn(Backbone.fetchCache, 'getCacheKey').andReturn('someCacheKey');
      Backbone.fetchCache.setCache(this.model, this.opts, this.modelResponse);
      expect(Backbone.fetchCache._cache['someCacheKey'].value)
        .toEqual(this.modelResponse);
    });

    it('calls setLocalStorage', function() {
      spyOn(Backbone.fetchCache, 'setLocalStorage');
      Backbone.fetchCache.setCache(this.model, this.opts);
      expect(Backbone.fetchCache.setLocalStorage).toHaveBeenCalled();
    });

    describe('with prefill: true option', function() {
      beforeEach(function() {
        this.opts = { prefill: true };
      });

      it('caches even if cache: true is not passed', function() {
        var cacheKey = Backbone.fetchCache.getCacheKey(this.model, this.opts);
        Backbone.fetchCache.setCache(this.model, this.opts, this.modelResponse);
        expect(Backbone.fetchCache._cache[cacheKey].value)
          .toEqual(this.modelResponse);
      });

      it('does not cache if cache: false is passed', function() {
        var cacheKey = Backbone.fetchCache.getCacheKey(this.model, this.opts);
        this.opts.cache = false;
        Backbone.fetchCache.setCache(this.model, this.opts, this.modelResponse);
        expect(Backbone.fetchCache._cache[cacheKey]).toBeUndefined();
      });

    });

    describe('cache expiry', function() {
      var cacheKey;

      beforeEach(function() {
        this.clock = sinon.useFakeTimers();
        cacheKey = Backbone.fetchCache.getCacheKey(this.model, this.opts);
      });

      afterEach(function() {
        this.clock.restore();
      });

      it('sets default expiry times for cache keys', function() {
        Backbone.fetchCache.setCache(this.model, { cache: true }, this.modelResponse);
        expect(Backbone.fetchCache._cache[cacheKey].expires)
          .toEqual((new Date()).getTime() + (5* 60 * 1000));
      });

      it('sets expiry times for cache keys', function() {
        var opts = { cache: true, expires: 1000 };
        Backbone.fetchCache.setCache(this.model, opts, this.modelResponse);
        expect(Backbone.fetchCache._cache[cacheKey].expires)
          .toEqual((new Date()).getTime() + (opts.expires * 1000));
      });

      it('is not set if expires: false is set', function() {
        var opts = { cache: true, expires: false };
        Backbone.fetchCache.setCache(this.model, opts, this.modelResponse);
        expect(Backbone.fetchCache._cache[cacheKey].expires)
          .toEqual(false);
      });
    });
  });

  describe('.clearItem', function() {
    beforeEach(function() {
      Backbone.fetchCache._cache = {
        '/item/1': { foo: 'bar' },
        '/item/2': { beep: 'boop' }
      };
    });

    it('deletes a single item from the cache', function() {
      Backbone.fetchCache.clearItem('/item/1');
      expect(Backbone.fetchCache._cache['/item/1']).toBeUndefined();
      expect(Backbone.fetchCache._cache['/item/2']).toEqual({ beep: 'boop' });
    });

    it('updates localStorage', function() {
      spyOn(Backbone.fetchCache, 'setLocalStorage');
      Backbone.fetchCache.clearItem('/item/1');
      expect(Backbone.fetchCache.setLocalStorage).toHaveBeenCalled();
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

    it('always primes the cache with an object', function() {
      Backbone.fetchCache.getLocalStorage();
      expect(Backbone.fetchCache._cache).toEqual({});
    });
  });

  describe('Automatic expiry when quota is met', function() {
    describe('.prioritize', function() {
      it('prioritizes older results by default', function() {
        var cache = {
          '/url1': { expires: 1000, value: { bacon: 'sandwich' } },
          '/url2': { expires: 1500, value: { egg: 'roll' } }
        };
        localStorage.setItem('backboneCache', JSON.stringify(cache));
        Backbone.fetchCache.getLocalStorage();
        expect(Backbone.fetchCache._prioritize()).toBeDefined();
        expect(Backbone.fetchCache._prioritize()).toEqual('/url1');
      });
    });

    describe('.priorityFn', function() {
      it('should take a custom priorityFn sorting function', function() {
        var cache = {
          '/url1': { expires: 1000, value: { bacon: 'sandwich' } },
          '/url2': { expires: 1500, value: { egg: 'roll' } }
        };
        localStorage.setItem('backboneCache', JSON.stringify(cache));
        Backbone.fetchCache.getLocalStorage();
        Backbone.fetchCache.priorityFn = function(a, b) {
          return b.expires - a.expires;
        };
        expect(Backbone.fetchCache._prioritize()).toEqual('/url2');
      });
    });

    describe('.deleteCacheWithPriority', function() {
      it('calls deleteCacheWithPriority if a QUOTA_EXCEEDED_ERR is thrown', function() {
        function QuotaError(message) {
          this.code = 22;
        }

        QuotaError.prototype = new Error();

        spyOn(localStorage, 'setItem').andThrow(new QuotaError());

        spyOn(Backbone.fetchCache, '_deleteCacheWithPriority');

        Backbone.fetchCache._cache = {
          '/url1': { expires: 1000, value: { bacon: 'sandwich' } },
          '/url2': { expires: 1500, value: { egg: 'roll' } }
        };
        Backbone.fetchCache.setLocalStorage();
        expect(Backbone.fetchCache._deleteCacheWithPriority).toHaveBeenCalled();
      });

      it('calls deleteCacheWithPriority if a QUOTA_EXCEEDED_ERR is thrown in IE', function() {
        function IEQuotaError(message) {
          this.number = 22;
        }

        IEQuotaError.prototype = new Error();

        spyOn(localStorage, 'setItem').andThrow(new IEQuotaError());

        spyOn(Backbone.fetchCache, '_deleteCacheWithPriority');

        Backbone.fetchCache._cache = {
          '/url1': { expires: 1000, value: { bacon: 'sandwich' } },
          '/url2': { expires: 1500, value: { egg: 'roll' } }
        };
        Backbone.fetchCache.setLocalStorage();
        expect(Backbone.fetchCache._deleteCacheWithPriority).toHaveBeenCalled();
      });

      it('calls deleteCacheWithPriority if a QUOTA_EXCEEDED_ERR is thrown in Firefox', function() {
        function FFQuotaError(message) {
          this.message = 22;
        }

        FFQuotaError.prototype = new Error();

        spyOn(localStorage, 'setItem').andThrow(new FFQuotaError());

        spyOn(Backbone.fetchCache, '_deleteCacheWithPriority');

        Backbone.fetchCache._cache = {
          '/url1': { expires: 1000, value: { bacon: 'sandwich' } },
          '/url2': { expires: 1500, value: { egg: 'roll' } }
        };
        Backbone.fetchCache.setLocalStorage();
        expect(Backbone.fetchCache._deleteCacheWithPriority).toHaveBeenCalled();
      });

      it('should delete a cached item according to what is returned by priorityFn', function() {
        var cache = {
          '/url1': { expires: 1000, value: { bacon: 'sandwich' } },
          '/url2': { expires: 1500, value: { egg: 'roll' } }
        };
        localStorage.setItem('backboneCache', JSON.stringify(cache));
        Backbone.fetchCache.getLocalStorage();
        Backbone.fetchCache._deleteCacheWithPriority();
        expect(Backbone.fetchCache._cache)
          .toEqual({'/url2': { expires: 1500, value: { egg: 'roll' } }});
      });
    });
  });

  describe('Backbone.Model', function() {
    describe('.prototype.fetch', function() {
      it('saves returned attributes to the attributeCache', function() {
        var cacheKey = Backbone.fetchCache.getCacheKey(this.model);
        this.model.fetch({ cache: true });
        this.server.respond();
        expect(Backbone.fetchCache._cache[cacheKey].value)
          .toEqual(this.model.toJSON());
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

      it('rejects the returned promise on AJAX error', function() {
        var spy = jasmine.createSpy('error');

        this.model.url = '/non-existant';
        this.model.fetch().fail(spy);
        this.server.respond();

        expect(spy).toHaveBeenCalled();
      });

      describe('with prefill: true option', function() {
        beforeEach(function(){
          this.cacheData = { cheese: 'pickle' };
          Backbone.fetchCache._cache[this.model.url] = {
            value: this.cacheData,
            expires: (new Date()).getTime() + (5* 60 * 1000)
          };
        });

        it('sets cache data and makes an xhr request', function() {
          this.model.fetch({ prefill: true });
          expect(this.model.toJSON()).toEqual(this.cacheData);

          this.server.respond();

          for (var key in this.modelResponse) {
            if (this.modelResponse.hasOwnProperty(key)) {
              expect(this.model.toJSON()[key]).toEqual(this.modelResponse[key]);
            }
          }
        });

        it('calls the prefillSuccess and success callbacks in order', function() {
          var prefillSuccess = jasmine.createSpy('prefillSuccess'),
              success = jasmine.createSpy('success');

          this.model.fetch({
            prefill: true,
            success: success,
            prefillSuccess: prefillSuccess
          });

          expect(prefillSuccess.calls[0].args[0]).toEqual(this.model);
          expect(prefillSuccess.calls[0].args[1]).toEqual(this.model.attributes);
          expect(success).not.toHaveBeenCalled();

          this.server.respond();

          expect(success.calls[0].args[0]).toEqual(this.model);
          expect(success.calls[0].args[1]).toEqual(this.modelResponse);
        });

        it('triggers sync on prefill success and success', function() {
          var prefillSuccess = jasmine.createSpy('prefillSuccess'),
              success = jasmine.createSpy('success'),
              sync = jasmine.createSpy('sync'),
              cachesync = jasmine.createSpy('cachesync');

          this.model.bind('sync', sync);
          this.model.bind('cachesync', cachesync);

          this.model.fetch({
            prefill: true,
            success: success,
            prefillSuccess: prefillSuccess
          });

          expect(sync).toHaveBeenCalled();
          expect(sync.callCount).toEqual(1);

          expect(cachesync).toHaveBeenCalled();
          expect(cachesync.callCount).toEqual(1);

          this.server.respond();

          // Ensure cachesync was not called on this second go around
          expect(cachesync.callCount).toEqual(1);

          expect(sync).toHaveBeenCalled();
          expect(sync.callCount).toEqual(2);

          expect(success.calls[0].args[0]).toEqual(this.model);
          expect(success.calls[0].args[1]).toEqual(this.modelResponse);
        });

        it('triggers progress on the promise on cache hit', function() {
          var progress = jasmine.createSpy('progress');
          this.model.fetch({ prefill: true }).progress(progress);
          expect(progress).toHaveBeenCalledWith(this.model);
        });

        it('fulfills the promise on AJAX success', function() {
          var success = jasmine.createSpy('success');
          this.model.fetch({ prefill: true }).done(success);
          this.server.respond();

          expect(success.calls[0].args[0]).toEqual(this.model);
          expect(success.calls[0].args[1]).toEqual(this.modelResponse);
        });
      });
    });

    describe('.prototype.sync', function() {
      beforeEach(function() {
        var cache = {};
        this.data = { some: 'data' };
        cache[this.model.url] = this.data;
        localStorage.setItem('backboneCache', JSON.stringify(cache));
        Backbone.fetchCache.getLocalStorage();
      });

      it('clears the cache for the model on create', function() {
        this.model.sync('create', this.model, {});
        expect(Backbone.fetchCache._cache[this.model.url]).toBeUndefined();
      });

      it('clears the cache for the model on update', function() {
        this.model.sync('update', this.model, {});
        expect(Backbone.fetchCache._cache[this.model.url]).toBeUndefined();
      });

      it('clears the cache for the model on patch', function() {
        this.model.sync('create', this.model, {});
        expect(Backbone.fetchCache._cache[this.model.url]).toBeUndefined();
      });

      it('clears the cache for the model on delete', function() {
        this.model.sync('create', this.model, {});
        expect(Backbone.fetchCache._cache[this.model.url]).toBeUndefined();
      });

      it('does not clear the cache for the model on read', function() {
        this.model.sync('read', this.model, {});
        expect(Backbone.fetchCache._cache[this.model.url]).toEqual(this.data);
      });

      it('calls super', function() {
        spyOn(Backbone.fetchCache._superMethods, 'modelSync');
        this.model.sync('create', this.model, {});
        expect(Backbone.fetchCache._superMethods.modelSync).toHaveBeenCalled();
      });

      it('returns the result of calling super', function() {
        expect(this.model.sync('create', this.model, {})).toBeAPromise();
      });

      describe('with an associated collection', function() {
        beforeEach(function() {
          var cache = {};
          this.model.collection = this.collection;
          cache[Backbone.fetchCache.getCacheKey(this.collection)] = [{ some: 'data' }];
          localStorage.setItem('backboneCache', JSON.stringify(cache));
          Backbone.fetchCache.getLocalStorage();
        });

        it('clears the cache for the collection', function() {
          var cacheKey = Backbone.fetchCache.getCacheKey(this.collection);
          this.model.sync('create', this.model, {});
          expect(Backbone.fetchCache._cache[cacheKey]).toBeUndefined();
        });
      });
    });
  });

  describe('Backbone.Collection', function() {
    describe('.prototype.fetch', function() {
      it('saves returned attributes to the attributeCache', function() {
        this.collection.fetch({ cache: true });
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

      it('calls set according to options on a cache hit', function() {
        var cacheData = [{ cheese: 'pickle' }, { salt: 'vinegar' }],
            options = { cache: true, remove: false };

        spyOn(this.collection, 'set');
        Backbone.fetchCache._cache[this.collection.url] = {
          value: cacheData,
          expires: (new Date()).getTime() + (5* 60 * 1000)
        };

        this.collection.fetch(options);

        expect(this.collection.set).toHaveBeenCalledWith(cacheData, options);
      });

      it('calls reset according to options on a cache hit', function() {
        var cacheData = [{ cheese: 'pickle' }, { salt: 'vinegar' }],
            options = { cache: true, reset: true };

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

      it('rejects the returned promise on AJAX error', function() {
        var spy = jasmine.createSpy('error');

        this.collection.url = '/non-existant';
        this.collection.fetch().fail(spy);
        this.server.respond();

        expect(spy).toHaveBeenCalled();
      });

      describe('with prefill: true option', function() {
        beforeEach(function(){
          this.cacheData = [{ cheese: 'pickle' }];
          Backbone.fetchCache._cache[this.collection.url] = {
            value: this.cacheData,
            expires: (new Date()).getTime() + (5* 60 * 1000)
          };
        });

        it('sets cache data and makes an xhr request', function() {
          this.collection.fetch({ prefill: true });
          expect(this.collection.toJSON()).toEqual(this.cacheData);

          this.server.respond();

          expect(this.collection.toJSON()).toEqual(this.collectionResponse);
        });

        it('calls the prefillSuccess and success callbacks in order', function() {
          var prefillSuccess = jasmine.createSpy('prefillSuccess'),
              success = jasmine.createSpy('success');

          this.collection.fetch({
            prefill: true,
            success: success,
            prefillSuccess: prefillSuccess
          });

          expect(prefillSuccess.calls[0].args[0]).toEqual(this.collection);
          expect(prefillSuccess.calls[0].args[1]).toEqual(this.collection.attributes);
          expect(success).not.toHaveBeenCalled();

          this.server.respond();
          expect(success.calls[0].args[0]).toEqual(this.collection);
          expect(success.calls[0].args[1]).toEqual(this.collectionResponse);
        });

        it('triggers sync on prefill success and success', function() {
          var prefillSuccess = jasmine.createSpy('prefillSuccess'),
              success = jasmine.createSpy('success'),
              sync = jasmine.createSpy('sync'),
              cachesync = jasmine.createSpy('cachesync');

          this.collection.bind('sync', sync);
          this.collection.bind('cachesync', cachesync);

          this.collection.fetch({
            prefill: true,
            success: success,
            prefillSuccess: prefillSuccess
          });

          expect(sync).toHaveBeenCalled();
          expect(sync.callCount).toEqual(1);

          expect(cachesync).toHaveBeenCalled();
          expect(cachesync.callCount).toEqual(1);

          this.server.respond();

          // Ensure cachesync was not called on this second go around
          expect(cachesync.callCount).toEqual(1);

          expect(sync).toHaveBeenCalled();
          expect(sync.callCount).toEqual(2);

          expect(success.calls[0].args[0]).toEqual(this.collection);
          expect(success.calls[0].args[1]).toEqual(this.collectionResponse);
        });

        it('triggers progress on the promise on cache hit', function() {
          var progress = jasmine.createSpy('progeress');
          this.collection.fetch({ prefill: true }).progress(progress);
          expect(progress).toHaveBeenCalledWith(this.collection);
        });

        it('fulfills the promise on AJAX success', function() {
          var success = jasmine.createSpy('success');
          this.collection.fetch({ prefill: true }).done(success);
          this.server.respond();

          expect(success.calls[0].args[0]).toEqual(this.collection);
          expect(success.calls[0].args[1]).toEqual(this.collectionResponse);
        });
      });
    });
  });
});
