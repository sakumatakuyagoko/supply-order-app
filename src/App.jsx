import { BrowserRouter as Router, Routes, Route } from 'react-router-dom';
import HomePage from './pages/HomePage';
import OrderPage from './pages/OrderPage';

function App() {
  return (
    <Router>
      <Routes>
        <Route path="/" element={<HomePage />} />
        <Route path="/order" element={<OrderPage />} />
        {/* Placeholders for future routes */}
        <Route path="/receive" element={<HomePage />} />
        <Route path="/history" element={<HomePage />} />
      </Routes>
    </Router>
  );
}

export default App;
