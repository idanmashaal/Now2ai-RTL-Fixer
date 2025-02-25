const path = require("path");
const CopyPlugin = require("copy-webpack-plugin");
const ZipPlugin = require("zip-webpack-plugin"); // Import the ZipPlugin

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

module.exports = (env, argv) => {
  const mode = argv.mode; // Get the mode from the webpack command
  const outputPath = getOutputPath(mode); // Determine the output path

  return {
    mode: mode,
    entry: {
      "content-script": "./src/content-script.js",
      background: "./src/background.js",
      popup: "./src/popup.js",
    },
    output: {
      path: outputPath, // Set the output path dynamically
      filename: "[name].js",
      clean: true,
    },
    devtool: "cheap-module-source-map",
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
      new CopyPlugin({
        patterns: [
          { from: "manifest.json", to: "manifest.json" },
          { from: "icons", to: "icons" },
          { from: "src/popup.html", to: "popup.html" },
        ],
      }),
      new ZipPlugin({
        path: path.resolve(__dirname, "dist", mode), // Output zip in the mode subfolder
        filename: buildFolder + ".zip",
      }),
    ],
  };
};
