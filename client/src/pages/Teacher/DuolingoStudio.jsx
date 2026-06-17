import { useState, useEffect, useCallback, useRef } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import {
  Plus, Edit3, Trash2, Folder, FileText, Target, Play, Save, ChevronRight, ChevronDown, MoveUp, MoveDown, BookOpen, Volume2, HelpCircle, Check, AlertCircle, Copy
} from 'lucide-react';
import { teacherService } from '../../services/teacherService';
import toast from 'react-hot-toast';
import { motion, AnimatePresence } from 'framer-motion';
import ImageUploader from '../../components/media/ImageUploader';
import './DuolingoStudio.css';

const CHALLENGE_TYPES = [
  { id: 'SELECT', label: 'SELECT (Trắc nghiệm ảnh)', desc: 'Học sinh chọn hình ảnh tương ứng với từ vựng' },
  { id: 'ASSIST', label: 'ASSIST (Trắc nghiệm chữ)', desc: 'Học sinh chọn nghĩa chữ chính xác' },
  { id: 'TYPE', label: 'TYPE (Gõ câu trả lời)', desc: 'Gõ câu trả lời chính xác bằng văn bản' },
  { id: 'TRANSLATE', label: 'TRANSLATE (Dịch câu)', desc: 'Dịch câu Anh - Việt hoặc Việt - Anh' },
  { id: 'ORDER', label: 'ORDER (Sắp xếp câu)', desc: 'Ghép từ rời rạc thành câu hoàn chỉnh' },
  { id: 'MATCH', label: 'MATCH (Ghép cặp từ)', desc: 'Nối các cặp từ vựng tương ứng Anh - Việt' },
  { id: 'LISTEN', label: 'LISTEN (Nghe viết lại)', desc: 'Học nghe phát âm câu và gõ lại' },
  { id: 'COMPLETE', label: 'COMPLETE (Hoàn thành câu)', desc: 'Điền từ vựng thích hợp vào chỗ trống' },
  { id: 'FILL', label: 'FILL (Trắc nghiệm điền khuyết)', desc: 'Chọn đáp án trắc nghiệm điền vào chỗ trống' }
];

const convertToSlug = (text) => {
  if (!text) return '';
  return text
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "") // Remove accents
    .replace(/đ/g, "d")
    .replace(/Đ/g, "d")
    .replace(/[^a-z0-9\s-]/g, "") // Remove special chars
    .trim()
    .replace(/\s+/g, "-") // Replace spaces with dashes
    .replace(/-+/g, "-"); // Remove duplicate dashes
};

