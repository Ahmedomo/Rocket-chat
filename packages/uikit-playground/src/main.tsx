import React from 'react';
import { createRoot } from 'react-dom/client';
import '@rocket.chat/icons/dist/rocketchat.css';
import '@rocket.chat/fuselage/dist/fuselage.css';

import './index.css';
import App from './App';
import { Provider } from './Context';
import PersistStore from './Components/PersistStore/PersistStore';

const container = document.getElementById('root');

if (!container) throw new Error('React root not found');

const root = createRoot(container);

root.render(
  <React.StrictMode>
    <Provider>
      <PersistStore>
        <App />
      </PersistStore>
    </Provider>
  </React.StrictMode>,
);
