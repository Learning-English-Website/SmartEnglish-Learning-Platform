import { useEffect } from 'react';
import { useNavigate } from 'react-router-dom';

/**
 * /quizlet redirects to the main Flashcards page (MySets)
 */
export default function QuizletHomePage() {
  const navigate = useNavigate();
  useEffect(() => {
    navigate('/flashcards', { replace: true });
  }, [navigate]);
  return null;
}
