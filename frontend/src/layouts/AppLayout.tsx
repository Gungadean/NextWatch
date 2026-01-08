import { Outlet } from 'react-router';
import Sidebar from '../components/Sidebar';
import { Container, HStack, VStack} from "@chakra-ui/react";
import Header from "../components/Header.tsx";

const AppLayout = () => {
  return (
    <Container padding="0" height="100vh" maxWidth="1920px">
      <HStack height="100%" alignItems="stretch">
        <Sidebar />

        <VStack flex="1" alignItems="stretch" padding="2" width="100%">
          <Header />
          <Outlet />
        </VStack>
      </HStack>
    </Container>
  )
};

export default AppLayout;