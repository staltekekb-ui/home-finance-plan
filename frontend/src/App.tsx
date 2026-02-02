import { useState } from 'react';
import { Routes, Route, Link } from 'react-router-dom';
import HomePage from './pages/HomePage';
import UploadPage from './pages/UploadPage';
import ReportsPage from './pages/ReportsPage';

function App() {
  const [menuOpen, setMenuOpen] = useState(false);

  return (
    <div className="min-h-screen">
      <nav className="bg-white shadow-sm">
        <div className="max-w-4xl mx-auto px-4">
          <div className="flex items-center justify-between h-16">
            <Link to="/" className="text-lg sm:text-xl font-bold text-gray-900">
              Домашняя Бухгалтерия
            </Link>

            {/* Desktop menu */}
            <div className="hidden sm:flex gap-4">
              <Link to="/" className="text-gray-600 hover:text-gray-900">
                Транзакции
              </Link>
              <Link to="/upload" className="text-gray-600 hover:text-gray-900">
                Загрузить
              </Link>
              <Link to="/reports" className="text-gray-600 hover:text-gray-900">
                Отчёты
              </Link>
            </div>

            {/* Mobile menu button */}
            <button
              className="sm:hidden p-2 text-gray-600"
              onClick={() => setMenuOpen(!menuOpen)}
            >
              <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                {menuOpen ? (
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                ) : (
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" />
                )}
              </svg>
            </button>
          </div>

          {/* Mobile menu */}
          {menuOpen && (
            <div className="sm:hidden pb-4 space-y-2">
              <Link
                to="/"
                className="block py-2 text-gray-600 hover:text-gray-900"
                onClick={() => setMenuOpen(false)}
              >
                Транзакции
              </Link>
              <Link
                to="/upload"
                className="block py-2 text-gray-600 hover:text-gray-900"
                onClick={() => setMenuOpen(false)}
              >
                Загрузить
              </Link>
              <Link
                to="/reports"
                className="block py-2 text-gray-600 hover:text-gray-900"
                onClick={() => setMenuOpen(false)}
              >
                Отчёты
              </Link>
            </div>
          )}
        </div>
      </nav>

      <main className="max-w-4xl mx-auto px-4 py-6 sm:py-8">
        <Routes>
          <Route path="/" element={<HomePage />} />
          <Route path="/upload" element={<UploadPage />} />
          <Route path="/reports" element={<ReportsPage />} />
        </Routes>
      </main>
    </div>
  );
}

export default App;
