import { codeBuilder } from "./DetectUndefinedIdentifierTestUtils";

describe("Detect Undefined Identifier for Flow Type", () => {
  const { code, codeFile } = codeBuilder(
    "DetectUndefinedIdentifierFlow",
    "default",
  );

  // it("_DebugUndefinedIdentifier", () => {
  //   codeFile("_DebugUndefinedIdentifier")
  //     .missImport("C")
  //     .noImport("a");
  // });

  it("detect undefined flow type", () => {
    code(`
    const A: TA = 1;
    `)
      .missImportType("TA")
      .noImport("TA");
  });

  it("declared flow type", () => {
    code(`
    type TA = number;
    const A: TA = 1;
    `).noImportType("TA");
  });

  it("declared flow type: object type", () => {
    code(`
    type TUser = {
      name: string,
      age: number
    };
    const A: TUser = {
      name: "A",
      age: 10
    };
    `).noImportType("TUser");
  });

  it("ignore imported type", () => {
    code(`
    import type {TUser} from './types';
    const A: TUser = {
      name: "A",
      age: 10
    };
    `).noImportType("TUser");
  });

  // This case is not important because try to auto import will lead to syntax error
  it.skip("not mess FlowType with default identifier", () => {
    code(`
    import type {TUser} from './types';
    TUser();
    `).missImport("TUser");
  });

  it("Define flowtype", () => {
    code(`
      // @flow
      type TItem = {
        value: string
      };
      `)
      .noImportType("TItem")
      .noImport("TItem");
  });

  it("Generic type in flow is not undefined identifier", () => {
    code(`
    type TItem<TValue> = {
      value: TValue
    };
    `)
      .noImportType("TValue")
      .noImport("TValue", "TItem");
  });

  // TODO Fix this
  it("flow generic class", () => {
    code(`
    class B extends C<T2> {}
    `)
      .missImportType("T2")
      .missImport("C")
      // .missImport("T2", "C", "D", "E")
      .noImport("T1", "A", "B", "T3");
  });

  it("ignore-generic-type-annotation", () => {
    codeFile("ignore-generic-type-annotation").noImport("TValue");
  });
});
