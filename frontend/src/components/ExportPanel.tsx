import React, { useState } from 'react';
import { X, FileText, Download } from 'lucide-react';
import './ExportPanel.css';

interface ExportPanelProps {
  isOpen: boolean;
  onClose: () => void;
}

const ExportPanel: React.FC<ExportPanelProps> = ({ isOpen, onClose }) => {
  const [format, setFormat] = useState('pdf');
  const [isExporting, setIsExporting] = useState(false);
  const [status, setStatus] = useState<'idle' | 'success'>('idle');

  if (!isOpen) return null;

  const handleExport = () => {
    setIsExporting(true);
    setTimeout(() => {
      setIsExporting(false);
      setStatus('success');
      setTimeout(() => {
        setStatus('idle');
        onClose();
      }, 2000);
    }, 1500);
  };

  return (
    <div className="dialog-overlay animate-fade-in flex-center">
      <div className="dialog-content glass-panel">
        <div className="dialog-header flex-between">
          <h3>Export Document</h3>
          <button className="icon-btn text-secondary" onClick={onClose}><X size={20} /></button>
        </div>

        <div className="export-options">
          <label className="export-label">Select Format</label>
          <div className="format-grid">
            {['pdf', 'docx', 'pptx', 'txt'].map(f => (
              <div 
                key={f} 
                className={`format-card flex-center ${format === f ? 'selected' : ''}`}
                onClick={() => setFormat(f)}
              >
                <FileText size={24} className="mb-1" />
                <span style={{textTransform: 'uppercase'}}>{f}</span>
              </div>
            ))}
          </div>
        </div>

        <div className="export-actions mt-3">
          {status === 'success' ? (
            <div className="success-msg text-success flex-center gap-sm">
              <Download size={18} /> Export ready!
            </div>
          ) : (
            <button 
              className="btn btn-primary w-100 flex-center gap-sm"
              onClick={handleExport}
              disabled={isExporting}
            >
              <Download size={18} />
              <span>{isExporting ? 'Exporting...' : 'Export'}</span>
            </button>
          )}
        </div>
      </div>
    </div>
  );
};

export default ExportPanel;
