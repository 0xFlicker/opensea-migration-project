import { FC } from "react";
import ListItemText from "@mui/material/ListItemText";
import MenuItem from "@mui/material/MenuItem";
import Typography from "@mui/material/Typography";
import ListItemIcon from "@mui/material/ListItemIcon";
import HomeIcon from "@mui/icons-material/Home";
import { DarkModeSwitch } from "features/appbar/components/DarkModeSwitch";
import { useSavedTheme } from "features/appbar/hooks";
import { WrappedLink } from "components/WrappedLink";

export const SiteMenu: FC<{
  // Yeah need to do a real sitemap and route stuff...
  isDemo?: boolean;
  isFaq?: boolean;
  isLinks?: boolean;
  isSignup?: boolean;
}> = ({ isDemo = false, isFaq = false, isLinks = false, isSignup = false }) => {
  const { handleChange: handleThemeChange, isDarkMode } = useSavedTheme();
  return (
    <>
      <MenuItem onClick={handleThemeChange}>
        <DarkModeSwitch isDarkMode={isDarkMode} />
        <ListItemText
          primary={
            <Typography textAlign="right" flexGrow={1}>
              Theme
            </Typography>
          }
        />
      </MenuItem>
      <MenuItem component={WrappedLink} href="/" disabled={isDemo}>
        <ListItemIcon>
          <HomeIcon />
        </ListItemIcon>
        <ListItemText
          primary={<Typography textAlign="right">Home</Typography>}
        />
      </MenuItem>
    </>
  );
};
