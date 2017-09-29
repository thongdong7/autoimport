import { workspace, Disposable, DocumentSelector } from 'vscode';

let currentRootPath: string = workspace.rootPath;

export function onWorkspaceRootChange(
  cb: (rootPath: string) => void
): Disposable {
  return workspace.onDidChangeConfiguration(() => {
    if (currentRootPath !== workspace.rootPath) {
      cb(workspace.rootPath);
      currentRootPath = workspace.rootPath;
    }
  });
}
