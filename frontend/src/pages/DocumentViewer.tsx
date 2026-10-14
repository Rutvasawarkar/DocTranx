import React, { useState } from 'react';
import { useParams, Link, useLocation } from 'react-router-dom';
import { ArrowLeft, Save, Download, Share2, FileText, Settings, History } from 'lucide-react';
import ExportPanel from '../components/ExportPanel';
import VersionHistoryPanel from '../components/VersionHistoryPanel';
import './DocumentViewer.css';

const MOCK_DOCUMENT = {
  id: '1',
  name: 'Q3_Financial_Report.pdf',
  format: 'PDF',
  sections: [
    { id: 's1', type: 'heading', level: 1, content: 'Q3 Financial Report 2026' },
    { id: 's2', type: 'paragraph', content: 'This report summarizes the financial performance for the third quarter of 2026. Revenue has grown by 15% compared to Q2, driven by strong enterprise sales.' },
    { id: 's3', type: 'heading', level: 2, content: 'Key Highlights' },
    { id: 's4', type: 'list', content: 'Enterprise revenue: $4.2M (+12%)' },
    { id: 's5', type: 'list', content: 'Operating margin: 24%' },
    { id: 's6', type: 'table-ref', content: 'Table 1: Revenue by Region' }
  ],
  tables: [
    {
      headers: ['Region', 'Q3 Revenue', 'Growth'],
      rows: [
        ['North America', '$2.1M', '+15%'],
        ['EMEA', '$1.5M', '+10%'],
        ['APAC', '$0.6M', '+20%']
      ]
    }
  ]
};

const DocumentViewer = () => {
  const { id } = useParams();
  const location = useLocation();
  const uploadedDoc = location.state?.document;
  
  const [document, setDocument] = useState(
    uploadedDoc 
      ? { ...MOCK_DOCUMENT, id: uploadedDoc.id, name: uploadedDoc.name, format: uploadedDoc.format } 
      : MOCK_DOCUMENT
  );
  const [activeTab, setActiveTab] = useState('editor');

  const [isExportOpen, setIsExportOpen] = useState(false);
  const [isHistoryOpen, setIsHistoryOpen] = useState(false);

  const renderSection = (section: any) => {
    switch (section.type) {
      case 'heading':
        const HeadingTag = `h${section.level}` as keyof JSX.IntrinsicElements;
        return <HeadingTag key={section.id} className={`doc-h${section.level}`} contentEditable suppressContentEditableWarning>{section.content}</HeadingTag>;
      case 'paragraph':
        return <p key={section.id} className="doc-p" contentEditable suppressContentEditableWarning>{section.content}</p>;
      case 'list':
        return <li key={section.id} className="doc-li" contentEditable suppressContentEditableWarning>{section.content}</li>;
      case 'table-ref':
        const tableIndex = parseInt(section.content.replace(/[^\d]/g, '')) - 1;
        const table = document.tables[tableIndex];
        if (!table) return null;
        return (
          <div key={section.id} className="doc-table-container">
            <h4 className="doc-table-title">{section.content}</h4>
            <table className="doc-table">
              <thead>
                <tr>
                  {table.headers.map((h: string, i: number) => <th key={i}>{h}</th>)}
                </tr>
              </thead>
              <tbody>
                {table.rows.map((row: string[], i: number) => (
                  <tr key={i}>
                    {row.map((cell: string, j: number) => <td key={j} contentEditable suppressContentEditableWarning>{cell}</td>)}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        );
      default:
        return <div key={section.id}>{section.content}</div>;
    }
  };

  return (
    <div className="viewer-container animate-fade-in">
      <div className="viewer-header glass-panel flex-between">
        <div className="flex-center gap-md">
          <Link to="/" className="icon-btn text-secondary"><ArrowLeft size={20} /></Link>
          <div>
            <h2 className="viewer-title">{document.name}</h2>
            <span className="status-badge status-ready">Structured JSON</span>
          </div>
        </div>
        <div className="viewer-actions flex-center gap-sm">
          <button className="icon-btn text-secondary" title="Version History" onClick={() => setIsHistoryOpen(true)}><History size={18} /></button>
          <button className="icon-btn text-secondary" title="Export" onClick={() => setIsExportOpen(true)}><Download size={18} /></button>
          <button className="icon-btn text-secondary" title="Share"><Share2 size={18} /></button>
          <button className="btn btn-primary flex-center gap-sm">
            <Save size={16} />
            <span>Save Changes</span>
          </button>
        </div>
      </div>

      <div className="viewer-body">
        <div className="viewer-sidebar glass-panel">
          <div className="sidebar-nav">
            <button 
              className={`sidebar-tab ${activeTab === 'editor' ? 'active' : ''}`}
              onClick={() => setActiveTab('editor')}
            >
              <FileText size={16} /> Editor
            </button>
            <button 
              className={`sidebar-tab ${activeTab === 'settings' ? 'active' : ''}`}
              onClick={() => setActiveTab('settings')}
            >
              <Settings size={16} /> Properties
            </button>
          </div>
          
          {activeTab === 'editor' && (
            <div className="outline-panel">
              <h3 className="panel-title">Document Outline</h3>
              <ul className="outline-list">
                {document.sections.filter(s => s.type === 'heading').map(s => (
                  <li key={s.id} className={`outline-item level-${s.level}`}>
                    {s.content}
                  </li>
                ))}
              </ul>
            </div>
          )}
        </div>

        <div className="viewer-content glass-panel">
          <div className="document-page">
            {document.sections.map(section => renderSection(section))}
          </div>
        </div>
      </div>

      <ExportPanel 
        isOpen={isExportOpen} 
        onClose={() => setIsExportOpen(false)} 
      />

      <VersionHistoryPanel 
        isOpen={isHistoryOpen} 
        onClose={() => setIsHistoryOpen(false)} 
      />
    </div>
  );
};

export default DocumentViewer;
