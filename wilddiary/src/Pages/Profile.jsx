import { useEffect, useState } from 'react';
import { useNavigate, Link as RouterLink } from 'react-router-dom';
import { useAuth } from '../Context/useAuth';
import { usePosts } from '../Context/usePosts';
import { discoveryService } from '../Services/discoveryService';
import { useColorMode, useToast, IconButton, Tooltip, Spinner } from '@chakra-ui/react';
import {
  Box, Flex, VStack, HStack, Grid, GridItem, Heading, Text,
  Badge, Divider, Link,
} from '@chakra-ui/react';
import { MdPerson, MdVerifiedUser, MdEmail, MdDescription, MdAutoAwesome, MdDeleteOutline } from 'react-icons/md';

export default function Profile() {
  const { user, isAuthenticated } = useAuth();
  const { deletePost } = usePosts();
  const { colorMode } = useColorMode();
  const navigate = useNavigate();
  const toast = useToast();
  const isDark = colorMode === 'dark';

  const [userPosts, setUserPosts] = useState([]);
  const [loadingPosts, setLoadingPosts] = useState(true);

  useEffect(() => {
    if (!isAuthenticated) { navigate('/auth'); return; }
    let active = true;
    discoveryService.userPosts()
      .then((data) => { if (active && Array.isArray(data)) setUserPosts(data); })
      .catch((err) => toast({ title: 'Could not load your posts', description: err.message, status: 'error' }))
      .finally(() => { if (active) setLoadingPosts(false); });
    return () => { active = false; };
  }, [isAuthenticated, navigate, toast]);

  const handleDeletePost = async (e, postId) => {
    e.preventDefault();
    e.stopPropagation();
    if (!window.confirm('Are you sure you want to delete this diary post?')) return;
    const res = await deletePost(postId);
    if (res.success) {
      setUserPosts(prev => prev.filter(p => p.id !== postId));
      toast({ title: 'Post deleted.', status: 'success', duration: 3000, isClosable: true });
    } else {
      toast({ title: 'Failed to delete post', description: res.error, status: 'error' });
    }
  };

  if (!isAuthenticated) return null;
  if (!user) {
    return (
      <Flex minH="60vh" align="center" justify="center">
        <Spinner color="brand.500" size="lg" />
      </Flex>
    );
  }

  const isCounselor = user?.role === 'counselor';

  const borderColor = isDark ? 'whiteAlpha.100' : 'gray.200';
  const cardBg = isDark ? 'whiteAlpha.50' : 'gray.50';
  const subtleText = isDark ? 'gray.400' : 'gray.500';

  return (
    <Box flex="1" maxW="4xl" mx="auto" w="100%" px={4} py={8} textAlign="left" fontFamily="'Poppins', sans-serif">
      <Box mb={8}>
        <Heading fontSize="3xl" fontWeight="900" fontFamily="'Poppins', sans-serif" letterSpacing="-0.5px">Your Profile</Heading>
        <Text color={subtleText} fontSize="sm" mt={1} fontFamily="'Poppins', sans-serif">Manage your account and view your sharing stats.</Text>
      </Box>

      <Grid templateColumns="1fr" gap={6} mb={8}>
        <GridItem>
          <Box bg={cardBg} border="1px solid" borderColor={borderColor} p={6} borderRadius="2xl">
            <HStack mb={6} spacing={4}>
              <Box p={4} borderRadius="2xl" bg={isCounselor ? 'green.900' : 'purple.900'} color={isCounselor ? 'green.300' : 'purple.300'}>
                <MdPerson size={32} />
              </Box>
              <Box>
                <Heading size="md" fontFamily="'Poppins', sans-serif" textTransform="capitalize">{user?.username || 'User'}</Heading>
                <Badge mt={1} colorScheme={isCounselor ? 'green' : 'purple'} borderRadius="full" px={3} py={0.5} fontSize="10px" fontFamily="'Poppins', sans-serif">
                  {isCounselor ? '✓ Verified Counselor' : 'Community Member'}
                </Badge>
              </Box>
            </HStack>
            <Divider borderColor={borderColor} mb={5} />
            <VStack align="flex-start" spacing={3} fontSize="sm" color={isDark ? 'gray.300' : 'gray.600'}>
              <HStack spacing={3}>
                <MdEmail size={18} color={isDark ? '#555' : '#aaa'} />
                <Text fontFamily="'Poppins', sans-serif">Email: <Text as="strong" color={isDark ? 'white' : 'black'}>{user?.email || 'N/A'}</Text></Text>
              </HStack>
              <HStack spacing={3}>
                <MdVerifiedUser size={18} color={isDark ? '#555' : '#aaa'} />
                <Text fontFamily="'Poppins', sans-serif">Role: <Text as="strong" color={isDark ? 'white' : 'black'} textTransform="capitalize">{user?.role || 'user'}</Text></Text>
              </HStack>
            </VStack>
          </Box>
        </GridItem>

      </Grid>

      <Box>
        <HStack mb={4} spacing={2}>
          <MdDescription size={20} color={isDark ? '#555' : '#aaa'} />
          <Heading size="md" fontFamily="'Poppins', sans-serif" fontWeight="800">Your Diary Entries ({userPosts.length})</Heading>
        </HStack>

        {loadingPosts ? (
          <Flex justify="center" py={10}>
            <Spinner color="brand.500" size="lg" />
          </Flex>
        ) : userPosts.length === 0 ? (
          <Flex direction="column" align="center" justify="center" py={10}
            border="2px dashed" borderColor={borderColor} borderRadius="2xl" textAlign="center">
            <MdAutoAwesome size={40} opacity={0.3} />
            <Text color={subtleText} fontSize="sm" mt={3} fontFamily="'Poppins', sans-serif">
              You haven't written any diary entries yet. Go to the{' '}
              <Link as={RouterLink} to="/feed" color="brand.500" fontWeight="700">Feed</Link> and share your thoughts.
            </Text>
          </Flex>
        ) : (
          <Grid templateColumns={{ base: '1fr', md: 'repeat(2, 1fr)' }} gap={4}>
            {userPosts.map((post) => (
              <GridItem key={post.id}>
                <Box as={RouterLink} to={`/post/${post.id}`} display="block" p={5} bg={cardBg}
                  border="1px solid" borderColor={borderColor} borderRadius="xl"
                  _hover={{ borderColor: isDark ? 'whiteAlpha.300' : 'gray.400' }} transition="border-color 0.2s" textDecoration="none">
                  <HStack justify="space-between" mb={2}>
                    <HStack spacing={2}>
                      <Text fontSize="xs" color={subtleText} fontFamily="'Poppins', sans-serif">
                        {new Date(post.created_at).toLocaleDateString()}
                      </Text>
                      {post.status === 'under_review' && (
                        <Badge colorScheme="yellow" fontSize="8px" borderRadius="sm">Under Review</Badge>
                      )}
                      {post.status === 'flagged' && (
                        <Badge colorScheme="red" fontSize="8px" borderRadius="sm">Flagged</Badge>
                      )}
                    </HStack>
                    <HStack spacing={2}>
                      <Badge colorScheme="purple" borderRadius="md" fontSize="9px" fontFamily="'Poppins', sans-serif" textTransform="capitalize">
                        {post.category}
                      </Badge>
                      <Tooltip label="Delete post" hasArrow>
                        <IconButton
                          aria-label="Delete post"
                          icon={<MdDeleteOutline size={16} />}
                          size="xs"
                          variant="ghost"
                          colorScheme="red"
                          onClick={(e) => handleDeletePost(e, post.id)}
                        />
                      </Tooltip>
                    </HStack>
                  </HStack>
                  <Text fontSize="sm" color={isDark ? 'gray.300' : 'gray.700'} noOfLines={3} lineHeight="1.6" fontFamily="'Poppins', sans-serif">
                    {post.content}
                  </Text>
                  <HStack mt={3} pt={2} borderTop="1px solid" borderColor={borderColor} fontSize="xs" color={subtleText} spacing={3} fontFamily="'Poppins', sans-serif">
                    <Text>👍 {post.reactions_count || 0} supports</Text>
                    <Text>•</Text>
                    <Text>💬 {post.comments_count || 0} replies</Text>
                    <Badge ml="auto" fontSize="9px" colorScheme={post.is_anonymous ? 'gray' : 'purple'} borderRadius="sm" fontFamily="'Poppins', sans-serif">
                      {post.is_anonymous ? 'Anonymous' : 'Public'}
                    </Badge>
                  </HStack>
                </Box>
              </GridItem>
            ))}
          </Grid>
        )}
      </Box>
    </Box>
  );
}
