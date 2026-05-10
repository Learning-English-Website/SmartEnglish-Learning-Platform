import './LoadingSpinner.css';

export default function LoadingSpinner({ size = 'md', fullScreen = false, text = '' }) {
  const spinner = (
    <div className={`spinner-wrapper ${fullScreen ? 'full-screen' : ''}`}>
      <div className={`memoris-spinner spinner-${size}`}>
        <div className="spinner-ring"></div>
        <span className="spinner-emoji">🧠</span>
      </div>
      {text && <p className="spinner-text">{text}</p>}
    </div>
  );

  return spinner;
}
