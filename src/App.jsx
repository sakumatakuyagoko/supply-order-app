import { BrowserRouter as Router, Routes, Route } from 'react-router-dom';
import HomePage from './pages/HomePage';
import OrderPage from './pages/OrderPage';
import ReceivePage from './pages/ReceivePage';

function App() {
  return (
    <Router>
      <Routes>
        <Route path="/" element={<HomePage />} />
        <Route path="/order" element={<OrderPage />} />
        <Route path="/receive" element={<ReceivePage />} />
        {/* Placeholders for future routes */}
        <Route path="/history" element={<HomePage />} />
      </Routes>
    </Router>
  );
}

export default App;
