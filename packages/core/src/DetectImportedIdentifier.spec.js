import fs from "fs";
import path from "path";
import { prepareJscodeshift } from "./utils/jscodeshift";
import { detectImportedIdentifiers } from "./DetectImportedIdentifier";

describe("Detect Undefined Identifier", () => {
  function codeFile(file: string) {
    const content = fs
      .readFileSync(
        path.join(
          __dirname,
          "../__testfixtures__/DetectImportedIdentifier/" + file + ".js",
        ),
      )
      .toString();

    return code(content);
  }
  function code(source: string) {
    const j = prepareJscodeshift();
    const ast = j(source);
    const importedIdentifiers = detectImportedIdentifiers(ast);
    // console.log(importedIdentifiers);

    const checker = {
      noImport(...identifiers: string[]) {
        for (const identifier of identifiers) {
          expect(importedIdentifiers).toContain(identifier);
        }

        return checker;
      },
    };
    return checker;
  }

  it("Ensure codeFile work", () => {
    codeFile("a").noImport("a");
  });

  // it("_DebugImportedIdentifier", () => {
  //   codeFile("_DebugImportedIdentifier").noImport("a");
  // });
});
