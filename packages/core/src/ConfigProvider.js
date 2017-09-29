// @flow
import fs from "fs";
import path from "path";
import {
  scanSourceDir,
  getExportInfoFromSource,
  file2Path,
} from "./utils/BuildSourceConfig";
import type {
  TOptions,
  TOptionDiff,
  TMemberInfo,
  TNormalizedOptions,
  TImportInfo,
} from "./types";
import Config from "./Config";
import { normalizePath } from "./utils/ImportBuilder";
import { initNormalizedOptions } from "./utils/OptionFile";
import { diffOptions } from "./utils/OptionFile";
import { defaultsDeep } from "lodash";
import { prepareJscodeshift } from "./utils/jscodeshift";
import { transformByConfigProvider } from "./auto-import";

const builtinPackages = {
  react: {
    main: "React",
    others: ["Component", "PureComponent"],
  },
  "react-dom": {
    main: "ReactDOM",
  },
  "prop-types": {
    main: "PropTypes",
  },
};

export class ProjectConfigProvider {
  file: string;
  projectPath: string;
  rootPath: string;
  options: TNormalizedOptions;
  genOptions: TNormalizedOptions;
  text2text: (file: string, text: string) => string;
  config: Config;
  scaned: boolean;

  constructor(file?: string) {
    this.genOptions = initNormalizedOptions;
    this.text2text = this._buildText2Text();

    this.scaned = false;
    if (file != null) {
      this.loadOptionFile(file);
    }
  }

  static fromCache(cacheFile: string) {
    const cacheContent = fs.readFileSync(cacheFile).toString("utf-8");
    const cache = JSON.parse(cacheContent);

    const cp = new ProjectConfigProvider();
    cp.config = Config.fromCache(cache);

    return cp;
  }

  _buildText2Text = () => {
    const jscodeshift = prepareJscodeshift({
      parser: "flow",
    });

    const api = {
      j: jscodeshift,
      jscodeshift: jscodeshift,
      stats: function empty() {},
    };

    const Text2Text = (file: string, text: string): string => {
      return transformByConfigProvider(
        {
          path: file,
          source: text,
        },
        api,
        this
      );
    };

    return Text2Text;
  };

  loadOptionFile = (file: string) => {
    this.file = file;
    this.projectPath = path.dirname(file);

    let options: TOptions;
    if (fs.existsSync(file)) {
      options = JSON.parse(fs.readFileSync(file).toString());
    } else {
      options = { ...initNormalizedOptions };
    }
    options.projectPath = path.dirname(file);

    const normalizedOptions: TNormalizedOptions = defaultsDeep(options, {
      packages: {},
      types: {},
      memberFolders: [],
      rootPath: "",
      ignore: [],
    });

    let genOptions: TNormalizedOptions = {
      ...normalizedOptions,
      packages: {
        ...builtinPackages,
        ...normalizedOptions.packages,
      },
    };

    if (!this.scaned) {
      const packagesFromSource = scanSourceDir(
        path.join(genOptions.projectPath, genOptions.rootPath)
      );

      genOptions = {
        ...genOptions,
        packages: {
          ...packagesFromSource,
          ...genOptions.packages,
        },
      };

      this.scaned = true;
    }

    // Cache this to detect difference between options to improve performance
    const optionsDiff = diffOptions(this.genOptions, genOptions);
    this.genOptions = genOptions;
    this.options = normalizedOptions;
    this.rootPath = normalizedOptions.rootPath;

    this._buildConfig(optionsDiff);
  };

  _buildConfig = (optionsDiff: TOptionDiff) => {
    if (!this.config) {
      this.config = new Config(this.genOptions);
    }

    // Build package import
    // TODO Fix this
    const newPackages = this.genOptions.packages;
    this.config.applyPackagesDiff(newPackages, optionsDiff.packages);

    // Build memberFolders import
    this.config.loadMemberFolders();

    // Change ignore
    this.config.options.ignore = this.genOptions.ignore;
  };

  getImport = (currentFilePath: string, member: string): ?TMemberInfo => {
    const memberInfo = this.config.getMemberInfo(member);
    if (memberInfo) {
      return {
        ...memberInfo,
        path: normalizePath(currentFilePath, memberInfo.path),
      };
    }
  };

  /**
 * Check if file belong to this project
 */
  containFile = (file: string) => {
    // console.log("cf", file, this.config.projectPath);
    return this.config.projectPath && file.startsWith(this.config.projectPath);
  };

  format = (file: string, text: string) => {
    const projectPath = path.relative(this.getFullRootPath(), file);
    // console.log('format1', projectPath);
    return this.text2text(projectPath, text);
  };

  addFile = (fullPath: string, content: string): void => {
    const packageOption: TImportInfo = getExportInfoFromSource(
      fullPath,
      content
    );

    const relativePath = path.relative(this.getFullRootPath(), fullPath);
    const filePath = file2Path(relativePath);

    // Build optionsDiff
    const packages = {
      [filePath]: packageOption,
    };

    const optionsDiff: TOptionDiff = {
      packages: {
        removed: [],
        added: [filePath],
        replaced: [],
      },
    };

    this.config.applyPackagesDiff(packages, optionsDiff.packages);
  };

  getFullRootPath = (): string => {
    if (path.isAbsolute(this.config.rootPath)) {
      return this.config.rootPath;
    }

    return path.join(this.config.projectPath, this.config.rootPath);
  };

  cache = () => {
    const cache = this.config.getCache();
    fs.writeFileSync(
      this.projectPath + "/autoimport.json.cache",
      JSON.stringify(cache, null, 2)
    );
  };
}

export default class ConfigProvider {
  projectPaths: string[];
  projectConfigs: ProjectConfigProvider[];

  updateProjectPaths = (projectPaths: string[]) => {
    this.projectPaths = projectPaths;
    this.projectConfigs = projectPaths.map(
      projectPath =>
        new ProjectConfigProvider(path.join(projectPath, "autoimport.json"))
    );
  };

  fromCache = (projectPaths: string[]) => {
    this.projectPaths = projectPaths;
    this.projectConfigs = projectPaths.map(projectPath =>
      ProjectConfigProvider.fromCache(
        path.join(projectPath, "autoimport.json.cache")
      )
    );
  };

  formatFile = (absFile: string, text: string): string => {
    if (!path.isAbsolute(absFile)) {
      throw new Error(`Need absolute file path to format. Got ${absFile}`);
    }

    const matchedPC: ProjectConfigProvider = this.projectConfigs.filter(pc =>
      pc.containFile(absFile)
    )[0];

    let result;
    if (matchedPC) {
      // console.log('find matched');
      result = matchedPC.format(absFile, text);
    } else {
      result = text;
    }

    return result;
  };

  updateOptionFile = (file: string) => {
    const matchedPC = this.projectConfigs.filter(pc => pc.file === file)[0];

    if (matchedPC) {
      return matchedPC.loadOptionFile(file);
    }
  };

  addFile = (fullPath: string, content?: string) => {
    const matchedPC = this.projectConfigs.filter(pc =>
      pc.containFile(fullPath)
    )[0];

    if (matchedPC) {
      return matchedPC.addFile(fullPath, content);
    }

    return content;
  };

  cache = () => {
    // Cache the import
    this.projectConfigs.forEach(pc => pc.cache());
  };
}
