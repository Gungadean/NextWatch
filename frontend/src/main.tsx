import { Provider } from './components/ui/provider'
import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'

import App from './App.tsx'
import {AuthProvider} from "./context/AuthContext.tsx";
import {Toaster} from "./components/ui/toaster.tsx";

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <Provider>
      <AuthProvider>
        <Toaster />
        <App />
      </AuthProvider>
    </Provider>
  </StrictMode>,
)