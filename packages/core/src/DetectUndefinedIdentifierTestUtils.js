import fs from "fs";
import path from "path";
import { getUndefinedIdentifier } from "./DetectUndefESLint";
import DetectUndefinedIdentifier, {
  removeImportIdentifiers,
} from "./DetectUndefinedIdentifier";
import { prepareJscodeshift } from "./utils/jscodeshift";

type TFNResult = {
  identifiers: string[],
  types: string[],
  unusedImports: string[],
  ast: any,
  jscodeshift: any,
};
type TFN = (source: string) => TFNResult;

const defaultFN: TFN = source => {
  const j = prepareJscodeshift();
  const ast = j(source);
  return {
    ...DetectUndefinedIdentifier(ast),
    ast,
    jscodeshift: j,
  };
};

const eslintFN: TFN = source => {
  const identifiers = getUndefinedIdentifier(source);
  return {
    identifiers,
    types: [],
    unusedImports: [],
    ast: null,
    jscodeshift: null,
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
        path.join(__dirname, `../__testfixtures__/${folder}/${file}.js`)
      )
      .toString();

    return code(content);
  }
  function code(source: string) {
    const {
      identifiers: undefinedIdentifiers,
      types: undefinedTypes,
      unusedImports,
      ast,
      jscodeshift,
    } = fnMap[detector](source);

    const checker = {
      unusedImport(...identifiers: string[]) {
        for (const identifier of identifiers) {
          expect(unusedImports).toContain(identifier);
        }

        return checker;
      },
      usedImport(...identifiers: string[]) {
        for (const identifier of identifiers) {
          expect(unusedImports).not.toContain(identifier);
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

      expectAfterClean(expected: string) {
        removeImportIdentifiers(jscodeshift, ast, unusedImports);

        // console.log(removeCodeIndent(expected));
        const toLines = text =>
          text
            .split("\n")
            .map(line => line.trim())
            .filter(line => line !== "");
        const expectedLines = toLines(expected);
        const actualLines = toLines(ast.toSource());
        expect(expectedLines).toEqual(actualLines);

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
