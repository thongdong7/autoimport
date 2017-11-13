// @flow

import type {
  TMemberInfo,
  TImportInfo,
  TOptionPackageDiff,
  TNormalizedOptions,
  TPackagesOption,
} from "./types";
import fs from "fs";
import path from "path";
import { flatMap } from "lodash";

const _parseIdentifierNameOfOtherPattern = new RegExp(
  "^(\\S+)\\s+as\\s+(\\S+)$",
);
export function parseIdentifierNameOfOther(otherStr: string) {
  const result = _parseIdentifierNameOfOtherPattern.exec(otherStr);

  if (result == null) {
    return {
      memberName: otherStr,
      memberAlias: otherStr,
    };
  } else {
    return {
      memberAlias: result[2],
      memberName: result[1],
    };
  }
}

function _getNodeModulesForMemberFolder(detectFolder, memberFolder): string {
  const fullMemberFolder = path.join(
    detectFolder,
    "node_modules",
    memberFolder,
  );

  if (!fs.existsSync(fullMemberFolder)) {
    // TODO Show a warning or watch this folder to load again when memberFolder available
    return "";
  }

  return fullMemberFolder;
}

export default class Config {
  options: TNormalizedOptions;
  memberFolders: string[];
  projectPath: string;
  _memberMap: {
    [name: string]: TMemberInfo,
  };
  packages: {
    [packageName: string]: TImportInfo,
  };
  types: {
    [packageName: string]: TImportInfo,
  };
  rootPath: string;

  constructor(options: TNormalizedOptions) {
    this.options = options;
    // console.log("o", this.options);

    this.memberFolders = this.options.memberFolders;
    this.packages = this.options.packages;
    this.types = this.options.types || {};
    this.projectPath = this.options.projectPath;
    this.rootPath = this.options.rootPath;
    this._memberMap = {};
  }

  static fromCache(cache) {
    const c = new Config(cache.options);
    c._memberMap = cache._memberMap;

    return c;
  }

  getStats = () => {
    return {
      numberIdentifiers: Object.keys(this._memberMap).length,
      memberFolders: this._getFullMemberFolders(),
    };
  };

  getCache = () => {
    return {
      _memberMap: this._memberMap,
      options: this.options,
    };
  };

  _updateMemberInfoIfNotExists = (member: string, info: TMemberInfo): void => {
    if (this._memberMap[member]) {
      return;
    }

    this._memberMap = {
      ...this._memberMap,
      [member]: info,
    };
  };

  getMemberInfo = (member: string): ?TMemberInfo => {
    // Only accept the member not declared in ignore
    if (this.options.ignore.indexOf(member) < 0) {
      return this._memberMap[member];
    }
  };

  _getMemberInfosFromImportInfo = (path: string, info: TImportInfo) => {
    let ret = {};
    if (info.main != null) {
      ret[info.main] = {
        path,
        defaultImport: true,
        exportKind: "value",
      };
    }

    for (const member of info.others || []) {
      const { memberName, memberAlias } = parseIdentifierNameOfOther(member);

      ret[memberAlias] = {
        path,
        defaultImport: false,
        exportKind: "value",
      };

      if (memberName !== memberAlias) {
        ret[memberAlias].actualName = memberName;
      }
    }

    for (const member of info.types || []) {
      ret[member] = {
        path,
        defaultImport: false,
        exportKind: "type",
      };
    }

    return ret;
  };

  _removePackage = (package_: string) => {
    // console.log("p", p, this.packages);
    const tmp = this._getMemberInfosFromImportInfo(
      package_,
      this.packages[package_],
    );
    // console.log("tmp", tmp);
    for (const member of Object.keys(tmp)) {
      delete this._memberMap[member];
    }

    // remove this package
    delete this.packages[package_];
  };

  _addPackage = (package_: string, importInfo: TImportInfo) => {
    const tmp = this._getMemberInfosFromImportInfo(package_, importInfo);
    this._memberMap = {
      ...this._memberMap,
      ...tmp,
    };

    this.packages = {
      ...this.packages,
      [package_]: importInfo,
    };
  };

  applyPackagesDiff = (
    packages: TPackagesOption,
    { removed, added, replaced }: TOptionPackageDiff,
  ) => {
    // Remove packages
    removed.forEach(this._removePackage);

    // Replace packages
    for (const p of replaced) {
      // Remove old package
      this._removePackage(p);

      // Add new package
      this._addPackage(p, packages[p]);
    }

    // Add packages
    added.forEach(p => this._addPackage(p, packages[p]));
  };

  _getFullMemberFolders = () => {
    // $FlowFixMe
    return flatMap(this.options.memberFolders || [], memberFolder => {
      const detectFolders = [
        this.projectPath,
        path.join(this.projectPath, path.dirname(this.rootPath)),
        path.join(this.projectPath, this.rootPath),
      ];
      // console.log(detectFolders);
      const fullMemberFolders = detectFolders
        .map(detectFolder =>
          _getNodeModulesForMemberFolder(detectFolder, memberFolder),
        )
        .filter(f => f !== "");

      // console.log(fullMemberFolders);

      return fullMemberFolders.map(f => [f, memberFolder]);
    });
  };

  loadMemberFolders = () => {
    for (const [
      fullMemberFolder,
      memberFolder,
    ] of this._getFullMemberFolders()) {
      const memberNames = fs
        .readdirSync(fullMemberFolder)
        .filter(item => item.endsWith(".js"))
        .map(item => item.replace(".js", ""));

      memberNames.forEach(member => {
        // autoDetectMembers[member] = memberFolder + "/" + member;
        // Only update if member is not exists
        this._updateMemberInfoIfNotExists(member, {
          path: memberFolder + "/" + member,
          // TODO verify it
          defaultImport: true,
          package: true,
          // Member folder just support exportKind=value, not support flow type at the moment
          exportKind: "value",
        });
      });
    }
  };
}
