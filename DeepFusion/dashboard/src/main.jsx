import React from 'react';
import ReactDOM from 'react-dom/client';
import { BrowserRouter, Routes, Route } from 'react-router-dom';
import { QueryClientProvider } from '@tanstack/react-query';
import { ThemeProvider } from 'next-themes';
import { ProSidebarProvider } from 'react-pro-sidebar';
import { queryClient } from './lib/react-query';
import MainLayout from './layouts/MainLayout';
import MacroPage from './pages/MacroPage';
import MesoPage from './pages/MesoPage';
import MicroPage from './pages/MicroPage';
import PolicyPage from './pages/PolicyPage';
import GlobalPage from './pages/GlobalPage';
import './styles/global.css';

ReactDOM.createRoot(document.getElementById('root')).render(
  <React.StrictMode>
    <QueryClientProvider client={queryClient}>
      <ThemeProvider
        attribute="data-theme"
        defaultTheme="matin"
        enableSystem={false}
        themes={['matin', 'crepuscule', 'eclat', 'reve', 'lumiere']}
      >
        <BrowserRouter>
          <ProSidebarProvider>
            <Routes>
              <Route path="/" element={<MainLayout />}>
                <Route index element={<MacroPage />} />
                <Route path="macro" element={<MacroPage />} />
                <Route path="meso" element={<MesoPage />} />
                <Route path="micro" element={<MicroPage />} />
                <Route path="policy" element={<PolicyPage />} />
                <Route path="global" element={<GlobalPage />} />
              </Route>
            </Routes>
          </ProSidebarProvider>
        </BrowserRouter>
      </ThemeProvider>
    </QueryClientProvider>
  </React.StrictMode>
);
