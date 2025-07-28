// Widget.js

(function() {
    let template = document.createElement("template");
    template.innerHTML = `
        <style>
            :host {
                display: block;
                padding: 16px;
                font-family: sans-serif;
            }
            button {
                background-color: #0070f2;
                color: white;
                border: none;
                padding: 10px 15px;
                cursor: pointer;
                border-radius: 4px;
            }
            h3 {
                color: #333;
            }
        </style>
        <h3>Mein SAC Test-Widget</h3>
        <label id="myLabel">Klicken Sie auf den Button!</label><br><br>
        <button id="myButton">Ändere Text</button>
    `;

    class MyWidget extends HTMLElement {
        constructor() {
            super();
            this._shadowRoot = this.attachShadow({ mode: "open" });
            this._shadowRoot.appendChild(template.content.cloneNode(true));
            
            this._shadowRoot.getElementById("myButton").addEventListener("click", this._onButtonClick.bind(this));
        }

        _onButtonClick() {
            const label = this._shadowRoot.getElementById("myLabel");
            label.textContent = "Der Text wurde geändert!";
            console.log("Button wurde geklickt!");
        }
    }

    customElements.define("com-sap-sample-mainwidget", MyWidget);
})();
