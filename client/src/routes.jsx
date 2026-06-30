import { Suspense, lazy } from 'react';
import { createBrowserRouter, Outlet } from 'react-router-dom';
import Layout from './components/Layout/Layout';
import DashboardLayout from './components/Layout/DashboardLayout';
import StudyLayout from './components/Layout/StudyLayout';
import PublicSetLayout from './components/PublicSetLayout/PublicSetLayout';
import ProtectedRoute from './components/ProtectedRoute/ProtectedRoute';
import AdminRoute from './components/AdminRoute/AdminRoute';
import AdminLayout from './components/AdminLayout/AdminLayout';
import TeacherRoute from './components/TeacherRoute/TeacherRoute';
import TeacherLayout from './components/TeacherLayout/TeacherLayout';
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
const CoursesPage = lazy(() => import('./pages/Duolingo/CoursesPage'));
const DuolingoLearnPage = lazy(() => import('./pages/Duolingo/LearnPage'));
const LessonPage = lazy(() => import('./pages/Duolingo/LessonPage'));
const ChatPage = lazy(() => import('./pages/Duolingo/ChatPage'));
const Browse = lazy(() => import('./pages/Quizlet/Browse'));
const StudyPage = lazy(() => import('./pages/Quizlet/StudyPage'));
const SharedSet = lazy(() => import('./pages/Quizlet/SharedSet'));
const LibraryPage = lazy(() => import('./pages/Quizlet/LibraryPage'));
const FolderPage = lazy(() => import('./pages/Quizlet/FolderPage'));
const StudySetLearn = lazy(() => import('./pages/StudySets/StudySetLearn'));
const LearnNewPage = lazy(() => import('./pages/StudySets/LearnNewPage'));
const ReviewPage = lazy(() => import('./pages/StudySets/ReviewPage'));
const ExploreSetsPage = lazy(() => import('./pages/Quizlet/ExploreSets'));
const NotificationsPage = lazy(() => import('./pages/Notifications/NotificationsPage'));
const ProPage = lazy(() => import('./pages/Pro/ProPage'));
const SuccessPage = lazy(() => import('./pages/Pro/SuccessPage'));
const CancelPage = lazy(() => import('./pages/Pro/CancelPage'));

// Admin pages
const AdminDashboard = lazy(() => import('./pages/Admin/AdminDashboard'));
const AdminCoursesPage = lazy(() => import('./pages/Admin/AdminCoursesPage'));
const AdminUnitsPage = lazy(() => import('./pages/Admin/AdminUnitsPage'));
const AdminLessonsPage = lazy(() => import('./pages/Admin/AdminLessonsPage'));
const AdminChallengesPage = lazy(() => import('./pages/Admin/AdminChallengesPage'));
const AdminFlashcardSetsPage = lazy(() => import('./pages/Admin/AdminFlashcardSetsPage'));
const AdminFoldersPage = lazy(() => import('./pages/Admin/AdminFoldersPage'));
const AdminCommunitySetsPage = lazy(() => import('./pages/Admin/AdminCommunitySetsPage'));
const AdminUsersPage = lazy(() => import('./pages/Admin/AdminUsersPage'));
const AdminFeedbackPage = lazy(() => import('./pages/Admin/AdminFeedbackPage'));
const AdminSupportChatPage = lazy(() => import('./pages/Admin/AdminSupportChatPage'));
const AdminOrdersPage = lazy(() => import('./pages/Admin/AdminOrdersPage'));
const DuolingoStudio = lazy(() => import('./pages/Teacher/DuolingoStudio'));
const DailyChallengePlanner = lazy(() => import('./pages/Teacher/DailyChallengePlanner.jsx'));

const withSuspense = (element) => (
  <Suspense fallback={<LoadingSpinner fullScreen text="Loading..." />}>
    {element}
  </Suspense>
);

