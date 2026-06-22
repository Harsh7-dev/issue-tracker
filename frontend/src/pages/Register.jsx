import { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { validateRegister } from '../utils/validation';

export default function Register() {
  const { register } = useAuth();
  const navigate = useNavigate();
  const [form, setForm] = useState({ name: '', email: '', password: '' });
  const [errors, setErrors] = useState({});
  const [serverError, setServerError] = useState('');
  const [loading, setLoading] = useState(false);

  const onChange = (e) => setForm({ ...form, [e.target.name]: e.target.value });

  const onSubmit = async (e) => {
    e.preventDefault();
    setServerError('');
    const errs = validateRegister(form);
    setErrors(errs);
    if (Object.keys(errs).length) return;
    setLoading(true);
    try {
      await register(form.name, form.email, form.password);
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
        <p className="eyebrow" style={{ marginBottom: 20 }}>Create your account</p>
        <div className="card">
          {serverError && <div className="form-error" data-testid="register-error">{serverError}</div>}
          <form onSubmit={onSubmit} noValidate>
            <div className="field">
              <label htmlFor="name">Name</label>
              <input id="name" name="name" className="input"
                     value={form.name} onChange={onChange} data-testid="name-input" />
              {errors.name && <div className="error-text" data-testid="name-error">{errors.name}</div>}
            </div>
            <div className="field">
              <label htmlFor="email">Email</label>
              <input id="email" name="email" type="email" className="input"
                     value={form.email} onChange={onChange} data-testid="email-input" />
              {errors.email && <div className="error-text" data-testid="email-error">{errors.email}</div>}
            </div>
            <div className="field">
              <label htmlFor="password">Password</label>
              <input id="password" name="password" type="password" className="input"
                     value={form.password} onChange={onChange} data-testid="password-input" />
              {errors.password && <div className="error-text" data-testid="password-error">{errors.password}</div>}
            </div>
            <button type="submit" className="btn btn-primary" style={{ width: '100%', justifyContent: 'center' }}
                    disabled={loading} data-testid="register-submit">
              {loading ? <span className="spinner" /> : 'Create account'}
            </button>
          </form>
        </div>
        <p className="auth-switch">
          Already have an account? <Link to="/login" data-testid="goto-login">Sign in</Link>
        </p>
      </div>
    </div>
  );
}
