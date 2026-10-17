import React, { useState, useEffect } from 'react';
import { 
  Database, 
  FileText, 
  Calendar, 
  FileCode, 
  BookOpen, 
  CheckCircle2, 
  AlertCircle, 
  Upload, 
  RefreshCw 
} from 'lucide-react';
import type { 
  DataSourcesStatus, 
  FileValidationDetail 
} from '../api/client';
import { 
  fetchDataSources, 
  uploadDataFile 
} from '../api/client';

export const DataSourcesView: React.FC = () => {
  const [sources, setSources] = useState<DataSourcesStatus | null>(null);
  const [loading, setLoading] = useState<boolean>(true);
  const [_uploading, setUploading] = useState<boolean>(false);
  const [uploadStatus, setUploadStatus] = useState<string | null>(null);

  const loadData = async () => {
    setLoading(true);
    try {
      const data = await fetchDataSources();
      setSources(data);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, []);

  const handleFileUpload = async (fileType: string, e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setUploading(true);
    setUploadStatus(`Uploading and validating ${file.name}...`);
    try {
      const res = await uploadDataFile(fileType, file);
      setUploadStatus(`Successfully verified ${file.name} (${res.row_count} rows/lines).`);
      await loadData();
    } catch (err: any) {
      setUploadStatus(`Error uploading file: ${err.message}`);
    } finally {
      setUploading(false);
    }
  };

  const renderFileCard = (
    title: string,
    fileType: string,
    icon: React.ReactNode,
    detail?: FileValidationDetail,
    uploadAccept?: string
  ) => {
    return (
      <div className="bg-surface p-5 rounded-xl border border-border-subtle shadow-sm flex flex-col justify-between gap-4">
        <div className="flex items-start justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-lg bg-navy text-white flex items-center justify-center">
              {icon}
            </div>
            <div className="flex flex-col">
              <span className="text-sm font-bold text-navy">{title}</span>
              <span className="text-xs text-slate-500 font-mono">{detail?.file_name || 'Not Available'}</span>
            </div>
          </div>
          {detail?.valid ? (
            <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full bg-teal-light text-teal-dark border border-teal/20 text-xs font-semibold">
              <CheckCircle2 className="w-3.5 h-3.5" />
              Verified
            </span>
          ) : (
            <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full bg-rose-50 text-rose-700 border border-rose-200 text-xs font-semibold">
              <AlertCircle className="w-3.5 h-3.5" />
              Needs Review
            </span>
          )}
        </div>

        <div className="bg-ivory p-3.5 rounded-lg border border-slate-100 flex flex-col gap-1.5 text-xs">
          <div className="flex justify-between text-slate-600">
            <span>File Size:</span>
            <span className="font-mono font-semibold text-navy">
              {detail ? (detail.size_bytes / 1024 / 1024).toFixed(2) : 0} MB
            </span>
          </div>
          <div className="flex justify-between text-slate-600">
            <span>Records / Lines:</span>
            <span className="font-mono font-semibold text-navy">
              {detail ? detail.row_or_line_count.toLocaleString() : 0}
            </span>
          </div>
          <div className="flex justify-between text-slate-600">
            <span>Fields / Schema:</span>
            <span className="font-medium text-slate-700 truncate max-w-[200px]" title={detail?.columns_or_fields.join(', ')}>
              {detail?.columns_or_fields.slice(0, 3).join(', ')}...
            </span>
          </div>
        </div>

        {detail?.errors && detail.errors.length > 0 && (
          <div className="p-2.5 bg-rose-50 border border-rose-200 rounded text-rose-700 text-xs">
            {detail.errors.join(', ')}
          </div>
        )}

        <div className="pt-2 border-t border-border-subtle flex items-center justify-between">
          <label className="cursor-pointer text-xs font-semibold text-royal hover:text-navy flex items-center gap-1.5">
            <Upload className="w-3.5 h-3.5" />
            <span>Upload New Version</span>
            <input
              type="file"
              accept={uploadAccept}
              className="hidden"
              onChange={(e) => handleFileUpload(fileType, e)}
            />
          </label>
        </div>
      </div>
    );
  };

  return (
    <div className="flex flex-col w-full gap-6">
      {/* Top Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 bg-surface p-5 rounded-xl border border-border-subtle shadow-sm">
        <div>
          <h1 className="text-xl text-navy font-bold tracking-tight">Enterprise Data Sources</h1>
          <p className="text-xs text-slate-500 mt-0.5">
            Validation status and schema inspection for all 5 enterprise assets used in financial reconciliation.
          </p>
        </div>
        <button
          onClick={loadData}
          className="flex items-center gap-1.5 px-3 py-1.5 bg-surface hover:bg-slate-50 text-slate-700 border border-border-subtle rounded-lg text-xs font-semibold shadow-sm transition-colors"
        >
          <RefreshCw className="w-3.5 h-3.5 text-slate-500" />
          <span>Re-verify Data Sources</span>
        </button>
      </div>

      {uploadStatus && (
        <div className="p-3 bg-royal-light border border-royal/20 rounded-lg text-xs font-semibold text-royal flex items-center gap-2">
          <CheckCircle2 className="w-4 h-4" />
          <span>{uploadStatus}</span>
        </div>
      )}

      {loading ? (
        <div className="flex flex-col items-center justify-center min-h-[40vh] gap-3">
          <div className="w-8 h-8 border-4 border-royal border-t-transparent rounded-full animate-spin"></div>
          <span className="text-xs text-slate-500">Inspecting filesystem and database schemas...</span>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-6">
          {renderFileCard(
            'Master Customer Database',
            'db',
            <Database className="w-5 h-5" />,
            sources?.database,
            '.db,.sqlite'
          )}
          {renderFileCard(
            'Server Transaction Logs',
            'logs',
            <FileText className="w-5 h-5" />,
            sources?.server_logs,
            '.txt,.log'
          )}
          {renderFileCard(
            'Daily FX Exchange Rates',
            'rates',
            <Calendar className="w-5 h-5" />,
            sources?.exchange_rates,
            '.csv'
          )}
          {renderFileCard(
            'Statement PDF (Trap Analysis)',
            'statement',
            <BookOpen className="w-5 h-5" />,
            sources?.statement_pdf,
            '.pdf'
          )}
          {renderFileCard(
            'Reference Notebook',
            'notebook',
            <FileCode className="w-5 h-5" />,
            sources?.student_notebook,
            '.ipynb'
          )}
        </div>
      )}
    </div>
  );
};
