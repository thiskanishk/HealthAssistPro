import { useEffect, useState, MouseEvent } from 'react';
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
    Medication,
    Event,
    Assignment,
    Check
} from '@mui/icons-material';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { format } from 'date-fns';
import { useSnackbar } from 'notistack';
import { getNotifications, markNotificationRead, Notification } from '../../services/api/notifications';

export const NotificationManager: React.FC = () => {
    const [anchorEl, setAnchorEl] = useState<HTMLElement | null>(null);
    const { enqueueSnackbar } = useSnackbar();
    const queryClient = useQueryClient();
    
    const { data: notifications = [], isLoading } = useQuery({
        queryKey: ['notifications'],
        queryFn: getNotifications
    });

    const markReadMutation = useMutation({
        mutationFn: markNotificationRead,
        onSuccess: () => {
            // Refetch notifications
            queryClient.invalidateQueries({ queryKey: ['notifications'] });
        }
    });

    useEffect(() => {
        // Request permission for push notifications
        if ('Notification' in window) {
            Notification.requestPermission();
        }
    }, []);

    const handleNotificationClick = (event: MouseEvent<HTMLElement>) => {
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
                return <Medication color="primary" />;
            case 'appointment':
                return <Event color="secondary" />;
            case 'lab':
                return <Assignment color="info" />;
            default:
                return <Notifications color="action" />;
        }
    };

    // Safe access with type assertion
    const safeNotifications = notifications as Notification[];
    const unreadCount = safeNotifications.filter(n => !n.read).length || 0;
    const isNotificationsEmpty = !safeNotifications || safeNotifications.length === 0;

    return (
        <>
            <IconButton onClick={handleNotificationClick} aria-label="Notifications">
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
                
                {isLoading ? (
                    <Box sx={{ p: 2, textAlign: 'center' }}>
                        <Typography color="textSecondary">
                            Loading notifications...
                        </Typography>
                    </Box>
                ) : (
                    <>
                        <List>
                            {safeNotifications.map((notification: Notification) => (
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
                                                    {notification.timestamp ? 
                                                        format(new Date(notification.timestamp), 'PPp') : 
                                                        'Unknown date'}
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

                        {isNotificationsEmpty && (
                            <Box sx={{ p: 2, textAlign: 'center' }}>
                                <Typography color="textSecondary">
                                    No notifications
                                </Typography>
                            </Box>
                        )}
                    </>
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