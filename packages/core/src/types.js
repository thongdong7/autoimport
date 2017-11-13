// @flow

export type TAST = any;

export type TFile = {
  path: string,
  source: string,
};

export type TImportInfo = {
  // Default import for package
  main?: string,
  // other imports
  others?: string[],
  types?: string[],
};

// All importKind detected
export type TAllImportInfo = {|
  value: TImportInfo,
  type: TImportInfo,
|};

// export type TOptionsSource = {
//   // Value export
//   value: {
//     [path: string]: TImportInfo,
//   },
//   // Flow type export
//   type: {
//     [path: string]: TImportInfo,
//   },
// };

export type TPackagesOption = {
  [packageName: string]: TImportInfo,
};

export type TOptions = {
  packages?: TPackagesOption,
  // Config for flow type. Deprecated
  types?: TPackagesOption,
  memberFolders?: string[],
  projectPath?: string,
  rootPath?: string,
  ignore?: string[],
};

export type TNormalizedOptions = {
  packages: TPackagesOption,
  // Config for flow type
  types: TPackagesOption,
  memberFolders: string[],
  projectPath: string,
  rootPath: string,
  ignore: string[],
};

// A subset of TNormalizedOptions for diffOptions purpuse.
export type TOptionsForDiff = {
  packages: TPackagesOption,
};

// export type TSimpleConfig = {
//   members?: {
//     [name: string]: string,
//   },
//   memberFolders?: string[],
// };

export type TAPI = {
  jscodeshift: any,
};

export type TKind = "value" | "type";

export type TMemberInfo = {
  // The import path
  path: string,
  defaultImport: boolean,
  // Export kind. es6 export: value, flow type export: type
  exportKind: TKind,
  // Used in case member name is alias
  actualName: ?string,
};

export type TOptionPackageDiff = {|
  removed: string[],
  added: string[],
  // list of package names which change main, others
  replaced: string[],
|};

export type TOptionDiff = {|
  packages: TOptionPackageDiff,
|};
