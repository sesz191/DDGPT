(function() {
    let template = document.createElement("template");
    template.innerHTML = `
        <style>
            /* Your builder-specific styles */
            :host { display: block; padding: 10px; border: 1px solid #ddd; background-color: #f9f9f9; }
            label { display: block; margin-bottom: 5px; font-weight: bold; }
            input[type="text"], input[type="number"] {
                width: 90%;
                padding: 8px;
                margin-bottom: 10px;
                border: 1px solid #ccc;
                border-radius: 4px;
            }
        </style>
        <div>
            <h2>Document Dialogue Widget Properties</h2>
            <label for="api-key-input">API Key:</label>
            <input type="text" id="api-key-input" placeholder="Enter API Key">

            <label for="persona-id-input">Persona ID:</label>
            <input type="text" id="persona-id-input" placeholder="Enter Persona ID">

            <label for="extension-id-input">Extension ID:</label>
            <input type="text" id="extension-id-input" placeholder="Enter Extension ID (Optional)">

            <label for="base-url-input">Base URL:</label>
            <input type="text" id="base-url-input" placeholder="Enter Base URL">

            <label for="max-tokens-input">Max Tokens:</label>
            <input type="number" id="max-tokens-input" placeholder="Enter Max Tokens">
        </div>
    `;

    class BuilderWidget extends HTMLElement {
        constructor() {
            super();
            this._shadowRoot = this.attachShadow({ mode: "open" });
            this._shadowRoot.appendChild(template.content.cloneNode(true));

            this._props = {}; // To store the widget properties
            this._setupEventListeners();
        }

        // This method is called by SAC to pass the current properties of the widget
        onCustomWidgetBeforeUpdate(changedProperties) {
            this._props = { ...this._props, ...changedProperties };
            this._updateUI();
        }

        // This method is called by SAC after properties are updated
        onCustomWidgetAfterUpdate(changedProperties) {
            this._updateUI();
        }

        _setupEventListeners() {
            const apiKeyInput = this._shadowRoot.getElementById("api-key-input");
            const personaIdInput = this._shadowRoot.getElementById("persona-id-input");
            const extensionIdInput = this._shadowRoot.getElementById("extension-id-input");
            const baseUrlInput = this._shadowRoot.getElementById("base-url-input");
            const maxTokensInput = this._shadowRoot.getElementById("max-tokens-input");

            apiKeyInput.addEventListener("change", this._onPropertyChange.bind(this, "apiKey"));
            personaIdInput.addEventListener("change", this._onPropertyChange.bind(this, "personaId"));
            extensionIdInput.addEventListener("change", this._onPropertyChange.bind(this, "extensionId"));
            baseUrlInput.addEventListener("change", this._onPropertyChange.bind(this, "baseUrl"));
            maxTokensInput.addEventListener("change", this._onPropertyChange.bind(this, "max_tokens"));
        }

        _onPropertyChange(propertyName, event) {
            let value = event.target.value;
            // Convert number types if necessary
            if (propertyName === "max_tokens") {
                value = parseInt(value, 10);
                if (isNaN(value)) {
                    value = this._props[propertyName]; // Revert to old value or default
                }
            }
            this.dispatchEvent(new CustomEvent("propertiesChanged", {
                detail: {
                    properties: {
                        [propertyName]: value
                    }
                }
            }));
        }

        _updateUI() {
            const apiKeyInput = this._shadowRoot.getElementById("api-key-input");
            const personaIdInput = this._shadowRoot.getElementById("persona-id-input");
            const extensionIdInput = this._shadowRoot.getElementById("extension-id-input");
            const baseUrlInput = this._shadowRoot.getElementById("base-url-input");
            const maxTokensInput = this._shadowRoot.getElementById("max-tokens-input");

            if (apiKeyInput) apiKeyInput.value = this._props.apiKey !== undefined ? this._props.apiKey : "";
            if (personaIdInput) personaIdInput.value = this._props.personaId !== undefined ? this._props.personaId : "";
            if (extensionIdInput) extensionIdInput.value = this._props.extensionId !== undefined ? this._props.extensionId : "";
            if (baseUrlInput) baseUrlInput.value = this._props.baseUrl !== undefined ? this._props.baseUrl : "";
            if (maxTokensInput) maxTokensInput.value = this._props.max_tokens !== undefined ? this._props.max_tokens : "";
        }
    }

    // IMPORTANT: The tag name must match the one in your JSON manifest!
    customElements.define("com-sebastian-szallies-documentdialoguewidget-builder", BuilderWidget);
})();
