import React from 'react';
import { X, Clock, User, RotateCcw } from 'lucide-react';
import './VersionHistoryPanel.css';

interface Version {
  id: string;
  versionNumber: number;
  date: string;
  author: string;
  description: string;
  isCurrent?: boolean;
}

interface VersionHistoryPanelProps {
  isOpen: boolean;
  onClose: () => void;
}

const MOCK_VERSIONS: Version[] = [
  { id: 'v3', versionNumber: 3, date: 'Oct 12, 2026 14:30', author: 'Ayush B', description: 'Updated Q3 revenue numbers', isCurrent: true },
  { id: 'v2', versionNumber: 2, date: 'Oct 11, 2026 09:15', author: 'Ayush B', description: 'Fixed formatting in Table 1' },
  { id: 'v1', versionNumber: 1, date: 'Oct 10, 2026 16:45', author: 'System', description: 'Initial extraction from PDF' },
];

const VersionHistoryPanel: React.FC<VersionHistoryPanelProps> = ({ isOpen, onClose }) => {
  if (!isOpen) return null;

  return (
    <div className="side-panel-overlay animate-fade-in" onClick={onClose}>
      <div className="side-panel glass-panel" onClick={e => e.stopPropagation()}>
        <div className="panel-header flex-between">
          <div className="flex-center gap-sm">
            <Clock size={20} className="text-accent" />
            <h3>Version History</h3>
          </div>
          <button className="icon-btn text-secondary" onClick={onClose}><X size={20} /></button>
        </div>

        <div className="versions-list">
          {MOCK_VERSIONS.map((v, i) => (
            <div key={v.id} className={`version-item ${v.isCurrent ? 'current' : ''}`}>
              <div className="version-timeline-marker"></div>
              <div className="version-content">
                <div className="flex-between mb-1">
                  <span className="version-number">Version {v.versionNumber}</span>
                  <span className="version-date">{v.date}</span>
                </div>
                <p className="version-desc">{v.description}</p>
                <div className="flex-between mt-2">
                  <div className="version-author flex-center gap-sm">
                    <User size={14} /> {v.author}
                  </div>
                  {!v.isCurrent && (
                    <button className="btn-text flex-center gap-sm">
                      <RotateCcw size={14} /> Restore
                    </button>
                  )}
                  {v.isCurrent && (
                    <span className="current-badge">Current</span>
                  )}
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};

export default VersionHistoryPanel;
