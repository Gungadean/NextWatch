import React, { useState } from "react";
import {
  Box,
  Button,
  Input,
  Stack,
  Text,
  IconButton,
  HStack,
  Portal,
  CloseButton,
} from "@chakra-ui/react";
import {
  Dialog,
} from "@chakra-ui/react";
import { Field } from "@/components/ui/field";
import { NativeSelectField, NativeSelectRoot } from "@/components/ui/native-select";
import { useColorModeValue } from "@/components/ui/color-mode";
import { LuCopy, LuCheck } from "react-icons/lu";
import { toaster } from "@/components/ui/toaster";
import { type Employee } from "@/features/personnel/personnelApi";
import type {InviteCreateResponse} from "@/features/account/accountApi.ts";

interface InviteUserModalProps {
  isOpen: boolean;
  onOpenChange: (open: boolean) => void;
  availableEmployees: Employee[];
  onInvite: (employeeId: number) => Promise<InviteCreateResponse>;
}

/**
 * InviteUserModal
 * Handles the selection of an employee and displays a generated, copyable invite URL.
 */
export const InviteUserModal: React.FC<InviteUserModalProps> = ({
  isOpen,
  onOpenChange,
  availableEmployees,
  onInvite,
}) => {
  const [selectedEmployeeId, setSelectedEmployeeId] = useState<string>("");
  const [isInviting, setIsInviting] = useState(false);
  const [generatedInvite, setGeneratedInvite] = useState<{ url: string; expires: string } | null>(null);
  const [copied, setCopied] = useState(false);

  const cardBg = useColorModeValue("white", "gray.800");
  const borderColor = useColorModeValue("gray.200", "gray.700");
  const textColor = useColorModeValue("black", "white");
  const mutedText = useColorModeValue("gray.500", "gray.400");
  const inputBg = useColorModeValue("gray.50", "whiteAlpha.50");
  const inputFocusBg = useColorModeValue("white", "gray.800");

  const handleInvite = async () => {
    if (!selectedEmployeeId) return;
    setIsInviting(true);
    try {
      const response = await onInvite(parseInt(selectedEmployeeId));
      const url = `${window.location.origin}/register?token=${response.token}`;
      setGeneratedInvite({ url, expires: new Date(response.expires_at).toLocaleString() });
    } catch (error: unknown) {
      console.log(error);
      toaster.create({ title: "Failed to generate invite", type: "error" });
    } finally {
      setIsInviting(false);
    }
  };

  const copyToClipboard = () => {
    if (generatedInvite) {
      navigator.clipboard.writeText(generatedInvite.url);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
      toaster.create({ title: "Link copied!", type: "info" });
    }
  };

  return (
    <Dialog.Root
      open={isOpen}
      onOpenChange={(details) => {
        onOpenChange(details.open);
        if (!details.open) setGeneratedInvite(null);
      }}
      placement="center"
    >
      <Portal>
        <Dialog.Backdrop bg="blackAlpha.600" />
        <Dialog.Positioner>
          <Dialog.Content maxW="500px" bg={cardBg} borderColor={borderColor} borderWidth="1px" shadow="xl" borderRadius="lg">
            <Dialog.Header>
              <Text fontSize="lg" fontWeight="bold">Send Registration Invite</Text>
            </Dialog.Header>

            <Dialog.Body>
              {generatedInvite ? (
                <Stack gap={4}>
                  <Box p={4} bg="gray.50" _dark={{ bg: "gray.700" }} borderRadius="md">
                    <Text fontSize="sm" mb={2} color={mutedText}>
                      Share this link with the employee. It expires at:
                      <br />
                      <b>{generatedInvite.expires}</b>
                    </Text>

                    <HStack>
                      <Input value={generatedInvite.url} readOnly size="sm" />
                      <IconButton aria-label="Copy" size="sm" onClick={copyToClipboard}>
                        {copied ? <LuCheck /> : <LuCopy />}
                      </IconButton>
                    </HStack>
                  </Box>
                </Stack>
              ) : (
                <Stack gap={4}>
                  <Text fontSize="sm" color={mutedText}>
                    Select an employee to generate a unique registration link.
                  </Text>
                  <Field label="Employee">
                    <NativeSelectRoot>
                      <NativeSelectField
                        name="employee"
                        value={selectedEmployeeId}
                        onChange={(e) => setSelectedEmployeeId(e.target.value)}
                        bg={inputBg}
                          borderColor={borderColor}
                          color={textColor}
                          _focus={{ bg: inputFocusBg, borderColor: "blue.400", shadow: "sm" }}
                          transition="all 0.2s"
                      >
                        <option value="">-- Select Employee --</option>
                        {availableEmployees.map((emp) => (
                          <option key={emp.id} value={emp.id.toString()}>
                            {emp.last_name}, {emp.first_name}
                          </option>
                        ))}
                      </NativeSelectField>
                    </NativeSelectRoot>
                  </Field>
                </Stack>
              )}
            </Dialog.Body>

            <Dialog.Footer>
              {!generatedInvite && (
                <Button colorPalette="blue" loading={isInviting} onClick={handleInvite}>
                  Generate Invite
                </Button>
              )}
              <Dialog.ActionTrigger asChild>
                <Button variant="outline">{generatedInvite ? "Close" : "Cancel"}</Button>
              </Dialog.ActionTrigger>
            </Dialog.Footer>

            <Dialog.CloseTrigger asChild>
              <CloseButton size="sm" color={mutedText} _hover={{ bg: "gray.100", _dark: { bg: "gray.700" } }} />
            </Dialog.CloseTrigger>
          </Dialog.Content>
        </Dialog.Positioner>
      </Portal>
    </Dialog.Root>
  );
};

export default InviteUserModal;