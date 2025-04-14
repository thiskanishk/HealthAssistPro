import React, { useState, useEffect, useRef } from 'react';
import {
  Box,
  Paper,
  Typography,
  TextField,
  Button,
  List,
  ListItem,
  Avatar,
  IconButton,
  Menu,
  MenuItem,
  Chip
} from '@mui/material';
import {
  Send,
  AttachFile,
  MoreVert,
  Save,
  VoiceChat,
  Image
} from '@mui/icons-material';
import { useAIChat } from '../hooks/useAIChat';
import { MessageBubble } from './MessageBubble';
import { SuggestedQuestions } from './SuggestedQuestions';

export const AIHealthAssistant: React.FC = () => {
  const [input, setInput] = useState('');
  const [isVoiceInput, setIsVoiceInput] = useState(false);
  const chatEndRef = useRef<null | HTMLDivElement>(null);
  
  const {
    messages,
    sendMessage,
    loading,
    error,
    suggestions,
    context
  } = useAIChat();

  const scrollToBottom = () => {
    chatEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  const handleSend = async () => {
    if (!input.trim()) return;
    await sendMessage(input);
    setInput('');
  };

  return (
    <Paper elevation={3} sx={{ p: 2, height: '600px', display: 'flex', flexDirection: 'column' }}>
      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 2 }}>
        <Typography variant="h6">
          AI Health Assistant
        </Typography>
        <Chip
          label={loading ? 'Thinking...' : 'Ready'}
          color={loading ? 'warning' : 'success'}
          size="small"
        />
      </Box>

      <Box sx={{ flexGrow: 1, overflow: 'auto', mb: 2 }}>
        <List>
          {messages.map((message, index) => (
            <ListItem
              key={index}
              sx={{
                display: 'flex',
                justifyContent: message.sender === 'user' ? 'flex-end' : 'flex-start',
                mb: 1
              }}
            >
              <MessageBubble message={message} />
            </ListItem>
          ))}
        </List>
        <div ref={chatEndRef} />
      </Box>

      <SuggestedQuestions
        suggestions={suggestions}
        onSelect={(question) => setInput(question)}
      />

      <Box sx={{ display: 'flex', gap: 1, alignItems: 'center' }}>
        <IconButton onClick={() => setIsVoiceInput(!isVoiceInput)}>
          <VoiceChat color={isVoiceInput ? 'primary' : 'inherit'} />
        </IconButton>
        
        <TextField
          fullWidth
          value={input}
          onChange={(e) => setInput(e.target.value)}
          placeholder="Ask me about your health..."
          onKeyPress={(e) => e.key === 'Enter' && handleSend()}
          multiline
          maxRows={3}
        />
        
        <IconButton>
          <AttachFile />
        </IconButton>
        
        <Button
          variant="contained"
          onClick={handleSend}
          disabled={loading || !input.trim()}
        >
          <Send />
        </Button>
      </Box>
    </Paper>
  );
}; 