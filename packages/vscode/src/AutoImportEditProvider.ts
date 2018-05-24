import {
  DocumentFormattingEditProvider,
  TextDocument,
  FormattingOptions,
  CancellationToken,
  TextEdit,
  Range,
  workspace,
} from "vscode";
import ConfigProvider from "autoimport/lib/ConfigProvider";
import {
  safeExecution,
  addToOutput,
  updateStatusBar,
  showDone,
  showLoading,
} from "./errorHandler";
import { onWorkspaceRootChange } from "./utils";
import { requireLocalPkg } from "./requirePkg";

// TODO Fix this
const prettierOptions = {
  trailingComma: "es5",
  parser: "flow",
};

function fullDocumentRange(document: TextDocument): Range {
  const lastLineId = document.lineCount - 1;
  return new Range(0, 0, lastLineId, document.lineAt(lastLineId).text.length);
}

/**
 * Format the given text with user's configuration.
 * @param text Text to format
 * @param path formatting file's path
 * @returns {string} formatted text
 */
function format(
  configProvider: ConfigProvider,
  text: string,
  { fileName, languageId }: TextDocument,
  customOptions: object
): string {
  console.log("call format", fileName);

  addToOutput(`Call format ${fileName}`);
  // showLoading();
  let autoImportedText = configProvider.formatFile(fileName, text);

  // Call prettier
  addToOutput(`Call prettier ${fileName}`);
  autoImportedText = prettierFormat(fileName, autoImportedText);

  addToOutput(`Format document done`);
  // showDone();
  return autoImportedText;
}

function prettierFormat(fileName: string, text: string): string {
  const prettier = requireLocalPkg(fileName, "prettier");

  return prettier.format(text, prettierOptions);
}

function timeout(ms) {
  return new Promise(resolve => setTimeout(resolve, ms));
}

let configProvider: ConfigProvider;

export async function loadConfig() {
  if (configProvider == null) {
    configProvider = new ConfigProvider();
  }
  console.time("load config");
  addToOutput("Load config");
  // updateStatusBar("AutoImport: aaa");

  // Await is help to show loading in status bar
  // await timeout(1);

  const workspaceFolders = workspace.workspaceFolders || [];
  const projectPaths = workspaceFolders
    .filter(item => item.uri.scheme === "file")
    .map(item => item.uri.fsPath);

  configProvider.updateProjectPaths(projectPaths);
  const results = configProvider.getAutoImportStatus();

  const output = results
    .map(
      ({ hasJSONConfigFile, memberFolders, numberIdentifiers }) =>
        `JSONConfig: ${hasJSONConfigFile}\nmemberFolders: ${memberFolders.join(
          "\n"
        )}\nIdentifiers: ${numberIdentifiers}`
    )
    .join("\n");

  console.timeEnd("load config");
  addToOutput(`All config is loaded: ${output}`);
  showDone();
}

export function getConfigProvider() {
  if (configProvider == null) {
    configProvider = new ConfigProvider();
  }

  return configProvider;
}

class AutoImportEditProvider implements DocumentFormattingEditProvider {
  updateOptionFile = (file: string) => {
    addToOutput("Update option file");
    configProvider.updateOptionFile(file);
  };

  provideDocumentFormattingEdits(
    document: TextDocument,
    options: FormattingOptions,
    token: CancellationToken
  ): TextEdit[] {
    return [
      TextEdit.replace(
        fullDocumentRange(document),
        format(getConfigProvider(), document.getText(), document, {})
      ),
    ];
  }
}

export default AutoImportEditProvider;
