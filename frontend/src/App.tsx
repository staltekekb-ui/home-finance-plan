import { useState } from 'react';
import { Routes, Route, Link, useLocation } from 'react-router-dom';
import DashboardPage from './pages/DashboardPage';
import HomePage from './pages/HomePage';
import UploadPage from './pages/UploadPage';
import ReportsPage from './pages/ReportsPage';
import BudgetsPage from './pages/BudgetsPage';
import GoalsPage from './pages/GoalsPage';
import AccountsPage from './pages/AccountsPage';
import RecurringPage from './pages/RecurringPage';

const navItems = [
  { path: '/', label: 'Обзор' },
  { path: '/transactions', label: 'Транзакции' },
  { path: '/upload', label: 'Добавить' },
  { path: '/reports', label: 'Отчёты' },
  { path: '/budgets', label: 'Бюджеты' },
  { path: '/goals', label: 'Цели' },
  { path: '/accounts', label: 'Счета' },
  { path: '/recurring', label: 'Повторяющиеся' },
];

function App() {
  const [menuOpen, setMenuOpen] = useState(false);
  const location = useLocation();

  const isActive = (path: string) => {
    if (path === '/') return location.pathname === '/';
    return location.pathname.startsWith(path);
  };

  return (
    <div className="min-h-screen">
      <nav className="bg-white shadow-card sticky top-0 z-40">
        <div className="max-w-6xl mx-auto px-4">
          <div className="flex items-center justify-between h-16">
            <Link to="/" className="text-lg sm:text-xl font-bold text-slate-700 hover:text-sage-600 transition-colors">
              Домашняя Бухгалтерия
            </Link>

            {/* Desktop menu */}
            <div className="hidden lg:flex gap-2">
              {navItems.map((item) => (
                <Link
                  key={item.path}
                  to={item.path}
                  className={`px-4 py-2 rounded-full text-sm font-medium transition-all duration-200 ${
                    isActive(item.path)
                      ? 'bg-gradient-green text-white shadow-card'
                      : 'text-slate-600 hover:text-sage-600 hover:bg-cream-200'
                  }`}
                >
                  {item.label}
                </Link>
              ))}
            </div>

            {/* Mobile menu button */}
            <button
              className="lg:hidden p-2 text-slate-600 hover:text-sage-600 transition-colors"
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
            <div className="lg:hidden pb-4 space-y-2 animate-slide-up">
              {navItems.map((item) => (
                <Link
                  key={item.path}
                  to={item.path}
                  className={`block py-2 px-4 rounded-xl font-medium transition-all duration-200 ${
                    isActive(item.path)
                      ? 'bg-gradient-green text-white shadow-card'
                      : 'text-slate-600 hover:text-sage-600 hover:bg-cream-200'
                  }`}
                  onClick={() => setMenuOpen(false)}
                >
                  {item.label}
                </Link>
              ))}
            </div>
          )}
        </div>
      </nav>

      <main className="max-w-6xl mx-auto px-4 py-6 sm:py-8">
        <Routes>
          <Route path="/" element={<DashboardPage />} />
          <Route path="/transactions" element={<HomePage />} />
          <Route path="/upload" element={<UploadPage />} />
          <Route path="/reports" element={<ReportsPage />} />
          <Route path="/budgets" element={<BudgetsPage />} />
          <Route path="/goals" element={<GoalsPage />} />
          <Route path="/accounts" element={<AccountsPage />} />
          <Route path="/recurring" element={<RecurringPage />} />
        </Routes>
      </main>
    </div>
  );
}

export default App;
