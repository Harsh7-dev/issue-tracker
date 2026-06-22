export const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

export function validateRegister({ name, email, password }) {
  const errors = {};
  if (!name || !name.trim()) errors.name = 'Name is required';
  if (!email || !EMAIL_RE.test(email)) errors.email = 'Enter a valid email address';
  if (!password || password.length < 8) errors.password = 'Password must be at least 8 characters';
  return errors;
}

export function validateLogin({ email, password }) {
  const errors = {};
  if (!email || !EMAIL_RE.test(email)) errors.email = 'Enter a valid email address';
  if (!password) errors.password = 'Password is required';
  return errors;
}

export function validateIssue({ title }) {
  const errors = {};
  if (!title || !title.trim()) errors.title = 'Title is required';
  return errors;
}

export function validateProject({ name }) {
  const errors = {};
  if (!name || !name.trim()) errors.name = 'Project name is required';
  return errors;
}
