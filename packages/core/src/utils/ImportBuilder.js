// @flow
import path from "path";

export function normalizePath(currentFilePath: string, memPath: string) {
  if (memPath.startsWith("./")) {
    let ret = path.relative(path.dirname(currentFilePath), memPath);

    if (ret.startsWith(".")) {
      return ret;
    }

    if (ret === "") {
      ret = "index";
    }

    return "./" + ret;
  }

  return memPath;
}

export const IMPORT_IGNORE = -1;
