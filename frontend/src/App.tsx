import { lazy, Suspense } from 'react';
import { BrowserRouter, Routes, Route } from 'react-router-dom';
import { LoadingSkeleton } from '@/components/shared/LoadingSkeleton';

const Landing = lazy(() => import('@/pages/Landing'));
const AppDashboard = lazy(() => import('@/pages/AppDashboard'));
const Docs = lazy(() => import('@/pages/Docs'));

function PageLoader() {
  return (
    <div className="min-h-screen bg-bg-primary flex items-center justify-center">
      <LoadingSkeleton width={200} height={24} />
    </div>
  );
}

export default function App() {
  return (
    <BrowserRouter>
      <Suspense fallback={<PageLoader />}>
        <Routes>
          <Route path="/" element={<Landing />} />
          <Route path="/app/*" element={<AppDashboard />} />
          <Route path="/docs" element={<Docs />} />
        </Routes>
      </Suspense>
    </BrowserRouter>
  );
}
