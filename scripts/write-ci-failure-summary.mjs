#!/usr/bin/env node

import { appendFile } from "node:fs/promises";
import {
  buildCiFailureSummary,
  REQUIRED_CI_FAILURE_FIELDS,
} from "./lib/ci-failure-summary.mjs";

const values = Object.fromEntries(
  REQUIRED_CI_FAILURE_FIELDS.map((field) => [field, process.env[`CI_FAILURE_${field}`]]),
);
const markdown = buildCiFailureSummary(values);
if (process.env.GITHUB_STEP_SUMMARY) {
  await appendFile(process.env.GITHUB_STEP_SUMMARY, markdown, "utf8");
}
console.log(markdown);
