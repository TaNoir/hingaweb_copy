import { BrowserRouter } from 'react-router';
import { AuthProvider } from './lib/auth/AuthProvider.jsx';
import { AppRoutes } from './routes.jsx';
import { RouteFocus } from './components/layout/RouteFocus.jsx';

export default function App() {
  return (
    <BrowserRouter>
      <RouteFocus />
      <AuthProvider>
        <AppRoutes />
      </AuthProvider>
    </BrowserRouter>
  );
}
