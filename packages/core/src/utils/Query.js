// @flow

import { uniq, flatMap } from "lodash";
import type { TAST } from "../types";

export type TQueryTransform = {
  query: any,
  filter?: Object | Function,
  nodeTransform?: (node: Object) => string,
  flatNodeTransform?: (node: Object) => string[],
};

export const withQueryTransform = ({
  query,
  filter,
  nodeTransform,
  flatNodeTransform,
}: TQueryTransform) => (ast: TAST) => {
  const paths = ast.find(query, filter).paths();
  let ret = flatMap(paths, path => {
    if (nodeTransform) {
      return [nodeTransform(path.node)];
    } else if (flatNodeTransform) {
      return flatNodeTransform(path.node);
    }

    return [];
  });

  return uniq(ret);
};

export const compose = (...funcs: Function[]) => (ast: TAST) => {
  let ret = [];

  for (const func of funcs) {
    ret = [...ret, ...func(ast)];
  }

  return ret;
};

/**
 * Check if node is identifier
 */
export function isIdentifier(node: Object) {
  return node.type === "Identifier";
}

/**
 * Check if node is ObjectPattern
 */
export function isObjectPattern(node: Object) {
  return node.type === "ObjectPattern";
}

export function isLiteral(node: Object) {
  return node.type === "Literal";
}
