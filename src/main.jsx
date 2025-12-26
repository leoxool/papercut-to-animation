import React from 'react'
import ReactDOM from 'react-dom/client'
import App from './App.jsx'
import { UserProvider, useUser } from './contexts/UserContext.jsx'
import { ProjectProvider } from './contexts/ProjectContext.jsx'
import { ClassroomProvider } from './contexts/ClassroomContext.jsx'
import './index.css'

// 内层组件，需要在 UserProvider 内部使用 useUser hook
function AppWithProviders() {
  const { currentUser } = useUser();

  return (
    <ProjectProvider currentUser={currentUser}>
      <ClassroomProvider currentUser={currentUser} currentProject={null}>
        <App />
      </ClassroomProvider>
    </ProjectProvider>
  );
}

ReactDOM.createRoot(document.getElementById('root')).render(
  <React.StrictMode>
    <UserProvider>
      <AppWithProviders />
    </UserProvider>
  </React.StrictMode>,
)