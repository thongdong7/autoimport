import { sortImports } from "./ImportUtils";
import { prepareJscodeshift } from "./jscodeshift";

const formatBuilder = fn => (text: string) => {
  const normalizedText = removeCodeIndent(text);

  const j = prepareJscodeshift();
  const ast = j(normalizedText);

  fn(ast);

  const actual = ast.toSource();
  // console.log(`|${normalizedText}|`);
  const checker = {
    toBe(expectedText: string) {
      const normalizedExpectedText = removeCodeIndent(expectedText);
      expect(actual).toEqual(normalizedExpectedText);

      return checker;
    },
  };

  return checker;
};

describe("Sort Import", () => {
  const format = formatBuilder(sortImports);

  it("not change the first comment order", () => {
    format(`
      // @flow
      import A from "./A";
      import React from "react";
    `).toBe(`
      // @flow
      import React from "react";
      import A from "./A";
    `);
  });

  it("not change the first comment order - line block", () => {
    format(`
      /**
       * abc
       * 
       * @flow
       */
      import A from "./A";
      import React from "react";
    `).toBe(`
      /**
       * abc
       * 
       * @flow
       */
      import React from "react";
      import A from "./A";
    `);
  });

  it("external packages => internal outside packages => internal inside packages", () => {
    format(`
      // @flow
      import B from "../B";
      import A from "./A";
      import React from "react";
    `).toBe(`
      // @flow
      import React from "react";
      import B from "../B";
      import A from "./A";
    `);
  });
});
