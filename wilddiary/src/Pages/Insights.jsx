import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Alert, AlertIcon, Badge, Box, Flex, Heading, Progress, SimpleGrid, Spinner, Text, VStack } from '@chakra-ui/react';
import { useAuth } from '../Context/useAuth';
import { diaryService } from '../Services/diaryService';

export default function Insights() {
  const { isAuthenticated } = useAuth();
  const navigate = useNavigate();
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!isAuthenticated) {
      navigate('/auth', { replace: true });
      return;
    }
    let active = true;
    diaryService.insights()
      .then((result) => {
        if (active && result && !result.error) {
          setData(result);
        } else if (active) {
          setData({ moods: [], categories: [], disclaimer: 'Write more diary reflections to generate insights.' });
        }
      })
      .catch(() => {
        if (active) setData({ moods: [], categories: [], disclaimer: 'Write more diary reflections to generate insights.' });
      })
      .finally(() => {
        if (active) setLoading(false);
      });
    return () => { active = false; };
  }, [isAuthenticated, navigate]);

  if (loading) {
    return (
      <Flex py={20} justify="center">
        <Spinner color="brand.500" size="lg" />
      </Flex>
    );
  }

  const moods = Array.isArray(data?.moods) ? data.moods : [];
  const categories = Array.isArray(data?.categories) ? data.categories : [];
  const maxMood = Math.max(1, ...moods.map((item) => item.count || 0));
  const disclaimer = data?.disclaimer || 'A gentle overview of themes and patterns you have recorded.';

  return (
    <Box maxW="5xl" mx="auto" w="100%" py={10} px={4} fontFamily="'Poppins', sans-serif">
      <Badge colorScheme="purple" mb={2}>Private insights</Badge>
      <Heading mt={2} fontSize="3xl" fontWeight="900">Your reflection patterns</Heading>
      <Text color="gray.500" mt={2} mb={7}>A gentle overview of themes you chose to record.</Text>

      <Alert status="info" borderRadius="xl" mb={6}>
        <AlertIcon />
        {disclaimer}
      </Alert>

      <SimpleGrid columns={{ base: 1, md: 2 }} spacing={5}>
        <Box border="1px solid" borderColor="gray.200" borderRadius="2xl" p={6}>
          <Heading size="md" mb={5}>Mood check-ins</Heading>
          <VStack align="stretch" spacing={4}>
            {moods.length ? (
              moods.map((item) => (
                <Box key={item.label}>
                  <Flex justify="space-between">
                    <Text textTransform="capitalize" fontSize="sm">{item.label}</Text>
                    <Text fontSize="sm" fontWeight="700">{item.count}</Text>
                  </Flex>
                  <Progress
                    value={((item.count || 0) / maxMood) * 100}
                    colorScheme="purple"
                    mt={2}
                    borderRadius="full"
                  />
                </Box>
              ))
            ) : (
              <Text color="gray.500" fontSize="sm">No diary check-ins yet. Start a reflection to track your moods.</Text>
            )}
          </VStack>
        </Box>

        <Box border="1px solid" borderColor="gray.200" borderRadius="2xl" p={6}>
          <Heading size="md" mb={5}>Topics you share</Heading>
          <VStack align="stretch" spacing={3}>
            {categories.length ? (
              categories.map((item) => (
                <Flex key={item.label} justify="space-between" p={3} bg="blackAlpha.50" borderRadius="lg">
                  <Text textTransform="capitalize">{item.label}</Text>
                  <Badge colorScheme="purple">{item.count}</Badge>
                </Flex>
              ))
            ) : (
              <Text color="gray.500" fontSize="sm">No community topics yet.</Text>
            )}
          </VStack>
        </Box>
      </SimpleGrid>
    </Box>
  );
}
