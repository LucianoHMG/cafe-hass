// Import CSS first - the vite-plugin-css-injected-by-js will automatically inject it
import './index.css';

import React from 'react';
import ReactDOM from 'react-dom/client';
import App from './App';

console.log('C.A.F.E.: main.tsx loading...');
console.log('C.A.F.E.: window.location:', window.location.href);
console.log('C.A.F.E.: document.getElementById("root"):', document.getElementById('root'));

// Create a web component for Home Assistant panel integration
class CafePanel extends HTMLElement {
  private root: ReactDOM.Root | null = null;
  private _hass: any = null;
  private _narrow: boolean = false;
  private _route: any = null;
  private _panel: any = null;
  
  // Properties that HA will set
  get hass() { return this._hass; }
  set hass(value: any) { 
    console.log('C.A.F.E.: hass property set:', !!value, value?.states ? Object.keys(value.states).length : 0);
    this._hass = value; 
    if (this.root) this.render();
  }
  
  get narrow() { return this._narrow; }
  set narrow(value: boolean) { 
    this._narrow = value; 
    if (this.root) this.render();
  }
  
  get route() { return this._route; }
  set route(value: any) { 
    this._route = value; 
    if (this.root) this.render();
  }
  
  get panel() { return this._panel; }
  set panel(value: any) { 
    this._panel = value; 
    if (this.root) this.render();
  }
  
  connectedCallback() {
    console.log('C.A.F.E.: CafePanel connectedCallback');
    console.log('C.A.F.E.: Shadow DOM check - this.shadowRoot:', this.shadowRoot);
    console.log('C.A.F.E.: Parent elements:', this.parentElement, this.parentElement?.shadowRoot);
    
    if (!this.root) {
      this.style.display = 'block';
      this.style.width = '100%';
      this.style.height = '100%';
      // Ensure the custom element has proper styling context
      this.style.position = 'relative';
      this.style.isolation = 'isolate';
      
      // Check if we're inside a shadow DOM and inject CSS accordingly
      this.injectCSSForShadowDOM();
      
      console.log('C.A.F.E.: Creating React root in custom element');
      this.root = ReactDOM.createRoot(this);
      this.render();
    }
  }
  
  // Method to inject CSS into shadow DOM if needed
  private injectCSSForShadowDOM() {
    // Check if we're inside a shadow root
    let currentNode: Node | null = this;
    let shadowRoot: ShadowRoot | null = null;
    
    while (currentNode) {
      if (currentNode instanceof ShadowRoot) {
        shadowRoot = currentNode;
        break;
      }
      currentNode = currentNode.parentNode;
    }
    
    if (shadowRoot) {
      console.log('C.A.F.E.: Detected shadow DOM, injecting CSS directly into shadow root');
      
      // Check if CSS is already injected in shadow DOM
      const existingStyle = shadowRoot.querySelector('style[data-cafe-shadow-styles]');
      if (!existingStyle) {
        // Get the CSS from the injected styles in document head
        const documentStyles = Array.from(document.querySelectorAll('style'))
          .map(s => s.textContent || '')
          .join('\n');
          
        // Create style element for shadow DOM
        const shadowStyle = document.createElement('style');
        shadowStyle.setAttribute('data-cafe-shadow-styles', 'true');
        shadowStyle.textContent = documentStyles;
        
        // Inject into shadow root
        shadowRoot.appendChild(shadowStyle);
        console.log('C.A.F.E.: CSS injected into shadow DOM');
      } else {
        console.log('C.A.F.E.: CSS already present in shadow DOM');
      }
    } else {
      console.log('C.A.F.E.: No shadow DOM detected, using document styles');
    }
  }
  
  disconnectedCallback() {
    console.log('C.A.F.E.: CafePanel disconnectedCallback');
    if (this.root) {
      this.root.unmount();
      this.root = null;
    }
  }
  
  static get observedAttributes() {
    return ['hass', 'narrow', 'route', 'panel'];
  }
  
  attributeChangedCallback() {
    if (this.root) {
      this.render();
    }
  }
  
  render() {
    if (this.root) {
      console.log('C.A.F.E.: Rendering custom element');
      console.log('C.A.F.E.: HASS object available:', !!this._hass);
      console.log('C.A.F.E.: HASS entities count:', this._hass?.states ? Object.keys(this._hass.states).length : 0);
      
      // Force CSS injection check - check all style elements
      const allStylesText = Array.from(document.querySelectorAll('style')).map(s => s.textContent || '').join('');
      const hasTailwindCSS = allStylesText.includes('--tw-border-spacing-x');
      const hasReactFlowCSS = allStylesText.includes('react-flow');
      console.log('C.A.F.E.: Has Tailwind CSS:', hasTailwindCSS, 'Has React Flow CSS:', hasReactFlowCSS);
      
      this.root.render(
        <React.StrictMode>
          <App hass={this._hass} narrow={this._narrow} route={this._route} panel={this._panel} />
        </React.StrictMode>
      );
      
      // Debug computed styles after render
      setTimeout(() => {
        const testElement = this.querySelector('div');
        if (testElement) {
          const computedStyles = window.getComputedStyle(testElement);
          console.log('C.A.F.E.: Sample computed styles:', {
            fontFamily: computedStyles.fontFamily,
            display: computedStyles.display,
            backgroundColor: computedStyles.backgroundColor,
            color: computedStyles.color
          });
        }
      }, 100);
    }
  }
}

console.log('C.A.F.E.: Defining custom element cafe-panel');
// Always define the custom element - HA will use it when needed
customElements.define('cafe-panel', CafePanel);

// For standalone development (when there's a root element)
if (typeof document !== 'undefined') {
  const rootElement = document.getElementById('root');
  console.log('C.A.F.E.: Checking for standalone root element:', rootElement);
  if (rootElement) {
    console.log('C.A.F.E.: Creating React root for standalone development');
    try {
      ReactDOM.createRoot(rootElement).render(
        <React.StrictMode>
          <App />
        </React.StrictMode>
      );
      console.log('C.A.F.E.: Standalone React root created successfully');
    } catch (error) {
      console.error('C.A.F.E.: Error creating standalone React root:', error);
    }
  } else {
    console.log('C.A.F.E.: No root element found, running as HA custom element only');
  }
}
