# Component Examples Guide

## Common Components

### 1. Notification Components

#### NotificationBadge
```typescript
// components/NotificationBadge.tsx
import React from 'react';
import { Badge, IconButton } from '@mui/material';
import NotificationsIcon from '@mui/icons-material/Notifications';

interface Props {
  count: number;
  onClick: () => void;
}

export const NotificationBadge: React.FC<Props> = ({ count, onClick }) => {
  return (
    <IconButton onClick={onClick}>
      <Badge badgeContent={count} color="primary">
        <NotificationsIcon />
      </Badge>
    </IconButton>
  );
};
```

#### NotificationDrawer
```typescript
// components/NotificationDrawer.tsx
import React from 'react';
import {
  Drawer,
  List,
  ListItem,
  ListItemText,
  Typography,
  IconButton
} from '@mui/material';
import CloseIcon from '@mui/icons-material/Close';
import { formatDistanceToNow } from 'date-fns';

interface Notification {
  id: string;
  title: string;
  message: string;
  createdAt: Date;
  read: boolean;
}

interface Props {
  open: boolean;
  notifications: Notification[];
  onClose: () => void;
  onNotificationClick: (id: string) => void;
}

export const NotificationDrawer: React.FC<Props> = ({
  open,
  notifications,
  onClose,
  onNotificationClick
}) => {
  return (
    <Drawer anchor="right" open={open} onClose={onClose}>
      <div style={{ width: 300, padding: 16 }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <Typography variant="h6">Notifications</Typography>
          <IconButton onClick={onClose}>
            <CloseIcon />
          </IconButton>
        </div>
        <List>
          {notifications.map((notification) => (
            <ListItem
              key={notification.id}
              button
              onClick={() => onNotificationClick(notification.id)}
              style={{
                backgroundColor: notification.read ? 'transparent' : '#f0f7ff'
              }}
            >
              <ListItemText
                primary={notification.title}
                secondary={
                  <>
                    <Typography variant="body2" component="span">
                      {notification.message}
                    </Typography>
                    <br />
                    <Typography variant="caption" color="textSecondary">
                      {formatDistanceToNow(notification.createdAt, { addSuffix: true })}
                    </Typography>
                  </>
                }
              />
            </ListItem>
          ))}
        </List>
      </div>
    </Drawer>
  );
};
```

### 2. Form Components

#### PreferencesForm
```typescript
// components/PreferencesForm.tsx
import React from 'react';
import {
  FormControl,
  FormGroup,
  FormControlLabel,
  Switch,
  Typography,
  TimePicker,
  TextField
} from '@mui/material';

interface Preferences {
  enabled: boolean;
  categories: {
    appointments: boolean;
    messages: boolean;
    system: boolean;
  };
  quietHours: {
    enabled: boolean;
    start: string;
    end: string;
  };
}

interface Props {
  preferences: Preferences;
  onChange: (preferences: Preferences) => void;
}

export const PreferencesForm: React.FC<Props> = ({
  preferences,
  onChange
}) => {
  const handleCategoryChange = (category: keyof typeof preferences.categories) => {
    onChange({
      ...preferences,
      categories: {
        ...preferences.categories,
        [category]: !preferences.categories[category]
      }
    });
  };

  return (
    <FormControl component="fieldset">
      <Typography variant="h6" gutterBottom>
        Notification Preferences
      </Typography>
      
      <FormGroup>
        <FormControlLabel
          control={
            <Switch
              checked={preferences.enabled}
              onChange={() => onChange({
                ...preferences,
                enabled: !preferences.enabled
              })}
            />
          }
          label="Enable Notifications"
        />
      </FormGroup>

      <Typography variant="subtitle1" gutterBottom sx={{ mt: 2 }}>
        Categories
      </Typography>
      
      <FormGroup>
        <FormControlLabel
          control={
            <Switch
              checked={preferences.categories.appointments}
              onChange={() => handleCategoryChange('appointments')}
            />
          }
          label="Appointments"
        />
        <FormControlLabel
          control={
            <Switch
              checked={preferences.categories.messages}
              onChange={() => handleCategoryChange('messages')}
            />
          }
          label="Messages"
        />
        <FormControlLabel
          control={
            <Switch
              checked={preferences.categories.system}
              onChange={() => handleCategoryChange('system')}
            />
          }
          label="System"
        />
      </FormGroup>

      <Typography variant="subtitle1" gutterBottom sx={{ mt: 2 }}>
        Quiet Hours
      </Typography>
      
      <FormGroup>
        <FormControlLabel
          control={
            <Switch
              checked={preferences.quietHours.enabled}
              onChange={() => onChange({
                ...preferences,
                quietHours: {
                  ...preferences.quietHours,
                  enabled: !preferences.quietHours.enabled
                }
              })}
            />
          }
          label="Enable Quiet Hours"
        />
        
        {preferences.quietHours.enabled && (
          <div style={{ display: 'flex', gap: 16, marginTop: 8 }}>
            <TimePicker
              label="Start Time"
              value={preferences.quietHours.start}
              onChange={(newValue) => onChange({
                ...preferences,
                quietHours: {
                  ...preferences.quietHours,
                  start: newValue
                }
              })}
              renderInput={(params) => <TextField {...params} />}
            />
            <TimePicker
              label="End Time"
              value={preferences.quietHours.end}
              onChange={(newValue) => onChange({
                ...preferences,
                quietHours: {
                  ...preferences.quietHours,
                  end: newValue
                }
              })}
              renderInput={(params) => <TextField {...params} />}
            />
          </div>
        )}
      </FormGroup>
    </FormControl>
  );
};
```

