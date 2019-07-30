/**
 * Settings
 * Turn on/off build features
 */
const settings = {
  clean: true,
  html: true,
  scripts: true,
  polyfills: false,
  styles: true,
  assets: true,
  images: true,
  reload: true
};

/**
 * Paths to project folders
 */
const paths = {
  input: 'src/',
  output: 'dist/',
  html: {
    input: 'src/public/**/*.html',
    partials: 'src/public/',
    output: 'dist/',
  },
  scripts: {
    input: 'src/js/**/*',
    polyfills: '.polyfill.js',
    output: 'dist/js/'
  },
  styles: {
    input: 'src/styles/**/*.{scss,sass}',
    output: 'dist/styles/'
  },
  images: {
    input: 'src/images/**/*',
    output: 'dist/images'
  },
  assets: {
    input: 'src/assets/**/*',
    output: 'dist/assets/'
  },
  reload: './dist/'
};


/**
 * Template for banner to add to file headers
 */
const banner = {
  full: '/*!\n' +
    ' * <%= package.name %> v<%= package.version %>\n' +
    ' * <%= package.description %>\n' +
    ' * (c) ' + new Date().getFullYear() + ' <%= package.author.name %>\n' +
    ' * <%= package.license %> License\n' +
    ' * <%= package.repository.url %>\n' +
    ' */\n\n',
  min: '/*!' +
    ' <%= package.name %> v<%= package.version %>' +
    ' | (c) ' + new Date().getFullYear() + ' <%= package.author.name %>' +
    ' | <%= package.license %> License' +
    ' | <%= package.repository.url %>' +
    ' */\n'
};


/**
 * Gulp Packages
 */

// General
const package = require('./package.json');
const {
  src,
  dest,
  watch,
  series,
  parallel
} = require('gulp');
const del = require('del');
const flatmap = require('gulp-flatmap');
const lazypipe = require('lazypipe');
const rename = require('gulp-rename');
const header = require('gulp-header');
const size = require('gulp-size');
const gif = require('gulp-if');

// HTML
const htmlmin = require('gulp-htmlmin');
const htmlPartial = require('gulp-html-partial');

// Scripts
const eslint = require('gulp-eslint');
const concat = require('gulp-concat');
const uglify = require('gulp-terser');
const optimizejs = require('gulp-optimize-js');

// Styles
const sass = require('gulp-sass');
const prefix = require('gulp-autoprefixer');
const minify = require('gulp-cssnano');

// Images
const imagemin = require('gulp-imagemin');

// BrowserSync
const browserSync = require('browser-sync');


const isProd = process.env.NODE_ENV === 'production';

/**
 * Gulp Tasks
 */

// Remove pre-existing content from output folders
const cleanDist = function (done) {

  // Make sure this feature is activated before running
  if (!settings.clean) return done();

  // Clean the dist folder
  del.sync([
    paths.output
  ]);

  // Signal completion
  return done();

};

// Repeated JavaScript tasks
const jsTasks = lazypipe()
  .pipe(header, banner.full, {
    package: package
  })
  .pipe(optimizejs)
  .pipe(dest, paths.scripts.output)
  .pipe(rename, {
    suffix: '.min'
  })
  .pipe(uglify)
  .pipe(optimizejs)
  .pipe(header, banner.min, {
    package: package
  })
  .pipe(dest, paths.scripts.output);

// Lint, minify, and concatenate scripts
const buildScripts = function (done) {

  // Make sure this feature is activated before running
  if (!settings.scripts) return done();

  // Run tasks on script files
  return src(paths.scripts.input)
    .pipe(flatmap(function (stream, file) {

      // If the file is a directory
      if (file.isDirectory()) {

        // Setup a suffix constiable
        let suffix = '';

        // If separate polyfill files enabled
        if (settings.polyfills) {

          // Update the suffix
          suffix = '.polyfills';

          // Grab files that aren't polyfills, concatenate them, and process them
          src([file.path + '/*.js', '!' + file.path + '/*' + paths.scripts.polyfills])
            .pipe(concat(file.relative + '.js'))
            .pipe(jsTasks());

        }

        // Grab all files and concatenate them
        // If separate polyfills enabled, this will have .polyfills in the filename
        src(file.path + '/*.js')
          .pipe(concat(file.relative + suffix + '.js'))
          .pipe(jsTasks());

        return stream;

      }

      // Otherwise, process the file
      return stream.pipe(jsTasks());

    }));

};

// Lint scripts
const lintScripts = function (done) {

  // Make sure this feature is activated before running
  if (!settings.scripts) return done();

  // Lint scripts
  return src(paths.scripts.input)
    .pipe(eslint({
      fix: true
    }))
    .pipe(eslint.format())
};

// HTML
const buildHtml = function (done) {
  if (!settings.html) return done();

  return src(paths.html.input)
    .pipe(htmlPartial({
      basePath: paths.html.partials
    }))
    .pipe(htmlmin({
      collapseWhitespace: true
    }))
    .pipe(size({
      title: 'HTML'
    }))
    .pipe(dest(paths.html.output));
}

// Process, lint, and minify Sass files
const buildStyles = function (done) {

  // Make sure this feature is activated before running
  if (!settings.styles) return done();

  // Run tasks on all Sass files
  return src(paths.styles.input)
    .pipe(sass({
      outputStyle: 'expanded',
      sourceComments: true
    }))
    .pipe(prefix({
      cascade: true,
      remove: true
    }))
    .pipe(header(banner.full, {
      package: package
    }))
    .pipe(dest(paths.styles.output))
    .pipe(rename({
      suffix: '.min'
    }))
    .pipe(minify({
      discardComments: {
        removeAll: true
      }
    }))
    .pipe(header(banner.min, {
      package: package
    }))
    .pipe(size({
      title: 'CSS'
    }))
    .pipe(dest(paths.styles.output));

};

// IMAGES
const buildImages = function () {
  return src(paths.images.input)
    .pipe(size({
      title: 'Images'
    }))
    .pipe(gif(isProd, imagemin()))
    .pipe(gif(isProd, size({
      title: 'Images (min)'
    })))
    .pipe(dest(paths.images.output));
}

// Copy static asset files into output folder
const copyAssets = function (done) {

  // Make sure this feature is activated before running
  if (!settings.assets) return done();

  // custom domain CNAME
  src('CNAME').pipe(dest('dist/'));

  // Copy static files
  return src(paths.assets.input)
    .pipe(size({
      title: 'Assets'
    }))
    .pipe(dest(paths.assets.output));

};

// Watch for changes to the src directory
const startServer = function (done) {

  // Make sure this feature is activated before running
  if (!settings.reload) return done();

  // Initialize BrowserSync
  browserSync.init({
    open: false,
    notify: false,
    reloadThrottle: 300,
    reloadDelay: 500,
    timestamps: true,
    server: {
      baseDir: paths.reload
    }
  });

  // Signal completion
  done();

};

// Reload the browser when files change
const reloadBrowser = function (done) {
  if (!settings.reload) return done();
  browserSync.reload();
  done();
};

// Watch for changes
const watchSource = function (done) {
  watch(paths.input, series(exports.default, reloadBrowser));
  done();
};


/**
 * Export Tasks
 */

// Default task
// gulp
exports.default = series(
  cleanDist,
  parallel(
    buildHtml,
    buildScripts,
    lintScripts,
    buildStyles,
    buildImages,
    copyAssets
  )
);

// Watch and reload
// gulp watch
exports.watch = series(
  exports.default,
  startServer,
  watchSource
);