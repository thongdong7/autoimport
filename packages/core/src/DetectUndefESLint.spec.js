import {
  getUndefinedIdentifier,
  getErrorIdentifiers,
} from "./DetectUndefESLint";

describe("Undefined Identifier using ESLint", () => {
  // In ESLint we trust
  it("quick check", () => {
    const actual = getUndefinedIdentifier(`
      a = 1;
      function f({y, z: {z1}}, u) {
        const {b,c:{d}} = u;
        const x = {e, f: 1};
        const y = {b,c};
        const z = [document, window, console];
      }
    `);

    expect(actual).toEqual(["a", "e", "c"]);
  });

  fit("get unused with React", () => {
    const actual = getErrorIdentifiers(`
      import React from 'react';
      import A from './A';

      export const b = props => <div />;
    `);

    expect(actual).toEqual({ undefined: [], unused: ["A"] });
  });

  // fit("get unused without React", () => {
  //   const actual = getErrorIdentifiers(`
  //     import React from 'react';
  //     import A from './A';

  //     const b = 1;
  //   `);

  //   expect(actual).toEqual({ undefined: [], unused: ["React", "A"] });
  // });
});
