import React, { useState, useEffect } from 'react';
import {
  Box,
  Card,
  CardContent,
  Grid,
  Typography,
  List,
  ListItem,
  ListItemText,
  Alert,
  CircularProgress,
  Chip,
  Paper,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  IconButton,
  Tooltip,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  TextField
} from '@mui/material';
import {
  SecurityOutlined,
  ErrorOutline,
  WarningAmber,
  Info,
  Refresh,
  TrendingUp,
  TrendingDown
} from '@mui/icons-material';
import { DateRangePicker } from '@mui/x-date-pickers';
import { ThreatMap } from '@/components/ThreatMap';

interface SecurityMetrics {
  activeUsers: number;
  failedLogins: number;
  blockedIPs: number;
  activeDevices: number;
  twoFactorEnabled: number;
  securityScore: number;
  threatLocations: Array<{
    country: string;
    count: number;
    lat: number;
    lng: number;
  }>;
  vulnerabilities: {
    high: number;
    medium: number;
    low: number;
  };
}

interface SecurityEvent {
  id: string;
  timestamp: Date;
  type: 'error' | 'warning' | 'info';
  message: string;
  details: string;
  ipAddress: string;
  userId?: string;
  category: 'auth' | 'access' | 'system' | 'data';
}

interface SecurityDashboardProps {
  refreshInterval?: number; // in milliseconds
}

