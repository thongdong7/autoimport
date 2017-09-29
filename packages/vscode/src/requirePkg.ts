import { addToOutput } from './errorHandler';

const path = require('path');
const readPkgUp = require('read-pkg-up');

/**
 * Recursively search for a package.json upwards containing given package
 * as a dependency or devDependency.
 * @param {string} fspath file system path to start searching from
 * @param {string} pkgName package's name to search for
 * @returns {string} resolved path to prettier
 */
function findPkg(fspath: string, pkgName: string): string | undefined {
  const res = readPkgUp.sync({ cwd: fspath, normalize: false });
  if (
    res.pkg &&
    ((res.pkg.dependencies && res.pkg.dependencies[pkgName]) ||
      (res.pkg.devDependencies && res.pkg.devDependencies[pkgName]))
  ) {
    return path.resolve(res.path, '..', 'node_modules/', pkgName);
  } else if (res.path) {
    return findPkg(path.resolve(path.dirname(res.path), '..'), pkgName);
  }
  return;
}

/**
 * Require package explicitely installed relative to given path.
 * Fallback to bundled one if no pacakge was found bottom up.
 * @param {string} fspath file system path starting point to resolve package
 * @param {string} pkgName package's name to require
 * @returns module
 */
function requireLocalPkg(fspath: string, pkgName: string): any {
  const modulePath = findPkg(fspath, pkgName);
  if (modulePath !== void 0) {
    try {
      return require(modulePath);
    } catch (e) {
      addToOutput(
        `Failed to load ${pkgName} from ${modulePath}. Using bundled`
      );
    }
  }

  return require(pkgName);
}
export { requireLocalPkg };