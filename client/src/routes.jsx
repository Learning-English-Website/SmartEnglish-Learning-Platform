import { Suspense, lazy } from 'react';
import { createBrowserRouter } from 'react-router-dom';
import Layout from './components/Layout/Layout';
import ProtectedRoute from './components/ProtectedRoute/ProtectedRoute';
import LoadingSpinner from './components/common/LoadingSpinner/LoadingSpinner';

// ── Lazy-loaded pages ─────────────────────────────────────────────────────────
const HomePage = lazy(() => import('./pages/Home/HomePage'));
const LoginPage = lazy(() => import('./pages/Auth/LoginPage'));
const RegisterPage = lazy(() => import('./pages/Auth/RegisterPage'));
const ForgotPasswordPage = lazy(() => import('./pages/Auth/ForgotPasswordPage'));
const OAuthCallbackPage = lazy(() => import('./pages/Auth/OAuthCallbackPage'));
const DashboardPage = lazy(() => import('./pages/Dashboard/DashboardPage'));
const ProfilePage = lazy(() => import('./pages/Profile/ProfilePage'));
const EditProfilePage = lazy(() => import('./pages/Profile/EditProfilePage'));
const QuizletHomePage = lazy(() => import('./pages/Quizlet/QuizletHomePage'));
const MySets = lazy(() => import('./pages/Quizlet/MySets'));
const CreateSet = lazy(() => import('./pages/Quizlet/CreateSet'));
const EditSet = lazy(() => import('./pages/Quizlet/EditSet'));
const SetDetail = lazy(() => import('./pages/Quizlet/SetDetail'));
const DuolingoHomePage = lazy(() => import('./pages/Duolingo/DuolingoHomePage'));
const Browse = lazy(() => import('./pages/Quizlet/Browse'));

const withSuspense = (element) => (
  <Suspense fallback={<LoadingSpinner fullScreen text="Loading..." />}>
    {element}
  </Suspense>
);

const router = createBrowserRouter([
  {
    element: <Layout />,
    children: [
      { path: '/', element: withSuspense(<HomePage />) },
      { path: '/login', element: withSuspense(<LoginPage />) },
      { path: '/register', element: withSuspense(<RegisterPage />) },
      { path: '/forgot-password', element: withSuspense(<ForgotPasswordPage />) },
      { path: '/oauth/callback', element: withSuspense(<OAuthCallbackPage />) },
      {
        path: '/dashboard',
        element: withSuspense(
          <ProtectedRoute><DashboardPage /></ProtectedRoute>
        ),
      },
      {
        path: '/quizlet',
        element: withSuspense(
          <ProtectedRoute><QuizletHomePage /></ProtectedRoute>
        ),
      },
      {
        path: '/flashcards',
        element: withSuspense(
          <ProtectedRoute><MySets /></ProtectedRoute>
        ),
      },
      {
        path: '/flashcards/sets/create',
        element: withSuspense(
          <ProtectedRoute><CreateSet /></ProtectedRoute>
        ),
      },
      {
        path: '/flashcards/browse',
        element: withSuspense(
          <ProtectedRoute><Browse /></ProtectedRoute>
        ),
      },
      {
        path: '/flashcards/sets/:id',
        element: withSuspense(
          <ProtectedRoute><SetDetail /></ProtectedRoute>
        ),
      },
      {
        path: '/flashcards/sets/:id/edit',
        element: withSuspense(
          <ProtectedRoute><EditSet /></ProtectedRoute>
        ),
      },
      {
        path: '/duolingo',
        element: withSuspense(
          <ProtectedRoute><DuolingoHomePage /></ProtectedRoute>
        ),
      },
      {
        path: '/profile',
        element: withSuspense(
          <ProtectedRoute><ProfilePage /></ProtectedRoute>
        ),
      },
      {
        path: '/user/profile',
        element: withSuspense(
          <ProtectedRoute><ProfilePage /></ProtectedRoute>
        ),
      },
      {
        path: '/admin/profile',
        element: withSuspense(
          <ProtectedRoute><ProfilePage /></ProtectedRoute>
        ),
      },
      {
        path: '/profile/edit',
        element: withSuspense(
          <ProtectedRoute><EditProfilePage /></ProtectedRoute>
        ),
      },
    ],
  },
]);

export default router;
