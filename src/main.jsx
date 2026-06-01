import React from 'react'
import ReactDOM from 'react-dom/client'
import App from './App.jsx'
import { UserProvider, useUser } from './contexts/UserContext.jsx'
import { ClassroomProvider } from './contexts/ClassroomContext.jsx'
import './index.css'

function AppWithProviders() {
  const { currentUser } = useUser();

  return (
    <ClassroomProvider currentUser={currentUser}>
      <App />
    </ClassroomProvider>
  );
}

ReactDOM.createRoot(document.getElementById('root')).render(
  <React.StrictMode>
    <UserProvider>
      <AppWithProviders />
    </UserProvider>
  </React.StrictMode>,
)