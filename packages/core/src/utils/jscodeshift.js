const jscodeshift = require("jscodeshift");
const getParser = require("jscodeshift/dist/getParser");

type TJSCodeShiftOptions = {
  parser: "flow",
};

const initOptions: TJSCodeShiftOptions = {
  parser: "flow",
};

export function prepareJscodeshift(options: TJSCodeShiftOptions = initOptions) {
  // if (parser) {
  //   return jscodeshift.withParser(parser);
  // } else
  if (options.parser) {
    return jscodeshift.withParser(getParser(options.parser));
  } else {
    return jscodeshift;
  }
}
