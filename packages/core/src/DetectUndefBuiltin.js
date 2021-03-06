// @flow
import { difference, uniq } from "lodash";
import recast from "recast";
import { withQueryTransform, isIdentifier, compose } from "./utils/Query";
import { detectIdentifiers, STOP_PROCESS } from "./utils/Detect";
import type { TAST } from "./types";
import { htmlTags } from "./utils/HTMLTags";

const types = recast.types.namedTypes;

// Input: class A extends Component {}
// Output: [Component]
// Input: class A extends React.Component {}
// Output: [React]
const SuperClassIdentifier = withQueryTransform({
  query: types.ClassDeclaration,
  // filter: {
  //   // superClass: {
  //     // type: "Identifier",
  //   // },
  // },
  flatNodeTransform: node => {
    let ret = [];

    const { superClass } = node;
    if (superClass) {
      switch (superClass.type) {
        case "Identifier":
          ret.push(superClass.name);

          break;
        case "MemberExpression":
          if (isIdentifier(superClass.object)) {
            ret.push(superClass.object.name);
          }
          break;

        default:
          break;
      }
    }

    return ret;
  },
});

const CallMemberIdentifiers = withQueryTransform({
  query: types.CallExpression,
  filter: {
    callee: {
      type: "MemberExpression",
      object: {
        type: "Identifier",
      },
    },
  },
  nodeTransform: node => node.callee.object.name,
});

// input: a()
// output: ["a"]
let CallExpressionIdentifier = withQueryTransform({
  query: types.CallExpression,
  filter: {
    callee: {
      type: "Identifier",
    },
  },
  nodeTransform: node => node.callee.name,
});

let CallExpressionParamsIdentifier = withQueryTransform({
  query: types.CallExpression,
  filter: {
    arguments: [],
  },
  flatNodeTransform: node =>
    node.arguments.filter(isIdentifier).map(item => item.name),
});
// console.log("call", callIdentifiers2);

// input: const a = x;
// output: ["x"]
let VarAssignToIdentifier = withQueryTransform({
  query: types.VariableDeclarator,
  filter: {
    init: {
      type: "Identifier",
    },
  },
  nodeTransform: node => node.init.name,
});

// input: switch (A) {};
// output: ["A"]
let SwitchIdentifier = withQueryTransform({
  query: types.SwitchStatement,
  filter: {
    discriminant: {
      type: "Identifier",
    },
  },
  nodeTransform: node => node.discriminant.name,
});

// input: switch (A) { case B: ...};
// output: ["A", "B"]
let SwitchCaseIdentifier = withQueryTransform({
  query: types.SwitchCase,
  filter: {
    test: {
      type: "Identifier",
    },
  },
  nodeTransform: node => node.test.name,
});

// input: return x;
// output: ["x"]
let ReturnIdentifier = withQueryTransform({
  query: types.ReturnStatement,
  filter: {
    argument: {
      type: "Identifier",
    },
  },
  nodeTransform: node => node.argument.name,
});

// input: const a = {x: {y: B, [z]: C}};
// output: ["B", "z", "C"]
let ObjectExpressionIdentifier = withQueryTransform({
  query: types.ObjectExpression,
  flatNodeTransform: node => [
    ...node.properties
      .filter(item => item.type === "Property" && isIdentifier(item.value))
      .map(item => item.value.name),
    ...node.properties
      .filter(
        item =>
          item.type === "Property" && isIdentifier(item.key) && item.computed,
      )
      .map(item => item.key.name),
  ],
});

// superClass identifier
const SuperClassIdentifier2 = {
  type: "ClassExpression",
  process: ({ child }) => {
    // console.log("child name", child.name);
    if (child.name === "superClass") {
      return child.node.name;
    }
  },
};

const MemberExpression2 = {
  type: "MemberExpression",
  process: ({ child, path }) => {
    if (path.name === "object") {
      return path.node.name;
    }
  },
};

const JSXExpressionContainer = {
  type: "JSXExpressionContainer",
  process: ({ child, path }) => {
    if (path.name === "expression") {
      return path.node.name;
    }
  },
};

const StopPropertyKeyIdentifier = {
  type: "Property",
  process: ({ child, path }) => {
    if (path.name === "key") {
      return STOP_PROCESS;
    }
  },
};

const StopMemberExpressionPropertyIdentifier = {
  type: "MemberExpression",
  process: ({ child, path }) => {
    if (path.name === "property") {
      return STOP_PROCESS;
    }
  },
};

