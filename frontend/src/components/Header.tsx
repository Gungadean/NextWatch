import {HStack, IconButton} from "@chakra-ui/react";
import {useColorMode} from "./ui/color-mode.tsx";
import {LuMoon, LuSun, LuLogOut, LuUser} from "react-icons/lu";
import {toaster} from "./ui/toaster.tsx";
import {useNavigate} from "react-router";
import {useAuth} from "../context/useAuth.ts";

const Header = () => {
  const { toggleColorMode, colorMode } = useColorMode()
  const navigate = useNavigate();
  const { logout } = useAuth();

  const showProfile = async () => {
    toaster.create({ title: "This will show a profile modal eventually.", type: "success" });
  }

  const handleLogout = async () => {
    logout();
    navigate("/login");
  }

  return (
    <HStack justify="right" gap="2">
      <IconButton onClick={toggleColorMode} variant="outline" size="sm">
        {colorMode === "light" ? <LuSun /> : <LuMoon />}
      </IconButton>
      <IconButton onClick={showProfile} variant="outline" size="sm">
        {<LuUser />}
      </IconButton>
      <IconButton onClick={handleLogout} variant="outline" size="sm">
        {<LuLogOut />}
      </IconButton>
    </HStack>
  )
}

export default Header;