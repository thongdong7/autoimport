// @flow
import { flatMap, uniq, remove } from "lodash";
import { CLIEngine } from "eslint";
import { builtinGlobal } from "./utils/BuiltinIdentifiers";

const cli = new CLIEngine({
  useEslintrc: false,
  extends: "react-app1",
  rules: {
    "react/jsx-no-undef": "error",
    "react/react-in-jsx-scope": "error",
    // "flowtype/define-flow-type": "error",
    // "flowtype/use-flow-type": "error",
    "flowtype/define-flow-type": "error",
    "flowtype/require-valid-file-annotation": "error",
    "flowtype/use-flow-type": "error",
    "no-undef": "error",
    "no-unused-vars": "error",
  },
  env: {
    node: true,
  },
  // extends: "react-app",
  parser: "babel-eslint",
  parserOptions: {
    ecmaVersion: 6,
    sourceType: "module",
    ecmaFeatures: {
      jsx: true,
      generators: true,
      experimentalObjectRestSpread: true,
    },
  },
  plugins: ["import", "react", "flowtype"],
  // 'import', 'flowtype', 'jsx-a11y', 'react'
  // plugins: ["react-app"],
});

const identifierRegex = /'(.*)'/;
const flowTypeRegex = /^\s*type\s+(\w+)/;

function _parseIdenfierFromMsg(message: string): string {
  const found = message.match(identifierRegex);

  // console.log(found);
  // $FlowFixMe
  return found[1];
}

function _errorToIdentifier(item: { message: string, source: string }) {
  const found = item.source.match(flowTypeRegex);
  // console.log("f", found);

  if (found != null) {
    // item.source is 'type XXX = ' => ignore
    return false;
  }

  const identifier = _parseIdenfierFromMsg(item.message);
  if (builtinGlobal.has(identifier)) {
    return false;
  }

  return identifier;
}

function _getUndefineIdentifierFromMessages(messages) {
  let undefinedIdentifiers = messages
    .filter(
      item =>
        item.ruleId === "no-undef" || item.ruleId === "react/jsx-no-undef",
    )
    .map(_errorToIdentifier)
    .filter(identifier => identifier !== false);

  const missedReact =
    messages.filter(item => item.ruleId === "react/react-in-jsx-scope").length >
    0;

  if (missedReact) {
    undefinedIdentifiers = undefinedIdentifiers.concat("React");
  }

  // console.log(undefinedIdentifiers);
  return uniq(undefinedIdentifiers);
}

function _getUnusedImportIdentifierFromMessages(messages) {
  let unusedIdentifiers = messages
    .filter(item => item.ruleId === "no-unused-vars")
    .filter(item => item.source.trim().startsWith("import "))
    .map(_errorToIdentifier)
    .filter(identifier => identifier !== false);

  // const missedReact =
  //   messages.filter(item => item.ruleId === "react/react-in-jsx-scope")
  //     .length === 0;

  // if (missedReact) {
  //   remove(unusedIdentifiers, item => item === "React");
  // }

  // console.log(unusedIdentifiers);
  return uniq(unusedIdentifiers);
}

/**
 * @deprecated Use getErrorIdentifiers() instead
 *
 * @param {string} code
 */
export function getUndefinedIdentifier(code: string): string[] {
  const out = cli.executeOnText(code);
  const messages = flatMap(out.results, results => results.messages);
  // console.log(messages);

  return _getUndefineIdentifierFromMessages(messages);
}

/**
 * Get undefined and unused identifiers
 */
// export function getErrorIdentifiers(code: string): Object {
//   const out = cli.executeOnText(code);
//   const messages = flatMap(out.results, results => results.messages);
//   console.log(messages);

//   let undefinedIdentifiers = _getUndefineIdentifierFromMessages(messages);
//   let unusedIdentifiers = _getUnusedImportIdentifierFromMessages(messages);

//   return {
//     undefined: undefinedIdentifiers,
//     unused: unusedIdentifiers,
//   };
// }