### 3. Custom Hooks

#### useNotifications
```typescript
// hooks/useNotifications.ts
import { useState, useEffect, useCallback } from 'react';
import { io, Socket } from 'socket.io-client';
import { useAuth } from './useAuth';

interface Notification {
  id: string;
  title: string;
  message: string;
  createdAt: Date;
  read: boolean;
}

export const useNotifications = () => {
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);
  const [socket, setSocket] = useState<Socket | null>(null);
  const { token } = useAuth();

  const fetchNotifications = useCallback(async () => {
    try {
      const response = await fetch('/api/notifications', {
        headers: {
          Authorization: `Bearer ${token}`
        }
      });
      const data = await response.json();
      setNotifications(data);
      setLoading(false);
    } catch (err) {
      setError(err as Error);
      setLoading(false);
    }
  }, [token]);

  const markAsRead = useCallback(async (id: string) => {
    try {
      await fetch(`/api/notifications/${id}/read`, {
        method: 'PUT',
        headers: {
          Authorization: `Bearer ${token}`
        }
      });
      
      setNotifications(prev =>
        prev.map(notification =>
          notification.id === id
            ? { ...notification, read: true }
            : notification
        )
      );
    } catch (err) {
      setError(err as Error);
    }
  }, [token]);

  useEffect(() => {
    fetchNotifications();

    const socket = io(process.env.REACT_APP_WS_URL!, {
      auth: {
        token
      }
    });

    socket.on('notification', (notification: Notification) => {
      setNotifications(prev => [notification, ...prev]);
    });

    setSocket(socket);

    return () => {
      socket.disconnect();
    };
  }, [token, fetchNotifications]);

  return {
    notifications,
    loading,
    error,
    markAsRead,
    refetch: fetchNotifications
  };
};
```

### 4. Context Providers

#### NotificationContext
```typescript
// contexts/NotificationContext.tsx
import React, { createContext, useContext, useState } from 'react';
import { useNotifications } from '../hooks/useNotifications';

interface NotificationContextType {
  showNotification: (message: string) => void;
  notifications: Notification[];
  loading: boolean;
  error: Error | null;
  markAsRead: (id: string) => Promise<void>;
}

const NotificationContext = createContext<NotificationContextType | undefined>(undefined);

export const NotificationProvider: React.FC = ({ children }) => {
  const [toasts, setToasts] = useState<string[]>([]);
  const {
    notifications,
    loading,
    error,
    markAsRead
  } = useNotifications();

  const showNotification = (message: string) => {
    setToasts(prev => [...prev, message]);
    setTimeout(() => {
      setToasts(prev => prev.filter(t => t !== message));
    }, 3000);
  };

  return (
    <NotificationContext.Provider
      value={{
        showNotification,
        notifications,
        loading,
        error,
        markAsRead
      }}
    >
      {children}
      {toasts.map((message, index) => (
        <Toast key={index} message={message} />
      ))}
    </NotificationContext.Provider>
  );
};

export const useNotificationContext = () => {
  const context = useContext(NotificationContext);
  if (context === undefined) {
    throw new Error('useNotificationContext must be used within a NotificationProvider');
  }
  return context;
};
```

### 5. Utility Components

