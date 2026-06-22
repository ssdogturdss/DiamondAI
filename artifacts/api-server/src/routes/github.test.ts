import { describe, it } from "node:test";
import assert from "node:assert/strict";
import { detectNodeVersion } from "./github.js";

type FileList = { path: string; content: string }[];

describe("detectNodeVersion", () => {
  describe("engines.node in package.json (highest priority)", () => {
    it("extracts major version from exact semver", () => {
      const files: FileList = [
        { path: "package.json", content: JSON.stringify({ engines: { node: "20.11.1" } }) },
      ];
      assert.equal(detectNodeVersion(files), "20");
    });

    it("strips leading >= from range", () => {
      const files: FileList = [
        { path: "package.json", content: JSON.stringify({ engines: { node: ">=18" } }) },
      ];
      assert.equal(detectNodeVersion(files), "18");
    });

    it("strips leading ~", () => {
      const files: FileList = [
        { path: "package.json", content: JSON.stringify({ engines: { node: "~20" } }) },
      ];
      assert.equal(detectNodeVersion(files), "20");
    });

    it("strips leading ^ (caret range)", () => {
      const files: FileList = [
        { path: "package.json", content: JSON.stringify({ engines: { node: "^18.0.0" } }) },
      ];
      assert.equal(detectNodeVersion(files), "18");
    });

    it("handles >=18.0.0 <20 style range by taking the first number", () => {
      const files: FileList = [
        { path: "package.json", content: JSON.stringify({ engines: { node: ">=18.0.0 <20" } }) },
      ];
      assert.equal(detectNodeVersion(files), "18");
    });

    it("handles v-prefixed string in engines.node", () => {
      const files: FileList = [
        { path: "package.json", content: JSON.stringify({ engines: { node: "v22.0.0" } }) },
      ];
      assert.equal(detectNodeVersion(files), "22");
    });

    it("falls through when engines.node contains no digits (e.g. lts alias)", () => {
      const files: FileList = [
        { path: "package.json", content: JSON.stringify({ engines: { node: "lts/iron" } }) },
        { path: ".nvmrc", content: "20\n" },
      ];
      assert.equal(detectNodeVersion(files), "20");
    });

    it("takes precedence over .nvmrc", () => {
      const files: FileList = [
        { path: "package.json", content: JSON.stringify({ engines: { node: "18" } }) },
        { path: ".nvmrc", content: "20" },
      ];
      assert.equal(detectNodeVersion(files), "18");
    });

    it("takes precedence over .node-version", () => {
      const files: FileList = [
        { path: "package.json", content: JSON.stringify({ engines: { node: "18" } }) },
        { path: ".node-version", content: "20" },
      ];
      assert.equal(detectNodeVersion(files), "18");
    });

    it("falls through when package.json has no engines field", () => {
      const files: FileList = [
        { path: "package.json", content: JSON.stringify({ name: "my-app" }) },
        { path: ".nvmrc", content: "22" },
      ];
      assert.equal(detectNodeVersion(files), "22");
    });

    it("falls through when package.json is malformed JSON", () => {
      const files: FileList = [
        { path: "package.json", content: "not json {{{" },
        { path: ".nvmrc", content: "20" },
      ];
      assert.equal(detectNodeVersion(files), "20");
    });
  });

  describe(".nvmrc (second priority)", () => {
    it("reads plain major version", () => {
      const files: FileList = [{ path: ".nvmrc", content: "20" }];
      assert.equal(detectNodeVersion(files), "20");
    });

    it("strips v prefix", () => {
      const files: FileList = [{ path: ".nvmrc", content: "v22.0.0" }];
      assert.equal(detectNodeVersion(files), "22");
    });

    it("extracts major from full semver", () => {
      const files: FileList = [{ path: ".nvmrc", content: "18.19.0" }];
      assert.equal(detectNodeVersion(files), "18");
    });

    it("strips trailing newline", () => {
      const files: FileList = [{ path: ".nvmrc", content: "20\n" }];
      assert.equal(detectNodeVersion(files), "20");
    });

    it("falls through on lts alias (non-numeric major)", () => {
      const files: FileList = [
        { path: ".nvmrc", content: "lts/iron" },
        { path: ".node-version", content: "20" },
      ];
      assert.equal(detectNodeVersion(files), "20");
    });

    it("falls through on blank .nvmrc", () => {
      const files: FileList = [
        { path: ".nvmrc", content: "   " },
        { path: ".node-version", content: "18" },
      ];
      assert.equal(detectNodeVersion(files), "18");
    });

    it("takes precedence over .node-version", () => {
      const files: FileList = [
        { path: ".nvmrc", content: "20" },
        { path: ".node-version", content: "18" },
      ];
      assert.equal(detectNodeVersion(files), "20");
    });

    it("matches .nvmrc nested in a subdirectory path", () => {
      const files: FileList = [{ path: "subdir/.nvmrc", content: "22" }];
      assert.equal(detectNodeVersion(files), "22");
    });
  });

  describe(".node-version (third priority)", () => {
    it("reads plain major version", () => {
      const files: FileList = [{ path: ".node-version", content: "18" }];
      assert.equal(detectNodeVersion(files), "18");
    });

    it("strips v prefix", () => {
      const files: FileList = [{ path: ".node-version", content: "v20.0.0" }];
      assert.equal(detectNodeVersion(files), "20");
    });

    it("extracts major from full semver", () => {
      const files: FileList = [{ path: ".node-version", content: "20.11.1" }];
      assert.equal(detectNodeVersion(files), "20");
    });

    it("falls through on lts alias", () => {
      const files: FileList = [{ path: ".node-version", content: "lts/hydrogen" }];
      const result = detectNodeVersion(files);
      assert.equal(result, process.versions.node.split(".")[0]);
    });

    it("falls through on blank file", () => {
      const files: FileList = [{ path: ".node-version", content: "" }];
      const result = detectNodeVersion(files);
      assert.equal(result, process.versions.node.split(".")[0]);
    });

    it("matches .node-version nested in a subdirectory path", () => {
      const files: FileList = [{ path: "subdir/.node-version", content: "22" }];
      assert.equal(detectNodeVersion(files), "22");
    });
  });

  describe("runtime fallback (lowest priority)", () => {
    it("returns the current Node major when no version hints are present", () => {
      const files: FileList = [];
      const expected = process.versions.node.split(".")[0];
      assert.equal(detectNodeVersion(files), expected);
    });

    it("returns the current Node major when all sources fail", () => {
      const files: FileList = [
        { path: "package.json", content: JSON.stringify({ name: "app" }) },
        { path: ".nvmrc", content: "lts/iron" },
        { path: ".node-version", content: "" },
      ];
      const expected = process.versions.node.split(".")[0];
      assert.equal(detectNodeVersion(files), expected);
    });
  });
});
