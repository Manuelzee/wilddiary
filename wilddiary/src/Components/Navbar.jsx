import { useEffect, useState } from 'react';
import { Link as RouterLink, useNavigate, useLocation } from 'react-router-dom';
import { useAuth } from '../Context/useAuth';
import { discoveryService } from '../Services/discoveryService';
import { useColorMode } from '@chakra-ui/react';
import {
  Box, Flex, HStack, VStack, IconButton, Button, Text, Image,
  Avatar, Tooltip, Badge, Divider,
  Drawer, DrawerOverlay, DrawerContent, DrawerCloseButton, DrawerHeader, DrawerBody,
  useDisclosure,
} from '@chakra-ui/react';
import {
  MdHome, MdMenuBook, MdInbox, MdNotifications, MdPsychology,
  MdMenu, MdInsights, MdSupportAgent, MdHealthAndSafety,
  MdAccountCircle, MdSettings, MdAdminPanelSettings, MdLogout,
  MdDarkMode, MdLightMode,
} from 'react-icons/md';

// ── The 5 Core Navbar Items ──
const CORE_TABS = [
  { icon: MdHome, label: 'Home', shortLabel: 'Home', key: 'feed', href: '/feed' },
  { icon: MdMenuBook, label: 'Private diary', shortLabel: 'Diary', key: 'diary', href: '/diary' },
  { icon: MdInbox, label: 'Inbox', shortLabel: 'Inbox', key: 'inbox', href: '/inbox' },
  { icon: MdNotifications, label: 'Notifications', shortLabel: 'Alerts', key: 'notifications', href: '/notifications', hasBadge: true },
  { icon: MdPsychology, label: 'AI Support', shortLabel: 'AI Support', key: 'chat', href: '/chat' },
];

