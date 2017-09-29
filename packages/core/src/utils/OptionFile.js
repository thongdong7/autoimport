// import path from "path";
import { difference, isEqual, intersection } from "lodash";

import type {
  TOptionPackageDiff,
  TOptionDiff,
  TOptionsForDiff,
  TNormalizedOptions,
} from "../types";

export const initNormalizedOptions: TNormalizedOptions = {
  packages: {},
  types: {},
  rootPath: "",
  projectPath: "",
  memberFolders: [],
  ignore: [],
};

function _diffObject(oldObject = {}, newObject = {}): TOptionPackageDiff {
  const oldKeys = Object.keys(oldObject);
  const newKeys = Object.keys(newObject);
  const removed = difference(oldKeys, newKeys);
  const added = difference(newKeys, oldKeys);

  // Same key but value different
  const replaced = [];
  const sameKeys = intersection(oldKeys, newKeys);
  for (const k of sameKeys) {
    if (!isEqual(oldObject[k], newObject[k])) {
      replaced.push(k);
    }
  }

  return {
    removed,
    added,
    replaced,
  };
}

export function diffOptions(
  oldOptions: TOptionsForDiff,
  newOptions: TOptionsForDiff,
): TOptionDiff {
  return {
    packages: _diffObject(oldOptions.packages, newOptions.packages),
  };
}

// export function loadOptionsFile(optionsFile: string) {
//   optionsFile = _normalizePath(optionsFile);
//   const options = require(optionsFile);
//   options.projectPath = path.dirname(optionsFile);

//   return options;
// }

// function _normalizePath(f) {
//   if (!path.isAbsolute(f)) {
//     return path.join(process.cwd(), f);
//   }

//   return f;
// }