#### ErrorBoundary
```typescript
// components/ErrorBoundary.tsx
import React, { Component, ErrorInfo } from 'react';
import { Typography, Button, Box } from '@mui/material';

interface Props {
  children: React.ReactNode;
}

interface State {
  hasError: boolean;
  error: Error | null;
}

export class ErrorBoundary extends Component<Props, State> {
  constructor(props: Props) {
    super(props);
    this.state = {
      hasError: false,
      error: null
    };
  }

  static getDerivedStateFromError(error: Error): State {
    return {
      hasError: true,
      error
    };
  }

  componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    console.error('Error caught by boundary:', error, errorInfo);
  }

  handleRetry = () => {
    this.setState({
      hasError: false,
      error: null
    });
  };

  render() {
    if (this.state.hasError) {
      return (
        <Box
          display="flex"
          flexDirection="column"
          alignItems="center"
          justifyContent="center"
          minHeight="200px"
          p={3}
        >
          <Typography variant="h6" gutterBottom>
            Something went wrong
          </Typography>
          <Typography variant="body2" color="textSecondary" gutterBottom>
            {this.state.error?.message}
          </Typography>
          <Button
            variant="contained"
            color="primary"
            onClick={this.handleRetry}
          >
            Try Again
          </Button>
        </Box>
      );
    }

    return this.props.children;
  }
}
```

## Usage Examples

### Implementing Notifications

```typescript
// pages/Dashboard.tsx
import React, { useState } from 'react';
import { NotificationBadge } from '../components/NotificationBadge';
import { NotificationDrawer } from '../components/NotificationDrawer';
import { useNotifications } from '../hooks/useNotifications';

export const Dashboard: React.FC = () => {
  const [drawerOpen, setDrawerOpen] = useState(false);
  const {
    notifications,
    loading,
    error,
    markAsRead
  } = useNotifications();

  const unreadCount = notifications.filter(n => !n.read).length;

  const handleNotificationClick = (id: string) => {
    markAsRead(id);
  };

  if (loading) return <div>Loading...</div>;
  if (error) return <div>Error: {error.message}</div>;

  return (
    <>
      <NotificationBadge
        count={unreadCount}
        onClick={() => setDrawerOpen(true)}
      />
      <NotificationDrawer
        open={drawerOpen}
        notifications={notifications}
        onClose={() => setDrawerOpen(false)}
        onNotificationClick={handleNotificationClick}
      />
    </>
  );
};
```

### Managing Preferences

```typescript
// pages/Settings.tsx
import React from 'react';
import { PreferencesForm } from '../components/PreferencesForm';
import { useNotificationPreferences } from '../hooks/useNotificationPreferences';

export const Settings: React.FC = () => {
  const {
    preferences,
    loading,
    error,
    updatePreferences
  } = useNotificationPreferences();

  if (loading) return <div>Loading...</div>;
  if (error) return <div>Error: {error.message}</div>;

  return (
    <PreferencesForm
      preferences={preferences}
      onChange={updatePreferences}
    />
  );
};
```

## Best Practices

### 1. Component Organization
- Keep components focused and single-responsibility
- Use TypeScript interfaces for props
- Implement proper error handling
- Add loading states

### 2. Performance Optimization
- Use React.memo for pure components
- Implement proper cleanup in useEffect
- Optimize re-renders with useMemo and useCallback
- Use proper key props in lists

### 3. Accessibility
- Use semantic HTML elements
- Add ARIA labels where needed
- Ensure keyboard navigation
- Test with screen readers

### 4. Testing
- Write unit tests for components
- Test error states and loading states
- Test user interactions
- Test accessibility

## Component Library Integration

### 1. Material-UI Theme
```typescript
// theme/index.ts
import { createTheme } from '@mui/material/styles';

export const theme = createTheme({
  palette: {
    primary: {
      main: '#1976d2'
    },
    secondary: {
      main: '#dc004e'
    }
  },
  components: {
    MuiButton: {
      styleOverrides: {
        root: {
          textTransform: 'none'
        }
      }
    }
  }
});
```

### 2. Styled Components
```typescript
// components/styled/index.ts
import { styled } from '@mui/material/styles';
import { Paper, Card } from '@mui/material';

export const StyledCard = styled(Card)(({ theme }) => ({
  padding: theme.spacing(2),
  marginBottom: theme.spacing(2),
  '&:hover': {
    boxShadow: theme.shadows[4]
  }
}));

export const StyledPaper = styled(Paper)(({ theme }) => ({
  padding: theme.spacing(3),
  borderRadius: theme.shape.borderRadius * 2
}));
``` 