export default function Navbar() {
  const { user, logout, isAuthenticated } = useAuth();
  const { colorMode, toggleColorMode } = useColorMode();
  const navigate = useNavigate();
  const location = useLocation();
  const isDark = colorMode === 'dark';
  const [unreadCount, setUnreadCount] = useState(0);

  const { isOpen, onOpen, onClose } = useDisclosure();

  useEffect(() => {
    if (!isAuthenticated) return;
    let active = true;
    discoveryService.notifications()
      .then(data => {
        if (active && Array.isArray(data)) {
          setUnreadCount(data.filter(n => !n.is_read).length);
        }
      })
      .catch(() => {});
    return () => { active = false; };
  }, [isAuthenticated, location.pathname]);

  const handleLogout = () => {
    onClose();
    logout();
    navigate('/');
  };

  const activeTab = (() => {
    if (location.pathname === '/feed' || location.pathname === '/') return 'feed';
    if (location.pathname.startsWith('/diary')) return 'diary';
    if (location.pathname.startsWith('/inbox')) return 'inbox';
    if (location.pathname.startsWith('/notifications')) return 'notifications';
    if (location.pathname === '/chat' || location.pathname === '/ai') return 'chat';
    return null;
  })();

  const navBg      = isDark ? '#242526' : 'white';
  const bottomBg   = isDark ? '#1c1d1e' : 'white';
  const border     = isDark ? 'rgba(255,255,255,0.1)' : '#e4e6eb';
  const iconBg     = isDark ? 'rgba(255,255,255,0.1)' : '#f0f2f5';
  const iconHov    = isDark ? 'rgba(255,255,255,0.16)' : '#e4e6eb';
  const drawerBg   = isDark ? '#242526' : 'white';
  const subtleText = isDark ? '#b0b3b8' : '#65676b';
  const mainText   = isDark ? '#e4e6eb' : '#050505';

  return (
    <>
      {/* ════════════════════════════════════════════════════════════════════════
          TOP NAVBAR (Desktop: full header | Mobile: logo + hamburger)
          ════════════════════════════════════════════════════════════════════════ */}
      <Box
        as="nav" bg={navBg} borderBottom="1px solid" borderColor={border}
        position="sticky" top={0} zIndex={200} h="56px"
        boxShadow={isDark ? '0 1px 8px rgba(0,0,0,0.4)' : '0 1px 4px rgba(0,0,0,0.08)'}
      >
        <Flex h="100%" align="center" px={{ base: 3, md: 4, lg: 6 }} justify="space-between" gap={2}>

          {/* ── LEFT: Logo ── */}
          <HStack spacing={2.5} flex="0 0 auto" minW={{ base: 'auto', lg: '240px' }}>
            <Box
              as={RouterLink}
              to={isAuthenticated ? '/feed' : '/'}
              display="flex"
              alignItems="center"
              gap={2.5}
              _hover={{ textDecoration: 'none', opacity: 0.9 }}
              transition="opacity 0.15s"
            >
              <Image
                src="/diarylogo.svg"
                fallbackSrc="/app-logo.jpg"
                alt="Wild Diary"
                boxSize="36px"
                flexShrink={0}
                borderRadius="full"
              />
              <Text
                fontWeight="800"
                fontSize="lg"
                letterSpacing="-0.4px"
                fontFamily="'Poppins', sans-serif"
                color={isDark ? 'white' : 'black'}
              >
                Wild Diary
              </Text>
            </Box>
          </HStack>

          {/* ── CENTER: Core 5 Tabs (Desktop Only) ── */}
          {isAuthenticated ? (
            <HStack
              display={{ base: 'none', md: 'flex' }}
              flex="1"
              justify="center"
              spacing={{ md: 1, lg: 2 }}
              maxW="560px"
            >
              {CORE_TABS.map(tab => {
                const Icon = tab.icon;
                const isActive = activeTab === tab.key;
                return (
                  <Tooltip key={tab.key} label={tab.label} placement="bottom" hasArrow openDelay={400}>
                    <Box
                      as={RouterLink}
                      to={tab.href}
                      position="relative"
                      display="flex"
                      alignItems="center"
                      justifyContent="center"
                      w={{ md: '72px', lg: '92px' }}
                      h="44px"
                      borderRadius="xl"
                      color={isActive ? 'brand.500' : subtleText}
                      bg={isActive ? (isDark ? 'rgba(124,58,237,0.14)' : 'purple.50') : 'transparent'}
                      _hover={{
                        bg: isDark ? 'rgba(255,255,255,0.08)' : 'gray.100',
                        color: isActive ? 'brand.500' : (isDark ? 'white' : 'black'),
                        textDecoration: 'none',
                      }}
                      transition="all 0.15s ease"
                    >
                      <Box position="relative">
                        <Icon size={25} />
                        {tab.hasBadge && unreadCount > 0 && (
                          <Badge
                            position="absolute"
                            top="-4px"
                            right="-8px"
                            colorScheme="red"
                            borderRadius="full"
                            fontSize="2xs"
                            px={1.5}
                            py={0.2}
                            fontWeight="800"
                          >
                            {unreadCount > 9 ? '9+' : unreadCount}
                          </Badge>
                        )}
                      </Box>
                      {isActive && (
                        <Box
                          position="absolute"
                          bottom="-6px"
                          left="15%"
                          w="70%"
                          h="3px"
                          bg="brand.500"
                          borderRadius="full"
                        />
                      )}
                    </Box>
                  </Tooltip>
                );
              })}
            </HStack>
          ) : (
            <Box flex="1" />
          )}

          {/* ── RIGHT: Hamburger & User Actions ── */}
          <HStack spacing={2} flex="0 0 auto" minW={{ base: 'auto', lg: '240px' }} justify="flex-end">
            {isAuthenticated ? (
              <>
                {/* Desktop: Quick Profile Avatar Button */}
                <Tooltip label={user?.username || 'Profile'} hasArrow>
                  <Box
                    as={RouterLink}
                    to="/profile"
                    display={{ base: 'none', md: 'flex' }}
                    alignItems="center"
                    gap={2}
                    p={1}
                    pr={2.5}
                    borderRadius="full"
                    bg={iconBg}
                    _hover={{ bg: iconHov, textDecoration: 'none' }}
                    transition="background 0.15s"
                  >
                    <Avatar size="xs" name={user?.username} bg="brand.500" color="white" />
                    <Text fontSize="xs" fontWeight="700" color={mainText} noOfLines={1} maxW="110px">
                      {user?.username}
                    </Text>
                  </Box>
                </Tooltip>

                {/* Hamburger "More Menus" Button (both Mobile & Desktop) */}
                <Tooltip label="More menus" hasArrow>
                  <IconButton
                    aria-label="Open more navigation menus"
                    icon={<MdMenu size={24} />}
                    onClick={onOpen}
                    bg={iconBg}
                    _hover={{ bg: iconHov }}
                    color={mainText}
                    borderRadius="full"
                    size="md"
                    variant="ghost"
                  />
                </Tooltip>
              </>
            ) : (
              <Button
                as={RouterLink}
                to="/auth"
                size="sm"
                borderRadius="full"
                variant="brand"
                fontFamily="'Poppins', sans-serif"
                fontWeight="700"
                px={5}
              >
                Sign In
              </Button>
            )}
          </HStack>
        </Flex>
      </Box>

      {/* ════════════════════════════════════════════════════════════════════════
          MOBILE BOTTOM NAVBAR (Instagram / Facebook Style Core 5 Tabs)
          ════════════════════════════════════════════════════════════════════════ */}
      {isAuthenticated && (
        <Box
          display={{ base: 'block', md: 'none' }}
          position="fixed"
          bottom={0}
          left={0}
          right={0}
          h="60px"
          bg={bottomBg}
          borderTop="1px solid"
          borderColor={border}
          zIndex={200}
          boxShadow={isDark ? '0 -2px 12px rgba(0,0,0,0.5)' : '0 -2px 10px rgba(0,0,0,0.06)'}
        >
          <Flex h="100%" align="center" justify="space-around" px={1}>
            {CORE_TABS.map(tab => {
              const Icon = tab.icon;
              const isActive = activeTab === tab.key;
              return (
                <Box
                  key={tab.key}
                  as={RouterLink}
                  to={tab.href}
                  flex="1"
                  h="100%"
                  display="flex"
                  flexDirection="column"
                  alignItems="center"
                  justifyContent="center"
                  color={isActive ? 'brand.500' : subtleText}
                  _hover={{ textDecoration: 'none' }}
                  position="relative"
                  py={1}
                >
                  <Box position="relative">
                    <Icon size={24} />
                    {tab.hasBadge && unreadCount > 0 && (
                      <Badge
                        position="absolute"
                        top="-3px"
                        right="-7px"
                        colorScheme="red"
                        borderRadius="full"
                        fontSize="3xs"
                        px={1.5}
                        py={0.2}
                        fontWeight="800"
                      >
                        {unreadCount > 9 ? '9+' : unreadCount}
                      </Badge>
                    )}
                  </Box>
                  <Text
                    fontSize="10px"
                    fontWeight={isActive ? '700' : '500'}
                    fontFamily="'Poppins', sans-serif"
                    mt={0.5}
                    letterSpacing="-0.2px"
                  >
                    {tab.shortLabel}
                  </Text>
                  {isActive && (
                    <Box
                      position="absolute"
                      top="0"
                      left="20%"
                      right="20%"
                      h="2.5px"
                      bg="brand.500"
                      borderRadius="full"
                    />
                  )}
                </Box>
              );
            })}
          </Flex>
        </Box>
      )}

      {/* ════════════════════════════════════════════════════════════════════════
          HAMBURGER "MORE MENUS" DRAWER (Houses all other sections)
          ════════════════════════════════════════════════════════════════════════ */}
      <Drawer isOpen={isOpen} placement="right" onClose={onClose} size="sm">
        <DrawerOverlay bg="blackAlpha.600" backdropFilter="blur(3px)" />
        <DrawerContent bg={drawerBg} color={mainText} fontFamily="'Poppins', sans-serif">
          <DrawerCloseButton mt={2} />
          <DrawerHeader borderBottom="1px solid" borderColor={border} pb={4} pt={5}>
            <Text fontSize="lg" fontWeight="800">
              More Menus
            </Text>
            <Text fontSize="xs" color={subtleText} fontWeight="500">
              Explore extra tools, resources, and account settings
            </Text>
          </DrawerHeader>

          <DrawerBody px={4} py={5}>
            <VStack spacing={4} align="stretch">

              {/* ── Profile Summary Card ── */}
              <Box
                p={3.5}
                borderRadius="xl"
                bg={isDark ? 'whiteAlpha.100' : 'gray.50'}
                border="1px solid"
                borderColor={border}
              >
                <HStack spacing={3}>
                  <Avatar size="md" name={user?.username} bg="brand.500" color="white" />
                  <Box minW={0} flex="1">
                    <HStack spacing={2} align="center">
                      <Text fontWeight="800" fontSize="md" color={mainText} noOfLines={1} textTransform="capitalize">
                        {user?.username}
                      </Text>
                      {user?.role === 'admin' && (
                        <Badge colorScheme="purple" fontSize="2xs" borderRadius="full">
                          Admin
                        </Badge>
                      )}
                      {user?.role === 'counselor' && (
                        <Badge colorScheme="green" fontSize="2xs" borderRadius="full">
                          Counselor
                        </Badge>
                      )}
                    </HStack>
                    <Text fontSize="xs" color={subtleText} noOfLines={1}>
                      {user?.email}
                    </Text>
                  </Box>
                </HStack>

                <Button
                  as={RouterLink}
                  to="/profile"
                  onClick={onClose}
                  size="sm"
                  w="100%"
                  mt={3}
                  variant="outline"
                  borderRadius="lg"
                  fontSize="xs"
                  fontWeight="700"
                  leftIcon={<MdAccountCircle size={18} />}
                >
                  View My Profile
                </Button>
              </Box>

              <Divider borderColor={border} />

              {/* ── Exploration & Support Section ── */}
              <Box>
                <Text fontSize="xs" fontWeight="800" color={subtleText} textTransform="uppercase" letterSpacing="0.5px" mb={2} px={1}>
                  Support & Growth
                </Text>

                <VStack spacing={1} align="stretch">
                  <DrawerMenuItem
                    to="/insights"
                    icon={MdInsights}
                    title="Emotional Insights"
                    description="Personal mood patterns & diary analytics"
                    onClick={onClose}
                    isDark={isDark}
                    border={border}
                  />

                  <DrawerMenuItem
                    to="/counselors"
                    icon={MdSupportAgent}
                    title="Find Counselors"
                    description="Connect with verified mental health experts"
                    onClick={onClose}
                    isDark={isDark}
                    border={border}
                  />

                  <DrawerMenuItem
                    to="/safety"
                    icon={MdHealthAndSafety}
                    title="Safety & Crisis Help"
                    description="Emergency hotlines and safe community practices"
                    onClick={onClose}
                    isDark={isDark}
                    border={border}
                    accentColor="#ef4444"
                  />
                </VStack>
              </Box>

              <Divider borderColor={border} />

              {/* ── Account & Administrative ── */}
              <Box>
                <Text fontSize="xs" fontWeight="800" color={subtleText} textTransform="uppercase" letterSpacing="0.5px" mb={2} px={1}>
                  Preferences & Tools
                </Text>

                <VStack spacing={1} align="stretch">
                  {user?.role === 'admin' && (
                    <DrawerMenuItem
                      to="/admin"
                      icon={MdAdminPanelSettings}
                      title="Admin Dashboard"
                      description="Moderate posts, verify counselors, manage users"
                      onClick={onClose}
                      isDark={isDark}
                      border={border}
                      accentColor="#7c3aed"
                    />
                  )}

                  <DrawerMenuItem
                    to="/settings"
                    icon={MdSettings}
                    title="Settings"
                    description="Account privacy, notifications, password"
                    onClick={onClose}
                    isDark={isDark}
                    border={border}
                  />

                  {/* Dark Mode Quick Toggle */}
                  <Flex
                    as="button"
                    onClick={toggleColorMode}
                    w="100%"
                    p={3}
                    borderRadius="xl"
                    align="center"
                    justify="space-between"
                    _hover={{ bg: isDark ? 'whiteAlpha.100' : 'gray.100' }}
                    transition="background 0.15s"
                    textAlign="left"
                  >
                    <HStack spacing={3}>
                      <Box
                        p={2}
                        borderRadius="lg"
                        bg={isDark ? 'whiteAlpha.200' : 'gray.200'}
                        color={isDark ? 'yellow.300' : 'gray.700'}
                      >
                        {isDark ? <MdDarkMode size={20} /> : <MdLightMode size={20} />}
                      </Box>
                      <Box>
                        <Text fontSize="sm" fontWeight="700" color={mainText}>
                          {isDark ? 'Dark mode enabled' : 'Light mode enabled'}
                        </Text>
                        <Text fontSize="xs" color={subtleText}>
                          Tap to toggle appearance theme
                        </Text>
                      </Box>
                    </HStack>
                    <Badge colorScheme={isDark ? 'purple' : 'gray'} borderRadius="full" px={2} fontSize="2xs">
                      {isDark ? 'Dark' : 'Light'}
                    </Badge>
                  </Flex>
                </VStack>
              </Box>

              <Divider borderColor={border} />

              {/* ── Sign Out ── */}
              <Button
                variant="ghost"
                colorScheme="red"
                color="red.400"
                onClick={handleLogout}
                leftIcon={<MdLogout size={18} />}
                justifyContent="flex-start"
                borderRadius="xl"
                py={6}
                fontWeight="700"
                fontSize="sm"
                _hover={{ bg: isDark ? 'whiteAlpha.100' : 'red.50' }}
              >
                Sign Out of Wild Diary
              </Button>
            </VStack>
          </DrawerBody>
        </DrawerContent>
      </Drawer>
    </>
  );
}

function DrawerMenuItem({ to, icon: Icon, title, description, onClick, isDark, accentColor }) {
  const mainText   = isDark ? '#e4e6eb' : '#050505';
  const subtleText = isDark ? '#b0b3b8' : '#65676b';

  return (
    <Flex
      as={RouterLink}
      to={to}
      onClick={onClick}
      p={3}
      borderRadius="xl"
      align="center"
      gap={3}
      _hover={{
        bg: isDark ? 'whiteAlpha.100' : 'gray.100',
        textDecoration: 'none',
      }}
      transition="background 0.15s"
    >
      <Box
        p={2}
        borderRadius="lg"
        bg={accentColor ? `${accentColor}18` : (isDark ? 'whiteAlpha.100' : 'purple.50')}
        color={accentColor || 'brand.500'}
        flexShrink={0}
      >
        <Icon size={20} />
      </Box>
      <Box minW={0} flex="1">
        <Text fontSize="sm" fontWeight="700" color={mainText} noOfLines={1}>
          {title}
        </Text>
        {description && (
          <Text fontSize="xs" color={subtleText} noOfLines={1}>
            {description}
          </Text>
        )}
      </Box>
    </Flex>
  );
}
