import React from 'react'
import ReactDOM from 'react-dom/client'
import App from './App.jsx'
import { UserProvider, useUser } from './contexts/UserContext.jsx'
import { ProjectProvider } from './contexts/ProjectContext.jsx'
import './index.css'

// 内层组件，需要在 UserProvider 内部使用 useUser hook
function AppWithProjectProvider() {
  const { currentUser } = useUser();

  return (
    <ProjectProvider currentUser={currentUser}>
      <App />
    </ProjectProvider>
  );
}

ReactDOM.createRoot(document.getElementById('root')).render(
  <React.StrictMode>
    <UserProvider>
      <AppWithProjectProvider />
    </UserProvider>
  </React.StrictMode>,
)