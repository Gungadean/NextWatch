import { useState, useEffect } from "react";
import {
  Box, Button, Center, Flex, Heading, HStack, Input, Spinner, Table, Text, Badge, VStack,
} from "@chakra-ui/react";
import { useColorModeValue } from "@/components/ui/color-mode";
import { toaster } from "@/components/ui/toaster";
import { getUsers, deleteUser, inviteUser, type User } from "@/features/account/accountApi";
import { getEmployees, type Employee } from "@/features/personnel/personnelApi";
import { useCurrentUser } from "@/hooks/useAuth.ts";
import { convertToLocalTime } from "@/utils/timeUtils.ts";
import InviteUserModal from "@/features/account/components/InviteUserModal.tsx";

const UserManagementPage = () => {
  const currentUser = useCurrentUser();
  const [users, setUsers] = useState<User[]>([]);
  const [employees, setEmployees] = useState<Employee[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState("");

  const [isInviteModalOpen, setIsInviteModalOpen] = useState(false);

  const pageBg = useColorModeValue("gray.50", "gray.900");
  const cardBg = useColorModeValue("white", "gray.800");
  const rowBg = useColorModeValue("gray.50", "gray.700");
  const borderColor = useColorModeValue("gray.200", "gray.700");

  useEffect(() => {
    const fetchData = async () => {
      try {
        const [usersData, employeesData] = await Promise.all([getUsers(), getEmployees()]);
        setUsers(usersData);
        setEmployees(employeesData);
      } catch (error: unknown) {
        console.log(error)
        toaster.create({ title: "Failed to load user data", type: "error" });
      } finally {
        setIsLoading(false);
      }
    };
    fetchData();
  }, []);

  const availableEmployees = employees.filter(emp => !users.some(u => u.employee_id === emp.id));

  const filteredUsers = users.filter(u =>
    u.email.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const handleDelete = async (userId: number) => {
    if (userId === currentUser?.id) {
      toaster.create({ title: "Cannot delete your own account", type: "error" });
      return;
    }
    if (!window.confirm("Are you sure you want to delete this user?")) return;
    try {
      await deleteUser(userId);
      setUsers(users.filter(u => u.id !== userId));
      toaster.create({ title: "User deleted", type: "success" });
    } catch (error: unknown) {
      console.log(error)
      toaster.create({ title: "Failed to delete user", type: "error" });
    }
  };

  const getBadgeColor = (user: User) => {
    if (user.role === "admin") {
      return "red";
    } else if (user.role === "manager") {
      return "yellow";
    } else {
      return "gray";
    }
  }

  if (isLoading) {
    return (
      <Center height="100vh">
        <VStack>
          <Spinner size="xl" color="blue.500" />
          <Text color="gray.500">Loading Users...</Text>
        </VStack>
      </Center>
    );
  }

  return (
    <Box borderRadius="md" bg={pageBg} h="calc(100vh - 64px)" p={6} overflow="hidden">
      <VStack gap={4} h="100%" align="stretch">
        <Flex justify="space-between" align="center" bg={cardBg} p={4} borderRadius="md" border="1px solid" borderColor={borderColor} shadow="sm">
          <HStack gap={4}>
            <Heading size="md">User Management</Heading>
            <Text color="gray.500" fontSize="sm">{filteredUsers.length} user{filteredUsers.length !== 1 && 's'} found</Text>
          </HStack>

          <HStack gap={3}>
            <Input
              placeholder="Search users..." size="sm" w="250px" value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)} border="1px solid" borderColor={borderColor}
            />

            <Button size="sm" colorPalette="blue" onClick={() => setIsInviteModalOpen(true)}>
              + Invite Employee
            </Button>
          </HStack>
        </Flex>

        <Box flex="1" bg={cardBg} borderRadius="md" border="1px solid" borderColor={borderColor} overflow="hidden" shadow="sm">
          <Table.ScrollArea h="100%">
            <Table.Root size="sm" stickyHeader interactive>
              <Table.Header>
                <Table.Row bg={rowBg}>
                  <Table.ColumnHeader>Email</Table.ColumnHeader>
                  <Table.ColumnHeader>Role</Table.ColumnHeader>
                  <Table.ColumnHeader>Status</Table.ColumnHeader>
                  <Table.ColumnHeader>Created</Table.ColumnHeader>
                  <Table.ColumnHeader>Last Login</Table.ColumnHeader>
                  <Table.ColumnHeader textAlign="right">Actions</Table.ColumnHeader>
                </Table.Row>
              </Table.Header>

              <Table.Body>
                {filteredUsers.map((user) => (
                  <Table.Row key={user.id}>
                    <Table.Cell>{user.email}</Table.Cell>
                    <Table.Cell>
                      <Badge colorPalette={getBadgeColor(user)}>{user.role}</Badge>
                    </Table.Cell>
                    <Table.Cell>{user.is_active ? "Active" : "Inactive"}</Table.Cell>
                    <Table.Cell>{convertToLocalTime(user.created_at)}</Table.Cell>
                    <Table.Cell>{convertToLocalTime(user.last_login)}</Table.Cell>
                    <Table.Cell textAlign="right">
                      {user.email !== currentUser?.email && (
                        <Button variant="ghost" size="sm" colorPalette="red" onClick={() => handleDelete(user.id)}>
                          Delete
                        </Button>
                      )}
                    </Table.Cell>
                  </Table.Row>
                ))}
              </Table.Body>
            </Table.Root>
          </Table.ScrollArea>
        </Box>
      </VStack>

      <InviteUserModal
        isOpen={isInviteModalOpen}
        onOpenChange={(open) => setIsInviteModalOpen(open)}
        availableEmployees={availableEmployees}
        onInvite={(employeeId) => inviteUser(employeeId)}
      />
    </Box>
  );
};

export default UserManagementPage;