import React from 'react';
import { Link, useLocation } from 'react-router-dom';
import {
  Box,
  Tabs,
  Tab,
  Badge,
  useTheme,
  useMediaQuery,
  IconButton,
  Menu,
  MenuItem,
} from '@mui/material';
import {
  Schedule,
  History,
  Group,
  VideoCall,
} from '@mui/icons-material';
import { useAuth } from '../../hooks/useAuth';

interface TelemedicineNavigationProps {
  waitingPatients?: number;
}

const TelemedicineNavigation: React.FC<TelemedicineNavigationProps> = ({
  waitingPatients = 0,
}) => {
  const location = useLocation();
  const theme = useTheme();
  const isMobile = useMediaQuery(theme.breakpoints.down('sm'));
  const { user } = useAuth();
  const [mobileMenuAnchor, setMobileMenuAnchor] = React.useState<null | HTMLElement>(null);

  const getCurrentTab = () => {
    const path = location.pathname.split('/')[2] || 'schedule';
    return ['schedule', 'history', 'waiting-room'].indexOf(path);
  };

  const handleMobileMenuOpen = (event: React.MouseEvent<HTMLElement>) => {
    setMobileMenuAnchor(event.currentTarget);
  };

  const handleMobileMenuClose = () => {
    setMobileMenuAnchor(null);
  };

  const navigationItems = [
    {
      label: 'Schedule',
      icon: <Schedule />,
      to: '/telemedicine/schedule',
      show: true,
    },
    {
      label: 'History',
      icon: <History />,
      to: '/telemedicine/history',
      show: true,
    },
    {
      label: 'Waiting Room',
      icon: (
        <Badge badgeContent={waitingPatients} color="error" max={99}>
          <Group />
        </Badge>
      ),
      to: '/telemedicine/waiting-room',
      show: user?.role === 'doctor',
    },
  ];

  if (isMobile) {
    return (
      <Box sx={{ borderBottom: 1, borderColor: 'divider', bgcolor: 'background.paper' }}>
        <IconButton
          size="large"
          edge="start"
          color="inherit"
          aria-label="menu"
          onClick={handleMobileMenuOpen}
        >
          <VideoCall />
        </IconButton>
        <Menu
          anchorEl={mobileMenuAnchor}
          open={Boolean(mobileMenuAnchor)}
          onClose={handleMobileMenuClose}
        >
          {navigationItems
            .filter(item => item.show)
            .map((item) => (
              <MenuItem
                key={item.to}
                component={Link}
                to={item.to}
                onClick={handleMobileMenuClose}
                selected={location.pathname === item.to}
              >
                <Box display="flex" alignItems="center" gap={1}>
                  {item.icon}
                  {item.label}
                </Box>
              </MenuItem>
            ))}
        </Menu>
      </Box>
    );
  }

  return (
    <Box sx={{ borderBottom: 1, borderColor: 'divider', bgcolor: 'background.paper' }}>
      <Tabs value={getCurrentTab()} centered>
        {navigationItems
          .filter(item => item.show)
          .map((item) => (
            <Tab
              key={item.to}
              icon={item.icon}
              label={item.label}
              component={Link}
              to={item.to}
            />
          ))}
      </Tabs>
    </Box>
  );
};

export default TelemedicineNavigation; 