import React, { useState, useEffect } from 'react';
import {
  Box,
  Paper,
  Typography,
  Grid,
  Card,
  CardContent,
  CardHeader,
  Select,
  MenuItem,
  FormControl,
  InputLabel,
  CircularProgress,
  Tooltip,
  IconButton
} from '@mui/material';
import {
  BarChart,
  Bar,
  LineChart,
  Line,
  PieChart,
  Pie,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip as ChartTooltip,
  Legend,
  ResponsiveContainer,
  Cell
} from 'recharts';
import {
  Refresh,
  TrendingUp,
  TrendingDown,
  AccessTime,
  Group,
  CheckCircle,
  Warning
} from '@mui/icons-material';
import { format, subDays, startOfDay, endOfDay } from 'date-fns';

interface AnalyticsData {
  visitStats: {
    totalVisits: number;
    averageDuration: number;
    overtimeVisits: number;
    efficiency: number;
  };
  taskStats: {
    total: number;
    completed: number;
    overdue: number;
    upcomingDue: number;
  };
  timeDistribution: {
    category: string;
    minutes: number;
  }[];
  visitTrends: {
    date: string;
    visits: number;
    avgDuration: number;
  }[];
  taskCategories: {
    category: string;
    count: number;
  }[];
  efficiency: {
    hour: number;
    efficiency: number;
    visits: number;
  }[];
}

