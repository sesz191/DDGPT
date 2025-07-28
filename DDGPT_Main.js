Vielen Dank für die API-Dokumentation! Nach der Analyse wird klar, warum der Fehler auftritt: Die Logik in deinem Widget entspricht nicht dem von der API vorgegebenen Ablauf.

Dein aktueller Code versucht, mit einer einzigen Aktion eine Nachricht zu senden und eine Antwort zu erhalten. Die API erfordert jedoch einen zweistufigen Prozess:

Chat erstellen: Zuerst musst du eine neue Chat-Sitzung erstellen, um eine chatId zu erhalten.

Nachricht senden: Danach kannst du unter Verwendung dieser chatId Nachrichten an die Sitzung senden.

Hauptunterschiede zwischen deinem Code und der API
Aspekt	Dein aktueller Code (falsch)	Erforderliche API-Logik (richtig)
API-Ablauf	Ein einziger POST-Aufruf für alles.	1. POST zum Erstellen des Chats (/v1/). 2. POST zum Senden der Nachricht (/v1/{chatId}/messages).
Endpunkt-URL	.../dd-chat/chat	.../dd-chat/v1/ und .../dd-chat/v1/{chatId}/messages
Request Payload	{ "question": "..." }	{ "text": "..." }
Antwort-Feld	Sucht nach data.answer oder data.reply	Muss nach data.content suchen.
Chat-ID	Wird nicht gespeichert oder verwendet.	Ist essenziell und muss nach der Erstellung gespeichert werden.

In Google Sheets exportieren
✅ Korrigierter Code für DDGPT_Main.js
Du musst deine DDGPT_Main.js-Datei erheblich anpassen, um den korrekten API-Ablauf abzubilden. Hier ist der vollständig korrigierte Code. Ersetze den gesamten Inhalt deiner DDGPT_Main.js damit.

JavaScript

