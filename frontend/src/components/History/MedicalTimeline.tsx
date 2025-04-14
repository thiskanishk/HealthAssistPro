import React from 'react';
import {
    Timeline,
    TimelineItem,
    TimelineSeparator,
    TimelineConnector,
    TimelineContent,
    TimelineDot,
    TimelineOppositeContent
} from '@mui/lab';
import { Paper, Typography, Chip } from '@mui/material';
import { format } from 'date-fns';
import {
    MedicalServices,
    Medication,
    LocalHospital,
    Assignment
} from '@mui/icons-material';

interface TimelineEvent {
    date: Date;
    type: 'diagnosis' | 'medication' | 'procedure' | 'test';
    title: string;
    description: string;
    doctor: string;
    status?: string;
}

interface MedicalTimelineProps {
    events: TimelineEvent[];
}

export const MedicalTimeline: React.FC<MedicalTimelineProps> = ({ events }) => {
    const getIcon = (type: string) => {
        switch (type) {
            case 'diagnosis':
                return <MedicalServices />;
            case 'medication':
                return <Medication />;
            case 'procedure':
                return <LocalHospital />;
            default:
                return <Assignment />;
        }
    };

    const getColor = (type: string) => {
        switch (type) {
            case 'diagnosis':
                return 'primary';
            case 'medication':
                return 'success';
            case 'procedure':
                return 'error';
            default:
                return 'info';
        }
    };

    return (
        <Timeline position="alternate">
            {events.map((event, index) => (
                <TimelineItem key={index}>
                    <TimelineOppositeContent>
                        <Typography color="textSecondary">
                            {format(new Date(event.date), 'PPP')}
                        </Typography>
                    </TimelineOppositeContent>
                    <TimelineSeparator>
                        <TimelineDot color={getColor(event.type)}>
                            {getIcon(event.type)}
                        </TimelineDot>
                        {index !== events.length - 1 && <TimelineConnector />}
                    </TimelineSeparator>
                    <TimelineContent>
                        <Paper elevation={3} sx={{ p: 2 }}>
                            <Typography variant="h6" component="h3">
                                {event.title}
                            </Typography>
                            <Typography>{event.description}</Typography>
                            <Typography variant="caption" display="block">
                                Dr. {event.doctor}
                            </Typography>
                            {event.status && (
                                <Chip
                                    label={event.status}
                                    size="small"
                                    color={event.status === 'completed' ? 'success' : 'warning'}
                                    sx={{ mt: 1 }}
                                />
                            )}
                        </Paper>
                    </TimelineContent>
                </TimelineItem>
            ))}
        </Timeline>
    );
}; 