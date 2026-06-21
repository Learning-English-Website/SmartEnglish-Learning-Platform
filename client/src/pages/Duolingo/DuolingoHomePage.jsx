import { useNavigate } from 'react-router-dom';
import { Container, Row, Col } from 'react-bootstrap';
import { motion } from 'framer-motion';
import { Zap, Trophy, Heart, Sparkles, ArrowRight, Play, Languages } from 'lucide-react';
import DailyChallengeCard from '../../components/gamification/DailyChallenge/DailyChallengeCard';
import QuestsPanel from '../../components/gamification/Quests/QuestsPanel';
import './DuolingoHomePage.css';

export default function DuolingoHomePage() {
  const navigate = useNavigate();

  const containerVariants = {
    hidden: { opacity: 0 },
    visible: {
      opacity: 1,
      transition: { staggerChildren: 0.15 }
    }
  };

  const itemVariants = {
    hidden: { opacity: 0, y: 30 },
    visible: {
      opacity: 1,
      y: 0,
      transition: { type: 'spring', stiffness: 100, damping: 15 }
    }
  };

  return (
    <div className="memoris-home">
      {/* Background decorations */}
      <div className="bg-glow bg-glow-1"></div>
      <div className="bg-glow bg-glow-2"></div>
      <div className="bg-glow bg-glow-3"></div>

      {/* Hero Section */}
      <div className="memoris-hero-wrapper">
        <Container>
          <Row className="align-items-center justify-content-between g-5">
            <Col lg={7} className="text-start">
              <motion.div
                initial={{ opacity: 0, x: -50 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ duration: 0.8, type: 'spring' }}
                className="hero-left-content"
              >
                <div className="badge-promo">
                  <Sparkles size={14} className="badge-icon" />
                  <span>Cá nhân hóa bằng Trí tuệ Nhân tạo</span>
                </div>
                <h1 className="hero-title">
                  Học tiếng Anh <br />
                  <span className="text-gradient">Thông minh &amp; Hiệu quả</span> <br />
                  cùng <span className="brand-highlight">Memoris</span>
                </h1>
                <p className="hero-subtitle">
                  Trải nghiệm lộ trình học tập được thiết kế tối ưu, kết hợp giữa phương thức phản xạ vui vẻ và hệ thống quản lý tim bền bỉ.
                </p>
                <div className="hero-actions-row">
                  <motion.button
                    whileHover={{ scale: 1.05 }}
                    whileTap={{ scale: 0.98 }}
                    className="btn-premium btn-primary-glow"
                    onClick={() => navigate('/duolingo/courses')}
                  >
                    <Play size={18} fill="currentColor" />
                    <span>Bắt đầu ngay</span>
                  </motion.button>
                  <motion.button
                    whileHover={{ scale: 1.05, backgroundColor: 'rgba(255, 255, 255, 0.08)' }}
                    whileTap={{ scale: 0.98 }}
                    className="btn-premium btn-outline-glass"
                    onClick={() => navigate('/duolingo/learn')}
                  >
                    <span>Lộ trình của tôi</span>
                    <ArrowRight size={18} />
                  </motion.button>
                </div>
              </motion.div>
            </Col>

            <Col lg={5} className="d-none d-lg-block text-center">
              <motion.div
                initial={{ opacity: 0, scale: 0.8, rotate: -5 }}
                animate={{ opacity: 1, scale: 1, rotate: 0 }}
                transition={{ duration: 0.8, delay: 0.2, type: 'spring' }}
                className="hero-mascot-wrapper"
              >
                <div className="mascot-card">
                  <div className="floating-badge badge-xp">
                    <Zap size={16} fill="currentColor" />
                    <span>+20 XP</span>
                  </div>
                  <div className="floating-badge badge-heart">
                    <Heart size={16} fill="currentColor" />
                    <span>Luyện Tim</span>
                  </div>
                  <div className="mascot-avatar">
                    <Languages size={96} className="mascot-svg-icon" />
                  </div>
                  <div className="pulse-ring pulse-ring-1"></div>
                  <div className="pulse-ring pulse-ring-2"></div>
                </div>
              </motion.div>
            </Col>
          </Row>

          {/* Challenge + Chatbot + Quests (Top section) */}
          <Row className="memoris-home-widgets-row g-4">
            <Col lg={4}>
              <div className="memoris-home-widget-stretch" style={{ height: '100%', overflow: 'auto' }}>
                <DailyChallengeCard />
              </div>
            </Col>
            
            <Col lg={4}>
              <motion.div
                whileHover={{ y: -5, scale: 1.02 }}
                transition={{ type: 'spring', stiffness: 300, damping: 20 }}
                className="memoris-home-widget-stretch chatbot-promo-card"
                onClick={() => navigate('/ai-chatbot')}
                style={{
                  background: 'linear-gradient(135deg, rgba(6, 182, 212, 0.12) 0%, rgba(99, 91, 255, 0.12) 100%)',
                  backdropFilter: 'blur(20px)',
                  border: '1px solid var(--border-subtle)',
                  borderRadius: '24px',
                  padding: '2rem',
                  display: 'flex',
                  flexDirection: 'column',
                  justifyContent: 'space-between',
                  cursor: 'pointer',
                  boxShadow: 'var(--card-shadow)',
                  position: 'relative',
                  overflow: 'hidden',
                  minHeight: '320px'
                }}
              >
                <div className="card-shine" style={{
                  position: 'absolute',
                  top: '-50%',
                  left: '-50%',
                  width: '200%',
                  height: '200%',
                  background: 'radial-gradient(circle, rgba(255,255,255,0.08) 0%, transparent 60%)',
                  pointerEvents: 'none'
                }}></div>
                <div>
                  <div className="promo-badge" style={{
                    display: 'inline-flex',
                    alignItems: 'center',
                    gap: '0.25rem',
                    background: 'rgba(6, 182, 212, 0.15)',
                    color: '#06b6d4',
                    padding: '0.35rem 0.75rem',
                    borderRadius: '100px',
                    fontSize: '0.8rem',
                    fontWeight: 700,
                    marginBottom: '1.5rem'
                  }}>
                    <Sparkles size={12} />
                    <span>AI CHATBOT</span>
                  </div>
                  <h3 style={{ fontSize: '1.5rem', fontWeight: 800, marginBottom: '0.75rem', color: 'var(--text-heading)' }}>
                    Luyện Hội Thoại AI
                  </h3>
                  <p style={{ color: 'var(--text-muted)', fontSize: '0.92rem', lineHeight: 1.5 }}>
                    Trò chuyện trực tiếp cùng AI nhập vai người phục vụ, giáo sư đại học hoặc nhà tuyển dụng để nâng phản xạ giao tiếp tự nhiên.
                  </p>
                </div>
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginTop: '1.5rem' }}>
                  <span style={{ fontSize: '0.85rem', fontWeight: 600, color: 'var(--gl-tertiary)' }}>Bắt đầu trò chuyện</span>
                  <div style={{
                    width: '40px',
                    height: '40px',
                    borderRadius: '12px',
                    background: 'var(--gl-tertiary)',
                    color: '#fff',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    boxShadow: '0 4px 12px rgba(99, 91, 255, 0.3)'
                  }}>
                    <ArrowRight size={18} />
                  </div>
                </div>
              </motion.div>
            </Col>

            <Col lg={4}>
              <div className="memoris-home-widget-stretch memoris-home-quests-card">
                <div className="memoris-home-quests-scroll">
                  <QuestsPanel />
                </div>
              </div>
            </Col>
          </Row>
        </Container>
      </div>

      {/* Simplified, compact bottom layout */}
      <div style={{ height: '32px' }} />
    </div>
  );
}
