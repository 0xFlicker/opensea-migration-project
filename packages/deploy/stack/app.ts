#!/usr/bin/env node

import * as cdk from "aws-cdk-lib";

import { WwwStack } from "./www.js";
import path from "path";
import { fileURLToPath } from "url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));

const app = new cdk.App();

new WwwStack(app, "opensea-migration-www", {
  domain: ["migration", "0xflick.xyz"],
  serverlessBuildOutDir: path.resolve(__dirname, "../.layers"),
  withLogging: true,
  whiteListedHeaders: ["Authorization", "Host", "Content-Type", "Accept"],
  env: {
    region: "us-east-1",
    account: process.env.CDK_DEFAULT_ACCOUNT,
  },
});
