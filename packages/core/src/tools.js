// import transformBuilder from "./auto-import";
import Config from "./Config";
import { scanSourceDir } from "./utils/BuildSourceConfig";

const fs = require("fs");
const path = require("path");
// import { prepareJscodeshift } from "./utils/jscodeshift";
const chalk = require("chalk");

// const success = chalk.green;
const error = chalk.red;

// console.log(jscodeshift);
// function process_(options, file, cliOpts) {
//   const transform = transformBuilder(options);

//   const jscodeshift = prepareJscodeshift({
//     parser: "flow",
//   });

//   const source = fs.readFileSync(file).toString("utf8");
//   // console.log(source);

//   const out = transform(
//     {
//       path: file,
//       source: source,
//     },
//     {
//       j: jscodeshift,
//       jscodeshift: jscodeshift,
//       stats: function empty() {},
//     }
//   );

//   if (!out || out === source) {
//     // No change
//     /* eslint-disable no-console */
//     console.log(success("no change"));
//     /* eslint-enable no-console */

//     return;
//   }

//   // Write change
//   if (cliOpts.write) {
//     fs.writeFileSync(file, out);
//   } else {
//     /* eslint-disable no-console */
//     console.log("out", out);
//     /* eslint-enable no-console */
//   }
// }

function _script() {
  var argv = require("minimist")(process.argv.slice(2));

  const { _: [command, ...restInputs], ...params } = argv;
  const scriptOptions = {
    inputs: restInputs,
    params,
  };

  const cmdMap = {
    gen: _scriptGen,
    // import: _scriptImport,
  };

  if (!cmdMap[command]) {
    error(`Invalid command ${command}`);
    process.exit(1);
  }

  cmdMap[command](scriptOptions);
}

/**
 * Generate the 'sources' field for config file
 */
function _scriptGen({ params: { c: optionsFile, write } }) {
  // console.log("gen sources for ", optionsFile);
  const options = _loadOptionsFile(optionsFile);
  const config = new Config(options);

  // console.log(config);
  const { value: valuePackages, type: typeOptions } = scanSourceDir(
    path.join(config.projectPath, config.rootPath)
  );
  // console.log("a", optionsSource);

  const generatedOptions = {
    ...options,
    packages: {
      ...options.packages,
      ...valuePackages,
    },
    types: typeOptions,
  };

  delete generatedOptions.projectPath;

  const genFile = optionsFile.replace(".json", ".gen.json");
  fs.writeFileSync(genFile, JSON.stringify(generatedOptions, null, 2));
}

function _loadOptionsFile(optionsFile: string) {
  optionsFile = _normalizePath(optionsFile);
  const options = JSON.parse(fs.readFileSync(optionsFile).toString());
  options.projectPath = path.dirname(optionsFile);

  return options;
}

// function _scriptImport({
//   params: { c: configFile, write },
//   inputs: [inputFile],
// }) {
//   let cliOptions = {
//     write: !!write,
//   };
//   const options = _loadOptionsFile(configFile);
//   // console.log(config);

//   // let inputFile = cli.input[0];
//   inputFile = _normalizePath(inputFile);
//   // console.log(inputFile);
//   process_(options, inputFile, cliOptions);
// }

function _normalizePath(f) {
  if (!path.isAbsolute(f)) {
    return path.join(process.cwd(), f);
  }

  return f;
}

_script();
