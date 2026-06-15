import { Component } from 'react';
import { Button, Container } from 'react-bootstrap';
import { FiAlertTriangle, FiRefreshCw } from 'react-icons/fi';

export default class ErrorBoundary extends Component {
  constructor(props) {
    super(props);
    this.state = { hasError: false, error: null };
  }

  static getDerivedStateFromError(error) {
    return { hasError: true, error };
  }

  componentDidCatch(error, info) {
    console.error('ErrorBoundary caught:', error, info);
  }

  handleReset = () => {
    this.setState({ hasError: false, error: null });
    window.location.href = '/';
  };

  render() {
    if (this.state.hasError) {
      return (
        <div
          style={{
            minHeight: '100vh',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            background: 'var(--bg-page)',
            padding: '24px',
          }}
        >
          <Container style={{ maxWidth: 480, textAlign: 'center' }}>
            <div
              style={{
                width: 64,
                height: 64,
                borderRadius: '50%',
                background: 'rgba(220, 38, 38, 0.1)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                margin: '0 auto 24px',
              }}
            >
              <FiAlertTriangle size={32} style={{ color: '#dc2626' }} />
            </div>
            <h1
              style={{
                fontSize: '1.5rem',
                fontWeight: 600,
                color: 'var(--text-heading)',
                marginBottom: 8,
              }}
            >
              Đã xảy ra lỗi
            </h1>
            <p style={{ color: 'var(--text-muted)', marginBottom: 24 }}>
              Chúng tôi đã gặp sự cố không mong muốn. Vui lòng tải lại trang.
            </p>
            <div style={{ display: 'flex', gap: 12, justifyContent: 'center' }}>
              <Button
                variant="primary"
                onClick={this.handleReset}
                style={{
                  background: 'var(--gl-tertiary)',
                  border: 'none',
                  borderRadius: 10,
                  padding: '12px 20px',
                  fontWeight: 600,
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: 8,
                }}
              >
                <FiRefreshCw size={16} />
                Quay lại Trang chủ
              </Button>
            </div>
          </Container>
        </div>
      );
    }

    return this.props.children;
  }
}
