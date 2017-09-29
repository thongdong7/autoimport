import recast from "recast";
import {
  withQueryTransform,
  isIdentifier,
  isObjectPattern,
  compose,
} from "./utils/Query";
import { flatMap } from "lodash";
import { detectIdentifiers, STOP_PROCESS } from "./utils/Detect";

const types = recast.types.namedTypes;

// input: import A from 'a';
// output: [A]
const ImportedIdentifiers = withQueryTransform({
  query: types.ImportDeclaration,
  filter: {
    importKind: "value",
  },
  flatNodeTransform: node => {
    return node.specifiers.map(item => item.local.name);
  },
});

// Input: class A extends Component {}
// Output: [A]
const DeclaredClassIdentifier = withQueryTransform({
  query: types.ClassDeclaration,
  flatNodeTransform: node => {
    let ret = [];

    if (node.id && isIdentifier(node.id)) {
      ret.push(node.id.name);
    }

    return ret;
  },
});

const DeclaredIdentifiers = withQueryTransform({
  query: types.VariableDeclarator,
  filter: {
    id: {
      type: "Identifier",
    },
  },
  nodeTransform: node => node.id.name,
});

// Input: const {a, b: b1, ...c} = {}
// Output: [a, b1, c]
const VarObjectPatternIdentifiers = withQueryTransform({
  query: types.VariableDeclarator,
  filter: {
    id: {
      type: "ObjectPattern",
    },
  },
  flatNodeTransform: node => {
    // console.log(JSON.stringify(node.id, null, 2));
    return [
      ...node.id.properties
        .filter(item => item.type === "Property" && isIdentifier(item.value))
        .map(item => item.value.name),
      ...node.id.properties
        .filter(
          item => item.type === "RestProperty" && isIdentifier(item.argument),
        )
        .map(item => item.argument.name),
    ];
  },
});

const FuncParamsIdentifiers = withQueryTransform({
  query: types.FunctionDeclaration,
  filter: {
    params: [],
  },
  flatNodeTransform: node => {
    return node.params.filter(isIdentifier).map(item => item.name);
  },
});

const ArrowFuncParamsIdentifiers = withQueryTransform({
  query: types.ArrowFunctionExpression,
  flatNodeTransform: node => {
    return node.params.filter(isIdentifier).map(item => item.name);
  },
});

function _getIdentifiersFromParams(params: Object[]): string[] {
  const x = params.filter(isObjectPattern);
  // $FlowFixMe
  const objectPatternIdentifiers: string[] = flatMap(x, item =>
    item.properties.filter(item2 => item2.value).map(item2 => item2.value.name),
  );

  const y: string[] = params
    .filter(isIdentifier)
    .map((item: { name: string }) => item.name);
  return [...objectPatternIdentifiers, ...y];
}

// Input: const a = { x(value) {}}
// Output: ["a", "value"]
const FunctionExpressionParamsIdentifiers = withQueryTransform({
  query: types.FunctionExpression,
  flatNodeTransform: node => {
    // return node.params.filter(_isIdentifier).map(item => item.name);
    return _getIdentifiersFromParams(node.params);
  },
});

// input: function x(y){}
// output: ["x"]
let FuncIdentifier = withQueryTransform({
  query: types.FunctionDeclaration,
  nodeTransform: node => node.id.name,
});
// console.log("func vars", funcVars);

// ignore identifier in variable->init
const StopVariableDeclaratorInit = {
  type: "VariableDeclarator",
  process: ({ child }) => {
    if (child.name === "init") {
      return STOP_PROCESS;
    }
  },
};

const ArrowFunctionExpressionParams = {
  type: "ArrowFunctionExpression",
  process: ({ child, path }) => {
    // if (path.node.name === "b") {
    //   console.log(path.node.name, child.parentPath.name);
    // }
    if (child.parentPath.name === "params") {
      return path.node.name;
    }
  },
};

// Detect identifier by lookup its parent
const parentImportedIdentifier = ast => {
  let ret = new Set();
  const myDetect = detectIdentifiers(
    // Arrow function expression params must be before StopVar
    ArrowFunctionExpressionParams,
    StopVariableDeclaratorInit,
  );

  ast.find(types.Identifier).forEach(path => {
    const items = myDetect(path);
    for (const item of items) {
      ret.add(item);
    }
  });

  // console.log("parent");
  return [...ret];
};

export const detectImportedIdentifiers = compose(
  DeclaredIdentifiers,
  ImportedIdentifiers,
  FuncIdentifier,
  FuncParamsIdentifiers,
  ArrowFuncParamsIdentifiers,
  VarObjectPatternIdentifiers,
  FunctionExpressionParamsIdentifiers,
  DeclaredClassIdentifier,
  // Will be used to replace abover identifier detection
  parentImportedIdentifier,
);
