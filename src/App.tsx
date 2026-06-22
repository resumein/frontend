import { BrowserRouter, Routes, Route } from 'react-router-dom';
import HomePage from './pages/Home';
import { ProtectedRoute, PublicRoute } from './components/RouteGuard';
import AuthCallbackPage from './pages/AuthCallback';
import DashboardPage from './pages/Dashboard';
// import Navbar from './components/Navbar'; 

function App() {
  return (
    <BrowserRouter>
      {/* <Navbar /> */}

      <Routes>
        <Route element={<PublicRoute />}>
          <Route path="/" element={<HomePage />} />
        </Route>

        <Route path="/auth/callback" element={<AuthCallbackPage />} />

        <Route element={<ProtectedRoute />}>
          <Route path="/dashboard" element={<DashboardPage />} />
        </Route>
      </Routes>
    </BrowserRouter>
  );
}

export default App;