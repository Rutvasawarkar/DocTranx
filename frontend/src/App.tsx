import { BrowserRouter as Router, Routes, Route } from 'react-router-dom';
import Navbar from './components/Navbar';
import Dashboard from './pages/Dashboard';
import DocumentViewer from './pages/DocumentViewer';

function App() {
  return (
    <Router>
      <div className="app-container">
        <Navbar />
        <main className="main-content">
          <Routes>
            <Route path="/" element={<Dashboard />} />
            <Route path="/document/:id" element={<DocumentViewer />} />
          </Routes>
        </main>
      </div>
    </Router>
  );
}

export default App;
