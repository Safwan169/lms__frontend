"use client";
import { useState } from "react";
import { SidebarTrigger } from "./ui/sidebar";
import { useTheme } from "next-themes";

import IconButton from "@mui/material/IconButton";
import Tooltip from "@mui/material/Tooltip";
import Menu from "@mui/material/Menu";
import MenuItem from "@mui/material/MenuItem";
import Avatar from "@mui/material/Avatar";
import Divider from "@mui/material/Divider";
import Box from "@mui/material/Box";
import Typography from "@mui/material/Typography";
import ListItemIcon from "@mui/material/ListItemIcon";
import GlobalSearchBar from "@/components/GlobalSearchBar";
import LightModeIcon from "@mui/icons-material/LightModeOutlined";
import DarkModeIcon from "@mui/icons-material/DarkModeOutlined";
import PersonIcon from "@mui/icons-material/PersonOutlined";
import SettingsIcon from "@mui/icons-material/SettingsOutlined";
import LogoutIcon from "@mui/icons-material/LogoutOutlined";
import { Notification } from "./Notification";
import { useRouter } from "next/navigation";
import { useAuth } from "@/context/AuthContext";

export default function DashboardTopbar() {
  const { theme, setTheme } = useTheme();
  const { user, logout } = useAuth();

  const router = useRouter();
  const normalizedRole = String(
    (user as any)?.role ??
    (Array.isArray((user as any)?.roles) ? (user as any)?.roles[0] : (user as any)?.roles) ??
    ""
  ).toLowerCase();
  const canAccessSettings = !["teacher", "student"].includes(normalizedRole);
  const displayName = String((user as any)?.name ?? "Admin User");
  const displayEmail = String((user as any)?.email ?? "admin@lms.com");
  const displayAvatar = String(
    (user as any)?.avatar_url ??
    (user as any)?.avatarUrl ??
    (user as any)?.profile?.avatar_url ??
    ""
  );
  const avatarInitial = displayName.trim().charAt(0).toUpperCase() || "A";

  const [profileAnchor, setProfileAnchor] = useState<null | HTMLElement>(null);
  const [isLoggingOut, setIsLoggingOut] = useState(false);

  const handleLogout = async () => {
    if (isLoggingOut) return

    setProfileAnchor(null);
    setIsLoggingOut(true);
    try {
      await logout();
    } finally {
      setIsLoggingOut(false);
    }
  };

  return (
    <header className="sticky top-0 z-10 flex h-16 shrink-0 items-center justify-between border-b bg-background px-4">
      <div className="flex items-center gap-2">
        <SidebarTrigger className="-ml-1" />
        <div className="mx-2 h-4 w-px bg-border" />
        <h1 className="text-sm font-medium">Dashboard</h1>
      </div>

      <div className="flex items-center gap-1">
        <GlobalSearchBar />

        <Tooltip title="Toggle theme">
          <IconButton size="small" onClick={() => setTheme(theme === "dark" ? "light" : "dark")}>
            {theme === "dark" ? <LightModeIcon fontSize="small" /> : <DarkModeIcon fontSize="small" />}
          </IconButton>
        </Tooltip>

        <Tooltip title="Notifications">
          <div>
            <Notification />
          </div>
        </Tooltip>

        <Tooltip title="Account">
          <IconButton size="small" onClick={(e) => setProfileAnchor(e.currentTarget)} sx={{ ml: 0.5 }}>
            <Avatar alt="Profile" src={displayAvatar || undefined} sx={{ width: 32, height: 32, fontSize: 14 }}>
              {avatarInitial}
            </Avatar>
          </IconButton>
        </Tooltip>

        <Menu
          anchorEl={profileAnchor}
          open={Boolean(profileAnchor)}
          onClose={() => setProfileAnchor(null)}
          PaperProps={{ sx: { width: 240, maxWidth: "calc(100vw - 24px)", borderRadius: "12px", mt: 1 } }}
          transformOrigin={{ horizontal: "right", vertical: "top" }}
          anchorOrigin={{ horizontal: "right", vertical: "bottom" }}
        >
          <Box px={2} py={1.5} display="flex" alignItems="center" gap={1.5} sx={{ minWidth: 0 }}>
            <Avatar src={displayAvatar || undefined} sx={{ width: 36, height: 36, fontSize: 14 }}>{avatarInitial}</Avatar>
            <Box sx={{ minWidth: 0, flex: 1 }}>
              <Typography fontSize={13} fontWeight={600} noWrap>{displayName}</Typography>
              <Typography
                fontSize={11}
                color="text.secondary"
                noWrap
                sx={{ overflow: "hidden", textOverflow: "ellipsis" }}
                title={displayEmail}
              >
                {displayEmail}
              </Typography>
            </Box>
          </Box>
          <Divider />
          <MenuItem
            sx={{ gap: 1.5, fontSize: 13 }}
            onClick={() => {
              setProfileAnchor(null);
              router.push("/dashboard/profile");
            }}
          >
            <ListItemIcon><PersonIcon fontSize="small" /></ListItemIcon>
            My Profile
          </MenuItem>
          {canAccessSettings ? (
            <MenuItem
              sx={{ gap: 1.5, fontSize: 13 }}
              onClick={() => {
                setProfileAnchor(null);
                router.push("/admin/settings/general");
              }}
            >
              <ListItemIcon><SettingsIcon fontSize="small" /></ListItemIcon>
              Settings
            </MenuItem>
          ) : null}
          <Divider />
          <MenuItem
            sx={{ gap: 1.5, fontSize: 13, color: "error.main" }}
            onClick={handleLogout}
            disabled={isLoggingOut}
          >
            <ListItemIcon><LogoutIcon fontSize="small" sx={{ color: "error.main" }} /></ListItemIcon>
            {isLoggingOut ? "Logging out..." : "Logout"}
          </MenuItem>
        </Menu>
      </div>
    </header>
  );
}
