import { useEffect, useState } from 'react';
import { Link as RouterLink, useNavigate, useLocation } from 'react-router-dom';
import { useAuth } from '../Context/useAuth';
import { discoveryService } from '../Services/discoveryService';
import { useColorMode } from '@chakra-ui/react';
import {
  Box, Flex, HStack, IconButton, Button, Text, Image,
  Avatar, Menu, MenuButton, MenuList, MenuItem, MenuDivider, Tooltip, Badge,
} from '@chakra-ui/react';
import {
  MdHome, MdMenuBook, MdInsights, MdAutoAwesome, MdSupportAgent,
  MdPersonAdd, MdNotifications, MdDarkMode, MdLightMode, MdLogout, MdChat,
  MdSettings,
} from 'react-icons/md';

const TABS = [
  { icon: MdHome, label: 'Support feed', key: 'feed', href: '/feed' },
  { icon: MdMenuBook, label: 'Private diary', key: 'diary', href: '/diary' },
  { icon: MdInsights, label: 'Insights', key: 'insights', href: '/insights' },
  { icon: MdAutoAwesome, label: 'AI support', key: 'chat', href: '/chat' },
  { icon: MdSupportAgent, label: 'Counselors', key: 'counselors', href: '/counselors' },
];

export default function Navbar() {
  const { user, logout, isAuthenticated } = useAuth();
  const { colorMode, toggleColorMode } = useColorMode();
  const navigate = useNavigate();
  const location = useLocation();
  const isDark = colorMode === 'dark';
  const [unreadCount, setUnreadCount] = useState(0);

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

  const handleLogout = () => { logout(); navigate('/'); };

  const activeTab = (() => {
    if (location.pathname === '/feed') return 'feed';
    if (location.pathname.startsWith('/diary')) return 'diary';
    if (location.pathname === '/insights') return 'insights';
    if (location.pathname === '/chat' || location.pathname === '/ai') return 'chat';
    if (location.pathname.startsWith('/counselors')) return 'counselors';
    return null;
  })();

  const navBg   = isDark ? '#242526' : 'white';
  const border  = isDark ? 'rgba(255,255,255,0.1)' : '#e4e6eb';
  const iconBg  = isDark ? 'rgba(255,255,255,0.1)' : '#f0f2f5';
  const iconHov = isDark ? 'rgba(255,255,255,0.15)' : '#e4e6eb';

  return (
    <Box
      as="nav" bg={navBg} borderBottom="1px solid" borderColor={border}
      position="sticky" top={0} zIndex={200} h="56px"
      boxShadow={isDark ? '0 1px 8px rgba(0,0,0,0.4)' : '0 1px 4px rgba(0,0,0,0.1)'}
    >
      <Flex h="100%" align="center" px={{ base: 2, md: 4 }} gap={2}>

        {/* ── LEFT: Logo ── */}
        <HStack spacing={2} flex="0 0 auto" minW={{ base: 'auto', lg: '260px' }}>
          <Box as={RouterLink} to={isAuthenticated ? '/feed' : '/'} display="flex" alignItems="center" gap={2} _hover={{ textDecoration: 'none' }}>
            <Image src="/diarylogo.svg" alt="Wild Diary" boxSize="36px" flexShrink={0} />
            <Text
              display={{ base: 'none', xl: 'block' }}
              fontWeight="800" fontSize="lg" letterSpacing="-0.3px"
              fontFamily="'Poppins', sans-serif" color={isDark ? 'white' : 'black'}
            >
              Wild Diary
            </Text>
          </Box>
        </HStack>

        {/* ── CENTER: Nav tabs (authenticated only) ── */}
        {isAuthenticated ? (
          <HStack flex="1" justify="center" spacing={0}>
            {TABS.map(tab => {
              const Icon = tab.icon;
              const isActive = activeTab === tab.key;
              return (
                <Tooltip key={tab.key} label={tab.label} placement="bottom" hasArrow openDelay={600}>
                  <Box
                    as={RouterLink} to={tab.href}
                    position="relative"
                    display="flex" alignItems="center" justifyContent="center"
                    w={{ base: '44px', md: '80px', lg: '96px' }} h="44px"
                    borderRadius="lg"
                    color={isActive ? 'brand.500' : isDark ? '#b0b3b8' : '#65676b'}
                    bg={isActive ? (isDark ? 'rgba(124,58,237,0.12)' : 'purple.50') : 'transparent'}
                    _hover={{ bg: isDark ? 'rgba(255,255,255,0.08)' : 'gray.100', textDecoration: 'none' }}
                    transition="background 0.15s"
                  >
                    <Icon size={26} />
                    {isActive && (
                      <Box
                        position="absolute" bottom="-6px" left="10%" w="80%" h="3px"
                        bg="brand.500" borderRadius="full"
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

        {/* ── RIGHT: Actions ── */}
        <HStack spacing={2} flex="0 0 auto" minW={{ base: 'auto', lg: '260px' }} justify="flex-end">
          <IconButton
            aria-label="Toggle colour mode"
            icon={isDark ? <MdLightMode size={20} /> : <MdDarkMode size={20} />}
            onClick={toggleColorMode}
            variant="ghost" borderRadius="full" size="sm"
          />

          {isAuthenticated ? (
            <>
              <Tooltip label="Find Counselors" hasArrow>
                <IconButton
                  aria-label="Find Counselors" icon={<MdPersonAdd size={20} />}
                  as={RouterLink} to="/counselors"
                  bg={iconBg} _hover={{ bg: iconHov }} color={isDark ? 'white' : 'black'}
                  borderRadius="full" size="md" variant="ghost"
                />
              </Tooltip>

              <Tooltip label="Messenger" hasArrow>
                <IconButton
                  aria-label="Messenger" icon={<MdChat size={20} />}
                  as={RouterLink} to="/chat"
                  bg={iconBg} _hover={{ bg: iconHov }} color={isDark ? 'white' : 'black'}
                  borderRadius="full" size="md" variant="ghost"
                />
              </Tooltip>

              <Tooltip label="Notifications" hasArrow>
                <Box position="relative" display="inline-flex">
                  <IconButton
                    aria-label="Notifications" icon={<MdNotifications size={20} />}
                    as={RouterLink} to="/notifications"
                    bg={iconBg} _hover={{ bg: iconHov }} color={isDark ? 'white' : 'black'}
                    borderRadius="full" size="md" variant="ghost"
                  />
                  {unreadCount > 0 && (
                    <Badge
                      position="absolute"
                      top="-2px"
                      right="-2px"
                      colorScheme="red"
                      borderRadius="full"
                      fontSize="xs"
                      px={1.5}
                      py={0.5}
                      transform="translate(25%, -25%)"
                    >
                      {unreadCount > 9 ? '9+' : unreadCount}
                    </Badge>
                  )}
                </Box>
              </Tooltip>

              <Menu placement="bottom-end">
                <MenuButton as={Button} variant="unstyled" p={0} minW="auto" h="auto" display="flex" alignItems="center">
                  <Avatar
                    size="sm" name={user?.username} bg="brand.500" color="white"
                    fontFamily="'Poppins', sans-serif" cursor="pointer"
                    _hover={{ opacity: 0.85 }} transition="opacity 0.15s"
                  />
                </MenuButton>
                <MenuList
                  bg={isDark ? '#3a3b3c' : 'white'} borderColor={border}
                  minW="220px" py={2} boxShadow="xl"
                >
                  <MenuItem
                    as={RouterLink} to="/profile"
                    fontFamily="'Poppins', sans-serif" fontSize="sm"
                    _hover={{ bg: isDark ? 'whiteAlpha.100' : 'gray.50' }} py={3}
                  >
                    <HStack spacing={3}>
                      <Avatar size="sm" name={user?.username} bg="brand.500" color="white" />
                      <Box>
                        <Text fontWeight="700" fontSize="sm" fontFamily="'Poppins', sans-serif" textTransform="capitalize" color={isDark ? 'white' : 'black'}>
                          {user?.username}
                        </Text>
                        <Text fontSize="xs" color={isDark ? 'gray.400' : 'gray.500'} fontFamily="'Poppins', sans-serif">
                          View your profile
                        </Text>
                      </Box>
                    </HStack>
                  </MenuItem>
                  <MenuDivider borderColor={border} />
                  <MenuItem
                    as={RouterLink} to="/settings"
                    icon={<MdSettings size={18} />}
                    fontFamily="'Poppins', sans-serif" fontSize="sm"
                    _hover={{ bg: isDark ? 'whiteAlpha.100' : 'gray.50' }}
                  >
                    Settings
                  </MenuItem>
                  <MenuDivider borderColor={border} />
                  <MenuItem
                    icon={<MdLogout size={18} />} onClick={handleLogout}
                    color="red.400" fontFamily="'Poppins', sans-serif" fontSize="sm"
                    _hover={{ bg: isDark ? 'whiteAlpha.100' : 'gray.50' }}
                  >
                    Sign Out
                  </MenuItem>
                </MenuList>
              </Menu>
            </>
          ) : (
            <Button
              as={RouterLink} to="/auth" size="sm" borderRadius="full"
              fontFamily="'Poppins', sans-serif" fontWeight="700"
            >
              Sign In
            </Button>
          )}
        </HStack>
      </Flex>
    </Box>
  );
}
