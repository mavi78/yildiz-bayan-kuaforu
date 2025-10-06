#!/usr/bin/env node

/**
 * Jest Runner Wrapper
 *
 * pnpm script'inden iletilen argümanları Jest CLI'ına düzgün şekilde aktarır.
 * Özellikle `pnpm test -- --help` gibi çağrılarda `--help` bayrağının
 * Jest tarafından yorumlanmasını sağlar.
 */

const { run } = require("jest");
const path = require("path");

const rawArgs = process.argv.slice(2);
const args = rawArgs.filter(arg => arg !== "--");
const configPath = path.resolve(__dirname, "..", "jest.config.js");

const needsInBand = args.includes("--help") || args.includes("-h");

const finalArgs = ["--config", configPath, ...(needsInBand ? ["--runInBand"] : []), ...args];

run(finalArgs);
