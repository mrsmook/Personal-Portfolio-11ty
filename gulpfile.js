const fs = require("fs");
const spawn = require("child_process").spawn;
const rimraf = require("rimraf");
const gulp = require("gulp");
const stylus = require("gulp-stylus");
const postcss = require("gulp-postcss");
const cssEnv = require("postcss-preset-env");
const cssNano = require("cssnano");
const cssMqpacker = require("css-mqpacker");
const cssNormalize = require("postcss-normalize");
const webpack = require("webpack");
const responsive = require("gulp-responsive");

// read the file instead requiring directly
const metadata = JSON.parse(fs.readFileSync("./data/manifest/metadata.json"));

// call eleventy with additional options
const eleventy = (options = "") => {
  let cmd = (done) =>
    spawn("eleventy", options.split(), { stdio: "inherit" }).on(
      "close",
      (code) => done(code)
    );
  cmd.displayName = "eleventy" + options;
  return cmd;
};

gulp.task("build:stylus", () =>
  gulp
    .src("assets/stylus/Illuminate.styl")
    .pipe(stylus())
    .pipe(
      postcss([
        cssNormalize({
          forceImport: true
        }),
        cssMqpacker,
        cssEnv,
        cssNano
      ])
    )
    .pipe(gulp.dest("modules/comps/generated"))
);

gulp.task("build:feaicons", () =>
  gulp
    .src("assets/stylus/IlluminateIcons.styl")
    .pipe(
      stylus({
        url: {
          name: "fea-ico",
          paths: [__dirname + "/node_modules/feather-icons/dist/icons"],
          limit: false
        }
      })
    )
    .pipe(postcss([cssEnv, cssNano]))
    .pipe(gulp.dest(`${metadata.site.output}/assets/css`))
);

gulp.task("watch:stylus", () =>
  gulp.watch("assets/stylus/**", gulp.series("build:stylus", "build:feaicons"))
);

gulp.task(
  "build:js",
  () =>
    new Promise((done) =>
      webpack(require("./webpack.config.js"), (err, stats) => {
        if (err) console.log("Webpack", err);
        console.log(stats.toString());
        done();
      })
    )
);

gulp.task("build:jscomments", (done) => {
  const license = fs.readFileSync("./LICENSE", "utf-8");
  const files = [
    `${metadata.site.output}/assets/js/Okitavera.js`,
    `modules/comps/generated/FontLoader.js`
  ];
  files.forEach((file) => fs.appendFileSync(file, `\n/*\n${license}\n*/\n`));
  return done();
});

gulp.task("watch:js", () =>
  gulp.watch("assets/js/**", gulp.series("build:js", "build:jscomments"))
);

gulp.task("build:thumbnails", (done) => {
  rimraf("assets/thumbnails", done);
  return gulp
    .src("assets/img/banners/*.{png,jpg}")
    .pipe(
      responsive({
        "*": {
          width: "320",
          quality: 80
        }
      })
    )
    .pipe(gulp.dest("assets/img/thumbnails"));
});

gulp.task("fetch:avatars", (done) => {
  const avapath = "assets/img/avatars";
  const ava = JSON.parse(fs.readFileSync("./data/manifest/friendlists.json"))
    .friends;

  !fs.existsSync(avapath) && fs.mkdirSync(avapath);

  ava.forEach((i) => {
    const options = `${i.img} -O ${avapath}/${i.name}.png`;
    spawn("wget", options.split(" "), { stdio: "inherit" });
  });

  const options = `${metadata.author.photo} -O ${avapath}/me.png`;
  spawn("wget", options.split(" "), { stdio: "inherit" });

  return done();
});

gulp.task("clean", (done) => {
  rimraf(metadata.site.output, done);
  rimraf("modules/comps/generated", done);
});

gulp.task(
  "serve",
  gulp.series(
    "clean",
    gulp.parallel("build:stylus", "build:feaicons", "build:js"),
    "build:jscomments",
    gulp.parallel("watch:stylus", "watch:js", eleventy("--serve"))
  )
);

gulp.task(
  "default",
  gulp.series(
    "clean",
    gulp.parallel("build:stylus", "build:feaicons", "build:js"),
    "build:jscomments",
    eleventy()
  )
);
