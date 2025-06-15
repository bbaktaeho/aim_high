const path = require("path");
const CopyPlugin = require("copy-webpack-plugin");
const HtmlWebpackPlugin = require("html-webpack-plugin");

module.exports = {
  mode: "development",
  entry: {
    popup: "./src/popup.tsx",
    content: "./src/content.tsx",
    "metamask-content": "./src/metamask-content.tsx",
    background: "./src/background.ts",
    "page-script": "./src/page-script.ts",
    transaction: "./src/transaction.tsx",
    "transaction-checker": "./src/transaction-checker.ts",
  },
  output: {
    path: path.resolve(__dirname, "dist"),
    filename: "[name].js",
  },
  devtool: "cheap-module-source-map",
  module: {
    rules: [
      {
        test: /\.(ts|tsx)$/,
        use: "ts-loader",
        exclude: /node_modules/,
      },
      {
        test: /\.css$/,
        use: ["style-loader", "css-loader"],
      },
    ],
  },
  resolve: {
    extensions: [".tsx", ".ts", ".js"],
    fallback: {
      // Add fallbacks for Node.js core modules
      crypto: false,
      stream: false,
      buffer: false,
      util: false,
      assert: false,
      fs: false,
      path: false,
      os: false,
    },
    alias: {
      // Mock React Native modules
      "@react-native-async-storage/async-storage": path.resolve(__dirname, "src/mocks/async-storage.js"),
    },
  },
  plugins: [
    new CopyPlugin({
      patterns: [
        { from: "public" },
        {
          from: "src/page-script.ts",
          to: "page-script.js",
          transform(content) {
            // Transform TypeScript to JavaScript
            return content;
          },
        },
      ],
    }),
    new HtmlWebpackPlugin({
      template: "./src/popup.html",
      filename: "popup.html",
      chunks: ["popup"],
    }),
    new HtmlWebpackPlugin({
      template: "./src/transaction.html",
      filename: "transaction.html",
      chunks: ["transaction"],
    }),
  ],
};
