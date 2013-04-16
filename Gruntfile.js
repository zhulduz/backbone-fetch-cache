/*global module:false*/
module.exports = function(grunt) {

  // Project configuration.
  grunt.initConfig({
    pkg: grunt.file.readJSON('package.json'),
    jasmine: {
      src: ['backbone.fetch-cache.js'],
      options: {
        helpers: [
          'spec/support/*.js'
        ],
        specs : 'spec/**/*.spec.js',
        vendor: [
          'spec/lib/jquery*.js',
          'spec/lib/underscore.js',
          'spec/lib/backbone.js'
        ],
        timeout : 5000,
        phantomjs : { 'ignore-ssl-errors' : true }
      }
    },
    uglify: {
      options: {
        banner: '/*  <%= pkg.name %> v<%= pkg.version %> ' +
        "(<%= grunt.template.today('yyyy-mm-dd') %>)\n" +
        "  by <%= pkg.author %> - <%= pkg.repository.url %>\n" +
        ' */\n',
        mangle: {
          except: ['_', 'Backbone']
        }
      },
      dist: {
        files: {
          'backbone.fetch-cache.min.js': ['backbone.fetch-cache.js']
        }
      }
    },
    watch: {
      files: '<%= jshint.files %>',
      tasks: ['jshint', 'jasmine']
    },
    jshint: {
      files: ['grunt.js', 'backbone.fetch-cache.js', 'spec/**/*.spec.js'],
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
        browser: true,
        globals: {
          $: true,
          _: true,
          Backbone: true,
          define: true,
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
    }
  });

  grunt.loadNpmTasks('grunt-contrib-jasmine');
  grunt.loadNpmTasks('grunt-contrib-jshint');
  grunt.loadNpmTasks('grunt-contrib-uglify');
  grunt.loadNpmTasks('grunt-contrib-watch');

  // Default task.
  grunt.registerTask('default', ['jshint', 'jasmine']);

};
