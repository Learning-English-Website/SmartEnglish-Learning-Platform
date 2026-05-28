import { useNavigate } from 'react-router-dom';
import { Container, Row, Col } from 'react-bootstrap';
import { motion } from 'framer-motion';
import { Zap, Trophy, Heart, Sparkles, ArrowRight, Play, Languages, ShieldAlert } from 'lucide-react';
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
        </Container>
      </div>

      {/* Features Grid */}
      <Container className="memoris-features-container">
        <motion.div
          variants={containerVariants}
          initial="hidden"
          whileInView="visible"
          viewport={{ once: true, margin: '-100px' }}
        >
          <Row className="g-4 justify-content-center">
            <Col md={4}>
              <motion.div variants={itemVariants} className="premium-feature-card">
                <div className="icon-wrapper icon-orange">
                  <Zap size={24} fill="currentColor" />
                </div>
                <h3>Tốc độ &amp; Thú vị</h3>
                <p>Bài học siêu ngắn, sinh động giúp việc tiếp thu tiếng Anh nhẹ nhàng như chơi game giải trí.</p>
              </motion.div>
            </Col>

            <Col md={4}>
              <motion.div variants={itemVariants} className="premium-feature-card">
                <div className="icon-wrapper icon-purple">
                  <Trophy size={24} fill="currentColor" />
                </div>
                <h3>Thi đua &amp; Danh hiệu</h3>
                <p>Tích lũy XP, duy trì chuỗi Streak rực lửa và tranh tài trên bảng xếp hạng cùng bạn bè quốc tế.</p>
              </motion.div>
            </Col>

            <Col md={4}>
              <motion.div variants={itemVariants} className="premium-feature-card">
                <div className="icon-wrapper icon-red">
                  <Heart size={24} fill="currentColor" />
                </div>
                <h3>Cơ chế Giữ Tim</h3>
                <p>Rèn luyện thói quen học cẩn thận. Bạn sẽ mất Tim khi làm sai, và có thể ôn tập để nạp lại đầy Tim.</p>
              </motion.div>
            </Col>
          </Row>
        </motion.div>

        {/* CTA Card Section */}
        <Row className="cta-premium-row justify-content-center">
          <Col lg={11}>
            <motion.div
              initial={{ opacity: 0, y: 50 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ duration: 0.8 }}
              className="cta-glass-card"
            >
              <div className="cta-left">
                <h2>Khám phá 5 khóa học nền tảng</h2>
                <p>Học Tiếng Anh giao tiếp cơ bản, Tiếng Anh du lịch, Tiếng Anh công sở, hay Văn hóa thành ngữ đặc sắc.</p>
              </div>
              <div className="cta-right">
                <motion.button
                  whileHover={{ scale: 1.05 }}
                  whileTap={{ scale: 0.98 }}
                  className="btn-premium btn-cta-action"
                  onClick={() => navigate('/duolingo/courses')}
                >
                  <span>Khám phá Khóa học</span>
                  <ArrowRight size={18} />
                </motion.button>
              </div>
            </motion.div>
          </Col>
        </Row>
      </Container>
    </div>
  );
}
