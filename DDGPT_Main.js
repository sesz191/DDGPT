(function() {
    let template = document.createElement("template");
    template.innerHTML = `
        <style>
            /* Add your actual widget's CSS here */
            :host {
                display: block;
                width: 100%;
                height: 100%;
                font-family: Arial, sans-serif;
                border: 1px solid #eee;
                box-sizing: border-box;
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
            }
            #chat-input-area {
                padding: 10px;
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
                margin-bottom: 10px;
            }
            .user-message {
                text-align: right;
                color: #007bff;
            }
            .api-message {
                text-align: left;
                color: #333;
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

    class DocumentDialogueWidget extends HTMLElement { // Renamed from BuilderWidget
        constructor() {
            super();
            this._shadowRoot = this.attachShadow({ mode: "open" });
            this._shadowRoot.appendChild(template.content.cloneNode(true));

            this._props = {}; // To store the widget properties (apiKey, personaId etc.)
            this._chatOutput = this._shadowRoot.getElementById("chat-output");
            this._userInput = this._shadowRoot.getElementById("user-input");
            this._sendButton = this._shadowRoot.getElementById("send-button");

            this._sendButton.addEventListener("click", this._sendMessage.bind(this));
            this._userInput.addEventListener("keypress", (e) => {
                if (e.key === "Enter") {
                    this._sendMessage();
                }
            });
        }

        // This method is called by SAC to pass the current properties of the widget
        onCustomWidgetBeforeUpdate(changedProperties) {
            this._props = { ...this._props, ...changedProperties };
            console.log("Main Widget Properties Updated:", this._props);
            // You might want to re-initialize your chat logic if properties like API key change
        }

        // This method is called by SAC after properties are updated
        onCustomWidgetAfterUpdate(changedProperties) {
            // No specific UI update needed for the main widget usually, as it reacts to user input
        }

        _addMessage(sender, message) {
            const msgDiv = document.createElement("div");
            msgDiv.classList.add("message");
            msgDiv.classList.add(sender === "user" ? "user-message" : "api-message");
            msgDiv.textContent = message;
            this._chatOutput.appendChild(msgDiv);
            this._chatOutput.scrollTop = this._chatOutput.scrollHeight; // Scroll to bottom
        }

        async _sendMessage() {
            const message = this._userInput.value.trim();
            if (!message) return;

            this._addMessage("user", `You: ${message}`);
            this._userInput.value = "";
            this._sendButton.disabled = true; // Disable button while sending

            try {
                // Here's where you would call your actual DocumentDialogue API
                // Using the properties passed from the builder panel
                const apiKey = this._props.apiKey;
                const personaId = this._props.personaId;
                const extensionId = this._props.extensionId; // Optional
                const baseUrl = this._props.baseUrl;
                const maxTokens = this._props.max_tokens;

                if (!apiKey || !personaId || !baseUrl) {
                    this._addMessage("api", "Error: API Key, Persona ID, or Base URL not configured in widget properties.");
                    return;
                }

                // Example API call (replace with your actual DocumentDialogue API logic)
                const response = await fetch(`${baseUrl}/your-document-dialogue-endpoint`, {
                    method: 'POST',
                    headers: {
                        'Content-Type': 'application/json',
                        'Authorization': `Bearer ${apiKey}` // Or whatever auth your API uses
                    },
                    body: JSON.stringify({
                        personaId: personaId,
                        text: message,
                        // Add other parameters as needed by your API, e.g., maxTokens
                        ...(extensionId && { extensionId: extensionId }),
                        ...(maxTokens && { max_tokens: maxTokens })
                    })
                });

                if (!response.ok) {
                    const errorText = await response.text();
                    throw new Error(`API Error: ${response.status} ${response.statusText} - ${errorText}`);
                }

                const data = await response.json();
                const apiResponse = data.reply || "No reply from API."; // Adjust based on your API's response structure
                this._addMessage("api", `AI: ${apiResponse}`);

            } catch (error) {
                console.error("Error sending message to Document Dialogue API:", error);
                this._addMessage("api", `Error communicating with API: ${error.message}`);
            } finally {
                this._sendButton.disabled = false; // Re-enable button
            }
        }
    }

    // IMPORTANT: This tag name MUST match the 'tag' property in your manifest.json for the 'main' component!
    customElements.define("com-sebastian-szallies-documentdialoguewidget-main", DocumentDialogueWidget); // Corrected tag
})();
