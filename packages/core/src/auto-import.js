// @flow
import type { TFile, TAPI, TMemberInfo } from "./types";
import getUndefinedIndentifiers from "./DetectUndefinedIdentifier";
import { ProjectConfigProvider } from "./ConfigProvider";
import path from "path";
import { updateImport } from "./utils/ImportUtils";

type TGetImport = (fileRelative: string, member: string) => ?TMemberInfo;

const baseTransform = (
  file: TFile,
  api: TAPI,
  rootPath: string,
  _getImport: TGetImport,
  _getImportType: TGetImport,
): string => {
  // console.log("rp", rootPath, file.path);
  const j = api.jscodeshift;

  // Find undefined nodes
  const ast = j(file.source);

  const {
    identifiers: missedIdentifiers,
    types: missedTypes,
  } = getUndefinedIndentifiers(ast);
  // console.log("missed", missedIdentifiers);
  // console.log("missed type", missedTypes);
  // console.log("root path", config.rootPath, file.path);

  let fileRelative;
  if (path.isAbsolute(file.path)) {
    fileRelative = path.relative(rootPath, file.path);
  } else {
    fileRelative = file.path;
  }

  const importMap = {};
  [...missedIdentifiers, ...missedTypes].forEach(identifier => {
    const importInfo: ?TMemberInfo = _getImport(fileRelative, identifier);

    if (!importInfo) {
      /* eslint-disable no-console */
      // console.error(`Could not find path for identifier ${error(identifier)}`);
      /* eslint-enable no-console */
      return;
    }

    const { exportKind, path: path_, actualName } = importInfo;

    if (!importMap[exportKind]) {
      importMap[exportKind] = {};
    }

    const mapKind = importMap[exportKind];

    if (!mapKind[path_]) {
      mapKind[path_] = {
        // importKind: exportKind,
        others: [],
      };
    }

    if (importInfo.defaultImport) {
      mapKind[path_].main = identifier;
    } else {
      const identifier_ =
        actualName != null ? `${actualName} as ${identifier}` : identifier;
      mapKind[path_].others = [...mapKind[path_].others, identifier_];
    }
  });

  updateImport(ast, importMap);

  // Add import
  let result: string = ast.toSource();

  // Remove the empty line between 2 imports
  while (true) {
    const result2 = result.replace(
      /(import[^\n]+from[^\n]+)\n{2,}import/g,
      "$1\nimport",
    );
    if (result2 === result) {
      break;
    }

    result = result2;
  }

  return result;
};

export const transformByConfigProvider = (
  file: TFile,
  api: TAPI,
  configProvider: ProjectConfigProvider,
) => {
  return baseTransform(
    file,
    api,
    configProvider.getFullRootPath(),
    configProvider.getImport,
    configProvider.getImport,
  );
};
