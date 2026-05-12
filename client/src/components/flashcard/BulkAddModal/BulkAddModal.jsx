import { useState } from 'react';
import { Modal as BsModal, Button } from 'react-bootstrap';
import { FiEye, FiUpload } from 'react-icons/fi';
import './BulkAddModal.css';

/**
 * BulkAddModal — paste "term | definition" lines to bulk create cards.
 *
 * Props:
 *   show        — boolean
 *   onHide()    — close modal
 *   onConfirm(cards: {front,back}[]) — called with parsed cards array
 *   loading?    — disables confirm button
 */
export default function BulkAddModal({ show, onHide, onConfirm, loading = false }) {
  const [text, setText] = useState('');
  const [parsed, setParsed] = useState([]);
  const [previewing, setPreviewing] = useState(false);
  const [parseError, setParseError] = useState('');

  const SEPARATOR = '|';

  const parseLines = () => {
    setParseError('');
    const lines = text
      .split('\n')
      .map((l) => l.trim())
      .filter(Boolean);

    if (lines.length === 0) {
      setParseError('Chưa có dữ liệu nào để parse.');
      return;
    }

    const result = [];
    const invalid = [];

    lines.forEach((line, idx) => {
      const parts = line.split(SEPARATOR);
      if (parts.length < 2) {
        invalid.push(idx + 1);
        return;
      }
      const front = parts[0].trim();
      const back  = parts.slice(1).join(SEPARATOR).trim();
      if (front && back) result.push({ front, back });
      else invalid.push(idx + 1);
    });

    if (result.length === 0) {
      setParseError(`Không parse được dòng nào. Định dạng: "term ${SEPARATOR} definition"`);
      return;
    }

    if (invalid.length > 0) {
      setParseError(`Bỏ qua ${invalid.length} dòng không hợp lệ (dòng: ${invalid.join(', ')})`);
    }

    setParsed(result);
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

  return (
    <BsModal show={show} onHide={handleClose} centered size="lg" className="bulk-modal">
      <BsModal.Header closeButton className="bulk-modal-header">
        <BsModal.Title className="bulk-modal-title">
          Add Multiple Cards
        </BsModal.Title>
      </BsModal.Header>

      <BsModal.Body className="bulk-modal-body">
        {!previewing ? (
          <>
            {/* Instructions */}
            <div className="bulk-instructions">
              <p>Nhập mỗi thẻ trên một dòng theo định dạng:</p>
              <code className="bulk-format">term {SEPARATOR} definition</code>
              <p className="bulk-example-label">Ví dụ:</p>
              <pre className="bulk-example">
{`Hello | Xin chào
Good morning | Chào buổi sáng
Thank you | Cảm ơn`}
              </pre>
            </div>

            {/* Textarea */}
            <textarea
              className="bulk-textarea"
              placeholder={`Hello | Xin chào\nGood morning | Chào buổi sáng\nThank you | Cảm ơn`}
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
                ✅ <strong>{parsed.length}</strong> cards sẽ được tạo
              </p>
              {parseError && <p className="bulk-parse-error">{parseError}</p>}
            </div>

            <div className="bulk-preview-table-wrap">
              <table className="bulk-preview-table">
                <thead>
                  <tr>
                    <th>#</th>
                    <th>TERM</th>
                    <th>DEFINITION</th>
                  </tr>
                </thead>
                <tbody>
                  {parsed.map((c, i) => (
                    <tr key={i}>
                      <td className="bulk-preview-num">{i + 1}</td>
                      <td>{c.front}</td>
                      <td>{c.back}</td>
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
          Cancel
        </Button>

        {!previewing ? (
          <button className="bulk-btn bulk-btn--preview" onClick={parseLines}>
            <FiEye size={14} /> Preview ({text.split('\n').filter(l => l.trim()).length} lines)
          </button>
        ) : (
          <>
            <button
              className="bulk-btn bulk-btn--back"
              onClick={() => setPreviewing(false)}
              disabled={loading}
            >
              ← Edit
            </button>
            <button
              className="bulk-btn bulk-btn--confirm"
              onClick={handleConfirm}
              disabled={loading || parsed.length === 0}
            >
              {loading
                ? <span className="spinner-border spinner-border-sm" />
                : <><FiUpload size={14} /> Add {parsed.length} Cards</>
              }
            </button>
          </>
        )}
      </BsModal.Footer>
    </BsModal>
  );
}
