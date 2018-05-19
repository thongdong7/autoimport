#!/usr/bin/env bash

set -ex

DIR="$( cd "$( dirname "${BASH_SOURCE[0]}" )" && pwd )"
cd $DIR/..
# TMP_FOLDER=/tmp/autoimport
# rm -rf $TMP_FOLDER || true

# echo "Copy soure code to another folder"
# cp -R $DIR/.. $TMP_FOLDER
# cd $TMP_FOLDER

lerna clean --yes

echo Bootstrap project...
lerna bootstrap

echo Compile to ES5
cd packages/core
yarn
yarn run compile
cd ../..

echo Publish the npm package...
lerna publish --yes --cd-version patch

echo Publish vscode package...  
cd packages/vscode

# Need to install the package from npm as `vsce` does not support linked package.
rm -Rf node_modules/ package-lock.json
npm install --no-optional

rm *.vsix || true
# vsce publish
vsce package

code --uninstall-extension thongdong7.vscode-autoimport || true
code --install-extension *.vsix

lerna clean --yes
lerna bootstrap