export default function DuolingoStudio() {
  const { courseId } = useParams();
  const navigate = useNavigate();
  
  // State quản trị
  const [courses, setCourses] = useState([]);
  const [activeCourse, setActiveCourse] = useState(null);
  const [treeData, setTreeData] = useState([]); // Chứa cấu trúc Units -> Lessons -> Challenges
  const [loading, setLoading] = useState(false);
  const [loadingTree, setLoadingTree] = useState(false);
  
  // Trạng thái Node đang được chọn trong cây soạn thảo
  // type: 'course' | 'unit' | 'lesson' | 'challenge' | 'new-unit' | 'new-lesson' | 'new-challenge'
  const [selectedNode, setSelectedNode] = useState(null);
  
  // Collapse state cho cây thư mục (lưu các ID đang mở)
  const [expandedNodes, setExpandedNodes] = useState({});

  // State các Form nhập liệu
  const [courseForm, setCourseForm] = useState({ title: '', slug: '', description: '', level: 'beginner', order: 0, isPublished: false });
  const [unitForm, setUnitForm] = useState({ title: '', summary: '', description: '', order: 0, xpReward: 10, isLockedDefault: true });
  const [lessonForm, setLessonForm] = useState({ title: '', subtitle: '', order: 0, xpReward: 5, estimatedMinutes: 5, grammarFocus: '', vocabFocus: '', type: 'challenge' });
  const [lessonTitleError, setLessonTitleError] = useState('');
  
  const [challengeForm, setChallengeForm] = useState({
    type: 'SELECT', question: '', correctAnswer: '',
    sourceLang: 'vi', targetLang: 'en', imageSrc: '', audioSrc: '',
    wordBank: '', correctOrder: '', pairs: '', sentence: '', blankIndex: '', hint: '',
    options: [{ text: '', correct: false, imageSrc: '' }, { text: '', correct: false, imageSrc: '' }, { text: '', correct: false, imageSrc: '' }, { text: '', correct: false, imageSrc: '' }],
    order: 0
  });

  const [saving, setSaving] = useState(false);
  
  // State tương tác thử cho mục Live Preview
  const [previewAnswers, setPreviewAnswers] = useState([]); // cho câu hỏi ORDER
  const [previewMatched, setPreviewMatched] = useState({}); // cho MATCH
  const [previewSelectedOpt, setPreviewSelectedOpt] = useState(null); // cho SELECT/ASSIST
  const [previewTextAnswer, setPreviewTextAnswer] = useState(''); // cho TRANSLATE/TYPE
  const [selectedMatchLeft, setSelectedMatchLeft] = useState(null); // MATCH: left selected index
  const [selectedMatchRight, setSelectedMatchRight] = useState(null); // MATCH: right selected index
  const [matchLeftPool, setMatchLeftPool] = useState([]); // MATCH: shuffled left column
  const [matchRightPool, setMatchRightPool] = useState([]); // MATCH: shuffled right column

  // Đồng bộ và xáo trộn các cột ghép cặp MATCH khi dữ liệu form thay đổi
  useEffect(() => {
    if (challengeForm.type === 'MATCH') {
      const pairsArr = (challengeForm.pairs || '').split('\n')
        .map(line => line.split('|').map(s => s.trim()))
        .filter(p => p.length >= 2)
        .map((p, i) => ({ left: p[0], right: p[1], index: i }));
      
      const poolSizeMismatch = matchLeftPool.length !== pairsArr.length;
      const poolIndexMismatch = pairsArr.some(p => !matchLeftPool.some(l => l.index === p.index));
      
      if (poolSizeMismatch || poolIndexMismatch) {
        const lefts = pairsArr.map(p => ({ text: p.left, index: p.index }));
        const rights = pairsArr.map(p => ({ text: p.right, index: p.index }));
        setMatchLeftPool([...lefts].sort(() => Math.random() - 0.5));
        setMatchRightPool([...rights].sort(() => Math.random() - 0.5));
        setPreviewMatched({});
        setSelectedMatchLeft(null);
        setSelectedMatchRight(null);
      }
    } else {
      if (matchLeftPool.length > 0 || matchRightPool.length > 0) {
        setMatchLeftPool([]);
        setMatchRightPool([]);
        setSelectedMatchLeft(null);
        setSelectedMatchRight(null);
      }
    }
  }, [challengeForm.pairs, challengeForm.type]);

  // Tải danh sách khóa học ban đầu
  useEffect(() => {
    const fetchCourses = async () => {
      setLoading(true);
      try {
        const res = await teacherService.getCourses();
        setCourses(res.data.courses || res.data || []);
      } catch {
        toast.error('Không thể tải danh sách khóa học');
      } finally {
        setLoading(false);
      }
    };
    fetchCourses();
  }, []);

  // Tải cấu trúc cây khi chọn Khóa học
  const loadCourseTree = useCallback(async (cId) => {
    setLoadingTree(true);
    try {
      const res = await teacherService.getCourseTree(cId);
      setActiveCourse(res.data.course);
      setTreeData(res.data.tree || []);
      
      // Mặc định mở rộng tất cả các Unit ban đầu
      const initialExpanded = {};
      (res.data.tree || []).forEach(unit => {
        initialExpanded[`unit-${unit._id}`] = true;
      });
      setExpandedNodes(initialExpanded);
    } catch {
      toast.error('Không thể tải giáo trình khóa học');
    } finally {
      setLoadingTree(false);
    }
  }, []);

  useEffect(() => {
    if (courseId) {
      loadCourseTree(courseId);
      setSelectedNode({ type: 'course', id: courseId });
    } else {
      setActiveCourse(null);
      setTreeData([]);
      setSelectedNode(null);
    }
  }, [courseId, loadCourseTree]);

  // Load thông tin chi tiết của Node khi được click
  useEffect(() => {
    if (!selectedNode) return;
    const fetchNodeDetails = async () => {
      try {
        if (selectedNode.type === 'course') {
          const res = await teacherService.getCourse(selectedNode.id);
          const c = res.data;
          setCourseForm({
            title: c.title || '', slug: c.slug || '', description: c.description || '',
            level: c.level || 'beginner', order: c.order || 0,
            isPublished: c.isPublished || c.isActive || false
          });
        } else if (selectedNode.type === 'unit') {
          const res = await teacherService.getUnit(selectedNode.id);
          const u = res.data;
          setUnitForm({
            title: u.title || '', summary: u.summary || '', description: u.description || '',
            order: u.order || 0, xpReward: u.xpReward || 10, isLockedDefault: u.isLockedDefault !== false
          });
        } else if (selectedNode.type === 'lesson') {
          const res = await teacherService.getLesson(selectedNode.id);
          const l = res.data;
          setLessonForm({
            title: l.title || '', subtitle: l.subtitle || '', order: l.order || 0,
            xpReward: l.xpReward || 5, estimatedMinutes: l.estimatedMinutes || 5,
            grammarFocus: (l.grammarFocus || []).join(', '), vocabFocus: (l.vocabFocus || []).join(', '),
            type: l.type || 'challenge'
          });
        } else if (selectedNode.type === 'challenge') {
          const res = await teacherService.getChallenge(selectedNode.id);
          const ch = res.data;
          setChallengeForm({
            type: ch.type || 'SELECT', question: ch.question || '', correctAnswer: ch.correctAnswer || '',
            sourceLang: ch.sourceLang || 'vi', targetLang: ch.targetLang || 'en',
            imageSrc: ch.imageSrc || '', audioSrc: ch.audioSrc || '',
            wordBank: (ch.wordBank || []).join(', '),
            correctOrder: (ch.correctOrder || []).join(', '),
            pairs: (ch.pairs || []).map(p => `${p.left}|${p.right}`).join('\n'),
            sentence: ch.sentence || '', blankIndex: ch.blankIndex?.toString() || '', hint: ch.hint || '',
            options: (ch.options && ch.options.length > 0)
              ? ch.options.map(o => ({ text: o.text || '', correct: o.correct || false, imageSrc: o.imageSrc || '' }))
              : [{ text: '', correct: false, imageSrc: '' }, { text: '', correct: false, imageSrc: '' }, { text: '', correct: false, imageSrc: '' }, { text: '', correct: false, imageSrc: '' }],
            order: ch.order || 0
          });
          // Reset preview states
          setPreviewAnswers([]);
          setPreviewMatched({});
          setPreviewSelectedOpt(null);
          setPreviewTextAnswer('');
        }
      } catch {
        toast.error('Không thể nạp dữ liệu chi tiết mục chọn');
      }
    };
    fetchNodeDetails();
  }, [selectedNode]);

  // Phím tắt Ctrl+Enter để Lưu nhanh câu hỏi
  useEffect(() => {
    const handleKeyDown = (e) => {
      if ((e.ctrlKey || e.metaKey) && e.key === 'Enter') {
        e.preventDefault();
        saveCurrentNode();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [selectedNode, courseForm, unitForm, lessonForm, challengeForm]);

  // Điều khiển đóng mở các Node
  const toggleExpand = (key) => {
    setExpandedNodes(prev => ({ ...prev, [key]: !prev[key] }));
  };

  // Text-To-Speech giọng nói câu tiếng Anh (Web Speech API)
  const speakText = (text) => {
    if (!text || !window.speechSynthesis) return;
    window.speechSynthesis.cancel();
    const utterance = new SpeechSynthesisUtterance(text);
    utterance.lang = 'en-US';
    window.speechSynthesis.speak(utterance);
  };

  // HUD Validator: Kiểm tra chất lượng và cảnh báo lỗi soạn bài
  const getChallengeValidationErrors = () => {
    if (selectedNode?.type !== 'challenge' && selectedNode?.type !== 'new-challenge') return [];
    const errors = [];
    const form = challengeForm;
    if (!form.question.trim()) errors.push('Thiếu nội dung câu hỏi chính.');
    
    if (['SELECT', 'ASSIST', 'FILL'].includes(form.type)) {
      const correctCount = form.options.filter(o => o.correct && o.text.trim()).length;
      const totalCount = form.options.filter(o => o.text.trim()).length;
      if (correctCount === 0) errors.push('Phải chọn ít nhất 1 đáp án làm đáp án ĐÚNG.');
      if (correctCount > 1) errors.push('Chỉ cho phép chọn DUY NHẤT 1 đáp án đúng.');
      if (totalCount < 2) errors.push('Cần điền tối thiểu 2 phương án trả lời.');
    }
    
    if (['TYPE', 'TRANSLATE', 'COMPLETE', 'LISTEN'].includes(form.type)) {
      if (!form.correctAnswer.trim()) errors.push('Chưa nhập đáp án chính xác (correctAnswer).');
    }

    if (form.type === 'MATCH') {
      const pairLines = form.pairs.split('\n').filter(l => l.trim().includes('|'));
      if (pairLines.length < 2) errors.push('Câu hỏi ghép từ cần tối thiểu 2 cặp từ ghép nối.');
    }

    if (form.type === 'ORDER') {
      const bank = form.wordBank.split(',').map(s => s.trim()).filter(Boolean);
      const order = form.correctOrder.split(',').map(s => s.trim()).filter(Boolean);
      if (bank.length === 0) errors.push('Word Bank không được để trống.');
      if (order.length !== bank.length) errors.push('Số phần tử của Correct Order phải trùng khớp với số từ trong Word Bank.');
    }

    return errors;
  };

  // Lưu node đang chỉnh sửa hoặc lưu node tạo mới
  const saveCurrentNode = async () => {
    if (!selectedNode) return;

    if (['lesson', 'new-lesson'].includes(selectedNode.type) && !lessonForm.title.trim()) {
      const message = 'Vui lòng nhập tiêu đề bài học';
      setLessonTitleError(message);
      toast.error(message);
      return;
    }
    setLessonTitleError('');

    setSaving(true);
    try {
      if (selectedNode.type === 'course') {
        await teacherService.updateCourse(selectedNode.id, courseForm);
        toast.success('Đã cập nhật khóa học');
        const updated = courses.map(c => c._id === selectedNode.id ? { ...c, title: courseForm.title } : c);
        setCourses(updated);
        loadCourseTree(selectedNode.id);
      } 
      else if (selectedNode.type === 'new-course') {
        const res = await teacherService.createCourse(courseForm);
        toast.success('Đã tạo khóa học mới');
        const newCourse = res.data;
        setCourses(prev => [...prev, newCourse]);
        navigate(`/teacher/studio/${newCourse._id}`);
      }
      else if (selectedNode.type === 'unit') {
        await teacherService.updateUnit(selectedNode.id, unitForm);
        toast.success('Đã cập nhật Unit');
        loadCourseTree(courseId);
      } 
      else if (selectedNode.type === 'new-unit') {
        await teacherService.createUnit({ ...unitForm, course: courseId });
        toast.success('Đã tạo Unit mới');
        setSelectedNode({ type: 'course', id: courseId });
        loadCourseTree(courseId);
      }
      else if (selectedNode.type === 'lesson') {
        const payload = {
          ...lessonForm,
          grammarFocus: (lessonForm.grammarFocus || '').split(',').map(s => s.trim()).filter(Boolean),
          vocabFocus: (lessonForm.vocabFocus || '').split(',').map(s => s.trim()).filter(Boolean)
        };
        await teacherService.updateLesson(selectedNode.id, payload);
        toast.success('Đã cập nhật Lesson');
        loadCourseTree(courseId);
      } 
      else if (selectedNode.type === 'new-lesson') {
        const payload = {
          ...lessonForm,
          unit: selectedNode.unitId,
          grammarFocus: (lessonForm.grammarFocus || '').split(',').map(s => s.trim()).filter(Boolean),
          vocabFocus: (lessonForm.vocabFocus || '').split(',').map(s => s.trim()).filter(Boolean)
        };
        await teacherService.createLesson(payload);
        toast.success('Đã tạo Lesson mới');
        setSelectedNode({ type: 'unit', id: selectedNode.unitId });
        loadCourseTree(courseId);
      }
      else if (selectedNode.type === 'challenge') {
        const errors = getChallengeValidationErrors();
        if (errors.length > 0) {
          toast.error(`Không thể lưu câu hỏi: ${errors[0]}`);
          setSaving(false);
          return;
        }

        const payload = parseChallengeForm();
        await teacherService.updateChallenge(selectedNode.id, payload);
        toast.success('Đã cập nhật câu hỏi');
        loadCourseTree(courseId);
      } 
      else if (selectedNode.type === 'new-challenge') {
        const errors = getChallengeValidationErrors();
        if (errors.length > 0) {
          toast.error(`Không thể lưu câu hỏi: ${errors[0]}`);
          setSaving(false);
          return;
        }

        const payload = { ...parseChallengeForm(), lesson: selectedNode.lessonId };
        await teacherService.createChallenge(payload);
        toast.success('Đã tạo câu hỏi mới');
        
        // Soạn bài tốc độ cao: Tự động mở form trống mới cho câu tiếp theo
        setChallengeForm(prev => ({
          ...prev,
          question: '', correctAnswer: '', wordBank: '', correctOrder: '', pairs: '', sentence: '', hint: '',
          imageSrc: '', audioSrc: '',
          options: [{ text: '', correct: false }, { text: '', correct: false }, { text: '', correct: false }, { text: '', correct: false }],
          order: prev.order + 1
        }));
        loadCourseTree(courseId);
      }
    } catch (err) {
      toast.error(err.response?.data?.error?.message || 'Không thể lưu thay đổi');
    } finally {
      setSaving(false);
    }
  };

  const parseChallengeForm = () => {
    const payload = {
      type: challengeForm.type,
      question: challengeForm.question,
      order: parseInt(challengeForm.order) || 0,
      sourceLang: challengeForm.sourceLang,
      targetLang: challengeForm.targetLang,
      imageSrc: challengeForm.imageSrc || null,
      audioSrc: challengeForm.audioSrc || null
    };

    if (['TYPE', 'TRANSLATE', 'COMPLETE', 'LISTEN'].includes(challengeForm.type)) {
      payload.correctAnswer = challengeForm.correctAnswer;
    }
    if (challengeForm.type === 'ORDER') {
      const bank = challengeForm.wordBank.split(',').map(s => s.trim()).filter(Boolean);
      const order = challengeForm.correctOrder.split(',').map(s => parseInt(s.trim())).filter(n => !isNaN(n));
      payload.wordBank = bank;
      payload.correctOrder = order;
      payload.correctAnswer = order.map(idx => bank[idx]).join(' ');
    }
    if (challengeForm.type === 'MATCH') {
      payload.pairs = challengeForm.pairs.split('\n').map(line => {
        const parts = line.split('|');
        return parts.length >= 2 ? { left: parts[0].trim(), right: parts[1].trim() } : null;
      }).filter(Boolean);
    }
    if (['COMPLETE', 'FILL'].includes(challengeForm.type)) {
      payload.sentence = challengeForm.sentence;
      payload.blankIndex = challengeForm.blankIndex !== '' ? parseInt(challengeForm.blankIndex) : null;
    }
    if (challengeForm.type === 'LISTEN') {
      payload.hint = challengeForm.hint;
    }
    if (['SELECT', 'ASSIST', 'FILL'].includes(challengeForm.type)) {
      payload.options = challengeForm.options.filter(o => o.text.trim()).map(o => ({ 
        text: o.text, 
        correct: o.correct,
        imageSrc: o.imageSrc || null
      }));
      if (challengeForm.type === 'FILL') {
        const correctOpt = challengeForm.options.find(o => o.correct);
        payload.correctAnswer = correctOpt ? correctOpt.text : '';
      }
    }
    return payload;
  };

  // Các hàm xóa
  const deleteItem = async (type, id) => {
    if (!window.confirm('Bạn có chắc muốn xóa mục này? Toàn bộ các phần học bên trong sẽ bị xóa theo.')) return;
    try {
      if (type === 'unit') {
        await teacherService.deleteUnit(id);
        toast.success('Đã xóa Unit');
      } else if (type === 'lesson') {
        await teacherService.deleteLesson(id);
        toast.success('Đã xóa Lesson');
      } else if (type === 'challenge') {
        await teacherService.deleteChallenge(id);
        toast.success('Đã xóa câu hỏi');
      }
      setSelectedNode(null);
      loadCourseTree(courseId);
    } catch {
      toast.error('Không thể xóa mục chọn');
    }
  };

  // Kéo thả sắp xếp thứ tự các node lên/xuống nhanh
  const moveNode = async (type, index, direction, parentNode = null) => {
    let list = [];
    if (type === 'unit') {
      list = [...treeData];
    } else if (type === 'lesson') {
      list = [...parentNode.lessons];
    } else if (type === 'challenge') {
      list = [...parentNode.challenges];
    }

    const targetIdx = direction === 'up' ? index - 1 : index + 1;
    if (targetIdx < 0 || targetIdx >= list.length) return;

    // Tráo đổi vị trí
    const temp = list[index];
    list[index] = list[targetIdx];
    list[targetIdx] = temp;

    const ids = list.map(item => item._id);

    try {
      if (type === 'unit') {
        await teacherService.reorderUnits(courseId, ids);
      } else if (type === 'lesson') {
        await teacherService.reorderLessons(parentNode._id, ids);
      } else if (type === 'challenge') {
        await teacherService.reorderChallenges(parentNode._id, ids);
      }
      toast.success('Đã sắp xếp lại vị trí');
      loadCourseTree(courseId);
    } catch {
      toast.error('Lỗi khi sắp xếp lại vị trí');
    }
  };

  return (
    <div className="studio-container">
      {/* Sidebar: Lựa chọn khóa học & Cây cấu trúc */}
      <div className="studio-sidebar">
        <div className="studio-sidebar-header">
          <label>Khóa học hiện tại</label>
          <select
            value={courseId || ''}
            onChange={(e) => {
              if (e.target.value) navigate(`/teacher/studio/${e.target.value}`);
              else navigate('/teacher/studio');
            }}
          >
            <option value="">— Chọn Khóa Học —</option>
            {courses.map(c => (
              <option key={c._id} value={c._id}>{c.title}</option>
            ))}
          </select>
          <button 
            className="create-course-btn"
            onClick={() => {
              navigate('/teacher/studio');
              setSelectedNode({ type: 'new-course' });
              setCourseForm({ title: '', slug: '', description: '', level: 'beginner', order: courses.length + 1, isPublished: false });
            }}
          >
            <Plus size={14} />
            Tạo khóa học mới
          </button>
        </div>

        {loadingTree ? (
          <div className="studio-tree-loading">
            <span className="spinner-loader" />
            <p>Đang nạp cấu trúc giáo trình...</p>
          </div>
        ) : (
          <div className="studio-tree-container">
            {activeCourse && (
              <div className="tree-node course-node">
                <div 
                  className={`tree-row ${selectedNode?.type === 'course' ? 'active' : ''}`}
                  onClick={() => setSelectedNode({ type: 'course', id: activeCourse._id })}
                >
                  <BookOpen size={16} color="#1cb0f6" />
                  <span className="node-title font-bold text-slate-800">{activeCourse.title}</span>
                  <button 
                    className="add-sub-btn" 
                    title="Thêm Unit mới"
                    onClick={(e) => {
                      e.stopPropagation();
                      setSelectedNode({ type: 'new-unit' });
                      setUnitForm({ title: '', summary: '', description: '', order: treeData.length, xpReward: 10, isLockedDefault: true });
                    }}
                  >
                    <Plus size={14} />
                  </button>
                </div>

                {/* Danh sách các Unit */}
                <div className="tree-children">
                  {treeData.map((unit, uIdx) => {
                    const unitKey = `unit-${unit._id}`;
                    const isExpanded = expandedNodes[unitKey];
                    return (
                      <div key={unit._id} className="tree-node unit-node">
                        <div 
                          className={`tree-row ${selectedNode?.type === 'unit' && selectedNode.id === unit._id ? 'active' : ''}`}
                          onClick={() => setSelectedNode({ type: 'unit', id: unit._id })}
                        >
                          <button 
                            className="toggle-expand-btn"
                            onClick={(e) => { e.stopPropagation(); toggleExpand(unitKey); }}
                          >
                            {isExpanded ? <ChevronDown size={14} /> : <ChevronRight size={14} />}
                          </button>
                          <Folder size={15} color="#1cb0f6" />
                          <span className="node-title text-slate-700">Chương {uIdx + 1}: {unit.title}</span>
                          
                          <div className="node-actions">
                            <button title="Dịch chuyển lên" onClick={(e) => { e.stopPropagation(); moveNode('unit', uIdx, 'up'); }}><MoveUp size={12} /></button>
                            <button title="Dịch chuyển xuống" onClick={(e) => { e.stopPropagation(); moveNode('unit', uIdx, 'down'); }}><MoveDown size={12} /></button>
                            <button 
                              title="Thêm Bài học mới"
                              onClick={(e) => {
                                e.stopPropagation();
                                setSelectedNode({ type: 'new-lesson', unitId: unit._id });
                                setLessonForm({ title: '', subtitle: '', order: (unit.lessons || []).length, xpReward: 5, estimatedMinutes: 5, grammarFocus: '', vocabFocus: '', type: 'challenge' });
                              }}
                            >
                              <Plus size={12} />
                            </button>
                            <button title="Xóa Unit" className="delete-btn" onClick={(e) => { e.stopPropagation(); deleteItem('unit', unit._id); }}><Trash2 size={12} /></button>
                          </div>
                        </div>

                        {/* Danh sách các Lesson */}
                        {isExpanded && (
                          <div className="tree-children">
                            {(unit.lessons || []).map((lesson, lIdx) => {
                              const lessonKey = `lesson-${lesson._id}`;
                              const isLessonExpanded = expandedNodes[lessonKey];
                              return (
                                <div key={lesson._id} className="tree-node lesson-node">
                                  <div 
                                    className={`tree-row ${selectedNode?.type === 'lesson' && selectedNode.id === lesson._id ? 'active' : ''}`}
                                    onClick={() => setSelectedNode({ type: 'lesson', id: lesson._id })}
                                  >
                                    <button 
                                      className="toggle-expand-btn"
                                      onClick={(e) => { e.stopPropagation(); toggleExpand(lessonKey); }}
                                    >
                                      {isLessonExpanded ? <ChevronDown size={14} /> : <ChevronRight size={14} />}
                                    </button>
                                    <FileText size={14} color="#f59e0b" />
                                    <span className="node-title text-slate-700">{lesson.title}</span>
                                    
                                    <div className="node-actions">
                                      <button title="Dịch chuyển lên" onClick={(e) => { e.stopPropagation(); moveNode('lesson', lIdx, 'up', unit); }}><MoveUp size={12} /></button>
                                      <button title="Dịch chuyển xuống" onClick={(e) => { e.stopPropagation(); moveNode('lesson', lIdx, 'down', unit); }}><MoveDown size={12} /></button>
                                      <button 
                                        title="Thêm câu hỏi mới"
                                        onClick={(e) => {
                                          e.stopPropagation();
                                          setSelectedNode({ type: 'new-challenge', lessonId: lesson._id });
                                          setChallengeForm({
                                            type: 'SELECT', question: '', correctAnswer: '',
                                            sourceLang: 'vi', targetLang: 'en', imageSrc: '', audioSrc: '',
                                            wordBank: '', correctOrder: '', pairs: '', sentence: '', blankIndex: '', hint: '',
                                            options: [{ text: '', correct: false, imageSrc: '' }, { text: '', correct: false, imageSrc: '' }, { text: '', correct: false, imageSrc: '' }, { text: '', correct: false, imageSrc: '' }],
                                            order: (lesson.challenges || []).length
                                          });
                                        }}
                                      >
                                        <Plus size={12} />
                                      </button>
                                      <button title="Xóa Lesson" className="delete-btn" onClick={(e) => { e.stopPropagation(); deleteItem('lesson', lesson._id); }}><Trash2 size={12} /></button>
                                    </div>
                                  </div>

                                  {/* Danh sách các Câu hỏi (Challenges) */}
                                  {isLessonExpanded && (
                                    <div className="tree-children">
                                      {(lesson.challenges || []).map((ch, cIdx) => (
                                        <div 
                                          key={ch._id}
                                          className={`tree-row challenge-node ${selectedNode?.type === 'challenge' && selectedNode.id === ch._id ? 'active' : ''}`}
                                          onClick={() => setSelectedNode({ type: 'challenge', id: ch._id })}
                                        >
                                          <Target size={13} color="#ec4899" />
                                          <span className="node-title text-slate-600 font-mono text-xs">
                                            [{ch.type}] {ch.question.substring(0, 30)}{ch.question.length > 30 ? '...' : ''}
                                          </span>
                                          
                                          <div className="node-actions">
                                            <button title="Dịch chuyển lên" onClick={(e) => { e.stopPropagation(); moveNode('challenge', cIdx, 'up', lesson); }}><MoveUp size={11} /></button>
                                            <button title="Dịch chuyển xuống" onClick={(e) => { e.stopPropagation(); moveNode('challenge', cIdx, 'down', lesson); }}><MoveDown size={11} /></button>
                                            <button title="Xóa câu hỏi" className="delete-btn" onClick={(e) => { e.stopPropagation(); deleteItem('challenge', ch._id); }}><Trash2 size={11} /></button>
                                          </div>
                                        </div>
                                      ))}
                                    </div>
                                  )}
                                </div>
                              );
                            })}
                          </div>
                        )}
                      </div>
                    );
                  })}
                </div>
              </div>
            )}
            {!courseId && (
              <div className="tree-guide">
                <BookOpen size={48} className="mx-auto mb-4 opacity-25" color="#1cb0f6" />
                <p className="text-slate-500">Vui lòng chọn khóa học phía trên để nạp cây giáo trình biên soạn.</p>
              </div>
            )}
          </div>
        )}
      </div>

      {/* Main Workspace: Hiển thị form động tương ứng */}
      <div className="studio-workspace">
        {selectedNode ? (
          <div className="workspace-card">
            {/* Header của Workspace */}
            <div className="workspace-header">
              <div className="header-info">
                <span className="badge-role">
                  {selectedNode.type.startsWith('new-') ? 'TẠO MỚI' : 'CHỈNH SỬA'}
                </span>
                <h2>
                  {(selectedNode.type === 'course' || selectedNode.type === 'new-course') && (selectedNode.type === 'course' ? 'Thiết lập Khóa Học' : 'Tạo Khóa Học Mới')}
                  {selectedNode.type === 'unit' && 'Thiết lập Chương Học (Unit)'}
                  {selectedNode.type === 'new-unit' && 'Tạo Unit Mới'}
                  {selectedNode.type === 'lesson' && 'Thiết lập Bài Học (Lesson)'}
                  {selectedNode.type === 'new-lesson' && 'Tạo Lesson Mới'}
                  {selectedNode.type === 'challenge' && 'Thiết lập Câu hỏi'}
                  {selectedNode.type === 'new-challenge' && 'Tạo Câu hỏi Mới'}
                </h2>
              </div>
              <button className="save-btn" onClick={saveCurrentNode} disabled={saving}>
                <Save size={16} />
                {saving ? 'Đang lưu...' : 'Lưu lại (Ctrl+Enter)'}
              </button>
            </div>

            {/* Body của Workspace */}
            <div className={`workspace-body ${['challenge', 'new-challenge'].includes(selectedNode?.type) ? 'split-layout' : ''}`}>
              {/* Form Khóa Học */}
              {(selectedNode.type === 'course' || selectedNode.type === 'new-course') && (
                <div className="studio-form">
                  <div className="form-grid">
                    <div className="form-group">
                      <label>Tên khóa học *</label>
                      <input 
                        type="text" 
                        value={courseForm.title} 
                        onChange={(e) => {
                          const val = e.target.value;
                          setCourseForm(f => ({ ...f, title: val, slug: convertToSlug(val) }));
                        }}
                        placeholder="ví dụ: Tiếng Anh giao tiếp cơ bản"
                      />
                    </div>
                    <div className="form-group">
                      <label>Đường dẫn Slug (Tự động hoặc tự nhập)</label>
                      <input 
                        type="text" 
                        value={courseForm.slug} 
                        onChange={(e) => setCourseForm(f => ({ ...f, slug: e.target.value }))}
                      />
                    </div>
                  </div>
                  <div className="form-group">
                    <label>Mô tả chi tiết khóa học</label>
                    <textarea 
                      rows={4} 
                      value={courseForm.description} 
                      onChange={(e) => setCourseForm(f => ({ ...f, description: e.target.value }))}
                      placeholder="Mô tả tóm tắt nội dung khóa học học viên sẽ được tiếp thu..."
                    />
                  </div>
                  <div className="form-grid">
                    <div className="form-group">
                      <label>Cấp độ học tập</label>
                      <select value={courseForm.level} onChange={(e) => setCourseForm(f => ({ ...f, level: e.target.value }))}>
                        <option value="beginner">Beginner (Cơ bản)</option>
                        <option value="intermediate">Intermediate (Trung cấp)</option>
                        <option value="advanced">Advanced (Nâng cao)</option>
                      </select>
                    </div>
                    <div className="form-group">
                      <label>Thứ tự sắp xếp hiển thị</label>
                      <input 
                        type="number" 
                        value={courseForm.order} 
                        onChange={(e) => setCourseForm(f => ({ ...f, order: parseInt(e.target.value) || 0 }))}
                      />
                    </div>
                  </div>


                  <div className="form-group-checkbox">
                    <input 
                      type="checkbox" 
                      id="course-ispublished"
                      checked={courseForm.isPublished} 
                      onChange={(e) => setCourseForm(f => ({ ...f, isPublished: e.target.checked }))}
                    />
                    <label htmlFor="course-ispublished">Xuất bản khóa học ngay (Học viên bắt đầu nhìn thấy trên trang chủ)</label>
                  </div>
                </div>
              )}

              {/* Form Unit */}
              {(selectedNode.type === 'unit' || selectedNode.type === 'new-unit') && (
                <div className="studio-form">
                  <div className="form-group">
                    <label>Tiêu đề chương (Unit Title) *</label>
                    <input 
                      type="text" 
                      value={unitForm.title} 
                      onChange={(e) => setUnitForm(f => ({ ...f, title: e.target.value }))}
                      placeholder="ví dụ: Chào hỏi và làm quen xã giao"
                    />
                  </div>
                  <div className="form-group">
                    <label>Tóm tắt ngắn gọn chủ đề</label>
                    <input 
                      type="text" 
                      value={unitForm.summary} 
                      onChange={(e) => setUnitForm(f => ({ ...f, summary: e.target.value }))}
                      placeholder="ví dụ: Học cách nói xin chào, cảm ơn, và giới thiệu tên cơ bản."
                    />
                  </div>
                  <div className="form-group">
                    <label>Mô tả chi tiết</label>
                    <textarea 
                      rows={3} 
                      value={unitForm.description} 
                      onChange={(e) => setUnitForm(f => ({ ...f, description: e.target.value }))}
                    />
                  </div>
                  <div className="form-grid">
                    <div className="form-group">
                      <label>XP thưởng hoàn thành chương</label>
                      <input 
                        type="number" 
                        value={unitForm.xpReward} 
                        onChange={(e) => setUnitForm(f => ({ ...f, xpReward: parseInt(e.target.value) || 0 }))}
                      />
                    </div>
                    <div className="form-group">
                      <label>Số thứ tự sắp xếp</label>
                      <input 
                        type="number" 
                        value={unitForm.order} 
                        onChange={(e) => setUnitForm(f => ({ ...f, order: parseInt(e.target.value) || 0 }))}
                      />
                    </div>
                  </div>
                  <div className="form-group-checkbox">
                    <input 
                      type="checkbox" 
                      id="unit-islocked"
                      checked={unitForm.isLockedDefault} 
                      onChange={(e) => setUnitForm(f => ({ ...f, isLockedDefault: e.target.checked }))}
                    />
                    <label htmlFor="unit-islocked">Mặc định khóa (Học viên cần hoàn thành Unit trước đó để mở khóa)</label>
                  </div>
                </div>
              )}

              {/* Form Lesson */}
              {(selectedNode.type === 'lesson' || selectedNode.type === 'new-lesson') && (
                <div className="studio-form">
                  <div className="form-group">
                    <label>Tiêu đề bài học (Lesson Title) *</label>
                    <input 
                      type="text" 
                      value={lessonForm.title} 
                      className={lessonTitleError ? 'input-error' : ''}
                      aria-invalid={Boolean(lessonTitleError)}
                      aria-describedby={lessonTitleError ? 'lesson-title-error' : undefined}
                      onChange={(e) => {
                        setLessonForm(f => ({ ...f, title: e.target.value }));
                        if (lessonTitleError) setLessonTitleError('');
                      }}
                      placeholder="ví dụ: Luyện cấu trúc My name is..."
                    />
                    {lessonTitleError && (
                      <p id="lesson-title-error" className="form-error-text">{lessonTitleError}</p>
                    )}
                  </div>
                  <div className="form-group">
                    <label>Tiêu đề phụ / Mô tả ngắn</label>
                    <input 
                      type="text" 
                      value={lessonForm.subtitle} 
                      onChange={(e) => setLessonForm(f => ({ ...f, subtitle: e.target.value }))}
                    />
                  </div>
                  <div className="form-grid">
                    <div className="form-group">
                      <label>Số thứ tự sắp xếp</label>
                      <input 
                        type="number" 
                        value={lessonForm.order} 
                        onChange={(e) => setLessonForm(f => ({ ...f, order: parseInt(e.target.value) || 0 }))}
                      />
                    </div>
                    <div className="form-group">
                      <label>Phân loại bài học</label>
                      <select value={lessonForm.type} onChange={(e) => setLessonForm(f => ({ ...f, type: e.target.value }))}>
                        <option value="challenge">Challenge (Bài học học lý thuyết mới)</option>
                        <option value="practice">Practice (Bài luyện tập củng cố)</option>
                      </select>
                    </div>
                  </div>
                </div>
              )}

              {/* Form Câu Hỏi (Challenge Node) - Split Screen */}
              {(selectedNode.type === 'challenge' || selectedNode.type === 'new-challenge') && (
                <div className="split-workspace">
                  {/* Cột trái: Nhập liệu */}
                  <div className="split-editor">
                    <div className="studio-form">
                      {/* Chọn dạng câu hỏi dạng Cards */}
                      <div className="form-group">
                        <label className="section-label">Lựa chọn dạng câu hỏi bài học</label>
                        <div className="challenge-cards-grid">
                          {CHALLENGE_TYPES.map(type => (
                            <div 
                              key={type.id}
                              className={`challenge-type-card ${challengeForm.type === type.id ? 'active' : ''}`}
                              onClick={() => setChallengeForm(f => ({ ...f, type: type.id }))}
                            >
                              <div className="card-badge">{type.id}</div>
                              <span className="card-desc">{type.desc}</span>
                            </div>
                          ))}
                        </div>
                      </div>

                      {/* Câu hỏi chính */}
                      <div className="form-group">
                        <label>Câu hỏi chính / Nội dung gợi ý học sinh dịch *</label>
                        <input 
                          type="text" 
                          className="question-input"
                          value={challengeForm.question} 
                          onChange={(e) => setChallengeForm(f => ({ ...f, question: e.target.value }))}
                          placeholder="Ví dụ: Xin chào bạn! hoặc Dịch câu: Good morning"
                        />
                      </div>



                      <div className="form-grid">
                        <div className="form-group">
                          <label>Thứ tự hiển thị câu hỏi</label>
                          <input 
                            type="number" 
                            value={challengeForm.order} 
                            onChange={(e) => setChallengeForm(f => ({ ...f, order: parseInt(e.target.value) || 0 }))}
                            min={0}
                          />
                        </div>
                      </div>



                      {/* Phân hệ tùy biến đáp án theo DẠNG CÂU HỎI */}
                      <div className="type-specific-config">
                        <h3>Cấu hình đáp án cho loại: {challengeForm.type}</h3>

                        {/* Config cho câu khuyết của dạng FILL (Trắc nghiệm điền khuyết) - HIỂN THỊ TRƯỚC ĐÁP ÁN */}
                        {challengeForm.type === 'FILL' && (
                          <div className="type-config-fields" style={{ marginBottom: '16px' }}>
                            <div className="form-grid">
                              <div className="form-group">
                                <label>Câu văn đầy đủ (Có ký tự gạch dưới ___ để hiển thị khuyết) *</label>
                                <input 
                                  type="text"
                                  value={challengeForm.sentence}
                                  onChange={(e) => setChallengeForm(f => ({ ...f, sentence: e.target.value }))}
                                  placeholder="She is a ___ doctor"
                                />
                              </div>
                              <div className="form-group">
                                <label>Vị trí chỉ số từ khuyết (Blank Index)</label>
                                <input 
                                  type="number"
                                  value={challengeForm.blankIndex}
                                  onChange={(e) => setChallengeForm(f => ({ ...f, blankIndex: e.target.value }))}
                                  placeholder="3"
                                />
                              </div>
                            </div>
                          </div>
                        )}

                        {/* Config cho dạng trắc nghiệm ảnh/chữ SELECT, ASSIST, FILL */}
                        {['SELECT', 'ASSIST', 'FILL'].includes(challengeForm.type) && (
                          <div className="options-editor-workspace">
                            <label className="text-slate-600 block mb-2 font-semibold">Danh sách các tùy chọn đáp án (Tích chọn đáp án ĐÚNG duy nhất)</label>
                            {challengeForm.options.map((opt, idx) => (
                              <div key={idx} className="option-row-item-wrapper" style={{ border: '1px solid #e2e8f0', borderRadius: '12px', padding: '12px', marginBottom: '12px', background: '#f8fafc' }}>
                                <div className="option-row-item" style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
                                  <input 
                                    type="text" 
                                    value={opt.text}
                                    onChange={(e) => {
                                      const opts = [...challengeForm.options];
                                      opts[idx].text = e.target.value;
                                      setChallengeForm(f => ({ ...f, options: opts }));
                                    }}
                                    placeholder={`Tùy chọn ${idx + 1}`}
                                    className="form-control-admin option-input"
                                    style={{ flex: 1 }}
                                  />
                                  <button 
                                    type="button"
                                    className={`btn-correct-indicator ${opt.correct ? 'is-correct' : ''}`}
                                    onClick={() => {
                                      const opts = challengeForm.options.map((o, i) => ({
                                        ...o,
                                        correct: i === idx
                                      }));
                                      setChallengeForm(f => ({ ...f, options: opts }));
                                    }}
                                  >
                                    {opt.correct ? <Check size={14} /> : 'Đúng'}
                                  </button>
                                  {challengeForm.options.length > 2 && (
                                    <button 
                                      type="button" 
                                      className="delete-opt-btn"
                                      onClick={() => {
                                        const filtered = challengeForm.options.filter((_, i) => i !== idx);
                                        setChallengeForm(f => ({ ...f, options: filtered }));
                                      }}
                                    >
                                      ✕
                                    </button>
                                  )}
                                </div>
                                {challengeForm.type === 'SELECT' && (
                                  <div className="option-image-uploader" style={{ marginTop: '8px', borderTop: '1px dashed #cbd5e1', paddingTop: '8px' }}>
                                    <label style={{ fontSize: '0.75rem', fontWeight: 600, color: '#64748b', display: 'block', marginBottom: '4px' }}>Hình ảnh cho tùy chọn {idx + 1}</label>
                                    <input 
                                      type="text" 
                                      value={opt.imageSrc || ''}
                                      onChange={(e) => {
                                        const opts = [...challengeForm.options];
                                        opts[idx].imageSrc = e.target.value;
                                        setChallengeForm(f => ({ ...f, options: opts }));
                                      }}
                                      placeholder="https://... (URL hoặc tải ảnh lên ở dưới)"
                                      className="form-control-admin option-image-input"
                                      style={{ marginBottom: '6px', fontSize: '0.8rem' }}
                                    />
                                    <ImageUploader 
                                      currentUrl={opt.imageSrc || ''}
                                      onUpload={(url) => {
                                        const opts = [...challengeForm.options];
                                        opts[idx].imageSrc = url;
                                        setChallengeForm(f => ({ ...f, options: opts }));
                                      }}
                                      onClear={() => {
                                        const opts = [...challengeForm.options];
                                        opts[idx].imageSrc = '';
                                        setChallengeForm(f => ({ ...f, options: opts }));
                                      }}
                                    />
                                  </div>
                                )}
                              </div>
                            ))}
                            {challengeForm.options.length < 6 && (
                              <button 
                                type="button" 
                                className="add-option-btn"
                                onClick={() => setChallengeForm(f => ({ ...f, options: [...f.options, { text: '', correct: false, imageSrc: '' }] }))}
                              >
                                <Plus size={12} /> Thêm tùy chọn đáp án
                              </button>
                            )}
                          </div>
                        )}

                        {/* Config cho dạng ORDER (sắp xếp câu) */}
                        {challengeForm.type === 'ORDER' && (
                          <div className="type-config-fields">
                            <div className="form-group">
                              <label>Các từ rời rạc của câu (Word Bank, phân cách bằng dấu phẩy) *</label>
                              <input 
                                type="text"
                                value={challengeForm.wordBank}
                                onChange={(e) => setChallengeForm(f => ({ ...f, wordBank: e.target.value }))}
                                placeholder="I, school, to, go"
                              />
                            </div>
                            <div className="form-group">
                              <label>Chỉ số thứ tự sắp xếp câu hoàn chỉnh (Correct Order, phân cách bằng dấu phẩy) *</label>
                              <input 
                                type="text"
                                value={challengeForm.correctOrder}
                                onChange={(e) => setChallengeForm(f => ({ ...f, correctOrder: e.target.value }))}
                                placeholder="0, 3, 2, 1 (nghĩa là: I go to school)"
                              />
                            </div>
                            <div className="config-help">
                              <HelpCircle size={14} />
                              <span>Ví dụ: Word Bank là: `I, to, school, go`. Câu chính xác là `I go to school`. Thứ tự đúng sẽ là: `0, 3, 1, 2` (vị trí tương ứng).</span>
                            </div>
                          </div>
                        )}

                        {/* Config cho dạng MATCH (Nối từ) */}
                        {challengeForm.type === 'MATCH' && (
                          <div className="type-config-fields">
                            <div className="form-group">
                              <label>Các cặp từ tương ứng ghép nối (mỗi dòng: Từ tiếng Anh|Nghĩa tiếng Việt) *</label>
                              <textarea 
                                rows={6}
                                value={challengeForm.pairs}
                                onChange={(e) => setChallengeForm(f => ({ ...f, pairs: e.target.value }))}
                                placeholder="hello|xin chào&#10;apple|quả táo&#10;doctor|bác sĩ"
                              />
                            </div>
                            <div className="config-help">
                              <HelpCircle size={14} />
                              <span>Nhập mỗi dòng một cặp từ ngăn cách bởi dấu gạch đứng `|`. Hệ thống sẽ tự đảo ngẫu nhiên khi học sinh làm bài.</span>
                            </div>
                          </div>
                        )}

                        {/* Config cho các loại nhập câu dịch, điền chỗ trống, nghe viết */}
                        {['TYPE', 'TRANSLATE', 'COMPLETE', 'LISTEN'].includes(challengeForm.type) && (
                          <div className="type-config-fields">
                            <div className="form-group">
                              <label>Đáp án chính xác bắt buộc gõ đúng (Correct Answer) *</label>
                              <input 
                                type="text"
                                value={challengeForm.correctAnswer}
                                onChange={(e) => setChallengeForm(f => ({ ...f, correctAnswer: e.target.value }))}
                                placeholder="Nhập câu dịch hoặc từ điền đúng..."
                              />
                            </div>
                            {challengeForm.type === 'COMPLETE' && (
                              <div className="form-grid">
                                <div className="form-group">
                                  <label>Câu văn đầy đủ (Có ký tự gạch dưới ___ để hiển thị khuyết)</label>
                                  <input 
                                    type="text"
                                    value={challengeForm.sentence}
                                    onChange={(e) => setChallengeForm(f => ({ ...f, sentence: e.target.value }))}
                                    placeholder="She is a ___ doctor"
                                  />
                                </div>
                                <div className="form-group">
                                  <label>Vị trí chỉ số từ khuyết (Blank Index)</label>
                                  <input 
                                    type="number"
                                    value={challengeForm.blankIndex}
                                    onChange={(e) => setChallengeForm(f => ({ ...f, blankIndex: e.target.value }))}
                                    placeholder="3"
                                  />
                                </div>
                              </div>
                            )}
                            {challengeForm.type === 'LISTEN' && (
                              <div className="form-group">
                                <label>Gợi ý ký tự độ dài (Hint)</label>
                                <input 
                                  type="text"
                                  value={challengeForm.hint}
                                  onChange={(e) => setChallengeForm(f => ({ ...f, hint: e.target.value }))}
                                  placeholder="_ _ _ _ _"
                                />
                              </div>
                            )}
                          </div>
                        )}


                      </div>

                      {/* HUD Cảnh Báo Lỗi */}
                      {getChallengeValidationErrors().length > 0 && (
                        <div className="validation-hud-alert">
                          <AlertCircle size={16} />
                          <div className="alert-content">
                            <h4>Cần sửa đổi trước khi lưu:</h4>
                            <ul>
                              {getChallengeValidationErrors().map((err, i) => (
                                <li key={i}>{err}</li>
                              ))}
                            </ul>
                          </div>
                        </div>
                      )}
                    </div>
                  </div>

                  {/* Cột phải: Live Web Preview */}
                  <div className="split-preview">


                    <div className="web-desktop-simulator">
                      <div className="simulated-browser-bar">
                        <div className="sim-dot red" />
                        <div className="sim-dot yellow" />
                        <div className="sim-dot green" />
                        <div className="sim-url">smartenglish.edu.vn/learn</div>
                      </div>

                      <div className="simulated-student-lesson-view">
                        {/* Header bài học giả lập */}
                        <div className="sim-lesson-header">
                          <div className="sim-progress-track">
                            <div className="sim-progress-fill" style={{ width: '60%' }} />
                          </div>
                          <div className="sim-hearts">❤️ 5</div>
                        </div>

                        {/* Vùng bài tập hiển thị động */}
                        <div className="sim-exercise-body">
                          {/* Khung linh vật cú Mascot và hội thoại */}
                          <div className="sim-mascot-dialogue">
                            <div className="sim-mascot-owl">🦉</div>
                            <div className="sim-speech-bubble">
                              {challengeForm.type === 'LISTEN' ? (
                                <button className="sim-listen-play-btn" onClick={() => speakText(challengeForm.correctAnswer)}>
                                  <Volume2 size={24} />
                                  <span>Nghe phát âm</span>
                                </button>
                              ) : (
                                <p className="text-slate-800 font-semibold">{challengeForm.question || 'Nội dung câu hỏi hiển thị tại đây...'}</p>
                              )}
                            </div>
                          </div>

                          {/* Kết xuất các DẠNG BÀI TẬP giả lập */}
                          <div className="sim-interaction-box">
                            {/* 📱 1. SELECT (Chọn ảnh) */}
                            {challengeForm.type === 'SELECT' && (
                              <div className="sim-grid-select-layout">
                                {challengeForm.options.map((opt, i) => (
                                  <div 
                                    key={i} 
                                    className={`sim-select-card ${previewSelectedOpt === i ? 'selected' : ''}`}
                                    onClick={() => setPreviewSelectedOpt(i)}
                                  >
                                    <div className="sim-select-img">
                                      {opt.imageSrc ? <img src={opt.imageSrc} alt="" /> : '📷'}
                                    </div>
                                    <div className="sim-select-label">{opt.text || `Tùy chọn ${i+1}`}</div>
                                    <span className="sim-select-key-badge">{i+1}</span>
                                  </div>
                                ))}
                              </div>
                            )}

                            {/* 🔤 2. ASSIST (Trắc nghiệm chữ) */}
                            {challengeForm.type === 'ASSIST' && (
                              <div className="sim-list-assist-layout">
                                {challengeForm.options.map((opt, i) => (
                                  <div 
                                    key={i} 
                                    className={`sim-assist-row-option ${previewSelectedOpt === i ? 'selected' : ''}`}
                                    onClick={() => setPreviewSelectedOpt(i)}
                                  >
                                    <span className="sim-assist-badge">{i+1}</span>
                                    <span className="sim-assist-text">{opt.text || `Tùy chọn ${i+1}`}</span>
                                  </div>
                                ))}
                              </div>
                            )}

                            {/* 📝 3. TRANSLATE hoặc LISTEN */}
                            {['TRANSLATE', 'LISTEN', 'TYPE'].includes(challengeForm.type) && (
                              <div className="sim-translate-layout">
                                <textarea 
                                  value={previewTextAnswer}
                                  onChange={(e) => setPreviewTextAnswer(e.target.value)}
                                  placeholder="Nhập câu dịch tiếng Anh của bạn tại đây..."
                                />
                                {challengeForm.type === 'LISTEN' && challengeForm.hint && (
                                  <div className="sim-listen-hint">Gợi ý: {challengeForm.hint}</div>
                                )}
                              </div>
                            )}

                            {/* 🧩 4. ORDER (Ghép câu kéo thả) */}
                            {challengeForm.type === 'ORDER' && (
                              <div className="sim-order-layout">
                                <div className="sim-order-slot-area">
                                  {previewAnswers.map((word, idx) => (
                                    <span 
                                      key={idx} 
                                      className="sim-word-bubble active-bubble"
                                      onClick={() => {
                                        setPreviewAnswers(prev => prev.filter((_, i) => i !== idx));
                                      }}
                                    >
                                      {word}
                                    </span>
                                  ))}
                                  {previewAnswers.length === 0 && <span className="text-slate-500 text-sm italic">Nhấp vào từ ở dưới để ghép thành câu...</span>}
                                </div>
                                
                                <div className="sim-order-words-bank">
                                  {challengeForm.wordBank.split(',').map(s => s.trim()).filter(Boolean).map((word, idx) => {
                                    const isUsed = previewAnswers.includes(word);
                                    return (
                                      <button 
                                        key={idx} 
                                        disabled={isUsed}
                                        className={`sim-word-bubble ${isUsed ? 'disabled-bubble' : ''}`}
                                        onClick={() => {
                                          setPreviewAnswers(prev => [...prev, word]);
                                        }}
                                      >
                                        {word}
                                      </button>
                                    );
                                  })}
                                </div>
                              </div>
                            )}

                            {/* 🔗 5. MATCH (Ghép cặp từ) */}
                            {challengeForm.type === 'MATCH' && (
                              <div className="sim-match-layout">
                                <div className="sim-match-col">
                                  {matchLeftPool.map((item, i) => (
                                    <button 
                                      key={`left-${i}`} 
                                      className={`sim-match-btn ${previewMatched[item.index] !== undefined ? 'matched' : ''} ${selectedMatchLeft === item.index ? 'selected' : ''}`}
                                      onClick={() => {
                                        if (previewMatched[item.index] !== undefined) {
                                          const newPairs = { ...previewMatched };
                                          delete newPairs[item.index];
                                          setPreviewMatched(newPairs);
                                          setSelectedMatchLeft(item.index);
                                          setSelectedMatchRight(null);
                                          return;
                                        }
                                        if (selectedMatchRight !== null) {
                                          const newPairs = { ...previewMatched, [item.index]: selectedMatchRight };
                                          setPreviewMatched(newPairs);
                                          setSelectedMatchRight(null);
                                          setSelectedMatchLeft(null);
                                        } else {
                                          setSelectedMatchLeft(prev => prev === item.index ? null : item.index);
                                        }
                                      }}
                                    >
                                      {item.text}
                                    </button>
                                  ))}
                                </div>
                                <div className="sim-match-col">
                                  {matchRightPool.map((item, i) => (
                                    <button 
                                      key={`right-${i}`} 
                                      className={`sim-match-btn ${Object.values(previewMatched).includes(item.index) ? 'matched' : ''} ${selectedMatchRight === item.index ? 'selected' : ''}`}
                                      onClick={() => {
                                        const matchedLeftKey = Object.keys(previewMatched).find(key => previewMatched[key] === item.index);
                                        if (matchedLeftKey !== undefined) {
                                          const newPairs = { ...previewMatched };
                                          delete newPairs[matchedLeftKey];
                                          setPreviewMatched(newPairs);
                                          setSelectedMatchRight(item.index);
                                          setSelectedMatchLeft(null);
                                          return;
                                        }
                                        if (selectedMatchLeft !== null) {
                                          const newPairs = { ...previewMatched, [selectedMatchLeft]: item.index };
                                          setPreviewMatched(newPairs);
                                          setSelectedMatchLeft(null);
                                          setSelectedMatchRight(null);
                                        } else {
                                          setSelectedMatchRight(prev => prev === item.index ? null : item.index);
                                        }
                                      }}
                                    >
                                      {item.text}
                                    </button>
                                  ))}
                                </div>
                              </div>
                            )}

                            {/* 📝 6. COMPLETE (Điền từ gõ) */}
                            {challengeForm.type === 'COMPLETE' && (
                              <div className="sim-complete-layout">
                                <div className="sim-complete-sentence-card">
                                  {(() => {
                                    const textToShow = challengeForm.sentence || challengeForm.question || 'Nice to ___ you';
                                    const parts = textToShow.split('___');
                                    return (
                                      <p className="sim-complete-sentence-text">
                                        {parts[0]}
                                        <span className="sim-complete-blank">___</span>
                                        {parts[1] || ''}
                                      </p>
                                    );
                                  })()}
                                </div>
                                <div className="sim-complete-input-wrapper">
                                  <input 
                                    type="text"
                                    value={previewTextAnswer}
                                    onChange={(e) => setPreviewTextAnswer(e.target.value)}
                                    placeholder="Gõ từ còn thiếu..."
                                    className="sim-complete-input"
                                  />
                                </div>
                              </div>
                            )}

                            {/* 📝 7. FILL (Điền từ chọn trắc nghiệm) */}
                            {challengeForm.type === 'FILL' && (
                              <div className="sim-fill-layout">
                                <div className="sim-complete-sentence-card">
                                  {(() => {
                                    const textToShow = challengeForm.sentence || challengeForm.question || 'Good ___!';
                                    const parts = textToShow.split('___');
                                    return (
                                      <p className="sim-complete-sentence-text">
                                        {parts[0]}
                                        <span className="sim-complete-blank">___</span>
                                        {parts[1] || ''}
                                      </p>
                                    );
                                  })()}
                                </div>
                                <div className="sim-fill-options">
                                  {challengeForm.options.map((opt, i) => (
                                    <div 
                                      key={i} 
                                      className={`sim-assist-row-option ${previewSelectedOpt === i ? 'selected' : ''}`}
                                      onClick={() => setPreviewSelectedOpt(i)}
                                    >
                                      <span className="sim-assist-badge">{i+1}</span>
                                      <span className="sim-assist-text">{opt.text || `Tùy chọn ${i+1}`}</span>
                                    </div>
                                  ))}
                                </div>
                              </div>
                            )}
                          </div>
                        </div>

                        {/* Footer bài tập giả lập */}
                        <div className="sim-lesson-footer">
                          <button className="sim-skip-btn">Bỏ qua</button>
                          <button 
                            className="sim-check-btn"
                            onClick={() => {
                              const type = challengeForm.type;
                              if (['SELECT', 'ASSIST', 'FILL'].includes(type)) {
                                if (previewSelectedOpt === null) {
                                  toast.error('Vui lòng chọn một đáp án trước!');
                                  return;
                                }
                                const isCorrect = challengeForm.options[previewSelectedOpt]?.correct;
                                if (isCorrect) {
                                  toast.success('Chính xác! Đáp án đúng.', { icon: '🟢' });
                                } else {
                                  toast.error('Chưa chính xác! Vui lòng chọn đáp án khác.', { icon: '🔴' });
                                }
                              } else if (['TRANSLATE', 'LISTEN', 'TYPE', 'COMPLETE'].includes(type)) {
                                if (!previewTextAnswer.trim()) {
                                  toast.error('Vui lòng nhập câu trả lời của bạn!');
                                  return;
                                }
                                const userAns = previewTextAnswer.trim().toLowerCase();
                                const correctAns = (challengeForm.correctAnswer || '').trim().toLowerCase();
                                if (userAns === correctAns) {
                                  toast.success('Chính xác! Đáp án đúng.', { icon: '🟢' });
                                } else {
                                  toast.error(`Chưa chính xác! Đáp án đúng là: "${challengeForm.correctAnswer}"`, { icon: '🔴' });
                                }
                              } else if (type === 'ORDER') {
                                if (previewAnswers.length === 0) {
                                  toast.error('Vui lòng sắp xếp các từ thành câu!');
                                  return;
                                }
                                const userSentence = previewAnswers.join(' ').trim().toLowerCase();
                                const bank = challengeForm.wordBank.split(',').map(s => s.trim()).filter(Boolean);
                                const order = challengeForm.correctOrder.split(',').map(s => parseInt(s.trim())).filter(n => !isNaN(n));
                                const correctSentence = order.map(idx => bank[idx]).join(' ').trim().toLowerCase();
                                const displayCorrect = order.map(idx => bank[idx]).join(' ');
                                if (userSentence === correctSentence) {
                                  toast.success('Chính xác! Đáp án đúng.', { icon: '🟢' });
                                } else {
                                  toast.error(`Chưa chính xác! Đáp án đúng là: "${displayCorrect}"`, { icon: '🔴' });
                                }
                              } else if (type === 'MATCH') {
                                const pairsArr = challengeForm.pairs.split('\n').map(line => line.split('|').map(s => s.trim())).filter(p => p.length >= 2);
                                if (Object.keys(previewMatched).length !== pairsArr.length) {
                                  toast.error('Vui lòng ghép nối tất cả các cặp từ trước!');
                                  return;
                                }
                                const allCorrect = Object.keys(previewMatched).every(
                                  leftIdx => parseInt(leftIdx) === previewMatched[leftIdx]
                                );
                                if (allCorrect) {
                                  toast.success('Chính xác! Tất cả các cặp đều đúng.', { icon: '🟢' });
                                } else {
                                  toast.error('Chưa chính xác! Một số cặp ghép bị sai.', { icon: '🔴' });
                                }
                              } else {
                                toast.success('Học viên bấm nút kiểm tra đáp án!', { icon: '🟢' });
                              }
                            }}
                          >
                            Kiểm tra
                          </button>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              )}
            </div>
          </div>
        ) : (
          <div className="workspace-empty-state">
            <div className="empty-state-icon">🖥️</div>
            <h3>Không gian biên soạn giáo trình</h3>
            <p>Chọn một khóa học ở sidebar trái, rồi nhấp vào các node cây thư mục (Khóa học, Unit, Lesson, Challenge) để bắt đầu chỉnh sửa nội dung hoặc xem trước.</p>
          </div>
        )}
      </div>
    </div>
  );
}
