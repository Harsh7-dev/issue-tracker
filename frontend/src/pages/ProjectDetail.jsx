import { useEffect, useState, useCallback } from 'react';
import { useParams, Link } from 'react-router-dom';
import { api } from '../api/client';
import Topbar from '../components/Topbar';
import Modal from '../components/Modal';
import Toast from '../components/Toast';
import { PriorityTag } from '../components/Badges';
import { validateIssue } from '../utils/validation';

const STATUSES = ['TODO', 'IN_PROGRESS', 'DONE'];
const PRIORITIES = ['LOW', 'MEDIUM', 'HIGH', 'CRITICAL'];

const emptyIssue = { title: '', description: '', priority: 'MEDIUM', status: 'TODO' };

export default function ProjectDetail() {
  const { id } = useParams();
  const [project, setProject] = useState(null);
  const [issues, setIssues] = useState([]);
  const [filters, setFilters] = useState({ title: '', status: '', priority: '' });
  const [loading, setLoading] = useState(true);
  const [modal, setModal] = useState(null); // 'create' | 'edit' | null
  const [editingId, setEditingId] = useState(null);
  const [form, setForm] = useState(emptyIssue);
  const [errors, setErrors] = useState({});
  const [toast, setToast] = useState({ message: '', type: 'info' });

  const loadProject = useCallback(async () => {
    try {
      setProject(await api.getProject(id));
    } catch (err) {
      setToast({ message: err.message, type: 'error' });
    }
  }, [id]);

  const loadIssues = useCallback(async () => {
    setLoading(true);
    try {
      setIssues(await api.listIssues(id, filters));
    } catch (err) {
      setToast({ message: err.message, type: 'error' });
    } finally {
      setLoading(false);
    }
  }, [id, filters]);

  useEffect(() => { loadProject(); }, [loadProject]);
  useEffect(() => {
    const t = setTimeout(loadIssues, 250); // debounce title search
    return () => clearTimeout(t);
  }, [loadIssues]);

  const openCreate = () => { setForm(emptyIssue); setErrors({}); setEditingId(null); setModal('create'); };
  const openEdit = (issue) => {
    setForm({ title: issue.title, description: issue.description || '', priority: issue.priority, status: issue.status });
    setErrors({});
    setEditingId(issue.id);
    setModal('edit');
  };

  const submitIssue = async (e) => {
    e.preventDefault();
    const errs = validateIssue(form);
    setErrors(errs);
    if (Object.keys(errs).length) return;
    try {
      if (modal === 'edit') {
        await api.updateIssue(editingId, form);
        setToast({ message: 'Issue updated', type: 'info' });
      } else {
        await api.createIssue(id, form);
        setToast({ message: 'Issue created', type: 'info' });
      }
      setModal(null);
      loadIssues();
    } catch (err) {
      setToast({ message: err.message, type: 'error' });
    }
  };

  const changeStatus = async (issue, status) => {
    try {
      await api.updateIssue(issue.id, { status });
      loadIssues();
    } catch (err) {
      setToast({ message: err.message, type: 'error' });
    }
  };

  const deleteIssue = async (issue) => {
    if (!window.confirm(`Delete "${issue.title}"?`)) return;
    try {
      await api.deleteIssue(issue.id);
      setToast({ message: 'Issue deleted', type: 'info' });
      loadIssues();
    } catch (err) {
      setToast({ message: err.message, type: 'error' });
    }
  };

  const archiveProject = async () => {
    if (!window.confirm('Archive this project?')) return;
    try {
      await api.archiveProject(id);
      loadProject();
      setToast({ message: 'Project archived', type: 'info' });
    } catch (err) {
      setToast({ message: err.message, type: 'error' });
    }
  };

  return (
    <div className="app-shell">
      <Topbar />
      <main className="container">
        <div className="crumb"><Link to="/" data-testid="back-dashboard">← Dashboard</Link></div>
        <div className="row-between">
          <div>
            <p className="eyebrow">Project</p>
            <h1 data-testid="project-title">{project?.name || '…'}</h1>
            <p className="muted" style={{ marginTop: 6 }}>{project?.description}</p>
          </div>
          <div className="flex gap-8">
            {project && !project.archived && (
              <button className="btn btn-ghost btn-sm" onClick={archiveProject} data-testid="archive-project-btn">
                Archive
              </button>
            )}
            <button className="btn btn-primary" onClick={openCreate} data-testid="new-issue-btn"
                    disabled={project?.archived}>
              + New issue
            </button>
          </div>
        </div>

        <div className="filters">
          <input className="input" placeholder="Search by title…"
                 value={filters.title}
                 onChange={(e) => setFilters({ ...filters, title: e.target.value })}
                 data-testid="filter-title" />
          <select className="select" value={filters.status}
                  onChange={(e) => setFilters({ ...filters, status: e.target.value })}
                  data-testid="filter-status">
            <option value="">All statuses</option>
            {STATUSES.map((s) => <option key={s} value={s}>{s.replace('_', ' ')}</option>)}
          </select>
          <select className="select" value={filters.priority}
                  onChange={(e) => setFilters({ ...filters, priority: e.target.value })}
                  data-testid="filter-priority">
            <option value="">All priorities</option>
            {PRIORITIES.map((p) => <option key={p} value={p}>{p}</option>)}
          </select>
        </div>

        {loading ? (
          <div className="empty"><span className="spinner" /></div>
        ) : issues.length === 0 ? (
          <div className="empty" data-testid="issues-empty">No issues match your filters.</div>
        ) : (
          <table className="issue-table" data-testid="issue-table">
            <thead>
              <tr>
                <th>Title</th><th>Priority</th><th>Status</th><th>Updated</th><th></th>
              </tr>
            </thead>
            <tbody>
              {issues.map((issue) => (
                <tr key={issue.id} data-testid="issue-row">
                  <td>
                    <button className="btn-ghost" style={{ border: 'none', padding: 0, color: 'inherit', textAlign: 'left' }}
                            onClick={() => openEdit(issue)} data-testid="issue-title">
                      {issue.title}
                    </button>
                  </td>
                  <td><PriorityTag priority={issue.priority} /></td>
                  <td>
                    <select className="select" style={{ width: 'auto', padding: '4px 8px', fontSize: 12.5 }}
                            value={issue.status}
                            onChange={(e) => changeStatus(issue, e.target.value)}
                            data-testid="status-select">
                      {STATUSES.map((s) => <option key={s} value={s}>{s.replace('_', ' ')}</option>)}
                    </select>
                  </td>
                  <td className="mono muted" style={{ fontSize: 12 }}>
                    {new Date(issue.updatedAt).toLocaleDateString()}
                  </td>
                  <td style={{ textAlign: 'right' }}>
                    <button className="btn btn-danger btn-sm" onClick={() => deleteIssue(issue)} data-testid="delete-issue-btn">
                      Delete
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </main>

      {modal && (
        <Modal title={modal === 'edit' ? 'Edit issue' : 'New issue'} onClose={() => setModal(null)} testid="issue-modal">
          <form onSubmit={submitIssue} noValidate>
            <div className="field">
              <label htmlFor="i-title">Title</label>
              <input id="i-title" className="input" value={form.title}
                     onChange={(e) => setForm({ ...form, title: e.target.value })}
                     data-testid="issue-title-input" />
              {errors.title && <div className="error-text" data-testid="issue-title-error">{errors.title}</div>}
            </div>
            <div className="field">
              <label htmlFor="i-desc">Description</label>
              <textarea id="i-desc" className="textarea" value={form.description}
                        onChange={(e) => setForm({ ...form, description: e.target.value })}
                        data-testid="issue-desc-input" />
            </div>
            <div className="filters" style={{ margin: 0, gridTemplateColumns: '1fr 1fr' }}>
              <div className="field">
                <label htmlFor="i-prio">Priority</label>
                <select id="i-prio" className="select" value={form.priority}
                        onChange={(e) => setForm({ ...form, priority: e.target.value })}
                        data-testid="issue-priority-input">
                  {PRIORITIES.map((p) => <option key={p} value={p}>{p}</option>)}
                </select>
              </div>
              <div className="field">
                <label htmlFor="i-status">Status</label>
                <select id="i-status" className="select" value={form.status}
                        onChange={(e) => setForm({ ...form, status: e.target.value })}
                        data-testid="issue-status-input">
                  {STATUSES.map((s) => <option key={s} value={s}>{s.replace('_', ' ')}</option>)}
                </select>
              </div>
            </div>
            <div className="modal-actions">
              <button type="button" className="btn btn-ghost" onClick={() => setModal(null)} data-testid="issue-cancel">Cancel</button>
              <button type="submit" className="btn btn-primary" data-testid="issue-save">
                {modal === 'edit' ? 'Save changes' : 'Create issue'}
              </button>
            </div>
          </form>
        </Modal>
      )}

      <Toast message={toast.message} type={toast.type} onDone={() => setToast({ message: '', type: 'info' })} />
    </div>
  );
}
