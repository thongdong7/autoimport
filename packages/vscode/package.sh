#!/usr/bin/env bash

set -e 

rm *.vsix

vsce package

code --uninstall-extension thongdong7.vscode-autoimport || true
code --install-extension *.vsix