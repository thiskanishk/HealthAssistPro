import React from 'react';
import {
    Box,
    Paper,
    Typography,
    FormControl,
    InputLabel,
    Select,
    MenuItem,
    Grid
} from '@mui/material';
import {
    LineChart,
    Line,
    XAxis,
    YAxis,
    CartesianGrid,
    Tooltip,
    Legend,
    ResponsiveContainer
} from 'recharts';
import { useQuery } from '@tanstack/react-query';
import { format, subMonths } from 'date-fns';
import { getHealthMetrics } from '../../services/api/metrics';

interface MetricData {
    timestamp: string;
    value: number;
}

interface HealthMetric {
    id: string;
    name: string;
    unit: string;
    data: MetricData[];
    normalRange?: {
        min: number;
        max: number;
    };
}

export const HealthMetricsChart: React.FC<{ patientId: string }> = ({ patientId }) => {
    const [timeRange, setTimeRange] = React.useState('6m');
    const [selectedMetrics, setSelectedMetrics] = React.useState<string[]>(['bloodPressure', 'heartRate']);

    const { data: metrics } = useQuery(
        ['healthMetrics', patientId, timeRange],
        () => getHealthMetrics(patientId, timeRange)
    );

    const formatData = (metrics: HealthMetric[]) => {
        const dates = new Set<string>();
        const metricsMap = new Map<string, Map<string, number>>();

        metrics.forEach(metric => {
            const metricMap = new Map<string, number>();
            metric.data.forEach(point => {
                const date = format(new Date(point.timestamp), 'MMM d');
                dates.add(date);
                metricMap.set(date, point.value);
            });
            metricsMap.set(metric.name, metricMap);
        });

        return Array.from(dates).map(date => ({
            date,
            ...Object.fromEntries(
                Array.from(metricsMap.entries()).map(([name, values]) => [
                    name,
                    values.get(date)
                ])
            )
        }));
    };

    const getMetricColor = (metricName: string) => {
        const colors = {
            bloodPressure: '#8884d8',
            heartRate: '#82ca9d',
            temperature: '#ffc658',
            oxygenLevel: '#ff7300'
        };
        return colors[metricName as keyof typeof colors] || '#000';
    };

    return (
        <Paper elevation={3} sx={{ p: 3 }}>
            <Box display="flex" justifyContent="space-between" alignItems="center" mb={3}>
                <Typography variant="h6">Health Metrics</Typography>
                <Box display="flex" gap={2}>
                    <FormControl size="small" sx={{ minWidth: 120 }}>
                        <InputLabel>Time Range</InputLabel>
                        <Select
                            value={timeRange}
                            onChange={(e) => setTimeRange(e.target.value)}
                            label="Time Range"
                        >
                            <MenuItem value="1m">1 Month</MenuItem>
                            <MenuItem value="3m">3 Months</MenuItem>
                            <MenuItem value="6m">6 Months</MenuItem>
                            <MenuItem value="1y">1 Year</MenuItem>
                        </Select>
                    </FormControl>
                    <FormControl size="small" sx={{ minWidth: 200 }}>
                        <InputLabel>Metrics</InputLabel>
                        <Select
                            multiple
                            value={selectedMetrics}
                            onChange={(e) => setSelectedMetrics(typeof e.target.value === 'string' ? [e.target.value] : e.target.value)}
                            label="Metrics"
                        >
                            {metrics?.map((metric: HealthMetric) => (
                                <MenuItem key={metric.id} value={metric.name}>
                                    {metric.name} ({metric.unit})
                                </MenuItem>
                            ))}
                        </Select>
                    </FormControl>
                </Box>
            </Box>

            <Box height={400}>
                <ResponsiveContainer width="100%" height="100%">
                    <LineChart data={formatData(metrics || [])}>
                        <CartesianGrid strokeDasharray="3 3" />
                        <XAxis dataKey="date" />
                        <YAxis />
                        <Tooltip />
                        <Legend />
                        {selectedMetrics.map(metricName => {
                            const metric = metrics?.find(m => m.name === metricName);
                            return (
                                <Line
                                    key={metricName}
                                    type="monotone"
                                    dataKey={metricName}
                                    stroke={getMetricColor(metricName)}
                                    name={`${metric?.name} (${metric?.unit})`}
                                    dot={{ r: 4 }}
                                    activeDot={{ r: 8 }}
                                />
                            );
                        })}
                    </LineChart>
                </ResponsiveContainer>
            </Box>

            {/* Metric Statistics */}
            <Grid container spacing={2} mt={2}>
                {selectedMetrics.map(metricName => {
                    const metric = metrics?.find(m => m.name === metricName);
                    if (!metric) return null;

                    const values = metric.data.map(d => d.value);
                    const average = values.reduce((a, b) => a + b, 0) / values.length;
                    const max = Math.max(...values);
                    const min = Math.min(...values);

                    return (
                        <Grid item xs={12} md={6} key={metric.id}>
                            <Paper elevation={1} sx={{ p: 2 }}>
                                <Typography variant="subtitle1" gutterBottom>
                                    {metric.name} Statistics
                                </Typography>
                                <Grid container spacing={2}>
                                    <Grid item xs={4}>
                                        <Typography variant="caption" color="textSecondary">
                                            Average
                                        </Typography>
                                        <Typography>
                                            {average.toFixed(1)} {metric.unit}
                                        </Typography>
                                    </Grid>
                                    <Grid item xs={4}>
                                        <Typography variant="caption" color="textSecondary">
                                            Min
                                        </Typography>
                                        <Typography>
                                            {min} {metric.unit}
                                        </Typography>
                                    </Grid>
                                    <Grid item xs={4}>
                                        <Typography variant="caption" color="textSecondary">
                                            Max
                                        </Typography>
                                        <Typography>
                                            {max} {metric.unit}
                                        </Typography>
                                    </Grid>
                                </Grid>
                            </Paper>
                        </Grid>
                    );
                })}
            </Grid>
        </Paper>
    );
}; 