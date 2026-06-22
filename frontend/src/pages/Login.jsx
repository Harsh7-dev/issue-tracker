import { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { validateLogin } from '../utils/validation';

export default function Login() {
  const { login } = useAuth();
  const navigate = useNavigate();
  const [form, setForm] = useState({ email: '', password: '' });
  const [errors, setErrors] = useState({});
  const [serverError, setServerError] = useState('');
  const [loading, setLoading] = useState(false);

  const onChange = (e) => setForm({ ...form, [e.target.name]: e.target.value });

  const onSubmit = async (e) => {
    e.preventDefault();
    setServerError('');
    const errs = validateLogin(form);
    setErrors(errs);
    if (Object.keys(errs).length) return;
    setLoading(true);
    try {
      await login(form.email, form.password);
      navigate('/');
    } catch (err) {
      setServerError(err.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="auth-wrap">
      <div className="auth-card">
        <div className="flex items-center gap-12" style={{ marginBottom: 22 }}>
          <span className="brand-mark" />
          <h1>Beacon</h1>
        </div>
        <p className="eyebrow" style={{ marginBottom: 20 }}>Sign in to your workspace</p>
        <div className="card">
          {serverError && <div className="form-error" data-testid="login-error">{serverError}</div>}
          <form onSubmit={onSubmit} noValidate>
            <div className="field">
              <label htmlFor="email">Email</label>
              <input id="email" name="email" type="email" className="input"
                     value={form.email} onChange={onChange} data-testid="email-input" autoComplete="email" />
              {errors.email && <div className="error-text" data-testid="email-error">{errors.email}</div>}
            </div>
            <div className="field">
              <label htmlFor="password">Password</label>
              <input id="password" name="password" type="password" className="input"
                     value={form.password} onChange={onChange} data-testid="password-input" autoComplete="current-password" />
              {errors.password && <div className="error-text" data-testid="password-error">{errors.password}</div>}
            </div>
            <button type="submit" className="btn btn-primary" style={{ width: '100%', justifyContent: 'center' }}
                    disabled={loading} data-testid="login-submit">
              {loading ? <span className="spinner" /> : 'Sign in'}
            </button>
          </form>
        </div>
        <p className="auth-switch">
          New here? <Link to="/register" data-testid="goto-register">Create an account</Link>
        </p>
      </div>
    </div>
  );
}
