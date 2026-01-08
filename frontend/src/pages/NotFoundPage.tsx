import {AbsoluteCenter, Button, Heading, VStack} from "@chakra-ui/react";

const NotFoundPage = () => {
  return (
    <AbsoluteCenter>
      <VStack>
        <Heading size="7xl" fontWeight="bold" paddingBottom="20px">404 :)</Heading>
        <Button asChild>
          <a href="/">Return to Dashboard</a>
        </Button>
      </VStack>
    </AbsoluteCenter>
  );
}

export default NotFoundPage;