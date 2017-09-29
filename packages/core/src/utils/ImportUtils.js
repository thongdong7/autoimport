import { uniq, isEqual } from "lodash";
import recast from "recast";
import compareImports from "codemod-imports-sort/dist/compareImports";
import type { TKind, TImportInfo } from "../types";

const builders = recast.types.builders;
const types = recast.types.namedTypes;

type TImportMap = {
  [importKind: TKind]: {
    main?: string,
    others?: string[],
  },
};

function keys<T: string>(obj: any): Array<T> {
  return Object.keys(obj);
}

export function updateImport(ast: any, importMap: TImportMap) {
  const newStatements = [];
  keys(importMap).forEach(importKind => {
    const mapKind: TImportInfo = importMap[importKind];
    keys(mapKind).forEach(path_ => {
      // Combine with exists import if any
      const currentImport = ast.find(types.ImportDeclaration, {
        importKind: importKind,
        source: {
          type: "Literal",
          value: path_,
        },
      });

      const initImportInfo: TImportInfo = mapKind[path_];

      if (currentImport.size() > 0) {
        // Has some imports => combine all of them to one
        let finalImportInfo: TImportInfo = initImportInfo;
        currentImport.forEach(path2_ => {
          const currentImportInfo = _getImportInfo(path2_.node);
          finalImportInfo = _combineImportInfo(
            finalImportInfo,
            currentImportInfo,
          );
        });

        const newImport = _buildPath(finalImportInfo, path_, importKind);

        currentImport.forEach((path2_, i) => {
          if (i === 0) {
            // console.log("currentImport.at(0)", currentImport.at(0).get());
            if (currentImport.size() > 0) {
              newImport.comments = currentImport.at(0).get().node.comments;
              currentImport.at(0).replaceWith(newImport);
            }
          } else {
            currentImport.at(i).remove();
          }
        });
      } else {
        newStatements.push(_buildPath(initImportInfo, path_, importKind));
      }
    });
  });

  // if (newStatements.length === 0) {
  //   // no import
  //   return;
  // }
  const statements = ast.find(types.Statement);
  if (statements.size() === 0) {
    const s = ast.find(types.Program);
    s.insertAfter(newStatements);
  } else {
    const statement0 = statements.at(0);

    if (!types.ImportDeclaration.check(statement0)) {
      const s0 = statement0.get().node;

      if (newStatements.length > 0) {
        const comments = s0.comments;
        // console.log(s0, s0.name);
        delete s0.comments;
        newStatements[0].comments = comments;
      }
    }

    statement0.insertBefore(newStatements);
  }

  // sort Imports
  sortImports(ast);
}

export function sortImports(ast: any) {
  // console.log('sort import');
  const config = {};
  const declarations = ast.find(types.ImportDeclaration);
  const sortedDeclarations = declarations.nodes().sort((a, b) => {
    const aImportKind = a.importKind === "value" ? 0 : 1;
    const bImportKind = b.importKind === "value" ? 0 : 1;

    // 'import value' should go before 'import type'
    if (aImportKind < bImportKind) {
      return -1;
    } else if (aImportKind > bImportKind) {
      return 1;
    }

    return compareImports(a.source.value, b.source.value, config.groups);
  });

  // console.log(JSON.stringify(ast.get(0).node, null, 2));

  /**
   * Respect the first comment
   * 
   * Input:
   *    // My comment
   *    import A from './A';
   *    import React from 'react';
   * Expect:
   *    // My comment
   *    import React from 'react';
   *    import A from './A';
   * Actual: 
   *    import React from 'react';
   *    // My comment
   *    import A from './A';
   * 
   * Root cause: the comment is attached into node 'import A...', so when the node is moved, the comments are moved too.
   * Solution: Get the comments from the first node before sort and move it the the first node after sort.
   */
  if (sortedDeclarations.length > 0) {
    const firstDeclarationNode = declarations.get(0).node;
    if (firstDeclarationNode) {
      const comments = firstDeclarationNode.comments;

      sortedDeclarations[0].comments = comments;

      // Find the sortedNode
      for (const node of sortedDeclarations.slice(1)) {
        if (isEqual(node, firstDeclarationNode)) {
          delete node.comments;
          break;
        }
      }
    }
  }

  ast
    .find(types.Statement)
    .at(0)
    .insertBefore(sortedDeclarations);

  // console.log(ast.toSource());

  declarations.remove();
  // console.log(ast.toSource());
}

function _getImportInfo(node: any) {
  let ret = {};

  // Main
  const mainItem = node.specifiers.filter(
    item =>
      item.type === "ImportDefaultSpecifier" &&
      item.local.type === "Identifier",
  )[0];

  if (mainItem) {
    ret.main = mainItem.local.name;
  }

  // Others
  const others: string[] = node.specifiers
    .filter(
      item =>
        item.type === "ImportSpecifier" && item.local.type === "Identifier",
    )
    .map(item => item.local.name);

  ret.others = others;

  return ret;
}

function _combineImportInfo(info1: TImportInfo, info2: TImportInfo) {
  const main: ?string =
    info1.main != null ? info1.main : info2.main != null ? info2.main : null;
  const others = uniq([...(info1.others || []), ...(info2.others || [])]);

  let ret: TImportInfo = { others };
  if (main != null) {
    ret.main = main;
  }

  return ret;
}

function _buildPath(importInfo: TImportInfo, path_: string, importKind: TKind) {
  const { main, others } = importInfo;
  let specifiers = [];
  if (main != null) {
    specifiers.push(builders.importDefaultSpecifier(builders.identifier(main)));
  }

  const others_ = others != null ? others : [];

  specifiers = [
    ...specifiers,
    ...others_
      .sort()
      .map(other => builders.importSpecifier(builders.identifier(other))),
  ];
  return builders.importDeclaration(
    specifiers,
    builders.literal(path_),
    importKind,
  );
}
