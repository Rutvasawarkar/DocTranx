import React, { useState, useRef } from 'react';
import { UploadCloud, X, File, CheckCircle } from 'lucide-react';
import './UploadDialog.css';

interface UploadDialogProps {
  isOpen: boolean;
  onClose: () => void;
  onUploadSuccess?: (file: File) => void;
}

const UploadDialog: React.FC<UploadDialogProps> = ({ isOpen, onClose, onUploadSuccess }) => {
  const [dragActive, setDragActive] = useState(false);
  const [file, setFile] = useState<File | null>(null);
  const [progress, setProgress] = useState(0);
  const [status, setStatus] = useState<'idle' | 'uploading' | 'success'>('idle');
  const inputRef = useRef<HTMLInputElement>(null);

  if (!isOpen) return null;

  const handleDrag = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (e.type === 'dragenter' || e.type === 'dragover') {
      setDragActive(true);
    } else if (e.type === 'dragleave') {
      setDragActive(false);
    }
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setDragActive(false);
    if (e.dataTransfer.files && e.dataTransfer.files[0]) {
      handleFile(e.dataTransfer.files[0]);
    }
  };

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    e.preventDefault();
    if (e.target.files && e.target.files[0]) {
      handleFile(e.target.files[0]);
    }
  };

  const handleFile = (selectedFile: File) => {
    setFile(selectedFile);
    setStatus('uploading');
    setProgress(0);
    
    // Simulate upload
    const interval = setInterval(() => {
      setProgress(p => {
        if (p >= 100) {
          clearInterval(interval);
          setStatus('success');
          return 100;
        }
        return p + 10;
      });
    }, 200);
  };

  return (
    <div className="dialog-overlay animate-fade-in flex-center">
      <div className="dialog-content glass-panel">
        <div className="dialog-header flex-between">
          <h3>Upload Document</h3>
          <button className="icon-btn text-secondary" onClick={onClose}><X size={20} /></button>
        </div>

        {status === 'idle' && (
          <div 
            className={`drop-zone flex-center ${dragActive ? 'active' : ''}`}
            onDragEnter={handleDrag}
            onDragLeave={handleDrag}
            onDragOver={handleDrag}
            onDrop={handleDrop}
            onClick={() => inputRef.current?.click()}
          >
            <input 
              ref={inputRef} 
              type="file" 
              className="hidden-input" 
              onChange={handleChange}
              accept=".pdf,.docx,.pptx"
            />
            <div className="drop-zone-content flex-center">
              <UploadCloud size={48} className="text-secondary mb-1" />
              <p className="drop-text">Drag & drop your file here</p>
              <p className="drop-hint text-secondary">or click to browse</p>
              <div className="supported-formats mt-2">
                Supports PDF, DOCX, PPTX
              </div>
            </div>
          </div>
        )}

        {status === 'uploading' && (
          <div className="upload-progress flex-center">
            <File size={40} className="text-secondary mb-2" />
            <p className="uploading-filename">{file?.name}</p>
            <div className="progress-bar-container">
              <div className="progress-bar" style={{ width: `${progress}%` }}></div>
            </div>
            <p className="progress-text text-secondary">{progress}% Uploading...</p>
          </div>
        )}

        {status === 'success' && (
          <div className="upload-success flex-center">
            <CheckCircle size={56} className="text-success mb-2" />
            <p className="success-text">Upload Complete!</p>
            <p className="success-hint text-secondary">{file?.name} has been processed.</p>
            <button className="btn btn-primary mt-3" onClick={() => {
              if (onUploadSuccess && file) {
                onUploadSuccess(file);
              } else {
                onClose();
              }
            }}>View Document</button>
          </div>
        )}
      </div>
    </div>
  );
};

export default UploadDialog;
