import {
  Disposable,
  StatusBarItem,
  OutputChannel,
  StatusBarAlignment,
  TextEditor,
  commands,
  window,
  languages,
} from 'vscode';

import { onWorkspaceRootChange } from './utils';

let statusBarItem: StatusBarItem;
let outputChannel: OutputChannel;
let outputChannelOpen: Boolean = false;

function toggleStatusBarItem(editor: TextEditor): void {
  if (editor !== undefined) {
    // The function will be triggered everytime the active "editor" instance changes
    // It also triggers when we focus on the output panel or on the debug panel
    // Both are seen as an "editor".
    // The following check will ignore such panels
    if (
      ['debug', 'output'].some(
        part => editor.document.uri.scheme === part
      )
    ) {
      return;
    }

    const score = languages.match("javascript", editor.document);
    console.log('score', score);


    if (score > 0) {
      statusBarItem.show();
    } else {
      statusBarItem.hide();
    }
  }
}

export function registerDisposables(): Disposable[] {
  return [
    // Mark the outputChannelOpen as false when changing workspaces
    onWorkspaceRootChange(() => {
      outputChannelOpen = false;
    }),

    // Keep track whether to show/hide the statusbar
    window.onDidChangeActiveTextEditor(editor => {
      if (statusBarItem !== undefined) {
        toggleStatusBarItem(editor);
      }
    }),
  ];
}

/**
* Update the statusBarItem message and show the statusBarItem
* 
* @param message The message to put inside the statusBarItem
*/
function updateStatusBar(message: string): void {
  statusBarItem.text = message;
  statusBarItem.show();
}

/**
* Adds the filepath to the error message
*
* @param msg The original error message
* @param fileName The path to the file
* @returns {string} enhanced message with the filename
*/
function addFilePath(msg: string, fileName: string): string {
  const lines = msg.split('\n');
  if (lines.length > 0) {
    lines[0] = lines[0].replace(/(\d*):(\d*)/g, `${fileName}:$1:$2`);
    return lines.join('\n');
  }

  return msg;
}
/**
* Append messages to the output channel and format it with a title
* 
* @param message The message to append to the output channel
*/
export function addToOutput(message: string): void {
  const title = `${new Date().toLocaleString()}:`;

  // Create a sort of title, to differentiate between messages
  outputChannel.appendLine(title);
  outputChannel.appendLine('-'.repeat(title.length));

  // Append actual output
  outputChannel.appendLine(`${message}\n`);

  if (outputChannelOpen === false) {
    outputChannel.show(true);
    outputChannelOpen = true;
  }
}
/**
* Execute a callback safely, if it doesn't work, return default and log messages.
* 
* @param cb The function to be executed, 
* @param defaultText The default value if execution of the cb failed
* @param fileName The filename of the current document
* @returns {string} formatted text or defaultText
*/
export function safeExecution(
  cb: () => string,
  defaultText: string,
  fileName: string
): string {
  try {
    const returnValue = cb();

    updateStatusBar('AutoImport: $(check)');

    return returnValue;
  } catch (err) {
    addToOutput(addFilePath(err.message, fileName));
    updateStatusBar('AutoImport: $(x)');

    return defaultText;
  }
}

export function setupChannel() {
  // Setup the statusBarItem
  statusBarItem = window.createStatusBarItem(StatusBarAlignment.Right, -1);
  statusBarItem.text = 'AutoImport';
  statusBarItem.command = 'autoimport.open-output';

  toggleStatusBarItem(window.activeTextEditor);

  // Setup the outputChannel
  outputChannel = window.createOutputChannel('AutoImport');
}

/**
* Setup the output channel and the statusBarItem.
* Create a command to show the output channel
* 
* @returns {Disposable} The command to open the output channel
*/
export function setupErrorHandler(): Disposable {
  return commands.registerCommand('autoimport.open-output', () => {
    outputChannel.show();
  });
}