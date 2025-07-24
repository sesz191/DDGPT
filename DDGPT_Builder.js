(function () {
    let template = document.createElement("template");
    template.innerHTML = `
<br>
<style>
    #form {
        font-family: Arial, sans-serif;
        width: 100%; /* Adjust width for better fit in builder */
        margin: 0 auto;
        padding: 10px; /* Add some padding */
        box-sizing: border-box; /* Include padding in width */
    }

    a {
        text-decoration: none;
        color: #007bff;
    }

    table {
        width: 100%;
        border-collapse: collapse;
        margin-bottom: 10px;
    }

    td {
        padding: 5px 1px; /* Adjust padding for readability */
        text-align: left;
        font-size: 13px;
    }

    input[type="text"], input[type="number"], select {
        width: 100%;
        padding: 8px; /* Slightly smaller padding for inputs */
        border: 1px solid #ccc; /* Thinner border */
        border-radius: 4px; /* Slightly smaller radius */
        font-size: 13px;
        box-sizing: border-box;
        margin-bottom: 8px; /* Smaller margin */
    }

    input[type="color"] {
        -webkit-appearance: none;
        border: none;
        width: 32px;
        height: 32px;
    }
    input[type="color"]::-webkit-color-swatch-wrapper {
        padding: 0;
    }
    input[type="color"]::-webkit-color-swatch {
        border: none;
    }

    input[type="submit"] {
        background-color: #487cac;
        color: white;
        padding: 10px;
        border: none;
        border-radius: 5px;
        font-size: 14px;
        cursor: pointer;
        width: 100%;
        margin-top: 10px; /* Add some top margin */
    }

    p {
        font-size: 12px;
        color: #666;
        text-align: center;
        margin-top: 15px;
    }
</style>
<form id="form">
    <table>
        <tr>
            <td>
                <p>API Key (Bearer Token)</p>
                <input id="builder_apiKey" type="text" placeholder="Enter API Key of ChatGPT">
            </td>
        </tr>
        <tr>
            <td>
                <p>Persona ID</p>
                <input id="builder_personaId" type="text" placeholder="Enter Persona ID">
            </td>
        </tr>
        <tr>
            <td>
                <p>Extension ID (Optional)</p>
                <input id="builder_extensionId" type="text" placeholder="Enter Extension ID">
            </td>
        </tr>
        <tr>
            <td>
                <p>Base URL</p>
                <input id="builder_baseUrl" type="text" placeholder="Enter Base URL">
            </td>
        </tr>
        <tr>
            <td>
                <p>Max Tokens</p>
                <input id="builder_max_tokens" type="number" placeholder="Enter Max Tokens">
            </td>
        </tr>
    </table>
    <input value="Update Settings" type="submit">
    <br>
    <p>Developed by <a target="_blank" href="https://linkedin.com/in/itsrohitchouhan">Rohit Chouhan</a></p>
</form>
`;
    class ChatGptWidgetBuilderPanel extends HTMLElement {
        constructor() {
            super();
            this._shadowRoot = this.attachShadow({
                mode: "open"
            });
            this._shadowRoot.appendChild(template.content.cloneNode(true));
            // Listen to submit only for legacy reasons if you had a single submit button
            // If using individual change listeners, the submit button is less critical for dispatching properties.
            this._shadowRoot
                .getElementById("form")
                .addEventListener("submit", (e) => {
                    e.preventDefault(); // Prevent form submission and page reload
                    // All properties are already dispatched on change, so no need to re-dispatch here
                    console.log("Builder form submitted.");
                });

            this._setupEventListeners();
            console.log("ChatGptWidgetBuilderPanel constructor finished.");
        }

        _setupEventListeners() {
            const inputs = ["apiKey", "personaId", "extensionId", "baseUrl", "max_tokens"];
            inputs.forEach(propName => {
                const inputElement = this._shadowRoot.getElementById(`builder_${propName}`);
                if (inputElement) {
                    inputElement.addEventListener("change", this._onPropertyChange.bind(this, propName));
                }
            });
        }

        _onPropertyChange(propertyName, event) {
            let value = event.target.value;
            // Handle number conversion for max_tokens
            if (propertyName === "max_tokens") {
                value = parseInt(value, 10);
                if (isNaN(value)) {
                    // It's good practice to provide feedback or revert to a default/previous value
                    console.warn(`Invalid input for ${propertyName}. Not dispatching change.`);
                    return; // Prevent dispatching invalid value
                }
            }
            this.dispatchEvent(
                new CustomEvent("propertiesChanged", {
                    detail: {
                        properties: {
                            [propertyName]: value,
                        },
                    },
                })
            );
            console.log(`Property '${propertyName}' changed to:`, value);
        }

        // SAC calls these to set properties on the builder panel
        onCustomWidgetBeforeUpdate(changedProperties) {
            console.log("Builder: onCustomWidgetBeforeUpdate", changedProperties);
            this._updateUI(changedProperties);
        }

        onCustomWidgetAfterUpdate(changedProperties) {
            console.log("Builder: onCustomWidgetAfterUpdate", changedProperties);
            this._updateUI(changedProperties); // Call update again just in case, though usually BeforeUpdate is enough
        }

        _updateUI(changedProperties) {
            const inputs = {
                apiKey: this._shadowRoot.getElementById("builder_apiKey"),
                personaId: this._shadowRoot.getElementById("builder_personaId"),
                extensionId: this._shadowRoot.getElementById("builder_extensionId"),
                baseUrl: this._shadowRoot.getElementById("builder_baseUrl"),
                max_tokens: this._shadowRoot.getElementById("builder_max_tokens")
            };

            for (const propName in inputs) {
                if (inputs[propName] && changedProperties.hasOwnProperty(propName)) {
                    inputs[propName].value = changedProperties[propName];
                }
            }
        }
        // Removed individual setters/getters as _updateUI and _onPropertyChange handle everything.
    }

    // THIS IS THE CRITICAL LINE FOR THE BUILDER WIDGET!
    // It MUST match the "tag" for "kind": "builder" in your manifest.json
    customElements.define("com-sebastian-szallies-documentdialoguewidget-builder", ChatGptWidgetBuilderPanel);
    console.log("Builder widget 'com-sebastian-szallies-documentdialoguewidget-builder' defined.");
})();
