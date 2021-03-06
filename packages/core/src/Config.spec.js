import Config, { parseIdentifierNameOfOther } from "./Config";
import { initNormalizedOptions } from "./utils/OptionFile";

describe("Config", () => {
  it("could apply diff add", () => {
    const packages = {
      a: {
        main: "A",
        others: ["A1"],
      },
    };
    const config = new Config(initNormalizedOptions);
    // expect(config.getMemberInfo("A")).toBeDefined();
    // expect(config.getMemberInfo("A1")).toBeDefined();

    // Add
    config.applyPackagesDiff(packages, {
      removed: [],
      added: ["a"],
      replaced: [],
    });
    expect(config.getMemberInfo("A")).toBeDefined();
    expect(config.getMemberInfo("A1")).toBeDefined();

    // Replace
    const newPackages = {
      a: {
        main: "B",
        others: ["A1"],
      },
    };
    config.applyPackagesDiff(newPackages, {
      removed: [],
      added: [],
      replaced: ["a"],
    });
    expect(config.getMemberInfo("A")).toBeUndefined();
    expect(config.getMemberInfo("B")).toBeDefined();
    expect(config.getMemberInfo("A1")).toBeDefined();

    // Remove
    config.applyPackagesDiff({}, { removed: ["a"], added: [], replaced: [] });
    expect(config.getMemberInfo("A")).toBeUndefined();
    expect(config.getMemberInfo("A1")).toBeUndefined();
  });
});

describe("parseIdentifierNameOfOther", () => {
  it("could parse alias", () => {
    const actual = parseIdentifierNameOfOther("Switch as UISwitch");

    expect(actual).toEqual({
      memberAlias: "UISwitch",
      memberName: "Switch",
    });
  });

  it("could parse non alias", () => {
    const actual = parseIdentifierNameOfOther("Switch");

    expect(actual).toEqual({
      memberAlias: "Switch",
      memberName: "Switch",
    });
  });
});
