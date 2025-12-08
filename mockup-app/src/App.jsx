import { useState } from 'react'
import './App.css'
import Frame2 from './Frame2.jsx'
import Frame3 from './Frame3.jsx'
import Frame5 from './Frame5.jsx'
import Home from './Home.jsx'

function App() {
  const [currentFrame, setCurrentFrame] = useState(1)

  const handleHomeNavigate = (item) => {
    if (item === 'create') {
      setCurrentFrame(5)
    } else if (item === 'disconnect') {
      setCurrentFrame(2)
    } else if (item === 'vault') {
      setCurrentFrame(3)
    }
  }

  if (currentFrame === 'home') {
    return <Home onNavigate={handleHomeNavigate} />
  }

  if (currentFrame === 5) {
    return <Frame5 onBack={() => setCurrentFrame('home')} />
  }

  if (currentFrame === 3) {
    return <Frame3
      onDisconnect={() => setCurrentFrame(2)}
      onCreate={() => setCurrentFrame(5)}
      onHome={() => setCurrentFrame('home')}
    />
  }

  if (currentFrame === 2) {
    return <Frame2 onConnect={() => setCurrentFrame(3)} />
  }

  return (
    <div className="device-frame">
      <div className="screen">
        <header className="header">
          <button className="nav-button">Governance</button>
          <button className="nav-button" onClick={() => setCurrentFrame(2)}>Launch app</button>
        </header>

        <main className="main-content">
          <img src="/logo.png" alt="Mute" className="logo" />
        </main>
      </div>
    </div>
  )
}

export default App
