import { diffOptions } from "./OptionFile";

describe("Option change detect", () => {
  function options(oldOptions, newOptions) {
    const { packages: { replaced, removed, added } } = diffOptions(
      oldOptions,
      newOptions
    );

    const checker = {
      replacePackages: (...packages: string[]) => {
        for (const package_ of packages) {
          expect(replaced).toContain(package_);
        }

        return checker;
      },
      notReplacePackages: (...packages: string[]) => {
        for (const package_ of packages) {
          expect(replaced).not.toContain(package_);
        }

        return checker;
      },
      removePackages: (...packages: string[]) => {
        for (const package_ of packages) {
          expect(removed).toContain(package_);
        }

        return checker;
      },
      notRemovePackages: (...packages: string[]) => {
        for (const package_ of packages) {
          expect(removed).not.toContain(package_);
        }

        return checker;
      },
      addPackages: (...packages: string[]) => {
        for (const package_ of packages) {
          expect(added).toContain(package_);
        }

        return checker;
      },
      notAddPackages: (...packages: string[]) => {
        for (const package_ of packages) {
          expect(added).not.toContain(package_);
        }

        return checker;
      },
    };

    return checker;
  }

  it("could detect remove and add package", () => {
    options(
      {
        packages: {
          a: {},
          b: {},
        },
      },
      {
        packages: {
          a: {},
          c: {},
        },
      }
    )
      .removePackages("b")
      .addPackages("c")
      .notRemovePackages("a")
      .notAddPackages("a")
      .notReplacePackages("a");
  });

  it("could detect change package", () => {
    options(
      {
        packages: {
          a: {
            main: "X",
          },
        },
      },
      {
        packages: {
          a: {
            main: "Y",
          },
        },
      }
    ).replacePackages("a");
  });

  it("could detect when old options is missed", () => {
    options(
      { packages: {} },
      {
        packages: {
          a: {},
        },
      }
    ).addPackages("a");
  });

  it("could handle missed 'packages' attribute", () => {
    options(
      { packages: {} },
      {
        packages: {
          a: {},
        },
      }
    ).addPackages("a");
  });
});
