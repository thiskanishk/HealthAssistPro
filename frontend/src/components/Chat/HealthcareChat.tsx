import React, { useState, useEffect, useRef } from 'react';
import {
    Box,
    Paper,
    Typography,
    TextField,
    IconButton,
    List,
    ListItem,
    ListItemText,
    ListItemAvatar,
    Avatar,
    Divider,
    Button,
    CircularProgress,
    Chip,
    Menu,
    MenuItem
} from '@mui/material';
import {
    Send,
    AttachFile,
    MoreVert,
    Image,
    PictureAsPdf,
    LocalHospital
} from '@mui/icons-material';
import { useQuery, useMutation } from '@tanstack/react-query';
import { format } from 'date-fns';
import { useSocket } from '../../hooks/useSocket';
import { getConversations, sendMessage } from '../../services/api/chat';

interface Message {
    id: string;
    senderId: string;
    content: string;
    timestamp: Date;
    type: 'text' | 'image' | 'document';
    attachmentUrl?: string;
    read: boolean;
}

interface Conversation {
    id: string;
    provider: {
        id: string;
        name: string;
        role: string;
        avatar: string;
    };
    lastMessage: Message;
    unreadCount: number;
}

export const HealthcareChat: React.FC = () => {
    const [selectedConversation, setSelectedConversation] = useState<string | null>(null);
    const [message, setMessage] = useState('');
    const [attachmentMenu, setAttachmentMenu] = useState<null | HTMLElement>(null);
    const chatEndRef = useRef<null | HTMLDivElement>(null);
    const socket = useSocket();

    const { data: conversations } = useQuery(['conversations'], getConversations);
    
    const sendMessageMutation = useMutation(sendMessage, {
        onSuccess: () => {
            setMessage('');
        }
    });

    useEffect(() => {
        if (socket) {
            socket.on('new_message', (newMessage: Message) => {
                // Handle new message
                queryClient.invalidateQueries(['messages', selectedConversation]);
            });

            socket.on('provider_typing', (data: { providerId: string }) => {
                // Handle provider typing indication
            });
        }

        return () => {
            if (socket) {
                socket.off('new_message');
                socket.off('provider_typing');
            }
        };
    }, [socket, selectedConversation]);

    const scrollToBottom = () => {
        chatEndRef.current?.scrollIntoView({ behavior: 'smooth' });
    };

    useEffect(scrollToBottom, [messages]);

    const handleSend = () => {
        if (!message.trim() || !selectedConversation) return;

        sendMessageMutation.mutate({
            conversationId: selectedConversation,
            content: message,
            type: 'text'
        });
    };

    const handleAttachment = (type: 'image' | 'document') => {
        const input = document.createElement('input');
        input.type = 'file';
        input.accept = type === 'image' ? 'image/*' : '.pdf,.doc,.docx';
        input.onchange = async (e) => {
            const file = (e.target as HTMLInputElement).files?.[0];
            if (file) {
                // Handle file upload
                const formData = new FormData();
                formData.append('file', file);
                formData.append('conversationId', selectedConversation!);
                formData.append('type', type);
                
                sendMessageMutation.mutate({
                    conversationId: selectedConversation!,
                    content: '',
                    type,
                    attachment: formData
                });
            }
        };
        input.click();
    };

    return (
        <Box sx={{ display: 'flex', height: '600px' }}>
            {/* Conversations List */}
            <Paper sx={{ width: 300, borderRight: 1, borderColor: 'divider' }}>
                <Box p={2}>
                    <Typography variant="h6">Messages</Typography>
                </Box>
                <Divider />
                <List>
                    {conversations?.map((conversation: Conversation) => (
                        <ListItem
                            key={conversation.id}
                            button
                            selected={selectedConversation === conversation.id}
                            onClick={() => setSelectedConversation(conversation.id)}
                        >
                            <ListItemAvatar>
                                <Avatar src={conversation.provider.avatar}>
                                    <LocalHospital />
                                </Avatar>
                            </ListItemAvatar>
                            <ListItemText
                                primary={
                                    <Box display="flex" justifyContent="space-between">
                                        <Typography>{conversation.provider.name}</Typography>
                                        {conversation.unreadCount > 0 && (
                                            <Chip
                                                size="small"
                                                color="primary"
                                                label={conversation.unreadCount}
                                            />
                                        )}
                                    </Box>
                                }
                                secondary={
                                    <Typography
                                        variant="body2"
                                        color="textSecondary"
                                        noWrap
                                    >
                                        {conversation.lastMessage.content}
                                    </Typography>
                                }
                            />
                        </ListItem>
                    ))}
                </List>
            </Paper>

            {/* Chat Area */}
            <Box sx={{ flexGrow: 1, display: 'flex', flexDirection: 'column' }}>
                {selectedConversation ? (
                    <>
                        {/* Chat Header */}
                        <Box
                            sx={{
                                p: 2,
                                borderBottom: 1,
                                borderColor: 'divider',
                                bgcolor: 'background.paper'
                            }}
                        >
                            <Typography variant="h6">
                                {conversations?.find(c => c.id === selectedConversation)?.provider.name}
                            </Typography>
                        </Box>

                        {/* Messages */}
                        <Box sx={{ flexGrow: 1, overflow: 'auto', p: 2 }}>
                            {messages?.map((msg: Message) => (
                                <Box
                                    key={msg.id}
                                    sx={{
                                        display: 'flex',
                                        justifyContent: msg.senderId === currentUserId ? 'flex-end' : 'flex-start',
                                        mb: 2
                                    }}
                                >
                                    <Paper
                                        sx={{
                                            p: 2,
                                            maxWidth: '70%',
                                            bgcolor: msg.senderId === currentUserId ? 'primary.light' : 'background.paper'
                                        }}
                                    >
                                        {msg.type === 'text' ? (
                                            <Typography>{msg.content}</Typography>
                                        ) : msg.type === 'image' ? (
                                            <Box
                                                component="img"
                                                src={msg.attachmentUrl}
                                                sx={{ maxWidth: '100%', borderRadius: 1 }}
                                            />
                                        ) : (
                                            <Button
                                                startIcon={<PictureAsPdf />}
                                                href={msg.attachmentUrl}
                                                target="_blank"
                                            >
                                                View Document
                                            </Button>
                                        )}
                                        <Typography
                                            variant="caption"
                                            display="block"
                                            color="textSecondary"
                                            textAlign="right"
                                        >
                                            {format(new Date(msg.timestamp), 'p')}
                                        </Typography>
                                    </Paper>
                                </Box>
                            ))}
                            <div ref={chatEndRef} />
                        </Box>

                        {/* Message Input */}
                        <Box sx={{ p: 2, bgcolor: 'background.paper' }}>
                            <Box sx={{ display: 'flex', gap: 1 }}>
                                <IconButton onClick={(e) => setAttachmentMenu(e.currentTarget)}>
                                    <AttachFile />
                                </IconButton>
                                <TextField
                                    fullWidth
                                    value={message}
                                    onChange={(e) => setMessage(e.target.value)}
                                    placeholder="Type a message..."
                                    onKeyPress={(e) => e.key === 'Enter' && handleSend()}
                                />
                                <IconButton
                                    color="primary"
                                    onClick={handleSend}
                                    disabled={!message.trim()}
                                >
                                    <Send />
                                </IconButton>
                            </Box>
                        </Box>

                        {/* Attachment Menu */}
                        <Menu
                            anchorEl={attachmentMenu}
                            open={Boolean(attachmentMenu)}
                            onClose={() => setAttachmentMenu(null)}
                        >
                            <MenuItem onClick={() => handleAttachment('image')}>
                                <Image sx={{ mr: 1 }} /> Image
                            </MenuItem>
                            <MenuItem onClick={() => handleAttachment('document')}>
                                <PictureAsPdf sx={{ mr: 1 }} /> Document
                            </MenuItem>
                        </Menu>
                    </>
                ) : (
                    <Box
                        sx={{
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            height: '100%'
                        }}
                    >
                        <Typography color="textSecondary">
                            Select a conversation to start messaging
                        </Typography>
                    </Box>
                )}
            </Box>
        </Box>
    );
}; 