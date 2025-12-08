import { useState } from 'react'
import './App.css'
import Frame2 from './Frame2.jsx'
import Frame3 from './Frame3.jsx'

function App() {
  const [currentFrame, setCurrentFrame] = useState(1)

  if (currentFrame === 3) {
    return <Frame3 />
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
