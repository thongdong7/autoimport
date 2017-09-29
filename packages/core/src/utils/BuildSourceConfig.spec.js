// @flow

import { getExportInfoFromSource, scanSourceDir } from "./BuildSourceConfig";
import type { TImportInfo } from "../types";
import path from "path";
import fs from "fs";

describe("getExportInfoFromSource", () => {
  const defaultFile = "components/A.js";

  const d = path.join(__dirname, "../../__testfixtures__/DetectExport");
  /* eslint-disable no-unused-vars */
  function codeFile(file) {
    /* eslint-enable no-unused-vars */
    const source = fs.readFileSync(path.join(d, file)).toString("utf-8");
    return code(source, file);
  }

  function code(source: string, file?: string) {
    const filePath = file != null ? file : defaultFile;

    const importInfo: TImportInfo = getExportInfoFromSource(filePath, source);

    const checker = {
      hasOthers(...members: string[]) {
        const others = importInfo.others || [];

        for (const member of members) {
          expect(others).toContain(member);
        }

        return checker;
      },
      hasOtherTypes(...members: string[]) {
        const others = importInfo.types || [];

        for (const member of members) {
          expect(others).toContain(member);
        }

        return checker;
      },
      hasMain(member: string) {
        expect(importInfo.main).toBe(member);

        return checker;
      },
      notHasMain() {
        expect(importInfo.main).toBeUndefined();

        return checker;
      },
    };

    return checker;
  }

  // fit("debug", () => {
  //   codeFile("debug.js")
  //     .hasOthers("A")
  //     .notHasMain();
  // });

  it("export function", () => {
    code(`
      export function A();
    `)
      .hasOthers("A")
      .notHasMain();
  });

  it("export idenfiers", () => {
    code(`
      export const A = 1;
      export let B = 2, C=3;
    `)
      .hasOthers("A", "B", "C")
      .notHasMain();
  });

  it("export identifier as another name", () => {
    code(`
      const A = 1;
      const B = 2;

      export {A, B as B1};
    `)
      .hasOthers("A", "B1")
      .notHasMain();
  });

  it("export default in non-index file will be file name", () => {
    code(
      `
      export default 1;
    `,
      "/ABC.js"
    ).hasMain("ABC");
  });

  it("export default in index.js will be detected name base on folder name", () => {
    code(
      `
      export default 1;
    `,
      "/ABC/index.js"
    ).hasMain("ABC");
  });

  it("export type and value", () => {
    code(
      `
    export type TUser = {
      name: string,
    }

    export const A = 1;
    export default 2;
    `,
      "/ABC.js"
    )
      .hasOtherTypes("TUser")
      .hasMain("ABC")
      .hasOthers("A");
  });
});

describe("scanSourceDir", () => {
  it("could scan dir", () => {
    const d = path.join(__dirname, "../../__testfixtures__/sample1");

    const packagesFromSource = scanSourceDir(d);
    // console.log(typeOptionsSource);
    expect(packagesFromSource["./A"]).toBeDefined();
    expect(packagesFromSource["./B"]).toBeDefined();

    expect(packagesFromSource).toMatchSnapshot();

    expect(packagesFromSource["./B/types"]).toBeDefined();
    expect(packagesFromSource).toMatchSnapshot();
  });
});