const SecurityDashboard: React.FC<SecurityDashboardProps> = ({ refreshInterval = 30000 }) => {
  const [metrics, setMetrics] = useState<SecurityMetrics | null>(null);
  const [events, setEvents] = useState<SecurityEvent[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [eventFilter, setEventFilter] = useState<SecurityEvent['type'] | 'all'>('all');
  const [categoryFilter, setCategoryFilter] = useState<SecurityEvent['category'] | 'all'>('all');
  const [dateRange, setDateRange] = useState<[Date | null, Date | null]>([null, null]);

  const fetchSecurityData = async () => {
    try {
      setError(null);

      // Fetch security metrics
      const metricsResponse = await fetch('/api/security/metrics');
      const metricsData = await metricsResponse.json();

      if (!metricsResponse.ok) throw new Error(metricsData.message);

      setMetrics(metricsData);

      // Fetch security events
      const eventsResponse = await fetch('/api/security/events');
      const eventsData = await eventsResponse.json();

      if (!eventsResponse.ok) throw new Error(eventsData.message);

      setEvents(eventsData.events);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to fetch security data');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchSecurityData();
    const interval = setInterval(fetchSecurityData, refreshInterval);
    return () => clearInterval(interval);
  }, [refreshInterval]);

  const getEventIcon = (type: SecurityEvent['type']) => {
    switch (type) {
      case 'error':
        return <ErrorOutline color="error" />;
      case 'warning':
        return <WarningAmber color="warning" />;
      case 'info':
        return <Info color="info" />;
    }
  };

  const formatTimestamp = (date: Date) => {
    return new Date(date).toLocaleString();
  };

  const filteredEvents = events.filter(event => {
    const matchesType = eventFilter === 'all' || event.type === eventFilter;
    const matchesCategory = categoryFilter === 'all' || event.category === categoryFilter;
    const matchesDate = !dateRange[0] || !dateRange[1] || 
      (new Date(event.timestamp) >= dateRange[0] && new Date(event.timestamp) <= dateRange[1]);
    return matchesType && matchesCategory && matchesDate;
  });

  const getSecurityScoreColor = (score: number) => {
    if (score >= 80) return 'success';
    if (score >= 60) return 'warning';
    return 'error';
  };

  if (loading) {
    return (
      <Box display="flex" justifyContent="center" p={4}>
        <CircularProgress />
      </Box>
    );
  }

  return (
    <Box>
      <Box display="flex" alignItems="center" justifyContent="space-between" mb={3}>
        <Box display="flex" alignItems="center">
          <SecurityOutlined color="primary" sx={{ mr: 1 }} />
          <Typography variant="h5">Security Dashboard</Typography>
        </Box>
        <Tooltip title="Refresh data">
          <IconButton onClick={fetchSecurityData}>
            <Refresh />
          </IconButton>
        </Tooltip>
      </Box>

      {error && (
        <Alert severity="error" sx={{ mb: 3 }}>
          {error}
        </Alert>
      )}

      {metrics && (
        <Grid container spacing={3} mb={4}>
          <Grid item xs={12} sm={6} md={3}>
            <Card>
              <CardContent>
                <Typography color="textSecondary" gutterBottom>
                  Active Users
                </Typography>
                <Typography variant="h4">{metrics.activeUsers}</Typography>
              </CardContent>
            </Card>
          </Grid>
          <Grid item xs={12} sm={6} md={3}>
            <Card>
              <CardContent>
                <Typography color="textSecondary" gutterBottom>
                  Failed Logins (24h)
                </Typography>
                <Typography variant="h4">{metrics.failedLogins}</Typography>
              </CardContent>
            </Card>
          </Grid>
          <Grid item xs={12} sm={6} md={3}>
            <Card>
              <CardContent>
                <Typography color="textSecondary" gutterBottom>
                  Blocked IPs
                </Typography>
                <Typography variant="h4">{metrics.blockedIPs}</Typography>
              </CardContent>
            </Card>
          </Grid>
          <Grid item xs={12} sm={6} md={3}>
            <Card>
              <CardContent>
                <Typography color="textSecondary" gutterBottom>
                  2FA Adoption
                </Typography>
                <Box display="flex" alignItems="center">
                  <Typography variant="h4">
                    {Math.round((metrics.twoFactorEnabled / metrics.activeUsers) * 100)}%
                  </Typography>
                  {metrics.twoFactorEnabled > metrics.activeUsers / 2 ? (
                    <TrendingUp color="success" sx={{ ml: 1 }} />
                  ) : (
                    <TrendingDown color="error" sx={{ ml: 1 }} />
                  )}
                </Box>
              </CardContent>
            </Card>
          </Grid>
          <Grid item xs={12} sm={6} md={3}>
            <Card>
              <CardContent>
                <Typography color="textSecondary" gutterBottom>
                  Security Score
                </Typography>
                <Box display="flex" alignItems="center">
                  <CircularProgress
                    variant="determinate"
                    value={metrics.securityScore}
                    color={getSecurityScoreColor(metrics.securityScore)}
                    size={60}
                  />
                  <Typography variant="h4" sx={{ ml: 2 }}>
                    {metrics.securityScore}%
                  </Typography>
                </Box>
              </CardContent>
            </Card>
          </Grid>
        </Grid>
      )}

      <Grid container spacing={3}>
        <Grid item xs={12} md={8}>
          <Card>
            <CardContent>
              <Box display="flex" justifyContent="space-between" alignItems="center" mb={2}>
                <Typography variant="h6">Recent Security Events</Typography>
                <Box display="flex" gap={2}>
                  <FormControl size="small">
                    <InputLabel>Type</InputLabel>
                    <Select
                      value={eventFilter}
                      onChange={(e) => setEventFilter(e.target.value as typeof eventFilter)}
                      label="Type"
                    >
                      <MenuItem value="all">All</MenuItem>
                      <MenuItem value="error">Error</MenuItem>
                      <MenuItem value="warning">Warning</MenuItem>
                      <MenuItem value="info">Info</MenuItem>
                    </Select>
                  </FormControl>
                  <FormControl size="small">
                    <InputLabel>Category</InputLabel>
                    <Select
                      value={categoryFilter}
                      onChange={(e) => setCategoryFilter(e.target.value as typeof categoryFilter)}
                      label="Category"
                    >
                      <MenuItem value="all">All</MenuItem>
                      <MenuItem value="auth">Authentication</MenuItem>
                      <MenuItem value="access">Access Control</MenuItem>
                      <MenuItem value="system">System</MenuItem>
                      <MenuItem value="data">Data</MenuItem>
                    </Select>
                  </FormControl>
                  <DateRangePicker
                    value={dateRange}
                    onChange={(newValue) => setDateRange(newValue)}
                    renderInput={(startProps, endProps) => (
                      <>
                        <TextField {...startProps} size="small" />
                        <Box sx={{ mx: 1 }}> to </Box>
                        <TextField {...endProps} size="small" />
                      </>
                    )}
                  />
                </Box>
              </Box>
              <TableContainer>
                <Table>
                  <TableHead>
                    <TableRow>
                      <TableCell>Type</TableCell>
                      <TableCell>Timestamp</TableCell>
                      <TableCell>Message</TableCell>
                      <TableCell>IP Address</TableCell>
                    </TableRow>
                  </TableHead>
                  <TableBody>
                    {filteredEvents.map((event) => (
                      <TableRow key={event.id}>
                        <TableCell>
                          <Box display="flex" alignItems="center">
                            {getEventIcon(event.type)}
                            <Typography sx={{ ml: 1 }}>
                              {event.type.charAt(0).toUpperCase() + event.type.slice(1)}
                            </Typography>
                          </Box>
                        </TableCell>
                        <TableCell>{formatTimestamp(event.timestamp)}</TableCell>
                        <TableCell>{event.message}</TableCell>
                        <TableCell>{event.ipAddress}</TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </TableContainer>
            </CardContent>
          </Card>
        </Grid>
        <Grid item xs={12} md={4}>
          <Card>
            <CardContent>
              <Typography variant="h6" gutterBottom>
                Vulnerabilities
              </Typography>
              {metrics && (
                <List>
                  <ListItem divider>
                    <ListItemText primary="High Severity" />
                    <Chip
                      label={metrics.vulnerabilities.high}
                      color="error"
                      size="small"
                    />
                  </ListItem>
                  <ListItem divider>
                    <ListItemText primary="Medium Severity" />
                    <Chip
                      label={metrics.vulnerabilities.medium}
                      color="warning"
                      size="small"
                    />
                  </ListItem>
                  <ListItem>
                    <ListItemText primary="Low Severity" />
                    <Chip
                      label={metrics.vulnerabilities.low}
                      color="info"
                      size="small"
                    />
                  </ListItem>
                </List>
              )}
            </CardContent>
          </Card>
        </Grid>
      </Grid>

      {metrics?.threatLocations && (
        <Card sx={{ mt: 3 }}>
          <CardContent>
            <Typography variant="h6" gutterBottom>
              Threat Map
            </Typography>
            <Box height={400}>
              <ThreatMap
                locations={metrics.threatLocations}
                onLocationClick={(location) => {
                  setCategoryFilter('auth');
                  setEventFilter('error');
                }}
              />
            </Box>
          </CardContent>
        </Card>
      )}
    </Box>
  );
};

export default SecurityDashboard; 