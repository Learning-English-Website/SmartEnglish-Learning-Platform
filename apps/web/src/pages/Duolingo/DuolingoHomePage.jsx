import { Container } from 'react-bootstrap';
import '../AppPlaceholder/AppPlaceholderPages.css';

export default function DuolingoHomePage() {
  return (
    <div className="app-placeholder-page">
      <Container className="app-placeholder-inner">
        <div className="app-placeholder-chip">Week 2</div>
        <h1>Daily practice</h1>
        <p>Gamified lessons, streaks, and leaderboards ship in the next milestone.</p>
      </Container>
    </div>
  );
}
