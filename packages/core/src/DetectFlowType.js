// @flow
import { difference, flatMap } from "lodash";
import recast from "recast";
import {
  withQueryTransform,
  isIdentifier,
  isObjectPattern,
  compose,
} from "./utils/Query";
import type { TAST } from "./types";

const types = recast.types.namedTypes;

// input: const A: TA = 1;
// output: ["TA"]
let GenericTypeAnnotationIdentifier = withQueryTransform({
  query: types.GenericTypeAnnotation,
  filter: {
    id: {
      type: "Identifier",
    },
  },
  nodeTransform: node => node.id.name,
});

// input: type TA = number;
// output: ["TA"]
let TypeAliasIdentifiers = withQueryTransform({
  query: types.TypeAlias,
  filter: {
    id: {
      type: "Identifier",
    },
  },
  nodeTransform: node => node.id.name,
});

// input: type T1<T2> = {};
// output: ["T2"]
let TypeParameterIdentifier = withQueryTransform({
  query: types.TypeParameter,
  nodeTransform: node => node.name,
});

// input: import type {TA} from './types';
// output: ["TA"]
let ImportDeclarationIdentifiers = withQueryTransform({
  query: types.ImportDeclaration,
  filter: {
    importKind: "type",
  },
  flatNodeTransform: node =>
    node.specifiers != null
      ? node.specifiers
          .map(item => (item.imported != null ? item.imported.name : null))
          .filter(item => item)
      : [],
});

export function detectFlowType(ast: TAST) {
  let definedTypes = compose(
    TypeAliasIdentifiers,
    ImportDeclarationIdentifiers,
    TypeParameterIdentifier,
  )(ast);

  let undefinedTypes = compose(
    // Flow type idenfiers
    GenericTypeAnnotationIdentifier,
  )(ast);

  return difference(undefinedTypes, definedTypes);
}
