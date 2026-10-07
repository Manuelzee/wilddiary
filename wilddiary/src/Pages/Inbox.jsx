import { useEffect, useState } from 'react';
import { Link as RouterLink, useNavigate } from 'react-router-dom';
import { useAuth } from '../Context/useAuth';
import { discoveryService } from '../Services/discoveryService';
import { useColorMode } from '@chakra-ui/react';
import {
  Box, Flex, HStack, VStack, Heading, Text, Badge, Button,
  Spinner, IconButton, Tooltip, Tab, Tabs, TabList, TabPanels, TabPanel,
  Card, CardBody, Divider,
} from '@chakra-ui/react';
import {
  MdInbox, MdChatBubbleOutline, MdFavorite, MdArrowForward,
  MdRefresh, MdCheckCircleOutline, MdEditNote, MdShare,
} from 'react-icons/md';

const CATEGORY_SCHEME = {
  emotional: 'purple', financial: 'yellow',
  relationship: 'pink', social: 'blue', other: 'gray',
};

const timeAgo = (date) => {
  if (!date) return '';
  const s = Math.floor((Date.now() - new Date(date)) / 1000);
  if (s < 60) return 'just now';
  const m = Math.floor(s / 60); if (m < 60) return `${m}m ago`;
  const h = Math.floor(m / 60); if (h < 24) return `${h}h ago`;
  return `${Math.floor(h / 24)}d ago`;
};

