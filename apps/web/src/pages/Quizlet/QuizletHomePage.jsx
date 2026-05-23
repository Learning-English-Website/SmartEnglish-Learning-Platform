import { Container } from 'react-bootstrap';
import '../AppPlaceholder/AppPlaceholderPages.css';

export default function QuizletHomePage() {
  return (
    <div className="app-placeholder-page">
      <Container className="app-placeholder-inner">
        <div className="app-placeholder-chip">Week 2</div>
        <h1>Flashcards</h1>
        <p>Set CRUD, study modes, and spaced repetition arrive in the next milestone.</p>
      </Container>
    </div>
  );
}
