import recast from "recast";

const namedTypes = recast.types.namedTypes;
export const STOP_PROCESS = Symbol();

type TNode = Object;

type TProcessInput = {
  child: TNode,
  parent: TNode,
  path: TNode,
};

export type TDetector = {
  type: string,
  process: (input: TProcessInput) => typeof STOP_PROCESS | string | void,
};

export const detectIdentifiers = (...detectors: TDetector[]) => (
  path: TNode
) => {
  let ret = new Set();
  for (const detector of detectors) {
    const { type, process } = detector;
    const tmp = _findParent(path, {
      type,
    });

    if (tmp) {
      const out = process({ ...tmp, path });
      if (out === STOP_PROCESS) {
        return ret;
      }

      if (out != null) {
        // console.log("oput", out);
        ret.add(out);
        return ret;
      }
    }
  }

  // TODO Fix this
  const parent = path.parent;
  if (
    namedTypes.Property.check(parent.node) &&
    parent.node.shorthand === true
  ) {
    ret.add(path.node.name);
  }

  return ret;
};
type TFindParentResult =
  | false
  | {
      child: Object,
      parent: Object,
    };

function _findParent(path_, query): TFindParentResult {
  if (!path_ || !path_.parent) {
    return false;
  }
  const { type } = query;

  if (namedTypes[type].check(path_.parent.node)) {
    return { child: path_, parent: path_.parent };
  }

  return _findParent(path_.parent, query);
}
