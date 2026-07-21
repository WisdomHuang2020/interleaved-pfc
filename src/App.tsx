import { HashRouter, Routes, Route } from 'react-router-dom'
import Layout from './components/Layout'
import Home from './pages/Home'
import Theory from './pages/Theory'
import Curves from './pages/Curves'
import Designer from './pages/Designer'
import { DesignProvider } from './lib/DesignContext'

function App() {
  return (
    <DesignProvider>
      <HashRouter>
        <Layout>
          <Routes>
            <Route path="/" element={<Home />} />
            <Route path="/theory" element={<Theory />} />
            <Route path="/curves" element={<Curves />} />
            <Route path="/designer" element={<Designer />} />
          </Routes>
        </Layout>
      </HashRouter>
    </DesignProvider>
  )
}

export default App
