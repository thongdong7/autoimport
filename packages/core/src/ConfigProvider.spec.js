import ConfigProvider from "./ConfigProvider";
import fs from "fs";
import path from "path";
import shell from "shelljs";
import os from "os";

import type { TOptions } from "./types";

describe("ConfigProvider", () => {
  function fixture() {
    const configProvider = new ConfigProvider();
    const projectPath = path.join(os.tmpdir(), "autoimport-e2e");
    if (fs.existsSync(projectPath)) {
      // Remove this folder
      shell.rm("-rf", projectPath);
    }

    shell.mkdir("-p", projectPath);

    const testFile = path.join(projectPath, "a.js");
    const optionsFile = path.join(projectPath, "autoimport.json");

    const tool = {
      start: (options: TOptions) => {
        tool.writeOptions(options, { notify: false });
        configProvider.updateProjectPaths([projectPath]);
      },
      startWithoutOptionFile: () => {
        configProvider.updateProjectPaths([projectPath]);
      },

      writeOptions: (options_, { notify } = { notify: true }) => {
        fs.writeFileSync(optionsFile, JSON.stringify(options_, null, 2));

        // Notify that optionsFile is updated
        if (notify) {
          configProvider.updateOptionFile(optionsFile);
        }

        return tool;
      },

      writeFile: (file: string, content: string) => {
        tool._initFile(file, content);

        const fullPath = path.join(projectPath, file);

        configProvider.addFile(fullPath, content);

        return tool;
      },

      // write file with out notify to configProvider
      _initFile: (file: string, content: string) => {
        const fullPath = path.join(projectPath, file);
        const dirName = path.dirname(fullPath);
        if (!fs.existsSync(dirName)) {
          shell.mkdir("-p", dirName);
        }

        fs.writeFileSync(fullPath, content);
      },

      format: (text: string, file?: string) => {
        const normalizedText = removeCodeIndent(text);

        const importFile =
          file != null ? path.join(projectPath, file) : testFile;
        const nextText = configProvider.formatFile(importFile, normalizedText);

        const checker = {
          is: (expectedText: string) => {
            // console.log(removeCodeIndent(expectedText));
            expect(nextText.trim()).toEqual(removeCodeIndent(expectedText));

            return checker;
          },
        };

        return checker;
      },
    };

    //
    tool._initFile(
      "types.js",
      `
    export type TName = string;
    `,
    );

    return tool;
  }

  it("could update the option file", () => {
    const tool = fixture();
    const options1 = {
      packages: {
        react1: {
          main: "React1",
          others: ["Component1"],
        },
        "react-dom1": {
          main: "ReactDOM1",
        },
      },
      rootPath: "",
    };
    tool.start(options1);

    // Format with ReactDOM1
    tool.format(`ReactDOM1.render();`).is(`
import ReactDOM1 from "react-dom1";
ReactDOM1.render();
    `);

    // Change options
    const options2 = {
      ...options1,
      packages: {
        react1: {
          main: "React1",
          others: ["Component1"],
        },
        "react-dom2": {
          main: "ReactDOM1",
        },
      },
    };
    tool.writeOptions(options2);

    tool.format(`ReactDOM1.render();`).is(`
import ReactDOM1 from "react-dom2";
ReactDOM1.render();
    `);

    // Change back to option1
    tool.writeOptions(options1);
    tool.format(`ReactDOM1.render();`).is(`
import ReactDOM1 from "react-dom1";
ReactDOM1.render();
        `);
  });

  it("support ignore custom global identifiers", () => {
    const tool = fixture();
    const options1 = {
      rootPath: "",
    };
    tool.start(options1);

    tool.writeFile("Abc.js", "export default 1");
    tool.format("const x = Abc;").is(`
    import Abc from "./Abc";
    const x = Abc;
    `);

    tool.writeOptions(
      {
        rootPath: "",
        ignore: ["Abc"],
      },
      { notify: true },
    );

    tool.format("const x1 = Abc;").is("const x1 = Abc;");
  });

  it("could build import for new file", () => {
    const tool = fixture();
    const options1 = {
      packages: {
        react: {
          main: "React",
          others: ["Component"],
        },
        "react-dom": {
          main: "ReactDOM",
        },
      },
      rootPath: "",
    };
    tool.start(options1);

    tool.writeFile("B.js", `export const B = 1;`);
    tool.format(`
const A = B;
const D = C;
    `).is(`
import { B } from "./B";
const A = B;
const D = C;
    `);

    // Update B file to export C, now C could be auto imported
    tool.writeFile("B.js", `export const B = 1; export const C =2;`);
    tool.format(`
const A = B;
const D = C;
    `).is(`
import { B, C } from "./B";
const A = B;
const D = C;
    `);
  });

  it("could import flow type", () => {
    const tool = fixture();
    const options1 = {
      packages: {},
      rootPath: "",
    };
    tool.start(options1);

    tool.format(`
const A: TName = "abc";
    `).is(`
import type { TName } from "./types";
const A: TName = "abc";
    `);
  });

  it("should import relative folder correctly in child folder", () => {
    const tool = fixture();
    const options1 = {
      packages: {},
      rootPath: "",
    };
    tool.start(options1);

    tool.writeFile("d1/d2/d3/X.js", "export const X =1;");

    tool.format(
      `
const y = X;
    `,
      "d1/d2/d3/Y.js",
    ).is(`
import { X } from "./X";
const y = X;
    `);
  });

  it("could work without autoimport.json", () => {
    const tool = fixture();
    tool.startWithoutOptionFile();

    tool.writeFile("d1/d2/d3/X.js", "export const X =1;");

    tool.format(
      `
const y = X;
        `,
      "d1/d2/d3/Y.js",
    ).is(`
import { X } from "./X";
const y = X;
        `);
  });

  it("support built-in React, ReactDOM", () => {
    const tool = fixture();
    tool.startWithoutOptionFile();

    tool.format(
      `
        const Hello = () => <div>Hello</div>;
        ReactDOM.render(<Hello />);
        `,
      "Hello.js",
    ).is(`
      import React from "react";
      import ReactDOM from "react-dom";
      const Hello = () => <div>Hello</div>;
      ReactDOM.render(<Hello />);
        `);
  });

  it("could import React and Component if not provided", () => {
    const tool = fixture();
    tool.startWithoutOptionFile();

    tool.format(
      `
        class A extends Component {
          render() {
            return <div>hello</div>;
          }
        }
        `,
      "Hello.js",
    ).is(`
        import React, { Component } from "react";
        class A extends Component {
          render() {
            return <div>hello</div>;
          }
        }
        `);
  });

  it("support import file in different folder", () => {
    const tool = fixture();
    tool.start({
      rootPath: "src",
    });

    tool.writeFile("src/d1/d2/A.js", "export const A = 1;");

    tool.format(
      `
const b = A;
        `,
      "src/d1/e1/e2/e3/B.js",
    ).is(`
import { A } from "../../../d2/A";
const b = A;
        `);
  });

  it("could combine with the current import", () => {
    const tool = fixture();
    tool.startWithoutOptionFile();

    // main
    tool.format(
      `
import React from "react";
class A extends Component {}
      `,
    ).is(`
import React, { Component } from "react";
class A extends Component {}
        `);

    // others
    tool.format(
      `
import { Component } from "react";
const A = () => <div>a</div>;
      `,
    ).is(`
import React, { Component } from "react";
const A = () => <div>a</div>;
        `);
  });

  it("could combine with the current import for type importKind `value` and `type`", () => {
    const tool = fixture();
    tool.startWithoutOptionFile();

    tool.writeFile(
      "C.js",
      `
export type TName = string;
export type TAge = number;
export const A = 1;
export const B = 2;
export const X = 2;
export default "hello";
      `,
    );
    tool.format(
      `
      import type { TAge } from "./C";
      import { X } from "./C";
      import { A } from "./C";
      const x = B;
      const y: TName = C;
      `,
    ).is(`
      import C, { A, B, X } from "./C";
      import type { TAge, TName } from "./C";
      const x = B;
      const y: TName = C;
        `);
  });

  it("keep flow comment at the first line", () => {
    const tool = fixture();
    tool.startWithoutOptionFile();

    tool.writeFile("A.js", "export const A = 1;");

    tool.format(
      `
      // @flow
      const b = A;`,
      "B.js",
    ).is(`
      // @flow
      import { A } from "./A";

      const b = A;`);
  });

  it("keep flow comment at the first line for text has import", () => {
    const tool = fixture();
    tool.startWithoutOptionFile();

    tool.format(
      `
      // @flow
      import React from 'react';
      const b = 1;`,
      "B.js",
    ).is(`
      // @flow
      import React from 'react';
      const b = 1;`);
  });

  it("keep flow comment at the first line for text has import apart", () => {
    const tool = fixture();
    tool.startWithoutOptionFile();

    tool.format(
      `
      // @flow
      import React from 'react';
      class A extends Component {}`,
      "B.js",
    ).is(`
      // @flow
      import React, { Component } from "react";
      class A extends Component {}`);
  });

  it("auto sort even not have new import", () => {
    const tool = fixture();
    tool.startWithoutOptionFile();

    tool.format(
      `
      // @flow
      import A from "./A";
      import React from "react";
      `,
      "B.js",
    ).is(`
      // @flow
      import React from "react";
      import A from "./A";
      `);
  });

  it("Could handle import index file in the sample folder", () => {
    const tool = fixture();
    tool.startWithoutOptionFile();

    tool.writeFile("components/A/index.js", "export const X = 1;");
    tool.format("const Y = X;", "components/A/A.js").is(`
      import { X } from "./index";
      const Y = X;
    `);
  });

  it("Remove 02 new lines between import statements with first comment", () => {
    const tool = fixture();
    tool.startWithoutOptionFile();

    tool.writeFile(
      "A.js",
      `
      // @flow
      export class X extends Component {}

      export class Y extends Component<{name: string}> {}

      export default class Z extends Component {

      }
    `,
    );

    tool.format(`
      // @flow
      import React from "react";

      import U from "./U";

      import { Button } from "antd";
      import type { TUser } from "./types";

      const a = () => {
        return (
          <div>
            <X />
            <Y />
            <A />
          </div>
        )
      }
        `).is(`
        // @flow
        import { Button } from "antd";
        import React from "react";
        import A, { X, Y } from "./A";
        import U from "./U";
        import type { TUser } from "./types";

        const a = () => {
          return (
            <div>
              <X />
              <Y />
              <A />
            </div>
          )
        }
    `);
  });

  it("could handle export class", () => {
    const tool = fixture();
    tool.startWithoutOptionFile();

    tool.writeFile(
      "A.js",
      `
      // @flow
      export class X extends Component {}

      export class Y extends Component<{name: string}> {}

      export default class Z extends Component {

      }
    `,
    );

    tool.format(`
      const a = () => {
        return (
          <div>
            <X />
            <Y />
            <A />
          </div>
        )
      }
    `).is(`
      import React from "react";
      import A, { X, Y } from "./A";
      const a = () => {
        return (
          <div>
            <X />
            <Y />
            <A />
          </div>
        )
      }
    `);
  });

  it("support disable autoimport", () => {
    const tool = fixture();
    tool.startWithoutOptionFile();

    tool.writeFile(
      "A.js",
      `
      export default 1;
    `,
    );

    tool.format(`
      // autoimport-disable
      const b = A;
    `).is(`
      // autoimport-disable
      const b = A;
    `);
  });
});

