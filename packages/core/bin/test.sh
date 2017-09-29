#!/usr/bin/env bash

set -e

export CI=true

echo Check flowtype...
yarn flow

echo Check eslint...
yarn lint

echo Run test...
yarn test:ci
