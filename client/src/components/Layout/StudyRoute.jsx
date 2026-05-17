import { Outlet, useParams, useNavigate } from 'react-router-dom';
import ProtectedRoute from '../ProtectedRoute/ProtectedRoute';
import DashboardLayout from './DashboardLayout';
import StudyLayout from './StudyLayout';

/**
 * StudyRoute — wraps a study route with:
 * 1. ProtectedRoute (auth check)
 * 2. DashboardLayout (sidebar nav)
 * Use this for pages that should have the full dashboard (e.g. StudySetDetail).
 */
export function DashboardStudyRoute({ element }) {
  return (
    <ProtectedRoute>
      <DashboardLayout>
        {element}
      </DashboardLayout>
    </ProtectedRoute>
  );
}

/**
 * PureStudyRoute — wraps a study route with:
 * 1. ProtectedRoute (auth check)
 * 2. StudyLayout (minimal top bar, no sidebar)
 * Use this for immersive study sessions (Learn, Flashcards, Test, Match).
 */
export function PureStudyRoute({ element }) {
  return (
    <ProtectedRoute>
      <StudyLayout backTo="/dashboard">
        {element}
      </StudyLayout>
    </ProtectedRoute>
  );
}
