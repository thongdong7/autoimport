import {
  DocumentFormattingEditProvider,
  TextDocument,
  FormattingOptions,
  CancellationToken,
  TextEdit,
  Range,
  workspace
} from "vscode";
import ConfigProvider from "autoimport/lib/ConfigProvider";
import { safeExecution, addToOutput } from "./errorHandler";
import { onWorkspaceRootChange } from "./utils";
import { requireLocalPkg } from "./requirePkg";

// TODO Fix this
const prettierOptions = {
  trailingComma: "es5",
  parser: "flow"
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
  let autoImportedText = configProvider.formatFile(fileName, text);

  // Call prettier
  addToOutput(`Call prettier ${fileName}`);
  autoImportedText = prettierFormat(fileName, autoImportedText);

  addToOutput(`Format document done`);
  return autoImportedText;
}

function prettierFormat(fileName: string, text: string): string {
  const prettier = requireLocalPkg(fileName, "prettier");

  return prettier.format(text, prettierOptions);
}

class AutoImportEditProvider implements DocumentFormattingEditProvider {
  configProvider: ConfigProvider;

  constructor() {
    // Load options
    console.time("load config");
    addToOutput("Load config");
    this.configProvider = new ConfigProvider();
    const workspaceFolders = workspace.workspaceFolders || [];
    const projectPaths = workspaceFolders
      .filter(item => item.uri.scheme === "file")
      .map(item => item.uri.fsPath);
    this.configProvider.updateProjectPaths(projectPaths);
    console.timeEnd("load config");
    addToOutput("All config is loaded");
    // console.log("pp", projectPaths);
  }

  updateOptionFile = (file: string) => {
    addToOutput("Update option file");
    this.configProvider.updateOptionFile(file);
  };

  // loadOptions() {

  // }

  provideDocumentFormattingEdits(
    document: TextDocument,
    options: FormattingOptions,
    token: CancellationToken
  ): TextEdit[] {
    return [
      TextEdit.replace(
        fullDocumentRange(document),
        format(this.configProvider, document.getText(), document, {})
      )
    ];
  }
}

export default AutoImportEditProvider;
