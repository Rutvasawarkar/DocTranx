import React, { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { Upload, File, MoreVertical, Trash2, Search } from 'lucide-react';
import './Dashboard.css';

import UploadDialog from '../components/UploadDialog';

interface DocumentInfo {
  id: string;
  name: string;
  format: string;
  status: 'PROCESSING' | 'READY' | 'FAILED';
  date: string;
}

const Dashboard = () => {
  const navigate = useNavigate();
  const [isUploadOpen, setIsUploadOpen] = useState(false);
  const [documents, setDocuments] = useState<DocumentInfo[]>([
    { id: '1', name: 'Q3_Financial_Report.pdf', format: 'PDF', status: 'READY', date: 'Oct 12, 2026' },
    { id: '2', name: 'Project_Proposal_Draft.docx', format: 'DOCX', status: 'READY', date: 'Oct 10, 2026' },
    { id: '3', name: 'Marketing_Strategy.pptx', format: 'PPTX', status: 'PROCESSING', date: 'Oct 14, 2026' },
  ]);

  return (
    <div className="dashboard container animate-fade-in">
      <div className="dashboard-header flex-between">
        <div>
          <h1 className="page-title">My Documents</h1>
          <p className="page-subtitle">Manage, transform, and analyze your files</p>
        </div>
        <button 
          className="btn btn-primary flex-center gap-sm"
          onClick={() => setIsUploadOpen(true)}
        >
          <Upload size={18} />
          <span>Upload Document</span>
        </button>
      </div>

      <div className="search-bar glass-panel flex-center gap-sm">
        <Search size={20} className="text-secondary" />
        <input 
          type="text" 
          placeholder="Search by name, format, or content..." 
          className="search-input"
        />
      </div>

      <div className="documents-grid">
        {documents.map(doc => (
          <div key={doc.id} className="document-card glass-panel flex-between">
            <div className="doc-info flex-center gap-md">
              <div className="doc-icon-wrapper flex-center">
                <File size={24} className="doc-icon" />
              </div>
              <div>
                <Link to={`/document/${doc.id}`} className="doc-name-link">
                  <h3 className="doc-name">{doc.name}</h3>
                </Link>
                <div className="doc-meta flex-center gap-sm">
                  <span className="doc-format">{doc.format}</span>
                  <span className="dot-separator">•</span>
                  <span className="doc-date">{doc.date}</span>
                </div>
              </div>
            </div>
            <div className="doc-actions flex-center gap-md">
              <span className={`status-badge status-${doc.status.toLowerCase()}`}>
                {doc.status === 'PROCESSING' ? 'Processing...' : doc.status}
              </span>
              <button className="icon-btn text-secondary"><MoreVertical size={20} /></button>
            </div>
          </div>
        ))}
      </div>

      <UploadDialog 
        isOpen={isUploadOpen} 
        onClose={() => setIsUploadOpen(false)} 
        onUploadSuccess={(file) => {
          const newDoc: DocumentInfo = {
            id: Math.random().toString(36).substring(2, 11),
            name: file.name,
            format: file.name.split('.').pop()?.toUpperCase() || 'UNKNOWN',
            status: 'READY',
            date: new Date().toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })
          };
          setDocuments([newDoc, ...documents]);
          setIsUploadOpen(false);
          navigate(`/document/${newDoc.id}`, { state: { document: newDoc } });
        }}
      />
    </div>
  );
};

export default Dashboard;
