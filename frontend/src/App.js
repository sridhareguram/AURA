import React from 'react';
import Dashboard from './components/Dashboard';
import { AppProvider } from './context/AppContext';
import { CssBaseline } from '@mui/material';

function App() {
  return (
    <AppProvider>
      <CssBaseline />
      <Dashboard />
    </AppProvider>
  );
}

export default App;
