'use client';
import { useState } from 'react';
import { SidebarTrigger } from './ui/sidebar';
import { useTheme } from 'next-themes';

// MUI
import IconButton from '@mui/material/IconButton';
import Tooltip from '@mui/material/Tooltip';
import Menu from '@mui/material/Menu';
import MenuItem from '@mui/material/MenuItem';
import Badge from '@mui/material/Badge';
import Avatar from '@mui/material/Avatar';
import Divider from '@mui/material/Divider';
import Box from '@mui/material/Box';
import Typography from '@mui/material/Typography';
import ListItemIcon from '@mui/material/ListItemIcon';
import GlobalSearchBar from '@/components/GlobalSearchBar';
import LightModeIcon from '@mui/icons-material/LightModeOutlined';
import DarkModeIcon from '@mui/icons-material/DarkModeOutlined';
import PersonIcon from '@mui/icons-material/PersonOutlined';
import SettingsIcon from '@mui/icons-material/SettingsOutlined';
import LogoutIcon from '@mui/icons-material/LogoutOutlined';
import { Notification } from './Notification';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/context/AuthContext';


const notifications = [
  { id: 1, title: 'New enrollment', message: 'John Doe enrolled in React course', time: '2m ago', unread: true },
  { id: 2, title: 'Assignment submitted', message: 'Jane submitted her final project', time: '1h ago', unread: true },
  { id: 3, title: 'New message', message: 'You have a new message from admin', time: '3h ago', unread: false },
];

export default function DashboardTopbar() {
  const { theme, setTheme } = useTheme();
  const { user } = useAuth();

  const router = useRouter();
  const normalizedRole = String(
    (user as any)?.role ??
    (Array.isArray((user as any)?.roles) ? (user as any)?.roles[0] : (user as any)?.roles) ??
    ""
  ).toLowerCase();
  const canAccessSettings = !["teacher", "student"].includes(normalizedRole);
  const displayName = String((user as any)?.name ?? "Admin User");
  const displayEmail = String((user as any)?.email ?? "admin@lms.com");

  // Notification menu
  const [notifAnchor, setNotifAnchor] = useState<null | HTMLElement>(null);

  // Profile menu
  const [profileAnchor, setProfileAnchor] = useState<null | HTMLElement>(null);

  const unreadCount = notifications.filter((n) => n.unread).length;
  const handleLogout = () => {
    router.push('/login');

  }

  return (
    <header className="sticky  top-0 z-10 flex h-16 shrink-0 items-center justify-between border-b bg-background px-4">

      {/* ── Left Side ── */}
      <div className="flex items-center gap-2">
        <SidebarTrigger className="-ml-1" />
        <div className="mx-2 h-4 w-px bg-border" />
        <h1 className="text-sm font-medium">Dashboard</h1>
      </div>

      {/* ── Right Side ── */}
      <div className="flex items-center gap-1">

        {/* Global Search */}
        <GlobalSearchBar />

        {/* Theme Toggle */}
        <Tooltip title="Toggle theme">
          <IconButton size="small" onClick={() => setTheme(theme === 'dark' ? 'light' : 'dark')}>
            {theme === 'dark' ? <LightModeIcon fontSize="small" /> : <DarkModeIcon fontSize="small" />}
          </IconButton>
        </Tooltip>

        {/* Notifications */}
        <Tooltip title="">
          {/* <IconButton size="small" onClick={(e) => setNotifAnchor(e.currentTarget)}> */}
            <Badge badgeContent={unreadCount} color="error">
              <Notification notifications={notifications}/>
            </Badge>
          {/* </IconButton> */}
        </Tooltip>

        <Menu
          anchorEl={notifAnchor}
          open={Boolean(notifAnchor)}
          onClose={() => setNotifAnchor(null)}
          PaperProps={{ sx: { width: 320, borderRadius: '12px', mt: 1 } }}
          transformOrigin={{ horizontal: 'right', vertical: 'top' }}
          anchorOrigin={{ horizontal: 'right', vertical: 'bottom' }}
        >
          <Box px={2} py={1.5} display="flex" justifyContent="space-between" alignItems="center">
            <Typography fontWeight={600} fontSize={14}>Notifications</Typography>
            <Typography fontSize={12} color="primary" sx={{ cursor: 'pointer' }}>Mark all read</Typography>
          </Box>
          
          <Box textAlign="center" py={1}>
            <Typography fontSize={13} color="primary" sx={{ cursor: 'pointer' }}>
              View all notifications
            </Typography>
          </Box>
        </Menu>

        {/* Profile Avatar */}
        <Tooltip title="Account">
          <IconButton size="small" onClick={(e) => setProfileAnchor(e.currentTarget)} sx={{ ml: 0.5 }}>
            <Avatar
              src="/profile.jpg"   // ← replace with your image path
              alt="Profile"
              sx={{ width: 32, height: 32, fontSize: 14 }}
            >
              A
            </Avatar>
          </IconButton>
        </Tooltip>

        <Menu
          anchorEl={profileAnchor}
          open={Boolean(profileAnchor)}
          onClose={() => setProfileAnchor(null)}
          PaperProps={{ sx: { width: 200, borderRadius: '12px', mt: 1 } }}
          transformOrigin={{ horizontal: 'right', vertical: 'top' }}
          anchorOrigin={{ horizontal: 'right', vertical: 'bottom' }}
        >
          {/* Profile Info */}
          <Box px={2} py={1.5} display="flex" alignItems="center" gap={1.5}>
            <Avatar src="/profile.jpg" sx={{ width: 36, height: 36, fontSize: 14 }}>A</Avatar>
            <Box>
              <Typography fontSize={13} fontWeight={600}>{displayName}</Typography>
              <Typography fontSize={11} color="text.secondary">{displayEmail}</Typography>
            </Box>
          </Box>
          <Divider />
          <MenuItem sx={{ gap: 1.5, fontSize: 13 }}>
            <ListItemIcon><PersonIcon fontSize="small" /></ListItemIcon>
            My Profile
          </MenuItem>
          {canAccessSettings ? (
            <MenuItem
              sx={{ gap: 1.5, fontSize: 13 }}
              onClick={() => {
                setProfileAnchor(null)
                router.push('/admin/settings/general')
              }}
            >
              <ListItemIcon><SettingsIcon fontSize="small" /></ListItemIcon>
              Settings
            </MenuItem>
          ) : null}
          <Divider />
          <MenuItem sx={{ gap: 1.5, fontSize: 13, color: 'error.main' }}>
            <ListItemIcon><LogoutIcon fontSize="small" sx={{ color: 'error.main' }} /></ListItemIcon>
            <div onClick={handleLogout} className='cursor-pointer'>
              Logout
            </div>
          </MenuItem>
        </Menu>

      </div>
    </header>
  );
}
