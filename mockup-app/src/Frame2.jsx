import './App.css'
import './Frame2.css'

function Frame2({ onConnect }) {
  return (
    <div className="device-frame">
      <div className="screen">
        <header className="frame2-header">
          <div className="search-bar">
            <span>Search stories, creators</span>
          </div>
          <div className="wallet-section">
            <button className="connect-wallet-btn" onClick={onConnect}>Connect Wallet</button>
          </div>
        </header>

        <main className="frame2-content">
          <div className="content-card">
            <div className="card-placeholder">
              <p>Connect your wallet to view stories</p>
            </div>
            <div className="card-title-bar"></div>
          </div>
          <div className="content-card">
            <div className="card-placeholder">
              <p>Connect your wallet to view creators</p>
            </div>
            <div className="card-title-bar"></div>
          </div>
        </main>
      </div>
    </div>
  )
}

export default Frame2
