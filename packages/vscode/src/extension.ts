import {
  ExtensionContext,
  commands,
  window,
  TextEdit,
  Range,
  TextDocument,
  languages,
  workspace,
  Uri
} from "vscode";
import * as path from "path";
import EditProvider from "./AutoImportEditProvider";
import * as fs from "fs";
import {
  setupChannel,
  setupErrorHandler,
  registerDisposables
} from "./errorHandler";

export function activate(context: ExtensionContext) {
  setupChannel();

  const editProvider = new EditProvider();

  let optionFileWatcher = workspace.createFileSystemWatcher(
    "**/autoimport.json"
  );
  let optionFileUpdate = async (e: Uri) => {
    // console.log('file change1');
    editProvider.updateOptionFile(e.fsPath);
  };
  optionFileWatcher.onDidChange(optionFileUpdate);

  // Watch js files
  let jsFileWatcher = workspace.createFileSystemWatcher("**/**/*.js");
  let jsFileUpdate = async (e: Uri) => {
    console.log("js file change1", e.fsPath);
    editProvider.configProvider.addFile(
      e.fsPath,
      fs.readFileSync(e.fsPath).toString()
    );
  };
  jsFileWatcher.onDidChange(jsFileUpdate);

  // optionFileWatcher.onDidCreate(optionFileUpdate);
  // optionFileWatcher.onDidDelete(async (e) => {
  //     let modeId = path.basename(e.path).split('\.')[0];

  //     if (_registeredProviders[modeId]) {
  //         _registeredProviders[modeId].dispose();
  //     }
  // });
  var disposable = commands.registerCommand(
    "extension.autoimportRescan",
    () => {
      editProvider.loadConfig();
    }
  );

  context.subscriptions.push(
    languages.registerDocumentFormattingEditProvider(
      "javascript",
      editProvider
    ),
    setupErrorHandler(),
    ...registerDisposables(),
    disposable
  );
}

// this method is called when your extension is deactivated
export function deactivate() {}
