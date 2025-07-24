(function () {
  let template = document.createElement("template");
  template.innerHTML = `
    <style>
      :host {}

      /* Style for the container */
      div {
        margin: 50px auto;
        max-width: 600px;
        font-family: Arial, sans-serif;
      }

      /* Style for the input container */
      .input-container {
        display: flex;
        justify-content: space-between;
        align-items: center;
        margin-bottom: 20px;
      }

      /* Style for the input field */
      #prompt-input {
        padding: 10px;
        font-size: 16px;
        border: 1px solid #ccc;
        border-radius: 5px;
        width: 70%;
      }

      /* Style for the button */
      #generate-button {
        padding: 10px;
        font-size: 16px;
        background-color: #3cb6a9;
        color: #fff;
        border: none;
        border-radius: 5px;
        cursor: pointer;
        width: 25%;
      }
      #generate-button:disabled {
          background-color: #cccccc;
          cursor: not-allowed;
      }

      /* Style for the generated text area */
      #generated-text {
        padding: 10px;
        font-size: 16px;
        border: 1px solid #ccc;
        border-radius: 5px;
        width:96%;
        min-height: 150px;
        resize: vertical;
      }
      .loading-spinner {
          border: 4px solid #f3f3f3;
          border-top: 4px solid #3cb6a9;
          border-radius: 50%;
          width: 20px;
          height: 20px;
          animation: spin 1s linear infinite;
          margin: 10px auto;
          display: none; /* Initially hidden */
      }
      @keyframes spin {
          0% { transform: rotate(0deg); }
          100% { transform: rotate(360deg); }
      }
    </style>
    <div>
      <center>
        <img src="https://1000logos.net/wp-content/uploads/2023/02/ChatGPT-Emblem.png" width="200"/>
        <h1>DocumentDialogue Chat</h1>
      </center>
      <div class="input-container">
        <input type="text" id="prompt-input" placeholder="Enter your message">
        <button id="generate-button">Send Message</button>
      </div>
      <div class="loading-spinner" id="spinner"></div>
      <textarea id="generated-text" rows="10" cols="50" readonly></textarea>
    </div>
  `;

  class Widget extends HTMLElement {
    constructor() {
      super();
      let shadowRoot = this.attachShadow({ mode: "open" });
      shadowRoot.appendChild(template.content.cloneNode(true));
      this._props = {}; // Initialisiere _props hier
      this._generateButtonListener = null; // Um den Listener zu speichern
      this._currentChatId = null; // Zum Speichern der aktuellen Chat-ID
    }

    // Wird aufgerufen, wenn das Element dem DOM hinzugefügt wird
    async connectedCallback() {
      this.initMain();
    }

    // Wird aufgerufen, wenn sich Eigenschaften des Widgets ändern
    onCustomWidgetBeforeUpdate(changedProperties) {
      this._props = { ...this._props, ...changedProperties };
    }

    // Wird aufgerufen, nachdem Eigenschaften aktualisiert wurden
    async onCustomWidgetAfterUpdate(changedProperties) {
      // Re-initialisiere nur, wenn relevante Eigenschaften sich geändert haben
      // oder die chatId noch nicht existiert.
      if (changedProperties.apiKey !== undefined || 
          changedProperties.baseUrl !== undefined ||
          changedProperties.personaId !== undefined ||
          changedProperties.extensionId !== undefined ||
          !this._currentChatId // Wenn kein Chat existiert, versuche erneut zu initialisieren
      ) {
          this.initMain();
      }
    }

    async initMain() {
      const promptInput = this.shadowRoot.getElementById("prompt-input");
      const generatedText = this.shadowRoot.getElementById("generated-text");
      const generateButton = this.shadowRoot.getElementById("generate-button");
      const spinner = this.shadowRoot.getElementById("spinner");

      // Setze den Initialzustand der UI
      generatedText.value = "Welcome! Enter your first message to start a chat.";
      generateButton.disabled = false;
      spinner.style.display = 'none';

      // Entferne den alten Event Listener, falls vorhanden, um Mehrfachregistrierungen zu verhindern
      if (this._generateButtonListener) {
        generateButton.removeEventListener("click", this._generateButtonListener);
      }

      // Definiere den Event Listener für das Senden von Nachrichten
      this._generateButtonListener = async () => {
        const prompt = promptInput.value.trim();
        if (!prompt) {
          alert("Please enter a message.");
          return;
        }

        generatedText.value = "Sending message...";
        generateButton.disabled = true;
        spinner.style.display = 'block';

        const { apiKey, baseUrl, personaId, extensionId } = this._props;

        if (!apiKey) {
            alert("API Key is missing. Please configure it in the widget properties.");
            generatedText.value = "Error: API Key not configured.";
            generateButton.disabled = false;
            spinner.style.display = 'none';
            // Triggere ein Fehler-Event
            this.dispatchEvent(new CustomEvent("onError", { detail: { message: "API Key is missing." } }));
            return;
        }
        if (!baseUrl) {
            alert("Base URL is missing. Please configure it in the widget properties.");
            generatedText.value = "Error: Base URL not configured.";
            generateButton.disabled = false;
            spinner.style.display = 'none';
            this.dispatchEvent(new CustomEvent("onError", { detail: { message: "Base URL is missing." } }));
            return;
        }

        try {
          // --- Schritt 1: Chat erstellen, falls noch keine chatId vorhanden ist ---
          if (!this._currentChatId) {
            generatedText.value = "Creating new chat session...";
            const createChatUrl = `${baseUrl}/v1/`;
            const createChatBody = {};
            if (personaId) createChatBody.personaId = personaId;
            if (extensionId) createChatBody.extensionId = extensionId;

            const chatResponse = await fetch(createChatUrl, {
              method: "POST",
              headers: {
                "Content-Type": "application/json",
                "Authorization": `Bearer ${apiKey}`
              },
              body: JSON.stringify(createChatBody)
            });

            if (!chatResponse.ok) {
              const error = await chatResponse.json();
              throw new Error(`Failed to create chat: ${error.message || chatResponse.statusText}`);
            }
            const chatData = await chatResponse.json();
            this._currentChatId = chatData.id;
            generatedText.value += "\nChat session created.";
            this.dispatchEvent(new CustomEvent("onChatCreated", { detail: { chatId: this._currentChatId } }));
          }

          // --- Schritt 2: Nachricht senden ---
          generatedText.value += `\nSending message to chat ${this._currentChatId}...`;
          const sendMessageUrl = `${baseUrl}/v1/${this._currentChatId}/messages`;
          const messageBody = {
            "text": prompt,
            "persist": true // Optional: Setze auf false, wenn die Nachricht nicht gespeichert werden soll
          };

          const messageResponse = await fetch(sendMessageUrl, {
            method: "POST",
            headers: {
              "Content-Type": "application/json",
              "Authorization": `Bearer ${apiKey}`
            },
            body: JSON.stringify(messageBody)
          });

          if (!messageResponse.ok) {
            const error = await messageResponse.json();
            throw new Error(`Failed to send message: ${error.message || messageResponse.statusText}`);
          }
          const messageData = await messageResponse.json();
          
          // --- Schritt 3 (Optional): Alle Nachrichten abrufen, um den gesamten Verlauf anzuzeigen ---
          const readMessagesUrl = `${baseUrl}/v1/${this._currentChatId}`;
          const readMessagesResponse = await fetch(readMessagesUrl, {
            method: "GET",
            headers: {
              "Authorization": `Bearer ${apiKey}`
            }
          });

          if (!readMessagesResponse.ok) {
              const error = await readMessagesResponse.json();
              throw new Error(`Failed to retrieve messages: ${error.message || readMessagesResponse.statusText}`);
          }
          const allMessages = await readMessagesResponse.json();
          
          // Formatierte Ausgabe des Chat-Verlaufs
          let chatHistory = "";
          allMessages.forEach(msg => {
              chatHistory += `${msg.role.toUpperCase()}: ${msg.content}\n`;
          });
          generatedText.value = chatHistory.trim();
          promptInput.value = ""; // Eingabefeld leeren

        } catch (e) {
            console.error("DocumentDialogue API error:", e);
            alert("DocumentDialogue API Error: " + e.message);
            generatedText.value = `Error: ${e.message}`;
            // Optional: Fehler-Event auslösen
            this.dispatchEvent(new CustomEvent("onError", { detail: { message: e.message } }));
        } finally {
            generateButton.disabled = false;
            spinner.style.display = 'none';
        }
      };

      // Füge den neuen Event Listener hinzu
      generateButton.addEventListener("click", this._generateButtonListener);
    }

    // Die Methode createChat aus der Haupt-JSON
    // Diese Methode kann nun von der SAC-Skripting-API aufgerufen werden,
    // um einen Chat zu initialisieren oder eine bestimmte Aktion auszulösen.
    // In diesem Fall würde sie das initiale Erstellen des Chats starten.
    async createChat() {
        // Diese Methode könnte direkt die Logik zum Erstellen eines Chats aufrufen
        // ohne auf eine Benutzereingabe zu warten.
        const generatedText = this.shadowRoot.getElementById("generated-text");
        const generateButton = this.shadowRoot.getElementById("generate-button");
        const spinner = this.shadowRoot.getElementById("spinner");

        if (this._currentChatId) {
            generatedText.value = "Chat already exists with ID: " + this._currentChatId;
            return;
        }

        generatedText.value = "Creating chat via createChat() method...";
        generateButton.disabled = true;
        spinner.style.display = 'block';

        const { apiKey, baseUrl, personaId, extensionId } = this._props;

        if (!apiKey || !baseUrl) {
            alert("API Key or Base URL missing. Please configure them.");
            generatedText.value = "Error: Configuration missing.";
            generateButton.disabled = false;
            spinner.style.display = 'none';
            this.dispatchEvent(new CustomEvent("onError", { detail: { message: "API Key or Base URL missing." } }));
            return;
        }

        try {
            const createChatUrl = `${baseUrl}/v1/`;
            const createChatBody = {};
            if (personaId) createChatBody.personaId = personaId;
            if (extensionId) createChatBody.extensionId = extensionId;

            const chatResponse = await fetch(createChatUrl, {
                method: "POST",
                headers: {
                    "Content-Type": "application/json",
                    "Authorization": `Bearer ${apiKey}`
                },
                body: JSON.stringify(createChatBody)
            });

            if (!chatResponse.ok) {
                const error = await chatResponse.json();
                throw new Error(`Failed to create chat: ${error.message || chatResponse.statusText}`);
            }
            const chatData = await chatResponse.json();
            this._currentChatId = chatData.id;
            generatedText.value = "New chat session created with ID: " + this._currentChatId;
            this.dispatchEvent(new CustomEvent("onChatCreated", { detail: { chatId: this._currentChatId } }));
        } catch (e) {
            console.error("Error creating chat:", e);
            alert("Error creating chat: " + e.message);
            generatedText.value = `Error creating chat: ${e.message}`;
            this.dispatchEvent(new CustomEvent("onError", { detail: { message: e.message } }));
        } finally {
            generateButton.disabled = false;
            spinner.style.display = 'none';
        }
    }
  }

  customElements.define("com-rohitchouhan-sap-chatgptwidget", Widget);
})();
