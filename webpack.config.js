const webpack = require("webpack");
const path = require("path");
const CopyPlugin = require("copy-webpack-plugin");
const ZipPlugin = require("zip-webpack-plugin");
const fs = require("fs");

// Create a timestamp for the build folder
const getTimestamp = () => {
  const now = new Date();
  return `${now.getFullYear()}${String(now.getMonth() + 1).padStart(
    2,
    "0"
  )}${String(now.getDate()).padStart(2, "0")}_${String(now.getHours()).padStart(
    2,
    "0"
  )}${String(now.getMinutes()).padStart(2, "0")}${String(
    now.getSeconds()
  ).padStart(2, "0")}`;
};

const buildFolder = `build_${getTimestamp()}`;

// Function to determine the output path based on the mode
const getOutputPath = (mode) => {
  return path.resolve(__dirname, "dist", mode, buildFolder);
};

// Function to copy the latest build to a consistent location
const copyLatestBuild = (mode) => {
  const sourcePath = path.resolve(__dirname, "dist", mode, buildFolder);
  const destPath = path.resolve(__dirname, "dist", `latest-${mode}`);

  try {
    // Remove existing directory if it exists
    if (fs.existsSync(destPath)) {
      fs.rmSync(destPath, { recursive: true, force: true });
    }

    // Copy the directory using the built-in fs.cpSync (available in Node.js 16.7.0+)
    fs.cpSync(sourcePath, destPath, { recursive: true });

    // Create a reference file that points to the original build (not hidden)
    const referenceFilePath = path.join(destPath, "BUILD_REFERENCE");
    fs.writeFileSync(referenceFilePath, buildFolder);

    // Create a symlink inside latest folder pointing to original build (with corrected relative path)
    try {
      // Need to go up one level from latest-{mode} to the 'dist' directory
      // then go to {mode}/buildFolder
      const symlinkPath = path.join(destPath, "original-build");
      const symlinkTarget = path.join("..", mode, buildFolder);

      // Remove existing symlink if it exists
      if (fs.existsSync(symlinkPath)) {
        fs.unlinkSync(symlinkPath);
      }

      // Create symlink (this won't affect Chrome loading the extension)
      fs.symlinkSync(symlinkTarget, symlinkPath, "dir");
    } catch (symlinkError) {
      console.warn(
        `Couldn't create reference symlink (non-critical): ${symlinkError.message}`
      );
    }

    console.log(`Copied build: ${sourcePath} -> ${destPath}`);
    console.log(`Reference build: ${buildFolder}`);
  } catch (error) {
    console.error(`Error copying build: ${error.message}`);
  }
};

module.exports = (env = {}, argv) => {
  const mode = argv.mode || "development";
  const outputPath = getOutputPath(mode);
  const isPackageScript = env.package;

  // Read package.json to get the version
  const packageJson = JSON.parse(fs.readFileSync("./package.json", "utf8"));
  const version = packageJson.version;

  // Debug flag - can be overridden with --env debug=true/false
  // Default: true for development, false for production
  const debugEnabled =
    env.debug !== undefined
      ? env.debug === "true" || env.debug === true
      : mode === "development";

  console.log(
    `Building in ${mode} mode, DEBUG=${debugEnabled}, VERSION=${version}`
  );

  return {
    mode: mode,
    entry: {
      "content-script": "./src/content-script.js",
      background: "./src/background.js",
      popup: "./src/popup.js",
    },
    output: {
      path: outputPath,
      filename: "[name].js",
      clean: true,
    },
    devtool: mode === "development" ? "cheap-module-source-map" : false,
    module: {
      rules: [
        {
          test: /\.js$/,
          exclude: /node_modules/,
          use: {
            loader: "babel-loader",
            options: {
              presets: ["@babel/preset-env"],
            },
          },
        },
      ],
    },
    plugins: [
      // Define global constants for the build
      new webpack.DefinePlugin({
        // Must use JSON.stringify for string values in DefinePlugin
        __DEBUG__: JSON.stringify(debugEnabled),
        __VERSION__: JSON.stringify(version),
        __ENV__: JSON.stringify(mode), // 'development' or 'production'
      }),

      // Copy and transform static files
      new CopyPlugin({
        patterns: [
          {
            from: "manifest.json",
            to: "manifest.json",
            transform(content) {
              const manifest = JSON.parse(content.toString());

              // Update version in manifest
              manifest.version = version;

              // Modify extension name for development builds
              if (mode === "development") {
                manifest.name = manifest.name + " (Dev)";
              }

              return JSON.stringify(manifest, null, 2);
            },
          },
          { from: "icons", to: "icons" },
          { from: "src/popup.html", to: "popup.html" },
        ],
      }),

      // Conditionally add ZipPlugin
      isPackageScript &&
        new ZipPlugin({
          path: path.resolve(__dirname, "dist", mode),
          filename: buildFolder + ".zip",
        }),

      // Custom plugin to create symlink after build
      {
        apply: (compiler) => {
          compiler.hooks.afterEmit.tap("CreateSymlinkPlugin", () => {
            // Create the dist directory if it doesn't exist
            const distDir = path.resolve(__dirname, "dist");
            if (!fs.existsSync(distDir)) {
              fs.mkdirSync(distDir, { recursive: true });
            }

            // Copy the build to latest-{mode} folder
            copyLatestBuild(mode);
          });
        },
      },
    ].filter(Boolean), // Remove any falsy plugin entries
  };
};
