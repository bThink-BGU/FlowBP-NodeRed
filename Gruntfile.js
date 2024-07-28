/**
 * Copyright JS Foundation and other contributors, http://js.foundation
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 * http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 **/

const path = require("path");
const fs = require("fs-extra");
const nodemon = require('nodemon');

module.exports = function (grunt) {

  var nodemonArgs = ["-V"];
  var flowFile = grunt.option('flowFile');
  if (flowFile) {
    nodemonArgs.push(flowFile);
    process.env.NODE_RED_ENABLE_PROJECTS = false;
  }
  var userDir = grunt.option('userDir');
  if (userDir) {
    nodemonArgs.push("-u");
    nodemonArgs.push(userDir);
  }

  var browserstack = grunt.option('browserstack');
  if (browserstack) {
    process.env.BROWSERSTACK = true;
  }
  var nonHeadless = grunt.option('non-headless');
  if (nonHeadless) {
    process.env.NODE_RED_NON_HEADLESS = true;
  }
  let packageFile = grunt.file.readJSON('package.json')
  process.env.NODE_RED_PACKAGE_VERSION = packageFile.version;

  grunt.initConfig({
    pkg: packageFile,
    paths: {
      dist: ".dist"
    },
    watch: {/*
      server: {
        files: ['.rebooted'],
        options: {
          livereload: true
        }
      },*/
      generator: {
        files: [
          'packages/node_modules/@bp/node-generator/**/*'
        ],
        tasks: ['generateNodes']
      },
      js: {
        files: [
          'packages/node_modules/**/*.js',
          '!packages/node_modules/@bp/node-generator/**/*',
          '!packages/node_modules/@bp/nodes/generated/**/*',
          'engine/js/01 runModel.js',
          'engine/js/02 nodeRedAdapter.js',
          'engine/js/03 nodeRedUtil.js'
        ],
        tasks: ['build']
      },
      /*generatedNodes: {
        files: [
          'packages/node_modules/@bp/nodes/generated/!**!/!*',
        ],
        tasks: ['restart-node-red']
      },*/
      json: {
        files: [
          'packages/node_modules/@bp/nodes/locales/**/*.json',
        ],
        tasks: ['jsonlint:messages']
      },
    },
    /*mkdir: {
      core: {
        options: {
          create: ['packages/node_modules/@bp/nodes/generated']
        },
      },
    },*/
    clean: {
      build: {
        src: []
      },
      release: {
        src: [
          '<%= paths.dist %>'
        ]
      },
    },
    uglify: {
      build: {
        /*files: {
          'packages/node_modules/@node-red/editor-client/public/red/red.min.js': 'packages/node_modules/@node-red/editor-client/public/red/red.js',
          'packages/node_modules/@node-red/editor-client/public/red/main.min.js': 'packages/node_modules/@node-red/editor-client/public/red/main.js',
          'packages/node_modules/@node-red/editor-client/public/vendor/ace/mode-jsonata.js': 'packages/node_modules/@node-red/editor-client/src/vendor/jsonata/mode-jsonata.js',
          'packages/node_modules/@node-red/editor-client/public/vendor/ace/snippets/jsonata.js': 'packages/node_modules/@node-red/editor-client/src/vendor/jsonata/snippets-jsonata.js'
        }*/
      }
    },
    jsonlint: {
      messages: {
        src: [
          'packages/node_modules/@bp/nodes/locales/**/*.json',
        ]
      }
    },
    nodemon: {
      /* uses .nodemonignore */
      dev: {
        script: 'packages/node_modules/node-red/red.js',
        options: {
          verbose: true,
          args: nodemonArgs,
          ext: 'js,html,json',
          ignore: ['packages/node_modules/@bp/nodes/generated/**/*'],
          legacyWatch: true,
          watch: [
            'packages/node_modules/**/*',
          ]
        }
      }
    },
    jshint: {
      options: {
        jshintrc: true
        // http://www.jshint.com/docs/options/
        //"asi": true,      // allow missing semicolons
        //"curly": true,    // require braces
        //"eqnull": true,   // ignore ==null
        //"forin": true,    // require property filtering in "for in" loops
        //"immed": true,    // require immediate functions to be wrapped in ( )
        //"nonbsp": true,   // warn on unexpected whitespace breaking chars
        ////"strict": true, // commented out for now as it causes 100s of warnings, but want to get there eventually
        //"loopfunc": true, // allow functions to be defined in loops
        //"sub": true       // don't warn that foo['bar'] should be written as foo.bar
      },
      all: {
        files: {
          src: ['packages/node_modules/@bp/**/*.js']
        }
      },
      tests: {
        files: {
          src: ['test/**/*.js']
        },
        options: {
          "expr": true
        }
      }
    },
    concurrent: {
      dev: {
        tasks: ['nodemon', 'watch'],
        options: {
          logConcurrentOutput: true
        }
      }
    },
    'npm-command': {
      options: {
        cmd: "pack",
        cwd: "<%= paths.dist %>/modules"
      },
      'node-red': {options: {args: [__dirname + '/packages/node_modules/node-red']}},
      '@bp/engine-adapter': {options: {args: [__dirname + '/packages/node_modules/@bp/engine-adapter']}},
      '@bp/node-generator': {options: {args: [__dirname + '/packages/node_modules/@bp/node-generator']}},
      '@bp/nodes': {options: {args: [__dirname + '/packages/node_modules/@bp/nodes']}}
    },
  });

  grunt.loadNpmTasks('grunt-contrib-jshint');
  grunt.loadNpmTasks('grunt-concurrent');
  grunt.loadNpmTasks('grunt-contrib-uglify');
  grunt.loadNpmTasks('grunt-contrib-clean');
  grunt.loadNpmTasks('grunt-contrib-watch');
  grunt.loadNpmTasks('grunt-npm-command');
  // grunt.loadNpmTasks('grunt-mkdir');

  grunt.registerTask('nodemon', 'Run nodemon', function () {
    this.async();
    const options = grunt.config.get('nodemon.dev.options');
    options.script = grunt.config.get('nodemon.dev.script');
    let callback;
    if (options.callback) {
      callback = options.callback;
      delete options.callback;
    } else {
      callback = function (nodemonApp) {
        nodemonApp.on('log', function (event) {
          console.log(event.colour);
        });
      };
    }
    let app = nodemon(options);
    callback(app);
    app.emit('restart');
  });

  grunt.registerTask('generateNodes', 'Generate nodes', function () {
    var nodeGenerator = require("./packages/node_modules/@bp/node-generator/nodeGenerator.js");
    nodeGenerator();
  });

  grunt.registerTask('setDevEnv',
    'Sets NODE_ENV=development so non-minified assets are used',
    function () {
      process.env.NODE_ENV = 'development';
    });

  grunt.registerTask('test-checkstyle',
    'Runs code style check on code',
    ['jshint:all']);

  grunt.registerTask('default',
    'Builds editor content then runs code style checks and unit tests on all components',
    ['dev']);

  grunt.registerTask('build',
    'Builds editor content',
    ['clean:build', 'uglify:build']);

  grunt.registerTask('build-with-generate-nodes',
    'Builds editor content',
    ['generateNodes', 'build']);

  grunt.registerTask('dev',
    'Developer mode: run node-red, watch for source changes and build/restart',
    ['generateNodes', 'build', 'setDevEnv', 'concurrent:dev']);

  grunt.registerTask('restart-node-red',
    'Restart node-red',
    function () {
      nodemon.emit('restart');
      nodemon.restart();
      nodemon.reset();
    });
};
