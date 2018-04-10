import fs from "fs";
import path from "path";
import { prepareJscodeshift } from "./utils/jscodeshift";
import DetectUndefinedIdentifier from "./DetectUndefinedIdentifier";
import { getUndefinedIdentifier } from "./DetectUndefESLint";

type TFNResult = {
  identifiers: string[],
  types: string[],
};
type TFN = (source: string) => TFNResult;

const defaultFN: TFN = source => {
  const j = prepareJscodeshift();
  const ast = j(source);
  return DetectUndefinedIdentifier(ast);
};

const eslintFN: TFN = source => {
  const identifiers = getUndefinedIdentifier(source);
  return {
    identifiers,
    types: [],
  };
};

const fnMap = {
  default: defaultFN,
  eslint: eslintFN,
};

export function codeBuilder(folder: string, detector: "default" | "eslint") {
  function codeFile(file: string) {
    const content = fs
      .readFileSync(
        path.join(__dirname, `../__testfixtures__/${folder}/${file}.js`),
      )
      .toString();

    return code(content);
  }
  function code(source: string) {
    const {
      identifiers: undefinedIdentifiers,
      types: undefinedTypes,
      unusedImports,
    } = fnMap[detector](source);

    const checker = {
      unusedImport(...identifiers: string[]) {
        for (const identifier of identifiers) {
          expect(unusedImports).toContain(identifier);
        }

        return checker;
      },

      missImport(...identifiers: string[]) {
        for (const identifier of identifiers) {
          expect(undefinedIdentifiers).toContain(identifier);
        }

        return checker;
      },

      missImportType(...identifiers: string[]) {
        for (const identifier of identifiers) {
          expect(undefinedTypes).toContain(identifier);
        }

        return checker;
      },

      noImport(...identifiers: string[]) {
        for (const identifier of identifiers) {
          expect(undefinedIdentifiers).not.toContain(identifier);
        }

        return checker;
      },

      noImportType(...identifiers: string[]) {
        for (const identifier of identifiers) {
          expect(undefinedTypes).not.toContain(identifier);
        }

        return checker;
      },
    };
    return checker;
  }

  return {
    code,
    codeFile,
  };
}
