import React from "react";
import ReactDOM from "react-dom/client";
import { Provider } from "react-redux";
import { BrowserRouter } from "react-router-dom";
import store from "./redux/store";
import "./index.css";
import App from "./App";
import reportWebVitals from "./reportWebVitals";
import "bootstrap/dist/css/bootstrap.min.css";
import { loadAllDataFromStorage } from './utils/directLoader';

const root = ReactDOM.createRoot(document.getElementById("root"));
root.render(
  <React.StrictMode>
    <Provider store={store}>
      <BrowserRouter>
        <App />
      </BrowserRouter>
    </Provider>
  </React.StrictMode>
);

// Initialize data from Application storage on app startup
document.addEventListener('DOMContentLoaded', () => {
  // Try to load with fixed ID from screenshots
  loadAllDataFromStorage('0c54617c-3116-4bcd-bb53-bf31ca8044d5', store.dispatch);
  
  console.log('Application initialized with data from storage');
});

reportWebVitals();