export default function Inbox() {
  const { user, isAuthenticated } = useAuth();
  const { colorMode } = useColorMode();
  const navigate = useNavigate();
  const isDark = colorMode === 'dark';

  const [loading, setLoading] = useState(true);
  const [posts, setPosts] = useState([]);
  const [notifications, setNotifications] = useState([]);
  const [filter, setFilter] = useState('all');

  const cardBg   = isDark ? '#242526' : 'white';
  const textCol  = isDark ? '#e4e6eb' : '#050505';
  const subtle   = isDark ? '#b0b3b8' : '#65676b';
  const border   = isDark ? 'rgba(255,255,255,0.1)' : '#e4e6eb';
  const hoverBg  = isDark ? 'rgba(255,255,255,0.05)' : '#f8f9fa';

  const loadInbox = async () => {
    setLoading(true);
    try {
      const [userPosts, notifs] = await Promise.all([
        discoveryService.userPosts().catch(() => []),
        discoveryService.notifications().catch(() => []),
      ]);
      setPosts(Array.isArray(userPosts) ? userPosts : []);
      setNotifications(Array.isArray(notifs) ? notifs : []);
    } catch {
      setPosts([]);
      setNotifications([]);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (!isAuthenticated) {
      navigate('/auth', { replace: true });
      return;
    }
    loadInbox();
  }, [isAuthenticated, navigate]);

  const handleMarkAllRead = async () => {
    try {
      await discoveryService.markNotificationsRead();
      setNotifications(prev => prev.map(n => ({ ...n, is_read: 1 })));
    } catch {
      // Ignore
    }
  };

  // Filter notifications into responses vs reactions
  const responseNotifs = notifications.filter(n => n.type === 'response');
  const reactionNotifs = notifications.filter(n => n.type === 'reaction');

  // Filter posts that have had any community interaction
  const activePosts = posts.filter(p => (p.comments_count > 0 || p.reactions_count > 0));

  return (
    <Box maxW="4xl" mx="auto" w="100%" py={{ base: 4, md: 8 }} px={{ base: 3, md: 6 }} fontFamily="'Poppins', sans-serif">
      {/* ── Page Header ── */}
      <Flex justify="space-between" align={{ base: 'flex-start', sm: 'center' }} mb={6} flexWrap="wrap" gap={3}>
        <Box>
          <HStack spacing={2.5} align="center">
            <Box
              p={2}
              borderRadius="xl"
              bg={isDark ? 'rgba(124,58,237,0.2)' : 'purple.50'}
              color="brand.500"
            >
              <MdInbox size={26} />
            </Box>
            <Box>
              <Heading fontSize={{ base: '2xl', md: '3xl' }} fontWeight="900" color={textCol} letterSpacing="-0.5px">
                Diary Inbox
              </Heading>
              <Text fontSize="sm" color={subtle} mt={0.5}>
                Activity, responses, and community support on your shared entries
              </Text>
            </Box>
          </HStack>
        </Box>

        <HStack spacing={2}>
          <Tooltip label="Refresh inbox" hasArrow>
            <IconButton
              aria-label="Refresh inbox"
              icon={<MdRefresh size={20} />}
              onClick={loadInbox}
              isLoading={loading}
              variant="outline"
              borderRadius="full"
              size="sm"
            />
          </Tooltip>
          {notifications.some(n => !n.is_read) && (
            <Button
              size="sm"
              variant="outline"
              borderRadius="full"
              leftIcon={<MdCheckCircleOutline />}
              onClick={handleMarkAllRead}
              fontSize="xs"
            >
              Mark all read
            </Button>
          )}
        </HStack>
      </Flex>

      {/* ── Tabs for Activity Stream vs Post Grouping ── */}
      <Tabs colorScheme="purple" variant="soft-rounded" onChange={(index) => {
        const filters = ['all', 'responses', 'reactions', 'posts'];
        setFilter(filters[index]);
      }}>
        <TabList gap={2} mb={6} overflowX="auto" py={1}>
          <Tab fontSize="xs" fontWeight="700" borderRadius="full">
            All Activity ({notifications.length})
          </Tab>
          <Tab fontSize="xs" fontWeight="700" borderRadius="full">
            Responses ({responseNotifs.length})
          </Tab>
          <Tab fontSize="xs" fontWeight="700" borderRadius="full">
            Support & Likes ({reactionNotifs.length})
          </Tab>
          <Tab fontSize="xs" fontWeight="700" borderRadius="full">
            My Active Posts ({activePosts.length})
          </Tab>
        </TabList>

        {loading ? (
          <Flex justify="center" align="center" py={20} direction="column" gap={3}>
            <Spinner size="lg" color="brand.500" thickness="3px" />
            <Text fontSize="sm" color={subtle}>Checking your diary inbox…</Text>
          </Flex>
        ) : (
          <TabPanels>
            {/* ── 1. ALL ACTIVITY ── */}
            <TabPanel p={0}>
              <VStack align="stretch" spacing={3}>
                {notifications.length === 0 ? (
                  <EmptyInboxState isDark={isDark} subtle={subtle} cardBg={cardBg} border={border} />
                ) : (
                  notifications.map((item) => (
                    <InboxNotificationCard
                      key={item.id}
                      item={item}
                      isDark={isDark}
                      cardBg={cardBg}
                      textCol={textCol}
                      subtle={subtle}
                      border={border}
                      hoverBg={hoverBg}
                    />
                  ))
                )}
              </VStack>
            </TabPanel>

            {/* ── 2. RESPONSES ONLY ── */}
            <TabPanel p={0}>
              <VStack align="stretch" spacing={3}>
                {responseNotifs.length === 0 ? (
                  <EmptyCategoryState
                    title="No responses yet"
                    message="When someone in the community replies to your shared thoughts, you'll see them right here."
                    isDark={isDark} subtle={subtle} cardBg={cardBg} border={border}
                  />
                ) : (
                  responseNotifs.map((item) => (
                    <InboxNotificationCard
                      key={item.id}
                      item={item}
                      isDark={isDark}
                      cardBg={cardBg}
                      textCol={textCol}
                      subtle={subtle}
                      border={border}
                      hoverBg={hoverBg}
                    />
                  ))
                )}
              </VStack>
            </TabPanel>

            {/* ── 3. SUPPORT & REACTIONS ONLY ── */}
            <TabPanel p={0}>
              <VStack align="stretch" spacing={3}>
                {reactionNotifs.length === 0 ? (
                  <EmptyCategoryState
                    title="No support reactions yet"
                    message="When members support or like your diary posts, notifications will show up here."
                    isDark={isDark} subtle={subtle} cardBg={cardBg} border={border}
                  />
                ) : (
                  reactionNotifs.map((item) => (
                    <InboxNotificationCard
                      key={item.id}
                      item={item}
                      isDark={isDark}
                      cardBg={cardBg}
                      textCol={textCol}
                      subtle={subtle}
                      border={border}
                      hoverBg={hoverBg}
                    />
                  ))
                )}
              </VStack>
            </TabPanel>

            {/* ── 4. POSTS GROUPED ── */}
            <TabPanel p={0}>
              <VStack align="stretch" spacing={4}>
                {posts.length === 0 ? (
                  <EmptyInboxState isDark={isDark} subtle={subtle} cardBg={cardBg} border={border} />
                ) : (
                  posts.map((post) => (
                    <ActivePostItem
                      key={post.id}
                      post={post}
                      isDark={isDark}
                      cardBg={cardBg}
                      textCol={textCol}
                      subtle={subtle}
                      border={border}
                      hoverBg={hoverBg}
                    />
                  ))
                )}
              </VStack>
            </TabPanel>
          </TabPanels>
        )}
      </Tabs>
    </Box>
  );
}

