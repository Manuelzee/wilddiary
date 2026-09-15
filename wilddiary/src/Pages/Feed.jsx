import { useEffect, useState } from 'react';
import { usePosts } from '../Context/usePosts';
import { useAuth } from '../Context/useAuth';
import { Link as RouterLink } from 'react-router-dom';
import { useColorMode } from '@chakra-ui/react';
import {
  Box, Flex, VStack, HStack, Text, Avatar, Button, IconButton, Input,
  InputGroup, InputLeftElement, Divider, Badge, Tooltip, Collapse,
  Spinner, Wrap, WrapItem, Alert, AlertIcon, AlertDescription,
} from '@chakra-ui/react';
import {
  MdMenuBook, MdInsights, MdHealthAndSafety, MdSettings, MdSupportAgent,
  MdExpandMore, MdExpandLess, MdSearch,
  MdPersonAdd, MdNotifications, MdAccountCircle,
  MdPhoto, MdVideoCameraBack, MdEmojiEmotions, MdRefresh, MdEditNote,
  MdChat, MdAutoAwesome,
} from 'react-icons/md';
import FeedPostCard from '../Components/FeedPostCard';
import { discoveryService } from '../Services/discoveryService';

// ─── Demo posts (shown when the backend has no posts yet) ─────────────────────
const DEMO_POSTS = [
  {
    id: 'demo-1',
    author_name: 'Anonymous',
    is_anonymous: true,
    author_role: 'user',
    content: "I've been struggling with crippling anxiety for the past 6 months. Work pressure, family expectations, and the constant feeling that I'm never enough.\n\nHas anyone found something that actually helps? Not looking for medical advice — just human connection. 💙",
    category: 'emotional',
    created_at: new Date(Date.now() - 45 * 60 * 1000).toISOString(),
    reactions_count: 89,
    comments_count: 23,
    liked_by_me: false,
    status: 'active',
    has_ai_insight: false,
  },
  {
    id: 'demo-2',
    author_name: 'Dr. Amira Hassan',
    is_anonymous: false,
    author_role: 'counselor',
    content: "💜 Mental health check-in! How are you REALLY feeling today — not the 'I'm fine' answer?\n\nDrop it in the comments. No judgment here. I read every single one and respond to as many as I can.\n\nRemember: your feelings are valid, your struggles are real, and you are never alone. 🌟",
    category: 'emotional',
    created_at: new Date(Date.now() - 3 * 60 * 60 * 1000).toISOString(),
    reactions_count: 234,
    comments_count: 67,
    liked_by_me: false,
    status: 'active',
    has_ai_insight: true,
  },
  {
    id: 'demo-3',
    author_name: 'HopefulStar',
    is_anonymous: false,
    author_role: 'user',
    content: "6 months ago I posted here saying I'd lost my job and was barely keeping it together. Today I want to share an update:\n\n✅ Got a new job — better than the last one\n✅ Started therapy — best decision of my life\n✅ Reconnected with old friends I had pushed away\n\nPlease don't give up. The storm does pass. 🌈",
    category: 'emotional',
    created_at: new Date(Date.now() - 7 * 60 * 60 * 1000).toISOString(),
    reactions_count: 512,
    comments_count: 98,
    liked_by_me: false,
    status: 'active',
    has_ai_insight: false,
  },
  {
    id: 'demo-4',
    author_name: 'Anonymous',
    is_anonymous: true,
    author_role: 'user',
    content: "Does anyone else feel exhausted from constantly pretending everything is okay?\n\nAt work, with family, on social media... I smile and nod but inside I am barely holding on. I don't want to burden people with my problems so I just keep going.\n\nIs this normal? Is this healthy?",
    category: 'emotional',
    created_at: new Date(Date.now() - 12 * 60 * 60 * 1000).toISOString(),
    reactions_count: 156,
    comments_count: 41,
    liked_by_me: false,
    status: 'active',
    has_ai_insight: true,
  },
  {
    id: 'demo-5',
    author_name: 'QuietReflection',
    is_anonymous: false,
    author_role: 'user',
    content: "Financial anxiety is destroying me quietly. Behind every 'I'm doing well' is a person juggling rent, student loans, and barely making it to the next paycheck.\n\nAnyone who has navigated financial stress alongside mental health struggles — what helped you?",
    category: 'financial',
    created_at: new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString(),
    reactions_count: 73,
    comments_count: 29,
    liked_by_me: false,
    status: 'active',
    has_ai_insight: false,
  },
];

