import { useEffect, useState } from 'react';
import { api } from '../api';
import Markdown from './Markdown.jsx';
import { prettyName, stripRolePrefix } from './agentDisplay.js';

export default function TraceModal({ sessionId, onClose }) {
  const [trace, setTrace] = useState(null);
  const [error, setError] = useState(null);

  useEffect(() => {
    if (!sessionId) return;
    let cancelled = false;
    setTrace(null);
    setError(null);
    api
      .trace(sessionId)
      .then((t) => !cancelled && setTrace(t))
      .catch((e) => !cancelled && setError(e.message));
    return () => {
      cancelled = true;
    };
  }, [sessionId]);

  if (!sessionId) return null;

  return (
    <div
      className="position-fixed top-0 start-0 w-100 h-100 d-flex justify-content-center align-items-center"
      style={{ backgroundColor: 'rgba(0,0,0,0.6)', zIndex: 1050 }}
      onMouseDown={(e) => e.target === e.currentTarget && onClose()}
    >
      <div
        className="card bg-black border-secondary shadow-lg"
        style={{ width: '100%', maxWidth: 720, maxHeight: '85vh' }}
      >
        <div className="card-header border-secondary d-flex justify-content-between align-items-center">
          <span className="fw-bold">Трасування сесії</span>
          <button className="btn-close btn-close-white" onClick={onClose} />
        </div>
        <div className="card-body overflow-auto">
          {error && <div className="alert alert-danger py-2">{error}</div>}
          {!trace && !error && <p className="text-secondary">Завантаження…</p>}

          {trace && (
            <>
              <div className="text-secondary small mb-3">
                Ітерацій: {trace.iterations} · токенів вхід/вихід:{' '}
                {trace.tokensInTotal ?? '—'}/{trace.tokensOutTotal ?? '—'} · завершено:{' '}
                {trace.completedAt ? new Date(trace.completedAt).toLocaleString() : '—'}
              </div>

              {trace.errorMessage && (
                <div className="alert alert-warning py-2">
                  [{trace.errorType}] {trace.errorMessage}
                </div>
              )}

              {(trace.trace || []).map((step, i) => (
                <div key={i} className="border-bottom border-secondary py-2">
                  <div className="d-flex justify-content-between">
                    <span className="fw-medium" style={{ color: '#b9a8ff' }}>{prettyName(step.agentRole)}</span>
                    <span className="text-secondary small">
                      {step.tokensIn ?? '—'}/{step.tokensOut ?? '—'} ток.
                    </span>
                  </div>
                  <Markdown>{stripRolePrefix(step.output, step.agentRole)}</Markdown>
                  {step.toolsUsed?.length > 0 && (
                    <div className="text-secondary small mt-1">
                      Інструменти: {step.toolsUsed.join(', ')}
                    </div>
                  )}
                </div>
              ))}
            </>
          )}
        </div>
      </div>
    </div>
  );
}
