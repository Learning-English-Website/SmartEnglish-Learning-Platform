import { useState, useEffect, useRef } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { Container, Form } from 'react-bootstrap';
import { FiArrowLeft, FiSave, FiTrash2, FiEdit2 } from 'react-icons/fi';
import { toast } from 'react-hot-toast';
import { setService } from '../../api/setService';
import { folderService } from '../../api/folderService';
import { ConfirmModal } from '../../components/common/Modal/Modal';
import { LoadingSpinner } from '../../components/common';
import TagPicker from '../../components/common/TagPicker/TagPicker';
import { useAuth } from '../../hooks/useAuth';
import './SetForm.css';

export default function EditSet() {
  const { id } = useParams();
  const navigate = useNavigate();
  const { user: currentUser } = useAuth();

  const [form, setForm] = useState(null);
  const [errors, setErrors] = useState({ title: '' });
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [showDelete, setShowDelete] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [folders, setFolders] = useState([]);
  const [selectedFolder, setSelectedFolder] = useState('');
  const [initialFolder, setInitialFolder] = useState('');
  const hasToastedError = useRef(false);

  // Fetch existing set data
  useEffect(() => {
    if (!id) return;
    setLoading(true);
    Promise.all([
      setService.getById(id),
      folderService.getAll()
    ])
      .then(([setData, foldersData]) => {
        const set = setData?.set ?? setData?.data ?? setData;
        const foldersList = Array.isArray(foldersData) ? foldersData : foldersData?.data ?? [];
        setFolders(foldersList);

        // Check ownership
        const ownerId = set.user?._id ?? set.user;
        if (ownerId && currentUser && ownerId.toString() !== currentUser._id.toString()) {
          if (!hasToastedError.current) {
            hasToastedError.current = true;
            toast.error('Bạn không có quyền chỉnh sửa học phần này.');
          }
          navigate(`/flashcards/sets/${id}`);
          return;
        }

        // Find folder containing this set
        const currentFolder = foldersList.find(f => 
          f.sets && f.sets.some(setId => setId.toString() === id.toString())
        );
        const folderId = currentFolder ? currentFolder._id : '';
        setSelectedFolder(folderId);
        setInitialFolder(folderId);

        setForm({
          title: set.title ?? '',
          description: set.description ?? '',
          isPublic: set.isPublic ?? false,
          tags: Array.isArray(set.tags) ? set.tags : [],
        });
      })
      .catch((err) => {
        console.error('Failed to load edit set info:', err);
        if (!hasToastedError.current) {
          hasToastedError.current = true;
          toast.error('Không thể tải thông tin set.');
        }
        navigate('/flashcards');
      })
      .finally(() => setLoading(false));
  }, [id, navigate]);

  const handleChange = (e) => {
    const { name, value, type, checked } = e.target;
    setForm((prev) => ({ ...prev, [name]: type === 'checkbox' ? checked : value }));
    if (name === 'title') setErrors((prev) => ({ ...prev, title: '' }));
  };

  const validate = () => {
    const newErrors = { title: '' };
    if (!form.title.trim()) {
      newErrors.title = 'Tiêu đề không được để trống.';
    } else if (form.title.trim().length < 3) {
      newErrors.title = 'Tiêu đề phải có ít nhất 3 ký tự.';
    }
    setErrors(newErrors);
    return !newErrors.title;
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!validate()) return;
    setSubmitting(true);
    try {
      const payload = {
        title: form.title.trim(),
        description: form.description.trim(),
        isPublic: form.isPublic,
        tags: form.tags,
      };
      console.log('Submitting with tags:', form.tags);
      await setService.update(id, payload);

      // Update folder membership if changed
      if (selectedFolder !== initialFolder) {
        if (initialFolder) {
          await folderService.removeSet(initialFolder, id);
        }
        if (selectedFolder) {
          await folderService.addSet(selectedFolder, id);
        }
      }

      toast.success('Cập nhật thành công! ✏️');
      navigate(`/flashcards/sets/${id}`);
    } catch (err) {
      console.error('Update error:', err);
      const msg = err?.response?.data?.message || err?.response?.data?.error || 'Cập nhật thất bại.';
      toast.error(msg);
    } finally {
      setSubmitting(false);
    }
  };

  const handleDelete = async () => {
    setDeleting(true);
    try {
      await setService.delete(id);
      toast.success('Đã xóa set thành công.');
      navigate('/flashcards');
    } catch {
      toast.error('Xóa thất bại. Vui lòng thử lại.');
    } finally {
      setDeleting(false);
    }
  };

  // ── Render ────────────────────────────────────────────────────────────────
  if (loading) {
    return (
      <div className="page-shell" style={{ display: 'flex', justifyContent: 'center', paddingTop: 160 }}>
        <LoadingSpinner text="Đang tải..." />
      </div>
    );
  }

  if (!form) {
    return null;
  }

  return (
    <div className="page-shell set-form-page">
      <Container>
        {/* Back */}
        <button className="set-form-back" onClick={() => navigate(`/flashcards/sets/${id}`)}>
          <FiArrowLeft size={16} /> Quay lại Set
        </button>

        <div className="set-form-card surface-card">
          {/* Heading */}
          <div className="set-form-heading">
            <div className="set-form-heading-icon set-form-heading-icon--edit">
              <FiEdit2 size={20} />
            </div>
            <div>
              <h1>Chỉnh Sửa Flashcard Set</h1>
              <p>Cập nhật thông tin cho bộ từ vựng của bạn.</p>
            </div>
          </div>

          <Form onSubmit={handleSubmit} noValidate>
            {/* Title */}
            <Form.Group className="set-form-group" controlId="edit-set-title">
              <Form.Label className="type-label">Tiêu đề *</Form.Label>
              <Form.Control
                type="text"
                name="title"
                value={form.title}
                onChange={handleChange}
                isInvalid={!!errors.title}
                className="set-form-input"
                autoFocus
              />
              <Form.Control.Feedback type="invalid">{errors.title}</Form.Control.Feedback>
            </Form.Group>

            {/* Description */}
            <Form.Group className="set-form-group" controlId="edit-set-description">
              <Form.Label className="type-label">Mô tả</Form.Label>
              <Form.Control
                as="textarea"
                name="description"
                value={form.description}
                onChange={handleChange}
                rows={3}
                className="set-form-input"
              />
            </Form.Group>

            {/* isPublic */}
            <div className="set-form-row">
              <Form.Group className="set-form-group set-form-group--public" controlId="edit-set-public">
                <Form.Label className="type-label">Hiển thị</Form.Label>
                <div className="set-form-toggle">
                  <input
                    type="checkbox"
                    id="edit-set-public"
                    name="isPublic"
                    checked={form.isPublic}
                    onChange={handleChange}
                    className="set-form-checkbox"
                  />
                  <label htmlFor="edit-set-public" className="set-form-toggle-label">
                    <span className="set-form-toggle-track" />
                    <span className="set-form-toggle-text">
                      {form.isPublic ? '🌐 Công khai' : '🔒 Riêng tư'}
                    </span>
                  </label>
                </div>
              </Form.Group>
            </div>

            {/* Folder */}
            <Form.Group className="set-form-group" controlId="edit-set-folder">
              <Form.Label className="type-label">Thư mục</Form.Label>
              <select
                name="folder"
                value={selectedFolder}
                onChange={(e) => setSelectedFolder(e.target.value)}
                className="set-form-input"
                aria-label="Thư mục"
              >
                <option value="">Không có thư mục</option>
                {folders.map((f) => (
                  <option key={f._id} value={f._id}>{f.name}</option>
                ))}
              </select>
            </Form.Group>

            {/* Tags */}
            <Form.Group className="set-form-group" controlId="edit-set-tags">
              <Form.Label className="type-label">Tags</Form.Label>
              <TagPicker
                selectedTags={form.tags}
                onChange={(tags) => setForm((prev) => ({ ...prev, tags }))}
                placeholder="Add tags..."
              />
            </Form.Group>

            {/* Actions */}
            <div className="set-form-actions set-form-actions--edit">
              {/* Delete button on the left */}
              <button
                type="button"
                className="set-form-btn-delete"
                onClick={() => setShowDelete(true)}
                disabled={submitting}
              >
                <FiTrash2 size={14} /> Xóa Set
              </button>

              <div className="set-form-actions-right">
                <button
                  type="button"
                  className="set-form-btn-cancel"
                  onClick={() => navigate(`/flashcards/sets/${id}`)}
                  disabled={submitting}
                >
                  Hủy
                </button>
                <button
                  type="submit"
                  className="btn-glassline-primary set-form-btn-submit"
                  disabled={submitting}
                >
                  {submitting ? (
                    <span className="spinner-border spinner-border-sm" />
                  ) : (
                    <>
                      <FiSave size={15} /> Lưu Thay Đổi
                    </>
                  )}
                </button>
              </div>
            </div>
          </Form>
        </div>
      </Container>

      {/* Delete Confirmation */}
      <ConfirmModal
        show={showDelete}
        onHide={() => setShowDelete(false)}
        onConfirm={handleDelete}
        title="Xóa Flashcard Set"
        message="Bạn có chắc muốn xóa set này? Tất cả flashcards trong set cũng sẽ bị xóa. Hành động này không thể hoàn tác."
        confirmText="Xóa Vĩnh Viễn"
        confirmVariant="danger"
        loading={deleting}
      />
    </div>
  );
}