(function() {
    let template = document.createElement("template");
    template.innerHTML = `
        <style>
            /* Dein CSS bleibt unverändert */
            :host {
                display: block;
                width: 100%;
                height: 100%;
                font-family: Arial, sans-serif;
                border: 1px solid #eee;
                box-sizing: border-box;
                padding: 10px;
            }
            #container {
                display: flex;
                flex-direction: column;
                height: 100%;
            }
            #chat-output {
                flex-grow: 1;
                overflow-y: auto;
                padding: 10px;
                background-color: #f9f9f9;
                border-bottom: 1px solid #ddd;
                border-radius: 5px;
                margin-bottom: 10px;
            }
            #chat-input-area {
                display: flex;
                gap: 5px;
            }
            #user-input {
                flex-grow: 1;
                padding: 8px;
                border: 1px solid #ccc;
                border-radius: 4px;
            }
            button {
                padding: 8px 12px;
                background-color: #007bff;
                color: white;
                border: none;
                border-radius: 4px;
                cursor: pointer;
            }
            button:hover {
                background-color: #0056b3;
            }
            .message {
                margin-bottom: 8px;
                word-wrap: break-word;
            }
            .user-message {
                text-align: right;
                color: #007bff;
            }
            .api-message {
                text-align: left;
                color: #333;
                background-color: #e9ecef;
                padding: 5px;
                border-radius: 5px;
            }
            .error-message {
                color: red;
                font-weight: bold;
            }
        </style>
        <div id="container">
            <div id="chat-output"></div>
            <div id="chat-input-area">
                <input type="text" id="user-input" placeholder="Type your message...">
                <button id="send-button">Send</button>
            </div>
        </div>
    `;

    class DocumentDialogueWidget extends HTMLElement {
        constructor() {
            super();
            this._shadowRoot = this.attachShadow({ mode: "open" });
            this._shadowRoot.appendChild(template.content.cloneNode(true));

            this._props = {};
            this._chatId = null; // WICHTIG: Zum Speichern der Chat-ID

            this._chatOutput = this._shadowRoot.getElementById("chat-output");
            this._userInput = this._shadowRoot.getElementById("user-input");
            this._sendButton = this._shadowRoot.getElementById("send-button");

            this._sendButton.addEventListener("click", () => this._sendMessage());
            this._userInput.addEventListener("keypress", (e) => {
                if (e.key === "Enter") {
                    this._sendMessage();
                }
            });
        }

        onCustomWidgetBeforeUpdate(changedProperties) {
            this._props = { ...this._props, ...changedProperties };
        }

        // Neue Funktion, um eine Chat-Sitzung zu erstellen
        async _createChatSession() {
            const { apiKey, personaId, extensionId, baseUrl } = this._props;

            if (!apiKey || !personaId || !baseUrl) {
                throw new Error("API Key, Persona ID, or Base URL not configured.");
            }
            // Korrekter Endpunkt zum Erstellen des Chats
            const url = `${baseUrl}/v1/`;
            const payload = {
                personaId: personaId,
                ...(extensionId && { extensionId: extensionId })
            };

            console.log("Creating new chat session with payload:", payload);

            const response = await fetch(url, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${apiKey}`
                },
                body: JSON.stringify(payload)
            });

            if (!response.ok) {
                const errorDetail = await response.text();
                throw new Error(`Failed to create chat: ${response.status} - ${errorDetail}`);
            }

            const data = await response.json();
            if (!data.id) {
                throw new Error("Chat creation response did not include a chat ID.");
            }

            this._chatId = data.id; // Speichere die erhaltene Chat-ID
            console.log("Chat session created successfully. Chat ID:", this._chatId);
            
            // Feuere das Event, um SAC über die neue Chat-ID zu informieren
            this.dispatchEvent(new CustomEvent("onChatCreated", { detail: { chatId: this._chatId }}));
        }

        // Angepasste Funktion zum Senden von Nachrichten
        async _sendMessage() {
            const message = this._userInput.value.trim();
            if (!message) return;

            this._addMessage("user", message);
            this._userInput.value = "";
            this._sendButton.disabled = true;

            try {
                // Schritt 1: Wenn noch keine Chat-ID vorhanden ist, erstelle eine neue Sitzung
                if (!this._chatId) {
                    await this._createChatSession();
                }

                // Schritt 2: Sende die Nachricht mit der vorhandenen Chat-ID
                const { apiKey, baseUrl } = this._props;
                
                // Korrekter Endpunkt und Payload zum Senden einer Nachricht
                const url = `${baseUrl}/v1/${this._chatId}/messages`;
                const payload = { text: message };

                console.log("Sending message to chat:", this._chatId);

                const response = await fetch(url, {
                    method: 'POST',
                    headers: {
                        'Content-Type': 'application/json',
                        'Authorization': `Bearer ${apiKey}`
                    },
                    body: JSON.stringify(payload)
                });

                if (!response.ok) {
                    const errorDetail = await response.text();
                    throw new Error(`API Error: ${response.status} - ${errorDetail || response.statusText}`);
                }

                const data = await response.json();
                // Korrektes Feld aus der Antwort auslesen
                const apiResponse = data.content || "AI did not provide content in the response.";
                this._addMessage("api", apiResponse);

            } catch (error) {
                console.error("Error during API call:", error);
                this._addMessage("api", `Error: ${error.message}`, true);
                this._chatId = null; // Setze Chat-ID zurück bei einem Fehler, um neu zu starten
            } finally {
                this._sendButton.disabled = false;
            }
        }
        
        _addMessage(sender, message, isError = false) {
            const msgDiv = document.createElement("div");
            msgDiv.classList.add("message");
            if (sender === "user") {
                msgDiv.classList.add("user-message");
                msgDiv.textContent = `You: ${message}`;
            } else {
                msgDiv.classList.add("api-message");
                msgDiv.textContent = `AI: ${message}`;
            }
            if (isError) {
                msgDiv.classList.add("error-message");
            }
            this._chatOutput.appendChild(msgDiv);
            this._chatOutput.scrollTop = this._chatOutput.scrollHeight;
        }
    }

    customElements.define("com-sebastian-szallies-documentdialoguewidget", DocumentDialogueWidget);
})();
