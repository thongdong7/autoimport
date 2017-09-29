#!/usr/bin/env bash

set -ex

DEST=$1
SRC=/tmp/test-autoimport

if [ "$DEST" == "" ]; then
  echo "Usage: $0 <source_folder>"
  exit 1
fi

if [ ! -d $DEST ]; then
  echo Invalid source folder
  exit 1
fi

mkdir -p $SRC
rm -rf $SRC/*
rm -rf $SRC/.git || true
cp -f $DEST/*.json $SRC
cp -rf $DEST/src $SRC

cd $SRC
echo "*.bk" > .gitignore
git init
git add -A
git commit -m "init"