function InboxNotificationCard({ item, isDark, cardBg, textCol, subtle, border, hoverBg }) {
  const isResponse = item.type === 'response';
  const isReaction = item.type === 'reaction';

  return (
    <Card
      as={item.link ? RouterLink : 'div'}
      to={item.link}
      bg={!item.is_read ? (isDark ? 'rgba(124,58,237,0.12)' : 'purple.50') : cardBg}
      border="1px solid"
      borderColor={!item.is_read ? 'brand.400' : border}
      borderRadius="xl"
      transition="all 0.15s ease"
      _hover={{
        bg: hoverBg,
        borderColor: 'brand.500',
        transform: 'translateY(-1px)',
        textDecoration: 'none',
      }}
      boxShadow="sm"
    >
      <CardBody p={{ base: 3.5, md: 4 }}>
        <Flex justify="space-between" align="center" gap={3}>
          <HStack spacing={3.5} align="center" minW={0} flex="1">
            <Box
              boxSize="40px"
              borderRadius="full"
              display="flex"
              alignItems="center"
              justifyContent="center"
              flexShrink={0}
              bg={isResponse ? 'blue.50' : isReaction ? 'pink.50' : 'purple.50'}
              color={isResponse ? 'blue.500' : isReaction ? 'pink.500' : 'purple.500'}
            >
              {isResponse && <MdChatBubbleOutline size={20} />}
              {isReaction && <MdFavorite size={20} />}
              {!isResponse && !isReaction && <MdInbox size={20} />}
            </Box>

            <Box minW={0} flex="1">
              <Text fontSize="sm" fontWeight={item.is_read ? '500' : '700'} color={textCol} noOfLines={2}>
                {item.message}
              </Text>
              <HStack spacing={2} mt={1}>
                <Text fontSize="xs" color={subtle}>
                  {timeAgo(item.created_at)}
                </Text>
                {item.type && (
                  <Badge size="sm" fontSize="2xs" colorScheme={isResponse ? 'blue' : isReaction ? 'pink' : 'purple'} borderRadius="full">
                    {item.type}
                  </Badge>
                )}
              </HStack>
            </Box>
          </HStack>

          <HStack spacing={2} flexShrink={0}>
            {!item.is_read && (
              <Badge colorScheme="purple" borderRadius="full" px={2} py={0.5} fontSize="2xs">
                New
              </Badge>
            )}
            <Box color={subtle}>
              <MdArrowForward size={18} />
            </Box>
          </HStack>
        </Flex>
      </CardBody>
    </Card>
  );
}

