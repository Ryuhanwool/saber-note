import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import { BrowserRouter } from 'react-router'
import App from './App'
import CommunityProvider from './ui/community/CommunityProvider'
import LeagueProvider from './ui/shared/LeagueProvider'
import './ui/shared/tokens.css'
import './ui/shared/base.css'

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <BrowserRouter>
      <LeagueProvider>
        <CommunityProvider>
          <App />
        </CommunityProvider>
      </LeagueProvider>
    </BrowserRouter>
  </StrictMode>,
)