const StopHTMLJSXIdentifier = {
  type: "JSXOpeningElement",
  process: ({ child, path }) => {
    if (path.node.type === "JSXIdentifier" && htmlTags.has(path.node.name)) {
      return STOP_PROCESS;
    }
  },
};

const StopGenericTypeAnnotation = {
  type: "GenericTypeAnnotation",
  process: ({ child, path }) => {
    // console.log(child.name);
    return STOP_PROCESS;
  },
};

const StopArrowFunctionExpressionParams = {
  type: "ArrowFunctionExpression",
  process: ({ child, path }) => {
    // console.log(child.parentPath.name);
    if (child.parentPath.name === "params") {
      return STOP_PROCESS;
    }
  },
};

const StopJSXAttributeIdentifier = {
  type: "JSXAttribute",
  process: ({ child, path }) => {
    if (child.name === "name") {
      return STOP_PROCESS;
    }
  },
};

const Property2 = {
  type: "Property",
  process: ({ child, path }) => {
    if (path.name === "value") {
      return path.node.name;
    }
  },
};

const JSXIdentifier = {
  type: "JSXOpeningElement",
  process: ({ child, path }) => {
    if (path.name === "name") {
      return path.node.name;
    }
  },
};

// const A = B + C => B,C is undefined identifiers
// Fail case: const a = <Abc x />; => x is detected as identifier
const VariableDeclarator2 = {
  type: "VariableDeclarator",
  process: ({ child, path }) => {
    // console.log("cn", child.name, path.node.name);
    if (child.name === "init") {
      return path.node.name;
    }
  },
};

// class A extends B<T> {} => [B, T]
// const ClassExtendsGenericType = {
//   type: "GenericTypeAnnotation",
//   process: ({ child, path }) => {
//     // console.log("cn", child.name, path.node.name);
//     // console.log("a");
//     if (child.name === "superTypeParameters") {
//       return path.node.name;
//     }
//   },
// };

// Fail on case 'props.a + 1' => a is detected as identifier
// const BinaryExpression2 = {
//   type: "BinaryExpression",
//   process: ({ child, path }) => {
//     return path.node.name;
//   },
// };

// Detect identifier by lookup its parent
const parentMissedIdentifier = ast => {
  let ret = new Set();
  const myDetect = detectIdentifiers(
    StopPropertyKeyIdentifier,
    StopMemberExpressionPropertyIdentifier,
    StopJSXAttributeIdentifier,
    StopHTMLJSXIdentifier,
    StopGenericTypeAnnotation,
    StopArrowFunctionExpressionParams,
    SuperClassIdentifier2,
    MemberExpression2,
    JSXExpressionContainer,
    VariableDeclarator2,
    Property2,
    JSXIdentifier,
    // ClassExtendsGenericType
    // BinaryExpression2
  );

  // console.log(JSON.stringify(ast.nodes(), null, 2));
  // ast.find(types.GenericTypeAnnotation).forEach(path => {
  //   console.log("path1", path.node.name);
  //   // const items = myDetect(path);
  //   // for (const item of items) {
  //   //   ret.add(item);
  //   // }
  // });
  ast.find(types.Identifier).forEach(path => {
    // console.log("path", path.node.name);
    const items = myDetect(path);
    for (const item of items) {
      ret.add(item);
    }
  });

  // console.log("parent");
  return [...ret];
};

import { builtinGlobal } from "./utils/BuiltinIdentifiers";
import { detectImportedIdentifiers } from "./DetectImportedIdentifier";

export default (ast: TAST) => {
  // console.log("aaaa1");
  let importedIdentifiers = detectImportedIdentifiers(ast);
  // console.log("imported", importedIdentifiers);

  importedIdentifiers = uniq([...importedIdentifiers, ...builtinGlobal]);

  let identifiers = compose(
    CallMemberIdentifiers,
    CallExpressionIdentifier,
    VarAssignToIdentifier,
    SuperClassIdentifier,
    ReturnIdentifier,
    CallExpressionParamsIdentifier,
    // JSXIdentifiers,
    SwitchIdentifier,
    SwitchCaseIdentifier,
    ObjectExpressionIdentifier,
    // This one will be used to replace above detection
    parentMissedIdentifier,
  )(ast);

  // Check is has JSX
  if (identifiers.indexOf("React") < 0 && ast.findJSXElements().size() > 0) {
    identifiers.push("React");
  }

  identifiers = uniq(identifiers);
  // console.log("identi", identifiers);

  // Missed identifers
  return difference(identifiers, importedIdentifiers);
};
