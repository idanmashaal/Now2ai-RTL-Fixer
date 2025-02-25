const path = require("path");
const CopyPlugin = require("copy-webpack-plugin");
const ZipPlugin = require("zip-webpack-plugin");

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

module.exports = {
  mode: process.env.NODE_ENV === "production" ? "production" : "development",
  entry: {
    "content-script": "./src/content-script.js",
    background: "./src/background.js",
    popup: "./src/popup.js",
  },
  output: {
    path: path.resolve(__dirname, "dist", buildFolder),
    filename: "[name].js",
    // Don't clean the entire dist directory, just the specific build folder
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
      path: path.resolve(__dirname, "dist"),
      filename: buildFolder + ".zip",
    }),
  ],
};