// ─── Left Sidebar ─────────────────────────────────────────────────────────────
function SidebarNavItem({ icon, label, href, onClick, hoverBg, iconBg, text }) {
  return (
    <Box as={onClick ? 'button' : RouterLink} to={onClick ? undefined : href} onClick={onClick}
      display="flex" alignItems="center" gap={3} w="100%" p="8px 10px" borderRadius="xl"
      _hover={{ bg: hoverBg, textDecoration: 'none' }} bg="transparent" border="none"
      cursor="pointer" transition="background 0.15s" color={text}>
      <Flex w="36px" h="36px" borderRadius="full" bg={iconBg} align="center" justify="center" flexShrink={0}>
        <Box as={icon} boxSize="18px" />
      </Flex>
      <Text fontSize="sm" fontWeight="600" fontFamily="'Poppins', sans-serif" color={text}>{label}</Text>
    </Box>
  );
}

function LeftSidebar({ user, isDark }) {
  const [showMore, setShowMore] = useState(false);

  const bg       = isDark ? '#18191a' : '#f0f2f5';
  const text     = isDark ? '#e4e6eb' : '#050505';
  const hoverBg  = isDark ? 'rgba(255,255,255,0.1)' : 'rgba(0,0,0,0.06)';
  const iconBg   = isDark ? 'rgba(255,255,255,0.12)' : '#e4e6eb';

  const MENU = [
    { icon: MdMenuBook, label: 'Private Diary', href: '/diary' },
    { icon: MdInsights, label: 'My Insights', href: '/insights' },
    { icon: MdAutoAwesome, label: 'AI Support', href: '/chat' },
    { icon: MdSupportAgent, label: 'Counselors', href: '/counselors' },
    { icon: MdHealthAndSafety, label: 'Safety Center', href: '/safety' },
  ];

  const MORE = [
    { icon: MdSettings, label: 'Settings', href: '/settings' },
    { icon: MdChat, label: 'Harbor Chat', href: '/chat' },
  ];

  const navStyle = { hoverBg, iconBg, text };

  return (
    <Box
      as="aside"
      w={{ lg: '260px', xl: '280px' }}
      flexShrink={0}
      display={{ base: 'none', lg: 'flex' }}
      flexDirection="column"
      position="sticky"
      top="56px"
      h="calc(100vh - 56px)"
      overflowY="auto"
      py={3} px={2}
      gap={1}
      bg={bg}
      sx={{ '&::-webkit-scrollbar': { width: '0px' } }}
    >
      {/* User profile link */}
      <Box
        as={RouterLink} to="/profile"
        display="flex" alignItems="center" gap={3}
        p="8px 10px" borderRadius="xl"
        _hover={{ bg: hoverBg, textDecoration: 'none' }}
        mb={1}
      >
        <Avatar size="sm" name={user?.username} bg="brand.500" color="white" fontFamily="'Poppins', sans-serif" />
        <Text fontSize="sm" fontWeight="700" textTransform="capitalize" fontFamily="'Poppins', sans-serif" color={text}>
          {user?.username}
        </Text>
      </Box>

      {/* Search */}
      <InputGroup size="sm" mb={2} px={1}>
        <InputLeftElement pointerEvents="none" h="full" pl={1}>
          <MdSearch color={isDark ? '#b0b3b8' : '#8a8d91'} size={16} />
        </InputLeftElement>
        <Input
          placeholder="Search menu…"
          borderRadius="full"
          bg={isDark ? 'rgba(255,255,255,0.08)' : '#e4e6eb'}
          border="none"
          fontFamily="'Poppins', sans-serif"
          fontSize="sm"
          _focus={{ boxShadow: 'none', bg: isDark ? 'rgba(255,255,255,0.12)' : '#d8dadf' }}
          pl="30px"
          color={text}
        />
      </InputGroup>

      {/* Menu items */}
      {MENU.map(item => <SidebarNavItem key={item.label} {...item} {...navStyle} />)}

      {/* See more toggle */}
      <SidebarNavItem
        icon={showMore ? MdExpandLess : MdExpandMore}
        label={showMore ? 'See less' : 'See more'}
        onClick={() => setShowMore(v => !v)}
        {...navStyle}
      />

      <Collapse in={showMore} animateOpacity>
        {MORE.map(item => <SidebarNavItem key={item.label} {...item} {...navStyle} />)}
      </Collapse>

      <Divider borderColor={isDark ? 'rgba(255,255,255,0.08)' : 'gray.200'} my={2} />

      <Text fontSize="xs" color={isDark ? 'gray.600' : 'gray.400'} px={2} fontFamily="'Poppins', sans-serif">
        Wild Diary © {new Date().getFullYear()}
      </Text>
    </Box>
  );
}

