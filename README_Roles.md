
# 🧑‍⚕️ Role-Based Access Guide – HealthAssist Pro

This guide explains how role-based access and dashboards are implemented in HealthAssist Pro.

---

## 👥 Roles Supported

- **Doctor**: Can diagnose patients, view and export treatments, and manage history.
- **Nurse**: Can create patient entries, input vitals, and track follow-ups.
- **Admin**: Can view audit logs, manage users, and monitor the system.

---

## 🔐 Backend (Node.js)

- **Middleware**: `authorizeRoles(...allowedRoles)` restricts access by role.
- **Protected Routes**:
  - `/api/v1/diagnose` → Doctor only
  - `/api/v1/patients/create` → Doctor or Nurse
  - `/api/v1/admin/audit` → Admin only

Middleware path: `backend/src/middlewares/authorizeRoles.js`

---

## 🖥️ Frontend (React + Material UI)

### Dashboards

Each role has a dedicated dashboard:

- `/dashboard/doctor` → `DoctorDashboard.tsx`
- `/dashboard/nurse` → `NurseDashboard.tsx`
- `/dashboard/admin` → `AdminDashboard.tsx`

Routes configured in: `frontend/src/routes/AppRoutes.tsx`

### ProtectedRoute Component

Located at: `frontend/src/components/ProtectedRoute.tsx`

Used to wrap role-restricted routes.

### Role-Based Redirect

- `useLoginRedirect.ts` automatically redirects users to their dashboard after login.
- Based on `user.role` from the auth context.

---

## 🧪 Testing Access

- Ensure JWT contains the `role` field.
- Use different test accounts to verify routing behavior.
- Accessing unauthorized routes redirects to `/unauthorized`.

---

## 📁 Key Files

- `backend/src/middlewares/authorizeRoles.js`
- `frontend/src/components/ProtectedRoute.tsx`
- `frontend/src/pages/DoctorDashboard.tsx`
- `frontend/src/pages/NurseDashboard.tsx`
- `frontend/src/pages/AdminDashboard.tsx`
- `frontend/src/hooks/useLoginRedirect.ts`
- `frontend/src/routes/AppRoutes.tsx`

---

For any role mismatch or unauthorized attempts, the user is redirected to `/unauthorized`.

