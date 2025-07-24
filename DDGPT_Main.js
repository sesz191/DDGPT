(function() {
    let template = document.createElement("template");
    template.innerHTML = `
        <style>
            /* Your actual widget's CSS here */
            :host {
                display: block;
                width: 100%;
                height: 100%;
                font-family: Arial, sans-serif;
                border: 1px solid #eee;
                box-sizing: border-box;
                padding: 10px; /* Added padding for better appearance */
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
                word-wrap: break-word; /* Prevents long words from breaking layout */
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

            this._props = {}; // To store the widget properties
            this._chatOutput = this._shadowRoot.getElementById("chat-output");
            this._userInput = this._shadowRoot.getElementById("user-input");
            this._sendButton = this._shadowRoot.getElementById("send-button");

            if (this._sendButton) {
                this._sendButton.addEventListener("click", this._sendMessage.bind(this));
            }
            if (this._userInput) {
                this._userInput.addEventListener("keypress", (e) => {
                    if (e.key === "Enter") {
                        this._sendMessage();
                    }
                });
            }
            console.log("DocumentDialogueWidget constructor finished.");
        }

        // SAC calls this to update properties
        onCustomWidgetBeforeUpdate(changedProperties) {
            this._props = { ...this._props, ...changedProperties };
            console.log("Main Widget Properties Updated:", this._props);
        }

        // SAC calls this after properties are updated
        onCustomWidgetAfterUpdate(changedProperties) {
            // No specific UI updates needed here, properties are primarily used for API calls
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
            this._chatOutput.scrollTop = this._chatOutput.scrollHeight; // Scroll to bottom
        }

        async _sendMessage() {
            const message = this._userInput.value.trim();
            if (!message) return;

            this._addMessage("user", message);
            this._userInput.value = "";
            this._sendButton.disabled = true;

            try {
                const { apiKey, personaId, extensionId, baseUrl, max_tokens } = this._props;

                if (!apiKey || !personaId || !baseUrl) {
                    this._addMessage("api", "Error: API Key, Persona ID, or Base URL not configured in widget properties.", true);
                    return;
                }

                const url = `${baseUrl}/chat`; // Assuming the chat endpoint is /chat or similar
                const payload = {
                    personaId: personaId,
                    question: message, // Assuming your API expects 'question' for user input
                    ...(extensionId && { extensionId: extensionId }), // Only include if not empty
                    ...(max_tokens && { maxTokens: max_tokens }) // API might expect maxTokens (camelCase)
                };

                console.log("Sending API request:", { url, payload });

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
                    console.error("API response error:", response.status, response.statusText, errorDetail);
                    throw new Error(`API Error: ${response.status} - ${errorDetail || response.statusText}`);
                }

                const data = await response.json();
                const apiResponse = data.answer || data.reply || "No response received."; // Adjust based on your API's actual response field
                this._addMessage("api", apiResponse);

            } catch (error) {
                console.error("Error during API call:", error);
                this._addMessage("api", `Failed to get response: ${error.message}`, true);
            } finally {
                this._sendButton.disabled = false;
            }
        }
    }

    // THIS IS THE CRITICAL LINE FOR THE MAIN WIDGET!
    // It MUST match the "tag" for "kind": "main" in your manifest.json
    customElements.define("com-sebastian-szallies-documentdialoguewidget", DocumentDialogueWidget);
    console.log("Main widget 'com-sebastian-szallies-documentdialoguewidget' defined.");

})();