// ─── Right Sidebar ────────────────────────────────────────────────────────────
function RightSidebar({ isDark }) {
  const bg      = isDark ? '#18191a' : '#f0f2f5';
  const text    = isDark ? '#e4e6eb' : '#050505';
  const subtle  = isDark ? '#b0b3b8' : '#65676b';
  const border  = isDark ? 'rgba(255,255,255,0.1)' : '#e4e6eb';
  const hoverBg = isDark ? 'rgba(255,255,255,0.08)' : 'rgba(0,0,0,0.05)';

  const [counselors, setCounselors] = useState([]);
  const [notifications, setNotifications] = useState([]);

  useEffect(() => {
    let active = true;
    discoveryService.counselors()
      .then(data => { if (active && Array.isArray(data)) setCounselors(data.slice(0, 4)); })
      .catch(() => {});
    discoveryService.notifications()
      .then(data => { if (active && Array.isArray(data)) setNotifications(data.slice(0, 5)); })
      .catch(() => {});
    return () => { active = false; };
  }, []);

  const unreadCount = notifications.filter(n => !n.is_read).length;

  return (
    <Box
      as="aside"
      w={{ xl: '300px', '2xl': '320px' }}
      flexShrink={0}
      display={{ base: 'none', xl: 'flex' }}
      flexDirection="column"
      position="sticky"
      top="56px"
      h="calc(100vh - 56px)"
      overflowY="auto"
      py={4} px={3}
      gap={4}
      bg={bg}
      sx={{ '&::-webkit-scrollbar': { width: '0px' } }}
    >
      {/* ── Verified Counselors ── */}
      <Box>
        <HStack justify="space-between" mb={3}>
          <Text fontWeight="800" fontSize="sm" color={text} fontFamily="'Poppins', sans-serif">
            Support Counselors
          </Text>
          <Button as={RouterLink} to="/counselors" size="xs" variant="ghost" color="brand.500" fontFamily="'Poppins', sans-serif" fontWeight="700">
            See all
          </Button>
        </HStack>
        {counselors.length === 0 ? (
          <Text fontSize="xs" color={subtle} fontFamily="'Poppins', sans-serif">
            No counselors listed yet. Directory verification is in progress.
          </Text>
        ) : (
          <VStack spacing={1} align="stretch">
            {counselors.map(c => (
              <HStack
                key={c.id} p={2} borderRadius="xl" cursor="pointer"
                _hover={{ bg: hoverBg }} transition="background 0.15s"
                as={RouterLink} to="/counselors" textDecoration="none"
              >
                <Avatar size="sm" name={c.username} bg="green.500" color="white" />
                <Box flex="1" minW={0}>
                  <HStack spacing={1}>
                    <Text fontSize="sm" fontWeight="700" color={text} fontFamily="'Poppins', sans-serif" noOfLines={1}>{c.username}</Text>
                    <Badge colorScheme="green" fontSize="7px" borderRadius="full" px={1} fontFamily="'Poppins', sans-serif">Pro</Badge>
                  </HStack>
                  <Text fontSize="xs" color={subtle} fontFamily="'Poppins', sans-serif" noOfLines={1}>{c.expertise || 'General Wellbeing'}</Text>
                </Box>
              </HStack>
            ))}
          </VStack>
        )}
      </Box>

      <Divider borderColor={border} />

      {/* ── Recent Notifications ── */}
      <Box>
        <HStack justify="space-between" mb={2}>
          <Text fontWeight="800" fontSize="sm" color={text} fontFamily="'Poppins', sans-serif">
            Recent Activity
          </Text>
          {unreadCount > 0 && (
            <Badge colorScheme="purple" borderRadius="full" fontSize="10px" fontFamily="'Poppins', sans-serif">
              {unreadCount} new
            </Badge>
          )}
        </HStack>
        {notifications.length === 0 ? (
          <Text fontSize="xs" color={subtle} fontFamily="'Poppins', sans-serif">
            No new activity. When members support your entries, updates appear here.
          </Text>
        ) : (
          <VStack spacing={1} align="stretch">
            {notifications.map((n) => (
              <HStack
                key={n.id} p={2} borderRadius="xl" cursor="pointer" spacing={2}
                _hover={{ bg: hoverBg }} transition="background 0.15s"
                as={n.link ? RouterLink : 'div'} to={n.link}
                bg={!n.is_read ? (isDark ? 'rgba(124,58,237,0.08)' : 'purple.50') : 'transparent'}
              >
                <Box w="7px" h="7px" borderRadius="full" bg={!n.is_read ? 'brand.500' : 'transparent'} flexShrink={0} mt="2px" />
                <Box flex="1">
                  <Text fontSize="xs" fontWeight={!n.is_read ? '700' : '500'} color={text} fontFamily="'Poppins', sans-serif" lineHeight="1.4">
                    {n.message}
                  </Text>
                  <Text fontSize="xs" color={subtle} fontFamily="'Poppins', sans-serif">{new Date(n.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</Text>
                </Box>
              </HStack>
            ))}
          </VStack>
        )}
      </Box>

      <Divider borderColor={border} />

      {/* ── Community Guidelines & Crisis Help ── */}
      <Box p={3} borderRadius="xl" bg={isDark ? 'whiteAlpha.50' : 'gray.50'} border="1px solid" borderColor={border}>
        <Text fontSize="xs" fontWeight="700" color={text} fontFamily="'Poppins', sans-serif" mb={1}>
          Need Immediate Help?
        </Text>
        <Text fontSize="xs" color={subtle} fontFamily="'Poppins', sans-serif" mb={2}>
          Wild Diary is a peer harbor, not emergency care. If you are in crisis, call emergency services (112 in Nigeria).
        </Text>
        <Button as={RouterLink} to="/safety" size="xs" variant="outline" colorScheme="purple" w="100%" borderRadius="full">
          Safety Center
        </Button>
      </Box>

      <Divider borderColor={border} />

      {/* ── Account ── */}
      <Box
        as={RouterLink} to="/profile"
        display="flex" alignItems="center" gap={3}
        p={3} borderRadius="xl"
        _hover={{ bg: hoverBg, textDecoration: 'none' }} cursor="pointer"
        transition="background 0.15s"
      >
        <Flex w="36px" h="36px" borderRadius="full" bg={isDark ? 'rgba(255,255,255,0.1)' : '#e4e6eb'} align="center" justify="center">
          <MdAccountCircle size={20} color={isDark ? '#e4e6eb' : '#65676b'} />
        </Flex>
        <Text fontSize="sm" fontWeight="700" color={text} fontFamily="'Poppins', sans-serif">
          My Account
        </Text>
      </Box>
    </Box>
  );
}

// ─── Create Post Box ──────────────────────────────────────────────────────────
function CreatePostBox({ user, isDark }) {
  const card   = isDark ? '#242526' : 'white';
  const border = isDark ? 'rgba(255,255,255,0.1)' : '#e4e6eb';
  const subtle = isDark ? '#b0b3b8' : '#65676b';
  const inputBg = isDark ? 'rgba(255,255,255,0.07)' : '#f0f2f5';

  return (
    <Box bg={card} border="1px solid" borderColor={border} borderRadius="xl" p={4} mb={3}>
      <HStack mb={3} spacing={2}>
        <Avatar size="sm" name={user?.username} bg="brand.500" color="white" fontFamily="'Poppins', sans-serif" flexShrink={0} />
        <Box
          as={RouterLink} to="/create"
          flex="1" px={4} py="9px"
          borderRadius="full" bg={inputBg}
          cursor="text"
          _hover={{ bg: isDark ? 'rgba(255,255,255,0.1)' : '#e4e6eb', textDecoration: 'none' }}
          transition="background 0.15s"
        >
          <Text fontSize="sm" color={subtle} fontFamily="'Poppins', sans-serif">
            What's on your mind, {user?.username}?
          </Text>
        </Box>
      </HStack>
      <Divider borderColor={border} mb={3} />
      <HStack justify="space-evenly" spacing={0}>
        {[
          { icon: <MdVideoCameraBack size={20} color="#f02849" />, label: 'Live video'    },
          { icon: <MdPhoto size={20} color="#45bd62" />,           label: 'Photo/Video'  },
          { icon: <MdEmojiEmotions size={20} color="#f7b928" />,   label: 'Feeling'      },
        ].map(btn => (
          <Button
            key={btn.label}
            flex="1"
            leftIcon={btn.icon}
            variant="ghost"
            size="sm"
            fontFamily="'Poppins', sans-serif"
            fontWeight="700"
            color={subtle}
            borderRadius="xl"
            _hover={{ bg: isDark ? 'rgba(255,255,255,0.08)' : '#f0f2f5' }}
            as={RouterLink} to="/create"
          >
            <Text display={{ base: 'none', md: 'block' }}>{btn.label}</Text>
          </Button>
        ))}
      </HStack>
    </Box>
  );
}

// ─── Main Feed ────────────────────────────────────────────────────────────────
export default function Feed() {
  const { posts, loading, error, fetchPosts } = usePosts();
  const { isAuthenticated, user } = useAuth();
  const { colorMode } = useColorMode();
  const isDark = colorMode === 'dark';

  const [category, setCategory] = useState('all');
  const [sort, setSort]         = useState('latest');
  const [searchQuery, setSearchQuery] = useState('');

  // fetchPosts is supplied by context and intentionally keyed by the selected filters.
  // eslint-disable-next-line react-hooks/exhaustive-deps
  useEffect(() => { fetchPosts(category, sort, searchQuery); }, [category, sort]);

  const displayPosts  = posts.length > 0 ? posts : DEMO_POSTS;
  const isDemoShowing = posts.length === 0 && !loading;

  const bodyBg  = isDark ? '#18191a' : '#f0f2f5';
  const card    = isDark ? '#242526' : 'white';
  const text    = isDark ? '#e4e6eb' : '#050505';
  const subtle  = isDark ? '#b0b3b8' : '#65676b';
  const border  = isDark ? 'rgba(255,255,255,0.1)' : '#e4e6eb';
  const hoverBg = isDark ? 'rgba(255,255,255,0.08)' : 'gray.100';

  const CATS = [
    { value: 'all',          label: 'All'           },
    { value: 'emotional',    label: '💜 Emotional'  },
    { value: 'financial',    label: '💰 Financial'  },
    { value: 'relationship', label: '🤝 Relationship' },
    { value: 'social',       label: '🌍 Social'     },
  ];

  return (
    <Box bg={bodyBg} minH="calc(100vh - 56px)">
      <Flex maxW="1350px" mx="auto">

        {/* ── Left Sidebar ── */}
        <LeftSidebar user={user} isDark={isDark} />

        {/* ── Center Feed ── */}
        <Box flex="1" py={4} px={{ base: 2, md: 4 }} minW={0}>

          {/* Create Post (authenticated only) */}
          {isAuthenticated && <CreatePostBox user={user} isDark={isDark} />}

          {/* Filter bar */}
          <Box bg={card} border="1px solid" borderColor={border} borderRadius="xl" p={3} mb={3}>
            <InputGroup size="sm" mb={3}>
              <InputLeftElement pointerEvents="none">
                <MdSearch color={isDark ? '#8a8d91' : '#b0b3b8'} size={18} />
              </InputLeftElement>
              <Input
                placeholder="Search diary entries by keyword…"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                onKeyDown={(e) => { if (e.key === 'Enter') fetchPosts(category, sort, searchQuery); }}
                borderRadius="full"
                bg={isDark ? 'rgba(255,255,255,0.06)' : 'gray.50'}
                borderColor={border}
                fontFamily="'Poppins', sans-serif"
                fontSize="xs"
              />
              {searchQuery && (
                <Button
                  size="xs"
                  position="absolute"
                  right="8px"
                  top="6px"
                  zIndex={2}
                  borderRadius="full"
                  onClick={() => { setSearchQuery(''); fetchPosts(category, sort, ''); }}
                >
                  Clear
                </Button>
              )}
            </InputGroup>
            <Flex justify="space-between" align="center" mb={2} flexWrap="wrap" gap={2}>
              <Text fontWeight="800" fontSize="sm" color={text} fontFamily="'Poppins', sans-serif">
                Diary Posts
              </Text>
              <HStack spacing={2}>
                <Button
                  size="xs" borderRadius="full" fontFamily="'Poppins', sans-serif"
                  variant={sort === 'latest' ? 'solid' : 'ghost'}
                  onClick={() => setSort('latest')}
                  leftIcon={<MdAutoAwesome size={12} />}
                >
                  Latest
                </Button>
                <Button
                  size="xs" borderRadius="full" fontFamily="'Poppins', sans-serif"
                  variant={sort === 'popular' ? 'solid' : 'ghost'}
                  onClick={() => setSort('popular')}
                >
                  Top
                </Button>
                <Tooltip label="Refresh" hasArrow>
                  <IconButton
                    aria-label="Refresh"
                    icon={<MdRefresh size={14} />}
                    size="xs" variant="ghost" borderRadius="full"
                    onClick={() => fetchPosts(category, sort)}
                    isLoading={loading}
                  />
                </Tooltip>
                {isAuthenticated && (
                  <Button
                    as={RouterLink} to="/create"
                    size="xs" borderRadius="full"
                    fontFamily="'Poppins', sans-serif"
                    leftIcon={<MdEditNote size={14} />}
                  >
                    Write
                  </Button>
                )}
              </HStack>
            </Flex>
            <Wrap spacing={2}>
              {CATS.map(cat => (
                <WrapItem key={cat.value}>
                  <Button
                    size="xs" borderRadius="full" fontFamily="'Poppins', sans-serif"
                    variant={category === cat.value ? 'solid' : 'ghost'}
                    bg={category === cat.value ? 'brand.500' : 'transparent'}
                    color={category === cat.value ? 'white' : undefined}
                    _hover={category === cat.value ? { bg: 'brand.600' } : { bg: hoverBg }}
                    onClick={() => setCategory(cat.value)}
                  >
                    {cat.label}
                  </Button>
                </WrapItem>
              ))}
            </Wrap>
          </Box>

          {/* Guest notice */}
          {!isAuthenticated && (
            <Alert status="info" borderRadius="xl" mb={3} bg={isDark ? 'rgba(59,130,246,0.08)' : 'blue.50'} border="1px solid" borderColor={isDark ? 'blue.800' : 'blue.200'}>
              <AlertIcon />
              <AlertDescription fontSize="sm" fontFamily="'Poppins', sans-serif">
                <Text fontWeight="700" fontSize="sm">Viewing as Guest</Text>
                <Text fontSize="xs" color={subtle}>
                  <Box as={RouterLink} to="/auth" color="brand.500" fontWeight="700">Sign in</Box> to post, comment, and support others.
                </Text>
              </AlertDescription>
            </Alert>
          )}

          {/* Demo notice */}
          {isDemoShowing && !error && (
            <Alert status="info" borderRadius="xl" mb={3} bg={isDark ? 'rgba(124,58,237,0.08)' : 'purple.50'} border="1px solid" borderColor={isDark ? 'purple.800' : 'purple.200'}>
              <AlertIcon />
              <AlertDescription fontSize="xs" fontFamily="'Poppins', sans-serif" color={subtle}>
                Showing demo posts — be the first to share a real diary entry!
              </AlertDescription>
            </Alert>
          )}

          {/* Error */}
          {error && (
            <Alert status="error" borderRadius="xl" mb={3}>
              <AlertIcon />
              <AlertDescription fontSize="sm" fontFamily="'Poppins', sans-serif">{error}</AlertDescription>
            </Alert>
          )}

          {/* Loading spinner */}
          {loading && posts.length === 0 && (
            <Flex align="center" justify="center" py={14} direction="column" gap={3}>
              <Spinner size="lg" color="brand.500" thickness="3px" />
              <Text color={subtle} fontFamily="'Poppins', sans-serif" fontSize="sm">Loading posts…</Text>
            </Flex>
          )}

          {/* Post list */}
          {!(loading && posts.length === 0) && (
            <VStack spacing={3} align="stretch">
              {displayPosts.map(post => (
                <FeedPostCard key={post.id} post={post} isDark={isDark} />
              ))}
            </VStack>
          )}
        </Box>

        {/* ── Right Sidebar ── */}
        <RightSidebar isDark={isDark} />
      </Flex>
    </Box>
  );
}
