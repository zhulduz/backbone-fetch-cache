/*global module:false*/
module.exports = function(grunt) {

  // Project configuration.
  grunt.initConfig({
    lint: {
      files: ['grunt.js', '*.js', 'spec/**/*.spec.js']
    },
    jasmine: {
      helpers: [
        'spec/support/*.js'
      ],
      specs : 'spec/**/*.spec.js',
      src: [
        // in order to satisfy dependencies
        'spec/lib/jquery*.js',
        'spec/lib/underscore.js',
        'spec/lib/backbone.js',
        'backbone.fetch-cache.js'
      ],
      timeout : 5000,
      phantomjs : { 'ignore-ssl-errors' : true }
    },
    watch: {
      files: '<config:lint.files>',
      tasks: 'lint jasmine'
    },
    jshint: {
      options: {
        curly: true,
        eqeqeq: true,
        immed: true,
        latedef: true,
        newcap: true,
        noarg: true,
        sub: true,
        undef: true,
        boss: true,
        eqnull: true,
        browser: true
      },
      globals: {
        $: true,
        _: true,
        Backbone: true,
        it: true,
        describe: true,
        beforeEach: true,
        afterEach: true,
        expect: true,
        spyOn: true,
        jasmine: true,
        sinon: true
      }
    }
  });

  grunt.loadNpmTasks('grunt-jasmine-runner');

  // Default task.
  grunt.registerTask('default', 'lint jasmine');

};
