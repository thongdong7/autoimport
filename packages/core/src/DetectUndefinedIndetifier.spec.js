import { codeBuilder } from "./DetectUndefinedIdentifierTestUtils";

for (const detector of ["default"]) {
  describe(`Detect Undefined Identifier: ${detector}`, () => {
    const { code, codeFile } = codeBuilder(
      "DetectUndefinedIdentifier",
      detector,
    );

    // it("_DebugUndefinedIdentifier", () => {
    //   codeFile("_DebugUndefinedIdentifier")
    //     .missImport("C")
    //     .noImport("a");
    // });

    it("detect identifier in jsx attribute value", () => {
      code(`
      const A = () => <B title={C} />;
    `)
        .missImport("C", "B", "React")
        .noImport("A");
    });

    it("miss in BinaryExpression", () => {
      code(
        `
      const a = B + C;
    `,
      )
        .missImport("B", "C")
        .noImport("a");
    });

    it("miss in BinaryExpression (more complex)", () => {
      code(
        `
      const a = 3 / (B + (1+ (2 * C)));
    `,
      )
        .missImport("B", "C")
        .noImport("a");
    });

    it("miss in BinaryExpression inside object assignment", () => {
      code(
        `
      const a = {
        x: B + C
      };
    `,
      )
        .missImport("B", "C")
        .noImport("a", "x");
    });

    it("miss in BinaryExpression inside object assignment (more complex)", () => {
      code(
        `
      const a = {
        x: 3 / (B + (1+ (2 * C)))
      };
    `,
      )
        .missImport("B", "C")
        .noImport("a", "x");
    });

    it("expression", () => {
      code(`
    const a = B.c\`aaa\`
    `)
        .missImport("B")
        .noImport("a", "c", "aaa");
    });

    it("should consider function as defined identifier", () => {
      code(
        `
      function a() {}
    `,
      ).noImport("a");
    });

    it("should not consider arrow function as undefined identifier ", () => {
      code(
        `
      const a = () => {};
    `,
      ).noImport("a");
    });

    it("destructure is not import", () => {
      code(
        `
      let {a: {b: {c}}} = x;
      c.d = 1;
    `,
      )
        .noImport("a", "b", "c", "d")
        .missImport("x");
    });

    it("destructure in function is not import", () => {
      code(
        `
        function x({a: {b: {c}}}) {
          c.d = 1;
        };
      `,
      ).noImport("x", "a", "b", "c", "d");
    });

    it("assign object shorthand property", () => {
      code(`
      const a = {
        A,
      }
      `)
        .missImport("A")
        .noImport("a");
    });

    it("return undefined", () => {
      code(
        `
          function x() {
            return y;
          };
        `,
      )
        .noImport("x", "config")
        .missImport("y");
    });

    it("no import arrow function params", () => {
      code(
        `
      function f1() {
        return p1 => f2(p1);
      }
      `,
      )
        .noImport("f1", "p1")
        .missImport("f2");
    });

    it("not import func params", () => {
      code(
        `
        function x(config) {
          const {type, ...rest} = config;
        };
      `,
      ).noImport("x", "config", "type", "rest");
    });

    it("var object pattern", () => {
      code(
        `
        const {a, b: b1, ...rest} = {};
      
        x(a, b, b1, rest);
      `,
      )
        .noImport("a", "b1", "rest")
        .missImport("x", "b");
    });

    it("function expression", () => {
      code(`
    const a = {
      x(value) {
        const y = value
      }
    }
    `).noImport("a", "x", "y", "value");
    });

    it("function expression with object pattern", () => {
      code(`
    const a = {
      x({value}) {
        const y = value
      }
    }
    `).noImport("a", "x", "y", "value");
    });

    it("import func call params", () => {
      code(
        `
        x(y);
      `,
      ).missImport("x", "y");
    });

    it("call object function", () => {
      code(`a.b();`)
        .noImport("b")
        .missImport("a");
    });

    it("class extends super's attribute", () => {
      code(`class A extends React.Component {}`)
        .noImport("A")
        .missImport("React");
    });

    it("class extends", () => {
      code(`
      class A extends B {}`)
        .noImport("A")
        .missImport("B");
    });

    it("class without name extends", () => {
      code(`
    function hoc() {
      return class extends B {}
    }
      `).missImport("B");
    });

    it("class extends super's attribute with import", () => {
      code(`
      import React from "react";
      class A extends React.Component {}`).noImport("A", "React");
    });

    it("import", () => {
      code(`
        import A, {B, C as AnotherC} from "d";
        A();
        B();
        C();
        AnotherC();
       `)
        .noImport("A", "B", "AnotherC")
        .missImport("C");
    });

    it("class extends with import", () => {
      code(`
        import {Component} from "react";
        class A extends Component {}`).noImport("A", "Component");
    });

    it("not import global", () => {
      code(`
        JSON.stringify(1);
        Object.keys({});
        `).noImport("JSON", "Object");
    });

    it("detect undefined jsx", () => {
      code(
        `
      const a = <Abc x={1} toggle/>
      `,
      )
        .missImport("Abc", "React")
        .noImport("x", "toggle");
    });

    it("detect undefined jsx but not component", () => {
      code(
        `
      const a = <div />
      `,
      ).noImport("div");
    });

    it("detect undefined var in switch", () => {
      code(`
    switch (A) {
      case B:
        break;
      default:
        break
    }
    `).missImport("A", "B");
    });

    it("member expression", () => {
      code(`
    a.b.c = e.f.g;
    `)
        .missImport("a", "e")
        .noImport("b", "c", "f", "g");
    });

    it("BinaryExpression with member expression", () => {
      // An example to show that we could put the code inside a file
      // This is useful when we has to escape a lot things inside the code
      codeFile("binary-expression-with-member-expression").noImport("b");
    });

    it("miss-jsx-identifier", () => {
      codeFile("miss-jsx-identifier").missImport("B", "React");
    });

    it("destructure in arrow function", () => {
      code("const a = ({ b }) => {};").noImport("b");
      code(`
      const a = ({ b }) => { 
        const { c } = b;
      };`).noImport("b");
      code("const a = ({  }) => { return b; };").missImport("b");
    });

    it("inside an object", () => {
      // z is an computed attribute
      code(`
    const a = {
      x: {
        y: B,
        [z]: C,
        u: D.x
      }
    }
    `)
        .missImport("B", "C", "z", "D")
        .noImport("a", "x", "y", "u");
    });

    it("declared class is included", () => {
      code(`
class A extends Component {

}
export default connect(AnalyticsSelection);
    `)
        .missImport("connect", "Component")
        .noImport("A");
    });

    it("declared class without extends is included", () => {
      code(`
class A {

}
export default connect(AnalyticsSelection);
    `)
        .missImport("connect")
        .noImport("A");
    });
  });
}
