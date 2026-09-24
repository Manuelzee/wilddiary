import { useEffect, useState } from 'react';
import { Link as RouterLink, useNavigate } from 'react-router-dom';
import { Badge, Box, Button, Flex, Heading, SimpleGrid, Spinner, Text, VStack, useColorMode, useToast } from '@chakra-ui/react';
import { MdAdd, MdLock, MdMenuBook } from 'react-icons/md';
import { useAuth } from '../Context/useAuth';
import { diaryService } from '../Services/diaryService';

export default function Diary() {
  const { isAuthenticated } = useAuth();
  const navigate = useNavigate();
  const toast = useToast();
  const { colorMode } = useColorMode();
  const [entries, setEntries] = useState([]);
  const [loading, setLoading] = useState(true);
  const isDark = colorMode === 'dark';

  useEffect(() => {
    if (!isAuthenticated) { navigate('/auth', { replace: true }); return; }
    let active = true;
    diaryService.list().then((data) => { if (active) setEntries(Array.isArray(data) ? data : []); })
      .catch((error) => toast({ title: 'Could not load your diary', description: error.message, status: 'error' }))
      .finally(() => { if (active) setLoading(false); });
    return () => { active = false; };
  }, [isAuthenticated, navigate, toast]);

  return (
    <Box w="100%" maxW="6xl" mx="auto" py={{ base: 6, md: 10 }}>
      <Flex justify="space-between" align="start" gap={4} mb={8}>
        <Box><Badge colorScheme="purple" mb={2}><MdLock style={{ display: 'inline' }} /> Private to you</Badge><Heading>My Diary</Heading><Text color="gray.500" mt={2}>A quiet place to write, notice patterns, and reflect.</Text></Box>
        <Button as={RouterLink} to="/diary/new" leftIcon={<MdAdd />} variant="brand">New entry</Button>
      </Flex>
      {loading ? <Flex justify="center" py={20}><Spinner /></Flex> : entries.length === 0 ? (
        <VStack border="2px dashed" borderColor={isDark ? 'whiteAlpha.200' : 'gray.200'} borderRadius="2xl" py={16} spacing={4}>
          <MdMenuBook size={44} opacity={0.35} /><Heading size="md">Your private pages begin here</Heading>
          <Text color="gray.500" textAlign="center">Write what you need. Private entries never appear in the community feed.</Text>
          <Button as={RouterLink} to="/diary/new" variant="brand">Write your first entry</Button>
        </VStack>
      ) : <SimpleGrid columns={{ base: 1, md: 2, lg: 3 }} spacing={4}>{entries.map((entry) => (
        <Box key={entry.id} as={RouterLink} to={`/diary/${entry.id}`} bg={isDark ? 'whiteAlpha.50' : 'white'} border="1px solid" borderColor={isDark ? 'whiteAlpha.200' : 'gray.200'} borderRadius="2xl" p={5} _hover={{ borderColor: 'brand.400', textDecoration: 'none', transform: 'translateY(-2px)' }} transition="all .2s">
          <Flex justify="space-between" mb={3}><Badge textTransform="capitalize" colorScheme="purple">{entry.mood || 'Reflection'}</Badge><Text fontSize="xs" color="gray.500">{new Date(entry.updated_at).toLocaleDateString()}</Text></Flex>
          <Heading size="sm" noOfLines={1}>{entry.title}</Heading><Text mt={3} color="gray.500" fontSize="sm" noOfLines={4} whiteSpace="pre-wrap">{entry.content}</Text>
        </Box>
      ))}</SimpleGrid>}
    </Box>
  );
}
