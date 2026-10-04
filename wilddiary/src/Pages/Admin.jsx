import { useCallback, useEffect, useState } from 'react';
import {
  Alert, AlertIcon, Badge, Box, Button, Flex, Heading, Input, SimpleGrid,
  Spinner, Stat, StatLabel, StatNumber, Table, TableContainer, Tbody, Td,
  Text, Th, Thead, Tr, useColorModeValue, useToast,
} from '@chakra-ui/react';
import { MdDeleteForever, MdFlag, MdLockReset, MdRefresh } from 'react-icons/md';
import { adminService } from '../Services/adminService';

function StatCard({ label, value, color }) {
  return (
    <Stat bg="whiteAlpha.50" border="1px solid" borderColor="whiteAlpha.200" borderRadius="xl" p={5}>
      <StatLabel color="gray.500">{label}</StatLabel>
      <StatNumber color={color}>{value ?? 0}</StatNumber>
    </Stat>
  );
}

export default function Admin() {
  const toast = useToast();
  const panel = useColorModeValue('white', '#242526');
  const border = useColorModeValue('gray.200', 'whiteAlpha.200');
  const [overview, setOverview] = useState(null);
  const [users, setUsers] = useState([]);
  const [audit, setAudit] = useState([]);
  const [query, setQuery] = useState('');
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(null);

  const load = useCallback(async (search = '') => {
    setLoading(true);
    try {
      const [summary, members, log] = await Promise.all([
        adminService.overview(), adminService.users(search), adminService.auditLog(),
      ]);
      setOverview(summary);
      setUsers(Array.isArray(members) ? members : []);
      setAudit(Array.isArray(log) ? log : []);
    } catch (error) {
      toast({ title: 'Could not load admin data', description: error.message, status: 'error' });
    } finally { setLoading(false); }
  }, [toast]);

  useEffect(() => {
    const timer = window.setTimeout(() => load(), 0);
    return () => window.clearTimeout(timer);
  }, [load]);

  const run = async (key, operation, success) => {
    setBusy(key);
    try {
      await operation();
      toast({ title: success, status: 'success', duration: 2500 });
      await load(query);
    } catch (error) {
      toast({ title: 'Action failed', description: error.message, status: 'error' });
    } finally { setBusy(null); }
  };

  const toggleFlag = (member) => {
    let reason = '';
    if (!member.is_flagged) {
      reason = window.prompt('Why is this account being flagged? (for example: repeated spam)')?.trim() || '';
      if (reason.length < 3) return;
    }
    run(`flag-${member.id}`, () => adminService.flagUser(member.id, !member.is_flagged, reason), member.is_flagged ? 'Flag removed' : 'User flagged');
  };

  const resetPassword = (member) => {
    const password = window.prompt(`Enter a temporary password for ${member.username} (at least 8 characters):`) || '';
    if (password.length < 8) return;
    run(`password-${member.id}`, () => adminService.resetPassword(member.id, password), 'Password changed and sessions revoked');
  };

  const deleteUser = (member) => {
    if (!window.confirm(`Permanently delete ${member.username}? Their private data will be removed. This cannot be undone.`)) return;
    run(`delete-${member.id}`, () => adminService.deleteUser(member.id), 'User deleted');
  };

  const clearContent = () => {
    const confirmation = window.prompt('Danger zone: type CLEAR WILDDIARY CONTENT to remove all posts, comments, chats, diaries, and notifications. User accounts will remain.') || '';
    if (confirmation !== 'CLEAR WILDDIARY CONTENT') return;
    run('clear', () => adminService.clearContent(confirmation), 'All application content cleared');
  };

  return (
    <Box w="full" maxW="7xl" mx="auto" px={{ base: 4, md: 8 }} py={8}>
      <Flex justify="space-between" align={{ base: 'start', md: 'center' }} gap={4} mb={7} direction={{ base: 'column', md: 'row' }}>
        <Box>
          <Heading size="lg">Administration</Heading>
          <Text color="gray.500" mt={1}>Manage members, security, moderation, and stored content.</Text>
        </Box>
        <Button leftIcon={<MdRefresh />} onClick={() => load(query)} isLoading={loading}>Refresh</Button>
      </Flex>

      <Alert status="info" borderRadius="lg" mb={6}>
        <AlertIcon /> Every administrative change is recorded. Flagging marks an account for review; suspension signs it out and blocks access.
      </Alert>

      <SimpleGrid columns={{ base: 2, md: 5 }} spacing={4} mb={8}>
        <StatCard label="Users" value={overview?.users?.total} />
        <StatCard label="Active" value={overview?.users?.active} color="green.400" />
        <StatCard label="Flagged" value={overview?.users?.flagged} color="orange.400" />
        <StatCard label="Posts" value={overview?.content?.posts} />
        <StatCard label="Open reports" value={overview?.content?.reports} color="red.400" />
      </SimpleGrid>

      <Box bg={panel} border="1px solid" borderColor={border} borderRadius="xl" overflow="hidden" mb={8}>
        <Flex p={5} gap={3} align={{ base: 'stretch', md: 'center' }} direction={{ base: 'column', md: 'row' }}>
          <Heading size="md" flex="1">User management</Heading>
          <Input maxW={{ md: '320px' }} value={query} onChange={e => setQuery(e.target.value)} placeholder="Search username or email" onKeyDown={e => e.key === 'Enter' && load(query)} />
          <Button onClick={() => load(query)}>Search</Button>
        </Flex>
        {loading ? <Flex py={16} justify="center"><Spinner /></Flex> : (
          <TableContainer>
            <Table size="sm">
              <Thead><Tr><Th>User</Th><Th>Role</Th><Th>Status</Th><Th>Flag</Th><Th>Joined</Th><Th textAlign="right">Actions</Th></Tr></Thead>
              <Tbody>
                {users.map(member => (
                  <Tr key={member.id}>
                    <Td><Text fontWeight="700">{member.username}</Text><Text fontSize="xs" color="gray.500">{member.email}</Text></Td>
                    <Td><Badge>{member.role}</Badge></Td>
                    <Td><Badge colorScheme={member.is_active ? 'green' : 'red'}>{member.is_active ? 'Active' : 'Suspended'}</Badge></Td>
                    <Td>{member.is_flagged ? <Box><Badge colorScheme="orange">Flagged</Badge><Text maxW="220px" fontSize="xs" mt={1} noOfLines={2}>{member.flag_reason}</Text></Box> : <Text color="gray.500">—</Text>}</Td>
                    <Td fontSize="xs">{member.created_at?.slice(0, 10)}</Td>
                    <Td>
                      <Flex gap={2} justify="flex-end" wrap="wrap">
                        {member.role !== 'admin' && <Button size="xs" leftIcon={<MdFlag />} colorScheme={member.is_flagged ? 'gray' : 'orange'} variant="outline" isLoading={busy === `flag-${member.id}`} onClick={() => toggleFlag(member)}>{member.is_flagged ? 'Unflag' : 'Flag'}</Button>}
                        {member.role !== 'admin' && <Button size="xs" colorScheme={member.is_active ? 'red' : 'green'} variant="outline" isLoading={busy === `status-${member.id}`} onClick={() => run(`status-${member.id}`, () => adminService.setUserStatus(member.id, !member.is_active), member.is_active ? 'User suspended' : 'User activated')}>{member.is_active ? 'Suspend' : 'Activate'}</Button>}
                        <Button size="xs" leftIcon={<MdLockReset />} variant="outline" isLoading={busy === `password-${member.id}`} onClick={() => resetPassword(member)}>Password</Button>
                        {member.role !== 'admin' && <Button size="xs" aria-label="Delete user" colorScheme="red" variant="ghost" isLoading={busy === `delete-${member.id}`} onClick={() => deleteUser(member)}><MdDeleteForever /></Button>}
                      </Flex>
                    </Td>
                  </Tr>
                ))}
              </Tbody>
            </Table>
          </TableContainer>
        )}
      </Box>

      <SimpleGrid columns={{ base: 1, lg: 2 }} spacing={6}>
        <Box bg={panel} border="1px solid" borderColor={border} borderRadius="xl" p={5}>
          <Heading size="md" mb={4}>Recent audit activity</Heading>
          {audit.slice(0, 12).map(item => <Box key={item.id} py={2} borderBottom="1px solid" borderColor={border}><Text fontSize="sm"><b>{item.admin_name}</b> · {item.action.replaceAll('_', ' ')}</Text><Text fontSize="xs" color="gray.500">{item.created_at}{item.details ? ` · ${item.details}` : ''}</Text></Box>)}
          {!audit.length && <Text color="gray.500">No administrative actions yet.</Text>}
        </Box>
        <Box bg={panel} border="1px solid" borderColor="red.300" borderRadius="xl" p={5} alignSelf="start">
          <Heading size="md" color="red.400">Danger zone</Heading>
          <Text color="gray.500" my={3}>Clear all community content and private user content while preserving accounts and the audit log. Nothing is cleared automatically during a restart or deployment.</Text>
          <Button colorScheme="red" leftIcon={<MdDeleteForever />} isLoading={busy === 'clear'} onClick={clearContent}>Clear all content</Button>
        </Box>
      </SimpleGrid>
    </Box>
  );
}