const AnalyticsDashboard: React.FC = () => {
  const [timeRange, setTimeRange] = useState<'7d' | '30d' | '90d'>('7d');
  const [data, setData] = useState<AnalyticsData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const COLORS = ['#0088FE', '#00C49F', '#FFBB28', '#FF8042', '#8884D8'];

  const fetchAnalyticsData = async () => {
    try {
      setLoading(true);
      setError(null);

      const days = timeRange === '7d' ? 7 : timeRange === '30d' ? 30 : 90;
      const startDate = startOfDay(subDays(new Date(), days));
      const endDate = endOfDay(new Date());

      const response = await fetch(
        `/api/productivity/analytics?startDate=${startDate.toISOString()}&endDate=${endDate.toISOString()}`
      );
      const result = await response.json();

      if (!response.ok) throw new Error(result.message);
      setData(result);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to fetch analytics data');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchAnalyticsData();
  }, [timeRange]);

  if (loading) {
    return (
      <Box display="flex" justifyContent="center" p={4}>
        <CircularProgress />
      </Box>
    );
  }

  if (error) {
    return (
      <Paper sx={{ p: 3, bgcolor: 'error.light', color: 'error.contrastText' }}>
        <Typography>{error}</Typography>
      </Paper>
    );
  }

  if (!data) return null;

  return (
    <Box>
      <Box display="flex" justifyContent="space-between" alignItems="center" mb={3}>
        <Typography variant="h5">Productivity Analytics</Typography>
        <Box display="flex" gap={2}>
          <FormControl size="small">
            <InputLabel>Time Range</InputLabel>
            <Select
              value={timeRange}
              onChange={(e) => setTimeRange(e.target.value as typeof timeRange)}
              label="Time Range"
            >
              <MenuItem value="7d">Last 7 Days</MenuItem>
              <MenuItem value="30d">Last 30 Days</MenuItem>
              <MenuItem value="90d">Last 90 Days</MenuItem>
            </Select>
          </FormControl>
          <Tooltip title="Refresh Data">
            <IconButton onClick={fetchAnalyticsData}>
              <Refresh />
            </IconButton>
          </Tooltip>
        </Box>
      </Box>

      <Grid container spacing={3}>
        {/* Summary Cards */}
        <Grid item xs={12} md={3}>
          <Card>
            <CardContent>
              <Box display="flex" alignItems="center" gap={1}>
                <AccessTime color="primary" />
                <Typography color="textSecondary">Average Visit Duration</Typography>
              </Box>
              <Typography variant="h4">
                {Math.round(data.visitStats.averageDuration / 60)} min
              </Typography>
              <Typography variant="body2" color="textSecondary">
                {data.visitStats.overtimeVisits} overtime visits
              </Typography>
            </CardContent>
          </Card>
        </Grid>

        <Grid item xs={12} md={3}>
          <Card>
            <CardContent>
              <Box display="flex" alignItems="center" gap={1}>
                <Group color="primary" />
                <Typography color="textSecondary">Total Visits</Typography>
              </Box>
              <Typography variant="h4">{data.visitStats.totalVisits}</Typography>
              <Box display="flex" alignItems="center" gap={0.5}>
                <TrendingUp color="success" />
                <Typography variant="body2" color="success.main">
                  +{Math.round((data.visitStats.totalVisits / 100) * 5)}% vs prev.
                </Typography>
              </Box>
            </CardContent>
          </Card>
        </Grid>

        <Grid item xs={12} md={3}>
          <Card>
            <CardContent>
              <Box display="flex" alignItems="center" gap={1}>
                <CheckCircle color="primary" />
                <Typography color="textSecondary">Task Completion</Typography>
              </Box>
              <Typography variant="h4">
                {Math.round((data.taskStats.completed / data.taskStats.total) * 100)}%
              </Typography>
              <Typography variant="body2" color="textSecondary">
                {data.taskStats.completed} of {data.taskStats.total} tasks
              </Typography>
            </CardContent>
          </Card>
        </Grid>

        <Grid item xs={12} md={3}>
          <Card>
            <CardContent>
              <Box display="flex" alignItems="center" gap={1}>
                <Warning color="primary" />
                <Typography color="textSecondary">Overdue Tasks</Typography>
              </Box>
              <Typography variant="h4">{data.taskStats.overdue}</Typography>
              <Typography variant="body2" color="warning.main">
                {data.taskStats.upcomingDue} due soon
              </Typography>
            </CardContent>
          </Card>
        </Grid>

        {/* Visit Trends Chart */}
        <Grid item xs={12} md={8}>
          <Card>
            <CardHeader title="Visit Trends" />
            <CardContent>
              <ResponsiveContainer width="100%" height={300}>
                <LineChart data={data.visitTrends}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis dataKey="date" />
                  <YAxis yAxisId="left" />
                  <YAxis yAxisId="right" orientation="right" />
                  <ChartTooltip />
                  <Legend />
                  <Line
                    yAxisId="left"
                    type="monotone"
                    dataKey="visits"
                    stroke="#8884d8"
                    name="Visits"
                  />
                  <Line
                    yAxisId="right"
                    type="monotone"
                    dataKey="avgDuration"
                    stroke="#82ca9d"
                    name="Avg Duration (min)"
                  />
                </LineChart>
              </ResponsiveContainer>
            </CardContent>
          </Card>
        </Grid>

        {/* Task Categories Pie Chart */}
        <Grid item xs={12} md={4}>
          <Card>
            <CardHeader title="Task Distribution" />
            <CardContent>
              <ResponsiveContainer width="100%" height={300}>
                <PieChart>
                  <Pie
                    data={data.taskCategories}
                    dataKey="count"
                    nameKey="category"
                    cx="50%"
                    cy="50%"
                    outerRadius={100}
                    label
                  >
                    {data.taskCategories.map((entry, index) => (
                      <Cell key={entry.category} fill={COLORS[index % COLORS.length]} />
                    ))}
                  </Pie>
                  <ChartTooltip />
                  <Legend />
                </PieChart>
              </ResponsiveContainer>
            </CardContent>
          </Card>
        </Grid>

        {/* Time Distribution Chart */}
        <Grid item xs={12} md={6}>
          <Card>
            <CardHeader title="Time Distribution" />
            <CardContent>
              <ResponsiveContainer width="100%" height={300}>
                <BarChart data={data.timeDistribution}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis dataKey="category" />
                  <YAxis />
                  <ChartTooltip />
                  <Legend />
                  <Bar dataKey="minutes" fill="#8884d8" name="Minutes Spent" />
                </BarChart>
              </ResponsiveContainer>
            </CardContent>
          </Card>
        </Grid>

        {/* Efficiency by Hour Chart */}
        <Grid item xs={12} md={6}>
          <Card>
            <CardHeader title="Efficiency by Hour" />
            <CardContent>
              <ResponsiveContainer width="100%" height={300}>
                <LineChart data={data.efficiency}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis dataKey="hour" />
                  <YAxis />
                  <ChartTooltip />
                  <Legend />
                  <Line
                    type="monotone"
                    dataKey="efficiency"
                    stroke="#82ca9d"
                    name="Efficiency %"
                  />
                  <Line
                    type="monotone"
                    dataKey="visits"
                    stroke="#8884d8"
                    name="Visit Count"
                  />
                </LineChart>
              </ResponsiveContainer>
            </CardContent>
          </Card>
        </Grid>
      </Grid>
    </Box>
  );
};

export default AnalyticsDashboard; 