function ActivePostItem({ post, isDark, cardBg, textCol, subtle, border, hoverBg }) {
  const scheme = CATEGORY_SCHEME[post.category] || 'gray';

  return (
    <Card
      bg={cardBg}
      border="1px solid"
      borderColor={border}
      borderRadius="xl"
      p={{ base: 4, md: 5 }}
      transition="all 0.15s ease"
      _hover={{ borderColor: 'brand.400', boxShadow: 'md' }}
    >
      <Flex justify="space-between" align="flex-start" gap={3} mb={2}>
        <HStack spacing={2}>
          <Badge colorScheme={scheme} borderRadius="full" px={2.5} py={0.5} fontSize="2xs" textTransform="capitalize">
            {post.category}
          </Badge>
          <Text fontSize="xs" color={subtle}>
            {timeAgo(post.created_at)}
          </Text>
        </HStack>

        <Button
          as={RouterLink}
          to={`/post/${post.id}`}
          size="xs"
          variant="outline"
          colorScheme="purple"
          borderRadius="full"
          rightIcon={<MdArrowForward />}
        >
          View discussion
        </Button>
      </Flex>

      <Text fontSize="sm" color={textCol} noOfLines={3} mb={3} lineHeight="1.6">
        {post.content}
      </Text>

      <Divider borderColor={border} my={2} />

      <Flex justify="space-between" align="center" fontSize="xs" color={subtle} pt={1}>
        <HStack spacing={4}>
          <HStack spacing={1}>
            <MdFavorite color="#ec4899" size={15} />
            <Text fontWeight="600">{post.reactions_count || 0} support</Text>
          </HStack>
          <HStack spacing={1}>
            <MdChatBubbleOutline color="#3b82f6" size={15} />
            <Text fontWeight="600">{post.comments_count || 0} responses</Text>
          </HStack>
        </HStack>

        {post.has_ai_insight && (
          <Badge colorScheme="purple" variant="subtle" fontSize="2xs" borderRadius="full">
            AI Insight
          </Badge>
        )}
      </Flex>
    </Card>
  );
}

function EmptyInboxState({ isDark, subtle, cardBg, border }) {
  return (
    <Box
      py={16}
      px={4}
      textAlign="center"
      border="2px dashed"
      borderColor={border}
      borderRadius="2xl"
      bg={cardBg}
    >
      <Box
        boxSize="56px"
        borderRadius="full"
        bg="purple.50"
        color="brand.500"
        display="flex"
        alignItems="center"
        justifyContent="center"
        mx="auto"
        mb={4}
      >
        <MdInbox size={30} />
      </Box>
      <Heading size="md" mb={2} fontWeight="800">
        Your Inbox is Peaceful
      </Heading>
      <Text color={subtle} fontSize="sm" maxW="420px" mx="auto" mb={6}>
        When members of the Wild Diary community reply or send reactions to your shared entries, you'll find them all organized here.
      </Text>
      <HStack justify="center" spacing={3}>
        <Button as={RouterLink} to="/create" size="sm" variant="brand" borderRadius="full" leftIcon={<MdShare />}>
          Share an entry to Feed
        </Button>
        <Button as={RouterLink} to="/diary" size="sm" variant="outline" borderRadius="full" leftIcon={<MdEditNote />}>
          Write in Private Diary
        </Button>
      </HStack>
    </Box>
  );
}

function EmptyCategoryState({ title, message, subtle, cardBg, border }) {
  return (
    <Box
      py={12}
      px={4}
      textAlign="center"
      border="1px dashed"
      borderColor={border}
      borderRadius="xl"
      bg={cardBg}
    >
      <Text fontWeight="700" fontSize="md" mb={1}>{title}</Text>
      <Text color={subtle} fontSize="sm" maxW="380px" mx="auto">{message}</Text>
    </Box>
  );
}