// ── Routes ─────────────────────────────────────────────────────────────────────
const router = createBrowserRouter([
  // Public routes
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
      { path: '/shared/:shareCode', element: withSuspense(<SharedSet />) },
      { path: '/premium/success', element: withSuspense(<SuccessPage />) },
      { path: '/premium/cancel', element: withSuspense(<CancelPage />) },
    ],
  },

  // Public set routes
  {
    element: <PublicSetLayout />,
    children: [
      { path: '/flashcards/sets/:id', element: withSuspense(<SetDetail />) },
    ],
  },

  // Protected routes with DashboardLayout
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
      { path: '/duolingo/courses', element: withSuspense(<CoursesPage />) },
      { path: '/duolingo/learn', element: withSuspense(<DuolingoLearnPage />) },
      { path: '/duolingo/lesson/:lessonId', element: withSuspense(<LessonPage />) },
      { path: '/ai-chatbot', element: withSuspense(<ChatPage />) },
      { path: '/profile', element: withSuspense(<ProfilePage />) },
      { path: '/user/profile', element: withSuspense(<ProfilePage />) },
      { path: '/profile/edit', element: withSuspense(<EditProfilePage />) },
      { path: '/community/sets/:id', element: withSuspense(<CommunitySetDetail />) },
      { path: '/study-sets/:id', element: withSuspense(<SetDetail />) },
      { path: '/folders/:id/:slug', element: withSuspense(<FolderPage />) },
      { path: '/premium', element: withSuspense(<ProPage />) },
      { path: '/explore', element: withSuspense(<ExploreSetsPage />) },
      { path: '/notifications', element: withSuspense(<NotificationsPage />) },
    ],
  },

  // Protected routes with StudyLayout
  {
    element: (
      <ProtectedRoute>
        <StudyLayout backTo="/dashboard" hideHeader />
      </ProtectedRoute>
    ),
    children: [
      { path: '/flashcards/sets/:id/flashcards', element: withSuspense(<StudyPage />) },
      { path: '/flashcards/sets/:id/test', element: withSuspense(<StudyPage />) },
      { path: '/flashcards/sets/:id/match', element: withSuspense(<StudyPage />) },
      { path: '/flashcards/sets/:id/learn', element: withSuspense(<StudySetLearn />) },
      { path: '/study-sets/:id/flashcards', element: withSuspense(<StudyPage />) },
      { path: '/study-sets/:id/test', element: withSuspense(<StudyPage />) },
      { path: '/study-sets/:id/match', element: withSuspense(<StudyPage />) },
      { path: '/study-sets/:id/learn', element: withSuspense(<StudySetLearn />) },
      { path: '/flashcards/learn-new', element: withSuspense(<LearnNewPage />) },
      { path: '/flashcards/review', element: withSuspense(<ReviewPage />) },
    ],
  },

  // Admin routes (separate layout, admin only)
  {
    element: (
      <AdminRoute>
        <AdminLayout>
          <Outlet />
        </AdminLayout>
      </AdminRoute>
    ),
    children: [
      { path: '/admin', element: withSuspense(<AdminDashboard />) },
      { path: '/admin/dashboard', element: withSuspense(<AdminDashboard />) },
      { path: '/admin/courses', element: withSuspense(<AdminCoursesPage />) },
      { path: '/admin/units', element: withSuspense(<AdminUnitsPage />) },
      { path: '/admin/lessons', element: withSuspense(<AdminLessonsPage />) },
      { path: '/admin/challenges', element: withSuspense(<AdminChallengesPage />) },
      { path: '/admin/flashcards', element: withSuspense(<AdminFlashcardSetsPage />) },
      { path: '/admin/folders', element: withSuspense(<AdminFoldersPage />) },
      { path: '/admin/community', element: withSuspense(<AdminCommunitySetsPage />) },
      { path: '/admin/users', element: withSuspense(<AdminUsersPage />) },
      { path: '/admin/feedback', element: withSuspense(<AdminFeedbackPage />) },
      { path: '/admin/support-chat', element: withSuspense(<AdminSupportChatPage />) },
      { path: '/admin/orders', element: withSuspense(<AdminOrdersPage />) },
    ],
  },

  // Teacher routes (separate layout, teacher & admin allowed)
  {
    element: (
      <TeacherRoute>
        <TeacherLayout>
          <Outlet />
        </TeacherLayout>
      </TeacherRoute>
    ),
    children: [
      { path: '/teacher/studio', element: withSuspense(<DuolingoStudio />) },
      { path: '/teacher/studio/:courseId', element: withSuspense(<DuolingoStudio />) },
      { path: '/teacher/daily-challenge', element: withSuspense(<DailyChallengePlanner />) },
    ],
  },
]);

export default router;
