import React from 'react'
import ReactDOM from 'react-dom/client'
import App from './App.jsx'
import { UserProvider, useUser } from './contexts/UserContext.jsx'
import { ProjectProvider, useProject } from './contexts/ProjectContext.jsx'
import { ClassroomProvider } from './contexts/ClassroomContext.jsx'
import './index.css'

// 嵌套提供者结构
function AppWithProviders() {
  const { currentUser } = useUser();

  return (
    <ProjectProvider currentUser={currentUser}>
      <ClassroomWrapper currentUser={currentUser}>
        <App />
      </ClassroomWrapper>
    </ProjectProvider>
  );
}

// ClassroomWrapper 在 ProjectProvider 内部，可以访问 currentProject
function ClassroomWrapper({ currentUser, children }) {
  const { currentProject } = useProject();

  return (
    <ClassroomProvider currentUser={currentUser} currentProject={currentProject}>
      {children}
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