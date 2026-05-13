import { useState, useCallback, useRef } from 'react';
import { Modal, Button, Table, Form, Alert, Badge } from 'react-bootstrap';
import { FiUpload, FiFile, FiCheck, FiAlertCircle, FiZap } from 'react-icons/fi';
import { parseCSV, validateCSV } from '../../../utils/parseCSV';
import { parseXLSX, validateXLSX } from '../../../utils/parseXLSX';
import './ImportModal.css';

const CARD_FIELDS = [
  { key: 'front', label: 'Front (Term)', required: true },
  { key: 'back', label: 'Back (Definition)', required: true },
  { key: 'pronunciation', label: 'Pronunciation', required: false },
  { key: 'example', label: 'Example', required: false },
  { key: 'note', label: 'Note', required: false },
];

const INITIAL_MAPPING = {
  front: -1,
  back: -1,
  pronunciation: -1,
  example: -1,
  note: -1,
};

/**
 * ImportModal — Import flashcards from CSV/XLSX files
 *
 * @param {boolean} show - Whether modal is visible
 * @param {function} onHide - Callback to close modal
 * @param {function} onImport - Callback with parsed cards: (cards: CreateCardInput[]) => Promise<void>
 */
export default function ImportModal({ show, onHide, onImport }) {
  const [file, setFile] = useState(null);
  const [parsedDataWithHeaders, setParsedDataWithHeaders] = useState(null);
  const [error, setError] = useState(null);
  const [columnMapping, setColumnMapping] = useState(INITIAL_MAPPING);
  const [importing, setImporting] = useState(false);
  const [dragActive, setDragActive] = useState(false);
  const [autoDetected, setAutoDetected] = useState(false);
  const fileInputRef = useRef(null);

  // Derived from parsedDataWithHeaders for backward compat
  const parsedData = parsedDataWithHeaders?.data;

  const handleDrag = useCallback((e) => {
    e.preventDefault();
    e.stopPropagation();
    if (e.type === 'dragenter' || e.type === 'dragover') {
      setDragActive(true);
    } else if (e.type === 'dragleave') {
      setDragActive(false);
    }
  }, []);

  const handleDrop = useCallback((e) => {
    e.preventDefault();
    e.stopPropagation();
    setDragActive(false);
    const files = e.dataTransfer?.files;
    if (files && files.length > 0) {
      handleFileSelect(files[0]);
    }
  }, []);

  const handleFileInputChange = (e) => {
    const files = e.target.files;
    if (files && files.length > 0) {
      handleFileSelect(files[0]);
    }
  };

  const handleFileSelect = async (selectedFile) => {
    setError(null);
    setParsedDataWithHeaders(null);
    setFile(selectedFile);

    const extension = selectedFile.name.split('.').pop().toLowerCase();

    try {
      let data;
      if (extension === 'csv') {
        const content = await selectedFile.text();
        data = parseCSV(content);
        const validation = validateCSV(data);
        if (!validation.valid) {
          setError(validation.error);
          return;
        }
      } else if (extension === 'xlsx' || extension === 'xls') {
        data = await parseXLSX(selectedFile);
        const validation = validateXLSX(data);
        if (!validation.valid) {
          setError(validation.error);
          return;
        }
      } else {
        setError('Unsupported file format. Please use CSV or XLSX.');
        return;
      }

      // Auto-detect column mapping based on header names
      const headers = data.headers.map((h) => h.toLowerCase());
      const newMapping = { ...INITIAL_MAPPING };

      // Common header patterns
      const patterns = {
        front: ['front', 'term', 'word', 'question', 'vocab', 'vocabulary', 'english'],
        back: ['back', 'definition', 'meaning', 'answer', 'translation', 'vietnamese', 'answer', 'vn'],
        pronunciation: ['pronunciation', 'pronounce', 'reading', 'phonetic', 'phonics', 'ipa'],
        example: ['example', 'sentence', 'usage', 'example sentence', 'example sentence'],
        note: ['note', 'notes', 'hint', 'comment', 'memo'],
      };

      Object.keys(patterns).forEach((field) => {
        const index = headers.findIndex((h) =>
          patterns[field].some((pattern) => h.includes(pattern))
        );
        if (index !== -1) {
          newMapping[field] = index;
        }
      });

      // Check if auto-detect found required fields
      const detectedCount = Object.values(newMapping).filter(v => v !== -1).length;
      setAutoDetected(detectedCount >= 2); // At least front & back detected

      // Set both parsed data AND auto-detected column mapping
      setParsedDataWithHeaders({ data, headers });
      setColumnMapping(newMapping);
    } catch (err) {
      setError('Failed to parse file. Please check the file format.');
    }
  };

  const handleMappingChange = (field, value) => {
    setColumnMapping((prev) => ({
      ...prev,
      [field]: parseInt(value, 10),
    }));
    // User manually changed mapping, no longer auto-detected
    setAutoDetected(false);
  };

  const handleImport = async () => {
    // Validate required fields
    if (columnMapping.front === -1 || columnMapping.back === -1) {
      setError('Please map both Front and Back columns');
      return;
    }

    if (!parsedDataWithHeaders) return;

    setImporting(true);
    setError(null);

    try {
      // Use headers directly from stored state (bypass React closure issue)
      const headers = parsedDataWithHeaders.headers;

      const cards = parsedDataWithHeaders.data.rows
        .map((row) => ({
          front: row[columnMapping.front] || '',
          back: row[columnMapping.back] || '',
          pronunciation: columnMapping.pronunciation !== -1 ? (row[columnMapping.pronunciation] || null) : null,
          example: columnMapping.example !== -1 ? (row[columnMapping.example] || null) : null,
          note: columnMapping.note !== -1 ? (row[columnMapping.note] || null) : null,
        }))
        .filter((card) => card.front.trim() && card.back.trim());

      if (cards.length === 0) {
        setError('No valid cards found. Please check your column mapping.');
        setImporting(false);
        return;
      }

      await onImport(cards);
      resetState();
      onHide();
    } catch (err) {
      setError('Failed to import cards. Please try again.');
    } finally {
      setImporting(false);
    }
  };

  const resetState = () => {
    setFile(null);
    setParsedDataWithHeaders(null);
    setError(null);
    setColumnMapping(INITIAL_MAPPING);
    setAutoDetected(false);
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };

  const handleClose = () => {
    resetState();
    onHide();
  };

  const previewRows = parsedData ? parsedData.rows.slice(0, 5) : [];

  return (
    <Modal show={show} onHide={handleClose} size="lg" centered>
      <Modal.Header closeButton>
        <Modal.Title>
          <FiUpload className="me-2" />
          Import Flashcards
        </Modal.Title>
      </Modal.Header>

      <Modal.Body>
        {/* Error Alert */}
        {error && (
          <Alert variant="danger" onClose={() => setError(null)} dismissible>
            <FiAlertCircle className="me-2" />
            {error}
          </Alert>
        )}

        {/* Step 1: File Upload */}
        {!parsedData && (
          <div
            className={`import-dropzone ${dragActive ? 'drag-active' : ''}`}
            onDragEnter={handleDrag}
            onDragLeave={handleDrag}
            onDragOver={handleDrag}
            onDrop={handleDrop}
            onClick={() => fileInputRef.current?.click()}
          >
            <input
              ref={fileInputRef}
              type="file"
              accept=".csv,.xlsx,.xls"
              onChange={handleFileInputChange}
              style={{ display: 'none' }}
            />
            <FiFile size={48} className="import-dropzone-icon" />
            <p className="import-dropzone-text">
              Drag and drop your file here, or click to browse
            </p>
            <p className="import-dropzone-hint">
              Supports CSV and XLSX files
            </p>
          </div>
        )}

        {/* Step 2: Column Mapping */}
        {parsedData && (
          <div className="import-mapping">
            {/* File info */}
            <div className="import-file-info">
              <FiFile size={20} />
              <span>{file?.name}</span>
              <Button
                variant="link"
                size="sm"
                onClick={resetState}
                className="import-reset-btn"
              >
                Change file
              </Button>
            </div>

            {/* Column mapping */}
            <div className="d-flex align-items-center gap-2 mb-3">
              <h5 className="import-section-title mb-0">Map Columns</h5>
              {autoDetected && (
                <Badge bg="success" className="d-flex align-items-center gap-1">
                  <FiZap size={12} /> Auto-detected
                </Badge>
              )}
            </div>
            <p className="import-section-desc">
              {autoDetected
                ? 'Columns were auto-detected. You can adjust if needed.'
                : 'Select which column corresponds to each card field'}
            </p>

            <div className="import-mapping-grid">
              {CARD_FIELDS.map((field) => (
                <Form.Group key={field.key} className="import-mapping-field">
                  <Form.Label>
                    {field.label}
                    {field.required && <span className="text-danger"> *</span>}
                  </Form.Label>
                  <Form.Select
                    value={columnMapping[field.key]}
                    onChange={(e) => handleMappingChange(field.key, e.target.value)}
                  >
                    <option value={-1}>-- Select column --</option>
                    {parsedData.headers.map((header, idx) => (
                      <option key={idx} value={idx}>
                        {header || `Column ${idx + 1}`}
                      </option>
                    ))}
                  </Form.Select>
                </Form.Group>
              ))}
            </div>

            {/* Preview table */}
            {previewRows.length > 0 && (
              <>
                <h5 className="import-section-title mt-4">Preview (first 5 rows)</h5>
                <div className="import-preview-table">
                  <Table size="sm" bordered hover>
                    <thead>
                      <tr>
                        <th>#</th>
                        {parsedData.headers.map((header, idx) => (
                          <th
                            key={idx}
                            className={
                              columnMapping.front === idx
                                ? 'col-front'
                                : columnMapping.back === idx
                                ? 'col-back'
                                : ''
                            }
                          >
                            {header || `Col ${idx + 1}`}
                            {autoDetected && (columnMapping.front === idx || columnMapping.back === idx) && (
                              <Badge bg="info" pill className="ms-1" style={{ fontSize: '0.6rem' }}>auto</Badge>
                            )}
                          </th>
                        ))}
                      </tr>
                    </thead>
                    <tbody>
                      {previewRows.map((row, rowIdx) => (
                        <tr key={rowIdx}>
                          <td>{rowIdx + 1}</td>
                          {row.map((cell, cellIdx) => (
                            <td
                              key={cellIdx}
                              className={
                                columnMapping.front === cellIdx
                                  ? 'col-front'
                                  : columnMapping.back === cellIdx
                                  ? 'col-back'
                                  : ''
                              }
                            >
                              {cell || '-'}
                            </td>
                          ))}
                        </tr>
                      ))}
                    </tbody>
                  </Table>
                </div>
              </>
            )}
          </div>
        )}
      </Modal.Body>

      <Modal.Footer>
        <Button variant="secondary" onClick={handleClose}>
          Cancel
        </Button>
        {parsedData && (
          <Button
            variant={autoDetected ? 'success' : 'primary'}
            onClick={handleImport}
            disabled={importing || columnMapping.front === -1 || columnMapping.back === -1}
          >
            {importing ? (
              <>
                <span className="spinner-border spinner-border-sm me-2" />
                Importing...
              </>
            ) : autoDetected ? (
              <>
                <FiCheck className="me-2" />
                Import {parsedData.rows.length} Cards (Ready!)
              </>
            ) : (
              <>
                <FiCheck className="me-2" />
                Import {parsedData.rows.length} Cards
              </>
            )}
          </Button>
        )}
      </Modal.Footer>
    </Modal>
  );
}
