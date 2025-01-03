import React from 'react';
import { BrowserRouter as Router, Routes, Route } from 'react-router-dom';
import AboutUs from './pages/AboutUs';
import NewWelcomeScreen from './components/NewWelcomeScreen';

function App() {
  return (
    <Router>
      <Routes>
        <Route path="/" element={<NewWelcomeScreen />} />
        <Route path="/about" element={<AboutUs />} />
      </Routes>
    </Router>
  );
}

export default App; 