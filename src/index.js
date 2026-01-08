#!/usr/bin/env node

const yargs = require("yargs");
const { startServer, clearCache } = require("./server");

const args = yargs
  .option("port", {
    alias: "p",
    type: "number",
    describe: "Port for caching proxy",
  })
  .option("origin", {
    alias: "o",
    type: "string",
    describe: "Origin server URL",
  })
  .option("clear-cache", {
    type: "boolean",
    describe: "Clear cache data",
  })
  .help()
  .argv;

if (!Number.isInteger(args.port)) {
  console.error("Port must be a number");
  process.exit(1);
}

if (args["clear-cache"]) {
  clearCache();
  console.log("Cache cleared!");
  process.exit(0);
}

if (!args.port || !args.origin) {
  console.log("Usage: caching-proxy --port <number> --origin <url>");
  process.exit(1);
}

startServer(args.port, args.origin);
