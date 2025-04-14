import { store } from '../../store';
import { login, logout } from '../authSlice';

describe('Auth Slice', () => {
  beforeEach(() => {
    store.dispatch(logout());
  });

  it('should handle successful login', async () => {
    const credentials = {
      email: 'test@example.com',
      password: 'password',
    };

    const result = await store.dispatch(login(credentials));
    const state = store.getState().auth;

    expect(result.type).toBe('auth/login/fulfilled');
    expect(state.isAuthenticated).toBe(true);
    expect(state.user).toBeTruthy();
    expect(state.token).toBeTruthy();
  });

  it('should handle failed login', async () => {
    const credentials = {
      email: 'wrong@example.com',
      password: 'wrongpassword',
    };

    const result = await store.dispatch(login(credentials));
    const state = store.getState().auth;

    expect(result.type).toBe('auth/login/rejected');
    expect(state.isAuthenticated).toBe(false);
    expect(state.error).toBeTruthy();
  });
}); 