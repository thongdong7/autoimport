import ConfigProvider from "./ConfigProvider";
import { prepareJscodeshift } from "./utils/jscodeshift";
import { isEqual, sortBy } from "lodash";
import fs from "fs";
import path from "path";
import shelljs from "shelljs";

let tmp = 0;
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
      tmp++;
      yield* _getFiles(fullPath);
    } else {
      tmp++;
      yield fullPath;
    }
  }
}

describe.skip("Real project", () => {
  function fixture(projectPath) {
    const configProvider = new ConfigProvider();

    const optionsFile = path.join(projectPath, "autoimport.json");
    const cacheFile = path.join(projectPath, "autoimport.json.cache");

    if (fs.existsSync(cacheFile)) {
      configProvider.fromCache([projectPath]);
    } else {
      // Start
      configProvider.updateProjectPaths([projectPath]);
      configProvider.cache();
    }

    const tool = {
      formatFile(f: string): string {
        return configProvider.formatFile(
          f,
          fs.readFileSync(f).toString("utf-8"),
        );
      },
    };

    return tool;
  }
  // Load project
  const projectPath = "/tmp/test-autoimport";

  const tool = fixture(projectPath);

  let i = 0;
  const allFiles = [];
  const sampleDir = __dirname + "/../../sample";

  let failedCases = [];
  const failFile = sampleDir + "/_fail.txt";
  if (fs.existsSync(failFile)) {
    const content = fs
      .readFileSync(failFile)
      .toString("utf-8")
      .trim();
    if (content != "") {
      failedCases = content.split("\n");
    }
  }
  console.log(failedCases);
  for (const f of _getFiles(projectPath + "/src")) {
    if (!f.endsWith(".js")) {
      continue;
    }

    if (failedCases.length === 0 || failedCases.indexOf(f) >= 0) {
      allFiles.push(f);
    }
  }

  for (const f of allFiles) {
    // console.log("f", f);
    // if (f.indexOf("TestIndex") > 0) {
    _test(f);
    // break;
    // }
    i++;
    if (i > 500) {
      break;
    }
  }
  // console.log("t", tmp);

  const j = prepareJscodeshift({
    parser: "flow",
  });

  function _buildSpecifier(spec) {
    if (spec.type === "ImportDefaultSpecifier") {
      return { default: spec.local.name };
    } else if (spec.type === "ImportSpecifier") {
      return { imported: spec.imported.name, local: spec.local.name };
    }

    console.log("spec", JSON.stringify(spec, null, 2));

    return spec;
  }

  function _getImports(ast) {
    let items = [];
    const rawImports = [];
    ast.find(j.ImportDeclaration).forEach(path1 => {
      // console.log(JSON.stringify(path.node, null, 2));
      // Ignore import without specifiers (like import 'a.css') because autoimport could not import them
      // Ignore import from third party
      // Ignore namespace import (ImportNamespaceSpecifier: import * as a from './b')
      const sourceValue = path1.node.source.value;
      if (
        path1.node.type === "ImportNamespaceSpecifier" ||
        // TODO only ignore default specifiers if it name is different with sourceValue
        path1.node.type === "ImportDefaultSpecifier" ||
        path1.node.specifiers.length === 0 ||
        !sourceValue.startsWith(".") ||
        sourceValue.endsWith(".jpg") ||
        sourceValue.endsWith(".png")
      ) {
        return;
      }

      // console.log("s1", sourceValue, sourceValue.startsWith("."));

      rawImports.push(path1);
      let item = {
        source: sourceValue,
        specifiers: sortBy(path1.node.specifiers.map(_buildSpecifier), [
          "imported",
        ]),
      };
      // let memberImports = path.node.specifiers.filter(specifier => {
      //   return specifier.type === "ImportSpecifier";
      // });

      items.push(item);
    });

    items = sortBy(items, ["source"]);

    return [items, rawImports];
  }
  shelljs.rm("-rf", sampleDir);
  shelljs.mkdir("-p", sampleDir);
  fs.writeFileSync(failFile, "");

  function _test(fullPath: string) {
    // For each file, remove the import => load the auto import
    // Expect: number removed item equal number auto import item
    it(`no import more ${fullPath}`, () => {
      const backupFile = `${fullPath}.bk`;
      if (fs.existsSync(backupFile)) {
        // console.log("restore backup");
        // Restore backup file
        shelljs.cp("-f", backupFile, fullPath);

        // Remove backup file
        // shelljs.rm(backupFile);
      } else {
        // Backup
        // console.log("backup");
        shelljs.cp("-f", fullPath, backupFile);
      }

      const source = fs.readFileSync(fullPath).toString("utf-8");
      // console.log("s", source);
      const ast = j(source);
      // console.log("ast", ast);

      const [imports, rawImports] = _getImports(ast);
      // console.log("imports", JSON.stringify(imports, null, 2));
      // console.log("a", rawImports);
      // Remove import with specifiers.length > 0
      const newSource1 = ast
        .find(j.ImportDeclaration)
        .filter(
          p =>
            p.node.specifiers.length > 0 && p.node.source.value.startsWith("."),
        )
        .remove()
        .toSource();

      // console.log("s1", newSource1);

      fs.writeFileSync(fullPath, newSource1);
      // console.log(newSource1);

      // return;
      const newSource2 = tool.formatFile(fullPath);
      // console.log(newSource2);

      // const j2 = prepareJscodeshift({
      //   parser: "flow",
      // });
      const ast2 = j(newSource2);
      const [imports2] = _getImports(ast2);
      // console.log("imp22", imports2);

      fs.writeFileSync(fullPath, newSource2);

      if (!isEqual(imports2, imports)) {
        // Generate test
        const fileName = path.basename(fullPath);
        const inputFile = fileName.replace(".js", ".input.js");
        const outputFile = fileName.replace(".js", ".output.js");

        function importDiff(i1, i2) {
          let ret = [];
          // Find
          for (const item1 of i1) {
            let found = false;
            for (const item2 of i2) {
              if (isEqual(item1, item2)) {
                found = true;
                break;
              }
            }

            if (!found) {
              ret.push(item1);
            }
          }

          return ret;
        }
        fs.writeFileSync(sampleDir + "/" + inputFile, source);
        fs.writeFileSync(sampleDir + "/" + outputFile, newSource2);
        fs.writeFileSync(
          sampleDir + "/" + fileName.replace(".js", ".diff.json"),
          JSON.stringify(importDiff(imports, imports2), null, 2),
        );

        fs.appendFileSync(failFile, fullPath + "\n");
        expect(imports2).toEqual(imports);
      } else {
        // Restore backup file
        shelljs.cp("-f", backupFile, fullPath);
      }
    });
  }

  // _test(projectPath + "/src/AppIndex.js");
  // _test(projectPath + "/src/apps/ui/index2.js");
});
