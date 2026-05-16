import { Suspense, lazy } from 'react';
import { createBrowserRouter, Outlet } from 'react-router-dom';
import Layout from './components/Layout/Layout';
import DashboardLayout from './components/Layout/DashboardLayout';
import PublicSetLayout from './components/PublicSetLayout/PublicSetLayout';
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
const CommunitySetDetail = lazy(() => import('./pages/Quizlet/CommunitySetDetail'));
const DuolingoHomePage = lazy(() => import('./pages/Duolingo/DuolingoHomePage'));
const Browse = lazy(() => import('./pages/Quizlet/Browse'));
const StudyPage = lazy(() => import('./pages/Quizlet/StudyPage'));
const SharedSet = lazy(() => import('./pages/Quizlet/SharedSet'));
const LibraryPage = lazy(() => import('./pages/Quizlet/LibraryPage'));
const FolderPage = lazy(() => import('./pages/Quizlet/FolderPage'));
const StudySetCreate = lazy(() => import('./pages/StudySets/StudySetCreate'));
const StudySetDetail = lazy(() => import('./pages/StudySets/StudySetDetail'));
const StudySetLearn = lazy(() => import('./pages/StudySets/StudySetLearn'));

const withSuspense = (element) => (
  <Suspense fallback={<LoadingSpinner fullScreen text="Loading..." />}>
    {element}
  </Suspense>
);

// ── Routes ─────────────────────────────────────────────────────────────────────
const router = createBrowserRouter([
  // Public routes (Login, Register, etc.)
  {
    element: <Layout />,
    children: [
      { path: '/', element: withSuspense(<HomePage />) },
      { path: '/login', element: withSuspense(<LoginPage />) },
      { path: '/register', element: withSuspense(<RegisterPage />) },
      { path: '/register/otp', element: withSuspense(<RegisterPage />) },
      { path: '/forgot-password', element: withSuspense(<ForgotPasswordPage />) },
      { path: '/forgot-password/otp', element: withSuspense(<ForgotPasswordPage />) },
      { path: '/oauth/callback', element: withSuspense(<OAuthCallbackPage />) },
      // Public shared set route - no auth required
      { path: '/shared/:shareCode', element: withSuspense(<SharedSet />) },
    ],
  },

  // Public set routes with DashboardLayout (không require login)
  {
    element: (
      <PublicSetLayout />
    ),
    children: [
      { path: '/flashcards/sets/:id', element: withSuspense(<SetDetail />) },
    ],
  },

  // Protected routes with DashboardLayout (sidebar + top navbar)
  {
    element: (
      <ProtectedRoute>
        <DashboardLayout>
          <Outlet />
        </DashboardLayout>
      </ProtectedRoute>
    ),
    children: [
      { path: '/dashboard', element: withSuspense(<DashboardPage />) },
      { path: '/quizlet', element: withSuspense(<QuizletHomePage />) },
      { path: '/library', element: withSuspense(<LibraryPage />) },
      { path: '/library/folders', element: withSuspense(<FolderPage />) },
      { path: '/user/:username/sets', element: withSuspense(<LibraryPage />) },
      { path: '/user/:username/folders', element: withSuspense(<FolderPage />) },
      { path: '/user/:username/classes', element: withSuspense(<LibraryPage />) },
      { path: '/user/:username/practice-tests', element: withSuspense(<LibraryPage />) },
      { path: '/user/:username/explanations', element: withSuspense(<LibraryPage />) },
      { path: '/flashcards', element: withSuspense(<MySets />) },
      { path: '/flashcards/sets/create', element: withSuspense(<CreateSet />) },
      { path: '/flashcards/browse', element: withSuspense(<Browse />) },
      { path: '/flashcards/sets/:id', element: withSuspense(<SetDetail />) },
      { path: '/flashcards/sets/:id/edit', element: withSuspense(<EditSet />) },
      { path: '/flashcards/sets/:id/study', element: withSuspense(<StudyPage />) },
      { path: '/duolingo', element: withSuspense(<DuolingoHomePage />) },
      { path: '/profile', element: withSuspense(<ProfilePage />) },
      { path: '/user/profile', element: withSuspense(<ProfilePage />) },
      { path: '/admin/profile', element: withSuspense(<ProfilePage />) },
      { path: '/profile/edit', element: withSuspense(<EditProfilePage />) },
      { path: '/community/sets/:id', element: withSuspense(<CommunitySetDetail />) },

      // ── Quizlet-style Study Sets routes ──────────────────────────────
      { path: '/study-sets/create', element: withSuspense(<StudySetCreate />) },
      { path: '/study-sets/:id', element: withSuspense(<StudySetDetail />) },
      { path: '/study-sets/:id/flashcards', element: withSuspense(<StudyPage />) },
      { path: '/study-sets/:id/learn', element: withSuspense(<StudySetLearn />) },
      { path: '/study-sets/:id/test', element: withSuspense(<StudyPage />) },
      { path: '/study-sets/:id/match', element: withSuspense(<StudyPage />) },
      { path: '/study-sets/:id/blast', element: withSuspense(<StudyPage />) },

      // ── Folder routes ──────────────────────────────────────────────
      { path: '/folders/:id/:slug', element: withSuspense(<FolderPage />) },
    ],
  },
]);

export default router;
