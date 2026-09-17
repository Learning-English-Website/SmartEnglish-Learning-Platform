import { useState } from 'react';
import { Modal as BsModal, Button } from 'react-bootstrap';
import { FiEye, FiUpload } from 'react-icons/fi';
import { parseBulkText, BULK_FORMATS, FORMAT_LABELS } from '../../../utils/bulkParser';
import './BulkAddModal.css';

/**
 * BulkAddModal — paste delimited lines to bulk create cards.
 * Supports 2, 3, and 4 field formats.
 *
 * Props:
 *   show        — boolean
 *   onHide()    — close modal
 *   onConfirm(cards: Array<{front, back, pronunciation?, example?}>) — called with parsed cards array
 *   loading?    — disables confirm button
 */
export default function BulkAddModal({ show, onHide, onConfirm, loading = false }) {
  const [text, setText] = useState('');
  const [format, setFormat] = useState(BULK_FORMATS.TWO_FIELD);
  const [parsed, setParsed] = useState([]);
  const [previewing, setPreviewing] = useState(false);
  const [parseError, setParseError] = useState('');

  const SEPARATOR = '|';

  const parseLines = () => {
    setParseError('');
    const { cards, error } = parseBulkText(text, format, SEPARATOR);

    if (cards.length === 0) {
      setParseError(error || 'Chưa có dữ liệu hợp lệ để xử lý.');
      return;
    }

    if (error) {
      setParseError(error);
    }

    setParsed(cards);
    setPreviewing(true);
  };

  const handleConfirm = () => {
    onConfirm(parsed);
  };

  const handleClose = () => {
    setText('');
    setParsed([]);
    setPreviewing(false);
    setParseError('');
    onHide();
  };

  const getFormatExample = () => {
    if (format === BULK_FORMATS.THREE_FIELD) {
      return `Hello | Xin chào | Hello, how are you?\nGood morning | Chào buổi sáng | Good morning teacher!\nThank you | Cảm ơn | Thank you very much!`;
    }
    if (format === BULK_FORMATS.FOUR_FIELD) {
      return `Hello | Xin chào | /ˈhɛloʊ/ | Hello, how are you?\nGood morning | Chào buổi sáng | /ɡʊd ˈmɔːrnɪŋ/ | Good morning teacher!\nThank you | Cảm ơn | /ˈθæŋk juː/ | Thank you very much!`;
    }
    return `Hello | Xin chào\nGood morning | Chào buổi sáng\nThank you | Cảm ơn`;
  };

  const getFormatSyntax = () => {
    if (format === BULK_FORMATS.THREE_FIELD) {
      return `Từ tiếng Anh ${SEPARATOR} Nghĩa tiếng Việt ${SEPARATOR} Câu ví dụ`;
    }
    if (format === BULK_FORMATS.FOUR_FIELD) {
      return `Từ tiếng Anh ${SEPARATOR} Nghĩa tiếng Việt ${SEPARATOR} Phiên âm (IPA) ${SEPARATOR} Câu ví dụ`;
    }
    return `Từ tiếng Anh ${SEPARATOR} Nghĩa tiếng Việt`;
  };

  return (
    <BsModal show={show} onHide={handleClose} centered size="lg" className="bulk-modal">
      <BsModal.Header closeButton className="bulk-modal-header">
        <BsModal.Title className="bulk-modal-title">
          Thêm nhiều thẻ cùng lúc
        </BsModal.Title>
      </BsModal.Header>

      <BsModal.Body className="bulk-modal-body">
        {!previewing ? (
          <>
            {/* Format Selector */}
            <div className="bulk-format-selector-group">
              <label className="bulk-format-selector-label">Chọn cấu trúc dữ liệu:</label>
              <div className="bulk-format-pills">
                {Object.values(BULK_FORMATS).map((fKey) => (
                  <button
                    key={fKey}
                    type="button"
                    className={`bulk-format-pill ${format === fKey ? 'active' : ''}`}
                    onClick={() => {
                      setFormat(fKey);
                      setParseError('');
                    }}
                  >
                    {FORMAT_LABELS[fKey]}
                  </button>
                ))}
              </div>
            </div>

            {/* Instructions */}
            <div className="bulk-instructions">
              <p>Nhập mỗi thẻ trên một dòng theo định dạng:</p>
              <code className="bulk-format">{getFormatSyntax()}</code>
              <p className="bulk-example-label">Ví dụ minh họa:</p>
              <pre className="bulk-example">
                {getFormatExample()}
              </pre>
            </div>

            {/* Textarea */}
            <textarea
              className="bulk-textarea"
              placeholder={getFormatExample()}
              value={text}
              onChange={(e) => { setText(e.target.value); setParseError(''); }}
              rows={10}
              autoFocus
            />

            {parseError && <p className="bulk-parse-error">{parseError}</p>}
          </>
        ) : (
          <>
            {/* Preview Table */}
            <div className="bulk-preview-header">
              <p className="bulk-preview-count">
                ✅ <strong>{parsed.length}</strong> thẻ sẽ được tạo
              </p>
              {parseError && <p className="bulk-parse-error">{parseError}</p>}
            </div>

            <div className="bulk-preview-table-wrap">
              <table className="bulk-preview-table">
                <thead>
                  <tr>
                    <th>#</th>
                    <th>TỪ TIẾNG ANH</th>
                    <th>NGHĨA TIẾNG VIỆT</th>
                    {format === BULK_FORMATS.FOUR_FIELD && <th>PHÁT ÂM (IPA)</th>}
                    {(format === BULK_FORMATS.THREE_FIELD || format === BULK_FORMATS.FOUR_FIELD) && (
                      <th>VÍ DỤ</th>
                    )}
                  </tr>
                </thead>
                <tbody>
                  {parsed.map((c, i) => (
                    <tr key={i}>
                      <td className="bulk-preview-num">{i + 1}</td>
                      <td className="bulk-preview-front">{c.front}</td>
                      <td className="bulk-preview-back">{c.back}</td>
                      {format === BULK_FORMATS.FOUR_FIELD && (
                        <td className="bulk-preview-ipa">{c.pronunciation || '—'}</td>
                      )}
                      {(format === BULK_FORMATS.THREE_FIELD || format === BULK_FORMATS.FOUR_FIELD) && (
                        <td className="bulk-preview-example">{c.example || '—'}</td>
                      )}
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </>
        )}
      </BsModal.Body>

      <BsModal.Footer className="bulk-modal-footer">
        <Button variant="outline-secondary" onClick={handleClose} disabled={loading}>
          Hủy
        </Button>

        {!previewing ? (
          <button className="bulk-btn bulk-btn--preview" onClick={parseLines}>
            <FiEye size={14} /> Xem trước ({text.split('\n').filter(l => l.trim()).length} dòng)
          </button>
        ) : (
          <>
            <button
              className="bulk-btn bulk-btn--back"
              onClick={() => setPreviewing(false)}
              disabled={loading}
            >
              ← Sửa lại
            </button>
            <button
              className="bulk-btn bulk-btn--confirm"
              onClick={handleConfirm}
              disabled={loading || parsed.length === 0}
            >
              <FiUpload size={14} />
              {loading ? 'Đang tạo...' : `Thêm ${parsed.length} thẻ`}
            </button>
          </>
        )}
      </BsModal.Footer>
    </BsModal>
  );
}
