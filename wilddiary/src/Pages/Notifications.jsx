import { useEffect, useState } from 'react';
import { Link as RouterLink, useNavigate } from 'react-router-dom';
import { Badge, Box, Button, Flex, Heading, Spinner, Text, VStack } from '@chakra-ui/react';
import { useAuth } from '../Context/useAuth';
import { discoveryService } from '../Services/discoveryService';

export default function Notifications() {
  const { isAuthenticated } = useAuth();
  const navigate = useNavigate();
  const [items, setItems] = useState(null);

  useEffect(() => {
    if (!isAuthenticated) {
      navigate('/auth', { replace: true });
      return;
    }
    let active = true;
    discoveryService.notifications()
      .then((data) => {
        if (active) setItems(Array.isArray(data) ? data : []);
      })
      .catch(() => {
        if (active) setItems([]);
      });
    return () => { active = false; };
  }, [isAuthenticated, navigate]);

  const markRead = async () => {
    try {
      await discoveryService.markNotificationsRead();
      setItems((current) => Array.isArray(current) ? current.map((item) => ({ ...item, is_read: 1 })) : []);
    } catch {
      // Ignore notification read errors
    }
  };

  return (
    <Box maxW="3xl" mx="auto" w="100%" py={10} px={4} fontFamily="'Poppins', sans-serif">
      <Flex justify="space-between" align="center" mb={7} flexWrap="wrap" gap={3}>
        <Box>
          <Heading fontSize="3xl" fontWeight="900">Notifications</Heading>
          <Text color="gray.500" mt={1}>Support, responses, and account updates.</Text>
        </Box>
        <Button variant="outline" borderRadius="full" size="sm" onClick={markRead}>
          Mark all read
        </Button>
      </Flex>

      {!items ? (
        <Flex justify="center" py={16}>
          <Spinner color="brand.500" size="lg" />
        </Flex>
      ) : (
        <VStack align="stretch" spacing={3}>
          {items.length ? (
            items.map((item) => (
              <Box
                key={item.id}
                as={item.link ? RouterLink : 'div'}
                to={item.link}
                p={4}
                border="1px solid"
                borderColor="gray.200"
                borderRadius="xl"
                bg={item.is_read ? 'transparent' : 'purple.50'}
                _hover={{ textDecoration: 'none', borderColor: 'brand.300' }}
              >
                <Flex justify="space-between" gap={3}>
                  <Text fontSize="sm" fontWeight={item.is_read ? '500' : '700'}>{item.message}</Text>
                  {!item.is_read && <Badge colorScheme="purple">New</Badge>}
                </Flex>
                <Text color="gray.500" fontSize="xs" mt={2}>
                  {item.created_at ? new Date(item.created_at).toLocaleString() : ''}
                </Text>
              </Box>
            ))
          ) : (
            <Box py={16} textAlign="center" border="2px dashed" borderColor="gray.200" borderRadius="2xl">
              <Heading size="sm">You’re all caught up</Heading>
              <Text color="gray.500" mt={2} fontSize="sm">New supportive activity will appear here.</Text>
            </Box>
          )}
        </VStack>
      )}
    </Box>
  );
}
