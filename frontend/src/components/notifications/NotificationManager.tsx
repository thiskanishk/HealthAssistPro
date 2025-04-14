import React, { useEffect, useState } from 'react';
import {
    Badge,
    IconButton,
    Menu,
    MenuItem,
    List,
    ListItem,
    ListItemText,
    ListItemIcon,
    Typography,
    Box,
    Divider,
    Button
} from '@mui/material';
import {
    Notifications,
    MedicationAlert,
    Event,
    Assignment,
    Check
} from '@mui/icons-material';
import { useQuery, useMutation } from '@tanstack/react-query';
import { format } from 'date-fns';
import { useSnackbar } from 'notistack';
import { getNotifications, markNotificationRead } from '../../services/api/notifications';

interface Notification {
    id: string;
    type: 'medication' | 'appointment' | 'lab' | 'general';
    title: string;
    message: string;
    timestamp: string;
    read: boolean;
    priority: 'high' | 'medium' | 'low';
}

export const NotificationManager: React.FC = () => {
    const [anchorEl, setAnchorEl] = useState<null | HTMLElement>(null);
    const { enqueueSnackbar } = useSnackbar();
    
    const { data: notifications, isLoading } = useQuery(
        ['notifications'],
        getNotifications,
        {
            refetchInterval: 30000 // Refetch every 30 seconds
        }
    );

    const markReadMutation = useMutation(markNotificationRead, {
        onSuccess: () => {
            // Refetch notifications
            queryClient.invalidateQueries(['notifications']);
        }
    });

    useEffect(() => {
        // Request permission for push notifications
        if ('Notification' in window) {
            Notification.requestPermission();
        }
    }, []);

    const handleNotificationClick = (event: React.MouseEvent<HTMLElement>) => {
        setAnchorEl(event.currentTarget);
    };

    const handleClose = () => {
        setAnchorEl(null);
    };

    const handleNotificationRead = (notificationId: string) => {
        markReadMutation.mutate(notificationId);
    };

    const getNotificationIcon = (type: string) => {
        switch (type) {
            case 'medication':
                return <MedicationAlert color="primary" />;
            case 'appointment':
                return <Event color="secondary" />;
            case 'lab':
                return <Assignment color="info" />;
            default:
                return <Notifications color="action" />;
        }
    };

    const unreadCount = notifications?.filter(n => !n.read).length || 0;

    return (
        <>
            <IconButton onClick={handleNotificationClick}>
                <Badge badgeContent={unreadCount} color="error">
                    <Notifications />
                </Badge>
            </IconButton>

            <Menu
                anchorEl={anchorEl}
                open={Boolean(anchorEl)}
                onClose={handleClose}
                PaperProps={{
                    style: {
                        maxHeight: 400,
                        width: 360
                    }
                }}
            >
                <Box sx={{ p: 2 }}>
                    <Typography variant="h6">
                        Notifications
                    </Typography>
                </Box>
                <Divider />
                
                <List>
                    {notifications?.map((notification: Notification) => (
                        <ListItem
                            key={notification.id}
                            sx={{
                                bgcolor: notification.read ? 'transparent' : 'action.hover'
                            }}
                        >
                            <ListItemIcon>
                                {getNotificationIcon(notification.type)}
                            </ListItemIcon>
                            <ListItemText
                                primary={notification.title}
                                secondary={
                                    <>
                                        {notification.message}
                                        <Typography
                                            component="span"
                                            variant="caption"
                                            display="block"
                                            color="text.secondary"
                                        >
                                            {format(new Date(notification.timestamp), 'PPp')}
                                        </Typography>
                                    </>
                                }
                            />
                            {!notification.read && (
                                <IconButton
                                    size="small"
                                    onClick={() => handleNotificationRead(notification.id)}
                                >
                                    <Check />
                                </IconButton>
                            )}
                        </ListItem>
                    ))}
                </List>

                {notifications?.length === 0 && (
                    <Box sx={{ p: 2, textAlign: 'center' }}>
                        <Typography color="textSecondary">
                            No notifications
                        </Typography>
                    </Box>
                )}

                <Divider />
                <Box sx={{ p: 1 }}>
                    <Button
                        fullWidth
                        onClick={() => {
                            // Handle view all notifications
                        }}
                    >
                        View All
                    </Button>
                </Box>
            </Menu>
        </>
    );
}; 