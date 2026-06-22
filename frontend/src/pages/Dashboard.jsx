import { useEffect, useState, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { api } from '../api/client';
import Topbar from '../components/Topbar';
import Modal from '../components/Modal';
import Toast from '../components/Toast';
import { validateProject } from '../utils/validation';

export default function Dashboard() {
  const navigate = useNavigate();
  const [stats, setStats] = useState({ totalProjects: 0, totalIssues: 0, openIssues: 0, completedIssues: 0 });
  const [projects, setProjects] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [form, setForm] = useState({ name: '', description: '' });
  const [errors, setErrors] = useState({});
  const [toast, setToast] = useState({ message: '', type: 'info' });

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const [s, p] = await Promise.all([api.getStats(), api.listProjects()]);
      setStats(s);
      setProjects(p);
    } catch (err) {
      setToast({ message: err.message, type: 'error' });
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { load(); }, [load]);

  const createProject = async (e) => {
    e.preventDefault();
    const errs = validateProject(form);
    setErrors(errs);
    if (Object.keys(errs).length) return;
    try {
      await api.createProject(form);
      setShowModal(false);
      setForm({ name: '', description: '' });
      setToast({ message: 'Project created', type: 'info' });
      load();
    } catch (err) {
      setToast({ message: err.message, type: 'error' });
    }
  };

  const statCards = [
    { key: 'totalProjects', label: 'Total projects', value: stats.totalProjects, testid: 'stat-projects' },
    { key: 'totalIssues', label: 'Total issues', value: stats.totalIssues, testid: 'stat-issues' },
    { key: 'openIssues', label: 'Open issues', value: stats.openIssues, testid: 'stat-open' },
    { key: 'completedIssues', label: 'Completed', value: stats.completedIssues, testid: 'stat-completed' },
  ];

  return (
    <div className="app-shell">
      <Topbar />
      <main className="container">
        <div className="row-between">
          <div>
            <p className="eyebrow">Overview</p>
            <h1>Dashboard</h1>
          </div>
          <button className="btn btn-primary" onClick={() => setShowModal(true)} data-testid="new-project-btn">
            + New project
          </button>
        </div>

        <div className="stat-grid">
          {statCards.map((s) => (
            <div className="stat" key={s.key} data-testid={s.testid}>
              <div className="stat-value">{loading ? '—' : s.value}</div>
              <div className="stat-label">{s.label}</div>
            </div>
          ))}
        </div>

        <h2>Projects</h2>
        {loading ? (
          <div className="empty"><span className="spinner" /></div>
        ) : projects.length === 0 ? (
          <div className="empty" data-testid="projects-empty">
            No projects yet. Create your first one to start tracking issues.
          </div>
        ) : (
          <div className="project-grid" data-testid="project-grid">
            {projects.map((p) => (
              <div className="card project-card" key={p.id}
                   onClick={() => navigate(`/projects/${p.id}`)}
                   data-testid="project-card">
                <div className="row-between">
                  <h2 style={{ fontSize: 17 }}>{p.name}</h2>
                  {p.archived && <span className="archived-tag" data-testid="archived-tag">ARCHIVED</span>}
                </div>
                <p className="desc">{p.description || 'No description'}</p>
                <span className="mono muted" style={{ fontSize: 11 }}>
                  {new Date(p.createdAt).toLocaleDateString()}
                </span>
              </div>
            ))}
          </div>
        )}
      </main>

      {showModal && (
        <Modal title="New project" onClose={() => setShowModal(false)} testid="project-modal">
          <form onSubmit={createProject} noValidate>
            <div className="field">
              <label htmlFor="p-name">Name</label>
              <input id="p-name" className="input" value={form.name}
                     onChange={(e) => setForm({ ...form, name: e.target.value })}
                     data-testid="project-name-input" />
              {errors.name && <div className="error-text" data-testid="project-name-error">{errors.name}</div>}
            </div>
            <div className="field">
              <label htmlFor="p-desc">Description</label>
              <textarea id="p-desc" className="textarea" value={form.description}
                        onChange={(e) => setForm({ ...form, description: e.target.value })}
                        data-testid="project-desc-input" />
            </div>
            <div className="modal-actions">
              <button type="button" className="btn btn-ghost" onClick={() => setShowModal(false)} data-testid="project-cancel">Cancel</button>
              <button type="submit" className="btn btn-primary" data-testid="project-save">Create project</button>
            </div>
          </form>
        </Modal>
      )}

      <Toast message={toast.message} type={toast.type} onDone={() => setToast({ message: '', type: 'info' })} />
    </div>
  );
}