describe("ConfigProvider cache", () => {
  it("could cache and load from cache", () => {
    const configProvider = new ConfigProvider();
    const projectPath = path.join(os.tmpdir(), "autoimport-e2e");
    if (fs.existsSync(projectPath)) {
      // Remove this folder
      shell.rm("-rf", projectPath);
    }

    shell.mkdir("-p", projectPath);

    const testFile = path.join(projectPath, "a.js");
    const optionsFile = path.join(projectPath, "autoimport.json");
    const cacheFile = path.join(projectPath, "autoimport.json.cache");

    const tool = {
      start: (options: TOptions) => {
        tool.writeOptions(options, { notify: false });
        configProvider.updateProjectPaths([projectPath]);
      },
      startWithoutOptionFile: () => {
        configProvider.updateProjectPaths([projectPath]);
      },

      writeOptions: (options_, { notify } = { notify: true }) => {
        fs.writeFileSync(optionsFile, JSON.stringify(options_, null, 2));

        // Notify that optionsFile is updated
        if (notify) {
          configProvider.updateOptionFile(optionsFile);
        }

        return tool;
      },

      writeFile: (file: string, content: string) => {
        tool._initFile(file, content);

        const fullPath = path.join(projectPath, file);

        configProvider.addFile(fullPath, content);

        return tool;
      },

      // write file with out notify to configProvider
      _initFile: (file: string, content: string) => {
        const fullPath = path.join(projectPath, file);
        const dirName = path.dirname(fullPath);
        if (!fs.existsSync(dirName)) {
          shell.mkdir("-p", dirName);
        }

        fs.writeFileSync(fullPath, content);
      },

      format: (text: string, file?: string) => {
        const normalizedText = removeCodeIndent(text);

        const importFile =
          file != null ? path.join(projectPath, file) : testFile;
        const nextText = configProvider.formatFile(importFile, normalizedText);

        const checker = {
          is: (expectedText: string) => {
            // console.log(removeCodeIndent(expectedText));
            expect(nextText.trim()).toEqual(removeCodeIndent(expectedText));

            return checker;
          },
        };

        return checker;
      },
    };

    //
    tool._initFile(
      "types.js",
      `
    export type TName = string;
    `,
    );

    tool.startWithoutOptionFile();
    configProvider.cache();

    expect(fs.existsSync(cacheFile)).toBe(true);

    // Create new ConfigProvider
    const configProvider2 = new ConfigProvider();
    configProvider2.fromCache([projectPath]);

    const text = configProvider2.formatFile(
      projectPath + "/a.js",
      `
const a: TName = "abc";
    `,
    );
    // console.log(text);
    expect(text).toContain(`import type { TName } from "./types";`);
  });
});
