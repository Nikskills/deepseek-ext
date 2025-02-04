"use strict";
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __importStar = (this && this.__importStar) || (function () {
    var ownKeys = function(o) {
        ownKeys = Object.getOwnPropertyNames || function (o) {
            var ar = [];
            for (var k in o) if (Object.prototype.hasOwnProperty.call(o, k)) ar[ar.length] = k;
            return ar;
        };
        return ownKeys(o);
    };
    return function (mod) {
        if (mod && mod.__esModule) return mod;
        var result = {};
        if (mod != null) for (var k = ownKeys(mod), i = 0; i < k.length; i++) if (k[i] !== "default") __createBinding(result, mod, k[i]);
        __setModuleDefault(result, mod);
        return result;
    };
})();
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.activate = activate;
exports.deactivate = deactivate;
const vscode = __importStar(require("vscode"));
const ollama_1 = __importDefault(require("ollama"));
async function processUserMessage(text, panel) {
    try {
        console.log('Processing message:', text); // Debug log
        // Check if Ollama is running
        try {
            const streamResponse = await ollama_1.default.chat({
                model: 'deepseek-r1:7b',
                messages: [{ role: 'user', content: text }],
                stream: true
            });
            let completeResponse = '';
            for await (const part of streamResponse) {
                completeResponse += part.message.content;
                panel.webview.postMessage({
                    command: 'updateMessage',
                    text: completeResponse
                });
            }
        }
        catch (ollamaError) {
            console.error('Ollama error:', ollamaError);
            panel.webview.postMessage({
                command: 'receiveMessage',
                text: 'Error: Please ensure Ollama is running and the model is downloaded. Run: ollama run deepseek-r1'
            });
        }
    }
    catch (error) {
        console.error('General error:', error);
        panel.webview.postMessage({
            command: 'receiveMessage',
            text: 'Error: Unable to process message'
        });
    }
}
function activate(context) {
    console.log('Extension activating...');
    const disposable = vscode.commands.registerCommand('deepseek-ext.start', () => {
        console.log('Command executed');
        const panel = vscode.window.createWebviewPanel('deepChat', 'Deep Seek Chat', vscode.ViewColumn.One, { enableScripts: true });
        panel.webview.html = getWebviewContent();
        // Send welcome message
        setTimeout(() => {
            panel.webview.postMessage({
                command: 'receiveMessage',
                text: 'Hello! I am DeepSeek AI. How can I help you today?'
            });
        }, 1000);
        panel.webview.onDidReceiveMessage(async (message) => {
            console.log('Received message:', message);
            switch (message.command) {
                case 'sendMessage':
                    await processUserMessage(message.text, panel);
                    return;
            }
        }, undefined, context.subscriptions);
    });
    context.subscriptions.push(disposable);
}
function getWebviewContent() {
    return /* html */ `
	<!DOCTYPE html>
    <html lang="en">
    <head>
        <meta charset="utf-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
        <style>
            body {
                padding: 0;
                color: var(--vscode-foreground);
                background-color: var(--vscode-editor-background);
            }
            .chat-container {
                display: flex;
                flex-direction: column;
                height: 90vh;
                padding: 20px;
            }
            .messages {
                flex: 1;
                overflow-y: auto;
                margin-bottom: 20px;
            }
            .message {
                margin: 8px 0;
                padding: 8px 12px;
                border-radius: 6px;
                max-width: 80%;
            }
            .received {
                background: var(--vscode-button-secondaryBackground);
                align-self: flex-start;
            }
            .sent {
                background: var(--vscode-button-background);
                color: var(--vscode-button-foreground);
                align-self: flex-end;
            }
            .input-area {
                display: flex;
                gap: 8px;
            }
            #message-input {
                flex: 1;
                padding: 8px;
                border: 1px solid var(--vscode-input-border);
                background: var(--vscode-input-background);
                color: var(--vscode-input-foreground);
                border-radius: 4px;
            }
            button {
                padding: 8px 16px;
                background: var(--vscode-button-background);
                color: var(--vscode-button-foreground);
                border: none;
                border-radius: 4px;
                cursor: pointer;
            }
            button:hover {
                background: var(--vscode-button-hoverBackground);
            }
        </style>
    </head>
    <body>
        <div class="chat-container">
            <div class="messages" id="messages"></div>
            <div class="input-area">
                <input type="text" id="message-input" placeholder="Type your message...">
                <button id="send-button">Send</button>
            </div>
        </div>
        <script>
            const vscode = acquireVsCodeApi();
            const messagesContainer = document.getElementById('messages');
            const messageInput = document.getElementById('message-input');
            const sendButton = document.getElementById('send-button');

            function addMessage(text, isSent) {
                const messageDiv = document.createElement('div');
                messageDiv.className = 'message ' + (isSent ? 'sent' : 'received');
                messageDiv.textContent = text;
                messagesContainer.appendChild(messageDiv);
                messagesContainer.scrollTop = messagesContainer.scrollHeight;
            }

            function sendMessage() {
                const text = messageInput.value.trim();
                if (text) {
                    addMessage(text, true);
                    vscode.postMessage({
                        command: 'sendMessage',
                        text: text
                    });
                    messageInput.value = '';
                }
            }

			window.addEventListener('message', event => {
				const message = event.data;
				switch (message.command) {
					case 'updateMessage':
						// Update last message if it's from AI
						const messages = document.querySelectorAll('.message');
						const lastMessage = messages[messages.length - 1];
						if (lastMessage && lastMessage.classList.contains('received')) {
							lastMessage.textContent = message.text;
						} else {
							addMessage(message.text, false);
						}
						break;
					case 'receiveMessage':
						addMessage(message.text, false);
						break;
				}
			});
            sendButton.addEventListener('click', sendMessage);
            messageInput.addEventListener('keypress', (e) => {
                if (e.key === 'Enter') {
                    sendMessage();
                }
            });
        </script>
    </body>
    </html>`;
}
// This method is called when your extension is deactivated
function deactivate() { }
//# sourceMappingURL=extension.js.map