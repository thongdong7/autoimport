// @flow

/**
 * Scan source root to get exports
 */
import type { TImportInfo } from "../types";
import { withQueryTransform, isIdentifier } from "./Query";
import recast from "recast";
import type { TPackagesOption } from "../types";
import fs from "fs";
import path from "path";
import { prepareJscodeshift } from "./jscodeshift";

const j = prepareJscodeshift();

var types = recast.types.namedTypes;

const getExportNameVarIdentifier = (exportKind: "value" | "type") =>
  withQueryTransform({
    query: types.ExportNamedDeclaration,
    filter: {
      exportKind: exportKind,
    },
    flatNodeTransform: node => {
      const varDeclarations: Object[] =
        (node.declaration && node.declaration.declarations) || [];
      // console.log("declarations", declarations);

      const specifiers: Object[] = node.specifiers || [];
      const ret = [
        ...varDeclarations
          .filter(item => isIdentifier(item.id))
          .map(item => item.id.name),
        ...specifiers.map(item => item.exported.name),
      ];

      if (
        node.declaration &&
        (node.declaration.type === "FunctionDeclaration" ||
          node.declaration.type === "TypeAlias" ||
          node.declaration.type === "ClassDeclaration")
      ) {
        ret.push(node.declaration.id.name);
      }

      return ret;
    },
  });

const ExportNameVarIdentifier = getExportNameVarIdentifier("value");
const ExportNameTypeIdentifier = getExportNameVarIdentifier("type");

export function getExportInfo(file: string): TImportInfo {
  const source = fs.readFileSync(file).toString();

  return getExportInfoFromSource(file, source);
}

export function getExportInfoFromSource(
  file: string,
  source: string
): TImportInfo {
  const ast = j(source);
  const hasDefaultExport = ast.find(types.ExportDefaultDeclaration).size() > 0;

  const others = ExportNameVarIdentifier(ast);
  const otherTypes = ExportNameTypeIdentifier(ast);
  let ret: TImportInfo = {
    others,
    types: otherTypes,
  };

  if (hasDefaultExport) {
    let fileName = path.basename(file).replace(".js", "");
    if (fileName === "index") {
      fileName = path.basename(path.dirname(file));
    }

    ret.main = fileName;
  }

  return ret;
}

export function file2Path(file: string) {
  let ret = file.replace(".js", "");
  if (ret.endsWith("/index")) {
    ret = ret.substr(0, ret.length - 6);
  }

  return "./" + ret;
}

function* _getFiles(dir: string) {
  // There is no node_modules in rootPath (src folder)
  const dirName = path.basename(dir);
  // TODO Fix this hard-code (for ignore `build` dir)
  if (dirName === "node_modules" || dirName === "build") {
    return;
  }

  for (const file of fs.readdirSync(dir)) {
    const fullPath = path.join(dir, file);
    if (fs.lstatSync(fullPath).isDirectory()) {
      yield* _getFiles(fullPath);
    } else {
      yield fullPath;
    }
  }
}

export function scanSourceDir(rootPath: string): TPackagesOption {
  const packagesOptions: TPackagesOption = {};
  const jsFilePattern = /^\w+.js$/;

  if (fs.existsSync(rootPath)) {
    for (const file of _getFiles(rootPath)) {
      const fileName = path.basename(file);
      if (!jsFilePattern.test(fileName)) {
        continue;
      }

      const relativeFile = path.relative(rootPath, file);
      const relativePath = file2Path(relativeFile);

      const exportInfo = getExportInfo(file);

      if (
        exportInfo.main != null ||
        !exportInfo.others ||
        exportInfo.others.length > 0 ||
        !exportInfo.types ||
        exportInfo.types.length > 0
      ) {
        packagesOptions[relativePath] = exportInfo;
      }
      // optionSource[_file2Path(relativeFile)] = importInfo;
    }
  }

  return packagesOptions;
}
