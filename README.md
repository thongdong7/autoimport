# Auto Import

> Auto Import undefined identifiers for ES6 & Flowtype

![Build Status](https://img.shields.io/travis/thongdong7/autoimport/master.svg?style=flat&label=travis)

![Screenshot](packages/vscode/docs/screenshot.gif)

# Features

* Auto Import undefined identifiers from installed dependencies and source code
* Support ES module import and Flow import
* Sort imports
* Disable autoimport for file: `// autoimport-disable`
* Auto remove unused imports

Sample config file (`autoimport.json`)

```json
{
  "packages": {
    "react": {
      "main": "React",
      "others": ["Component"]
    },
    "react-dom": {
      "main": "ReactDOM"
    }
  },
  "ignore": ["window", "document", "JSON"],
  "rootPath": ""
}
```

# Usage

TBD

# TODO

* Handle updating export
* Support ignore folders (like `build` folder created by CRA)
* Add test for VSCode
* Add travis test for VSCode
