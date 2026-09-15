import { useEffect, useState } from 'react';
import { Avatar, Badge, Box, Heading, SimpleGrid, Spinner, Text, VStack } from '@chakra-ui/react';
import { discoveryService } from '../Services/discoveryService';

export default function Counselors() {
  const [items, setItems] = useState(null);
  useEffect(() => { let active = true; discoveryService.counselors().then((data) => { if (active) setItems(data); }); return () => { active = false; }; }, []);
  return <Box maxW="6xl" mx="auto" w="100%" py={10}><Badge colorScheme="green">Professional support</Badge><Heading mt={2}>Verified counselors</Heading><Text color="gray.500" mt={2} mb={8}>Browse professionals verified by the Wild Diary team. Profiles are distinct from community accounts.</Text>
    {!items ? <Spinner /> : items.length === 0 ? <VStack border="2px dashed" borderColor="gray.200" borderRadius="2xl" py={16}><Heading size="md">Directory verification is in progress</Heading><Text color="gray.500" textAlign="center" maxW="lg">No professionals are publicly listed yet. Wild Diary does not self-verify counselor registrations.</Text></VStack> : <SimpleGrid columns={{ base: 1, md: 2, lg: 3 }} spacing={5}>{items.map((item) => <Box key={item.id} border="1px solid" borderColor="gray.200" borderRadius="2xl" p={6}><Avatar name={item.username} bg="green.500" mb={4} /><Heading size="sm">{item.username}</Heading><Badge colorScheme="green" my={2}>Verified professional</Badge><Text fontSize="sm" color="gray.500">{item.expertise}</Text><Text mt={3} fontSize="sm">{item.bio}</Text><Text mt={4} fontWeight="700" fontSize="xs">{item.availability}</Text></Box>)}</SimpleGrid>}
  </Box>;
}
