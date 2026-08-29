#!/usr/bin/env node

const { execFileSync } = require("child_process");
const fs = require("fs");
const path = require("path");

const WIDTH = 1284;
const HEIGHT = 2778;

const defaultDir = path.join(
  __dirname,
  "..",
  "assets",
  "store",
  "08-28",
);

const inputs = process.argv.slice(2);
const files =
  inputs.length > 0
    ? inputs
    : fs
        .readdirSync(defaultDir)
        .filter((name) => name.includes('iPhone - 6.9" Display'))
        .map((name) => path.join(defaultDir, name));

if (files.length === 0) {
  console.error("No iPhone screenshots found.");
  process.exit(1);
}

for (const file of files) {
  if (!fs.existsSync(file)) {
    console.error(`Missing: ${file}`);
    process.exit(1);
  }

  execFileSync(
    "sips",
    [
      "--resampleHeightWidth",
      String(HEIGHT),
      String(WIDTH),
      "-s",
      "format",
      "jpeg",
      "-s",
      "formatOptions",
      "100",
      file,
    ],
    { stdio: "inherit" },
  );

  const info = execFileSync(
    "sips",
    ["-g", "pixelWidth", "-g", "pixelHeight", file],
    { encoding: "utf8" },
  );
  console.log(info.trim());
}
