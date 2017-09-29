import { getUndefinedIdentifier } from "./DetectUndefESLint";

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
});
