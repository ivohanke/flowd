module.exports = function(grunt) {

  grunt.initConfig({
    pkg: grunt.file.readJSON('package.json'),
    concat: {
      options: {
        separator: ';'
      },
      dist: {
        src: [
          'public/bootstrap/js/affix.js',
          'public/bootstrap/js/alert.js',
          'public/bootstrap/js/button.js',
          'public/bootstrap/js/carousel.js',
          'public/bootstrap/js/dropdown.js',
          'public/bootstrap/js/modal.js',
          'public/bootstrap/js/tooltip.js',
          'public/bootstrap/js/popover.js',
          'public/bootstrap/js/scrollspy.js',
          'public/bootstrap/js/tab.js',
          'public/bootstrap/js/transition.js',
          'public/js/custom.js'
        ],
        dest: 'public/js/scripts.min.js'
      }
    },
    uglify: {
      options: {
        banner: '/*! <%= pkg.name %> <%= grunt.template.today("dd-mm-yyyy") %> */\n'
      },
      dist: {
        files: {
          'dist/<%= pkg.name %>.min.js': ['<%= concat.dist.dest %>']
        }
      }
    },
    jshint: {
      files: ['Gruntfile.js', '*.js'],
      options: {
        "bitwise": true,
        "browser": true,
        "curly": true,
        "eqeqeq": false,
        "eqnull": true,
        "esnext": true,
        "immed": true,
        "jquery": true,
        "latedef": true,
        "newcap": true,
        "noarg": true,
        "node": true,
        "strict": false,
        "trailing": true
      }
    },
    less: {
      dist: {
        options: {
          compress: true
        },
        files: {
          "public/stylesheets/app.min.css": "public/less/app.less"
        }
      },
    },
    watch: {
      files: [
        '<%= jshint.files %>',
        'public/bootstrap/less/*.less',
        'public/less/*.less',
        'public/js/*.js'
      ],
      tasks: ['jshint', 'less', 'concat', 'uglify'],
      livereload: {
        // Browser live reloading
        // https://github.com/gruntjs/grunt-contrib-watch#live-reloading
        options: {
          livereload: true
        },
        files: [
          'public/stylesheets/app.min.css',
          'public/js/custom.js',
          'views/*.handlebars',
          'views/layouts/*.handlebars',
          '*.js'
        ]
      }
    }
  });

  grunt.loadNpmTasks('grunt-contrib-uglify');
  grunt.loadNpmTasks('grunt-contrib-jshint');
  grunt.loadNpmTasks('grunt-contrib-concat');
  grunt.loadNpmTasks('grunt-contrib-watch');
  grunt.loadNpmTasks('grunt-contrib-less');

  grunt.registerTask('default', ['jshint', 'less', 'concat', 'uglify']);

};