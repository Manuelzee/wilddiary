import { useState } from 'react';
import { Link as RouterLink, useNavigate } from 'react-router-dom';
import { useAuth } from '../Context/useAuth';
import { useColorMode } from '@chakra-ui/react';
import {
  Box, Flex, VStack, Heading, Text, Button, Input, FormControl,
  FormLabel, InputGroup, InputLeftElement, InputRightElement,
  IconButton, Divider, HStack, Link, Image, useToast, Select,
} from '@chakra-ui/react';
import {
  MdEmail, MdLock, MdPerson, MdVisibility, MdVisibilityOff,
  MdArrowForward, MdMenuBook, MdVerifiedUser,
  MdDarkMode, MdLightMode,
} from 'react-icons/md';

// ─── Dark/Light mode toggle button ───────────────────────────────────────────
function ColorToggle() {
  const { colorMode, toggleColorMode } = useColorMode();
  return (
    <IconButton
      aria-label="Toggle color mode"
      icon={colorMode === 'dark' ? <MdLightMode size={20} /> : <MdDarkMode size={20} />}
      onClick={toggleColorMode}
      variant="ghost"
      borderRadius="full"
      position="fixed"
      top={4}
      right={4}
      zIndex={100}
      size="md"
    />
  );
}

// ─── Auth form (right panel) ──────────────────────────────────────────────────
function AuthPanel() {
  const { login, register } = useAuth();
  const { colorMode } = useColorMode();
  const navigate = useNavigate();
  const toast = useToast();
  const isDark = colorMode === 'dark';

  const [isRegister, setIsRegister] = useState(false);
  const [showPw, setShowPw] = useState(false);
  const [loading, setLoading] = useState(false);
  const [formData, setFormData] = useState({
    username: '', email: '', password: '', role: 'user',
  });

  const handleChange = (e) =>
    setFormData({ ...formData, [e.target.name]: e.target.value });

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    if (isRegister) {
      const res = await register(formData.username, formData.email, formData.password, formData.role);
      if (res.success) {
        toast({ title: 'Account created! You can now sign in.', status: 'success', duration: 3000, isClosable: true });
        setIsRegister(false);
        setFormData({ ...formData, password: '' });
      } else {
        toast({ title: res.error || 'Registration failed.', status: 'error', duration: 3000, isClosable: true });
      }
    } else {
      const res = await login(formData.email, formData.password);
      if (res.success) navigate('/feed');
      else toast({ title: res.error || 'Invalid email or password.', status: 'error', duration: 3000, isClosable: true });
    }
    setLoading(false);
  };

  const switchMode = (toReg) => {
    setIsRegister(toReg);
    setFormData({ username: '', email: '', password: '', role: 'user' });
  };

  const iconColor = isDark ? '#555' : '#aaa';
  const borderColor = isDark ? 'whiteAlpha.200' : 'gray.200';
  const subtleText = 'gray.500';

  return (
    <Box as="form" onSubmit={handleSubmit} w="100%" maxW="360px">
      <Heading
        fontSize={{ base: '3xl', md: '4xl' }}
        fontWeight="900"
        fontFamily="'Poppins', sans-serif"
        mb={8}
        lineHeight="1.1"
        letterSpacing="-0.5px"
      >
        Writing your heart<br />on the web
      </Heading>

      <VStack spacing={4} align="stretch">
        {isRegister && (
          <FormControl>
            <FormLabel fontSize="sm" fontFamily="'Poppins', sans-serif">Username</FormLabel>
            <InputGroup>
              <InputLeftElement pointerEvents="none" h="full">
                <MdPerson size={18} color={iconColor} />
              </InputLeftElement>
              <Input
                name="username"
                placeholder="e.g. HopefulBear"
                value={formData.username}
                onChange={handleChange}
                required
                size="lg"
                pl="42px"
                fontFamily="'Poppins', sans-serif"
              />
            </InputGroup>
          </FormControl>
        )}

        <FormControl>
          <FormLabel fontSize="sm" fontFamily="'Poppins', sans-serif">Email address</FormLabel>
          <InputGroup>
            <InputLeftElement pointerEvents="none" h="full">
              <MdEmail size={18} color={iconColor} />
            </InputLeftElement>
            <Input
              name="email"
              type="email"
              placeholder="you@example.com"
              value={formData.email}
              onChange={handleChange}
              required
              size="lg"
              pl="42px"
              fontFamily="'Poppins', sans-serif"
            />
          </InputGroup>
        </FormControl>

        <FormControl>
          <FormLabel fontSize="sm" fontFamily="'Poppins', sans-serif">Password</FormLabel>
          <InputGroup>
            <InputLeftElement pointerEvents="none" h="full">
              <MdLock size={18} color={iconColor} />
            </InputLeftElement>
            <Input
              name="password"
              type={showPw ? 'text' : 'password'}
              placeholder="••••••••"
              value={formData.password}
              onChange={handleChange}
              required
              size="lg"
              pl="42px"
              pr="48px"
              fontFamily="'Poppins', sans-serif"
            />
            <InputRightElement h="full">
              <IconButton
                aria-label={showPw ? 'Hide password' : 'Show password'}
                icon={showPw ? <MdVisibilityOff size={18} /> : <MdVisibility size={18} />}
                size="sm"
                variant="ghost"
                borderRadius="full"
                onClick={() => setShowPw((v) => !v)}
              />
            </InputRightElement>
          </InputGroup>
        </FormControl>

        {isRegister && (
          <FormControl>
            <FormLabel fontSize="sm" fontFamily="'Poppins', sans-serif">I am joining as</FormLabel>
            <InputGroup>
              <InputLeftElement pointerEvents="none" h="full">
                <MdVerifiedUser size={18} color={iconColor} />
              </InputLeftElement>
              <Select
                name="role"
                value={formData.role}
                onChange={handleChange}
                size="lg"
                pl="42px"
                fontFamily="'Poppins', sans-serif"
                border="1px solid"
                borderColor={borderColor}
                borderRadius="4px"
                sx={{ '& option': { bg: isDark ? '#000' : '#fff', color: isDark ? '#fff' : '#000' } }}
              >
                <option value="user">Community Member</option>
                <option value="counselor">Verified Counselor</option>
              </Select>
            </InputGroup>
          </FormControl>
        )}

        <Button
          type="submit"
          size="lg"
          isLoading={loading}
          loadingText="Please wait…"
          w="100%"
          fontFamily="'Poppins', sans-serif"
          fontWeight="700"
          fontSize="md"
          borderRadius="full"
          rightIcon={!loading ? <MdArrowForward size={18} /> : undefined}
        >
          {isRegister ? 'Create Account' : 'Sign In'}
        </Button>

        <Text fontSize="sm" color={subtleText} textAlign="center" fontFamily="'Poppins', sans-serif">
          {isRegister ? (
            <>
              Already have an account?{' '}
              <Link as="button" type="button" color="brand.500" fontWeight="700"
                _hover={{ textDecoration: 'underline' }} onClick={() => switchMode(false)}
                fontFamily="'Poppins', sans-serif">
                Sign in
              </Link>
            </>
          ) : (
            <>
              New to Wild Diary?{' '}
              <Link as="button" type="button" color="brand.500" fontWeight="700"
                _hover={{ textDecoration: 'underline' }} onClick={() => switchMode(true)}
                fontFamily="'Poppins', sans-serif">
                Create an account
              </Link>
            </>
          )}
        </Text>

        <HStack>
          <Divider borderColor={borderColor} />
          <Text fontSize="xs" color={subtleText} px={2} flexShrink={0}>or</Text>
          <Divider borderColor={borderColor} />
        </HStack>

        <Button
          as={RouterLink}
          to="/feed"
          size="lg"
          variant="outline"
          w="100%"
          fontFamily="'Poppins', sans-serif"
          fontWeight="600"
          fontSize="sm"
          borderRadius="full"
          leftIcon={<MdMenuBook size={18} />}
        >
          Continue as Guest
        </Button>
      </VStack>

      <Text fontSize="xs" color={subtleText} mt={6} lineHeight="1.6" fontFamily="'Poppins', sans-serif">
        🛡️ By continuing, you agree to our{' '}
        <Link href="#" color={subtleText} textDecoration="underline">Terms</Link>,{' '}
        <Link href="#" color={subtleText} textDecoration="underline">Privacy Policy</Link> and{' '}
        <Link href="#" color={subtleText} textDecoration="underline">Community Rules</Link>.
      </Text>
    </Box>
  );
}

// ─── Authenticated landing ────────────────────────────────────────────────────
function AuthenticatedHome({ user }) {
  const { colorMode, toggleColorMode } = useColorMode();
  const isDark = colorMode === 'dark';

  return (
    <Flex minH="100dvh" align="center" justify="center" direction="column" gap={10}
      px={6} py={16} bg={isDark ? 'black' : 'white'} position="relative">
      <IconButton
        aria-label="Toggle color mode"
        icon={isDark ? <MdLightMode size={20} /> : <MdDarkMode size={20} />}
        onClick={toggleColorMode}
        variant="ghost" borderRadius="full" position="fixed" top={4} right={4} zIndex={100} size="md"
      />
      <VStack spacing={4} textAlign="center" maxW="500px">
        <Image src="/diarylogo.svg" alt="Wild Diary" boxSize="96px" />
        <Heading fontSize={{ base: '3xl', md: '4xl' }} fontWeight="900" fontFamily="'Poppins', sans-serif" lineHeight="1.1">
          Welcome back,{' '}
          <Box as="span" color="brand.500" textTransform="capitalize">{user?.username}</Box>
        </Heading>
        <Text color="gray.500" fontFamily="'Poppins', sans-serif">
          Your safe space is ready. Pick up where you left off.
        </Text>
        <HStack spacing={4} pt={2}>
          <Button as={RouterLink} to="/feed" size="lg" borderRadius="full" fontFamily="'Poppins', sans-serif" fontWeight="700">
            Go to Feed
          </Button>
          <Button as={RouterLink} to="/create" size="lg" variant="outline" borderRadius="full" fontFamily="'Poppins', sans-serif" fontWeight="600">
            Write New Entry
          </Button>
        </HStack>
      </VStack>
    </Flex>
  );
}

// ─── Unauthenticated split layout (X.com style) ───────────────────────────────
function UnauthenticatedHome() {
  const { colorMode } = useColorMode();
  const isDark = colorMode === 'dark';

  return (
    <Flex minH="100dvh" bg={isDark ? 'black' : 'white'} position="relative">
      <ColorToggle />

      {/* LEFT — Large logo */}
      <Flex flex="1" align="center" justify="center" display={{ base: 'none', md: 'flex' }} px={8}>
        <Image
          src="/diarylogo.svg"
          alt="Wild Diary logo"
          w={{ md: '280px', lg: '360px', xl: '420px' }}
          maxW="90%"
        />
        <Text fontSize="4xl" fontWeight="1000" fontFamily="'Poppins', sans-serif" lineHeight="1.1" color='blue'>
          Wild Diary
        </Text>
      </Flex>
      {/* RIGHT — Form */}
      <Flex
        flex={{ base: '1', md: '0 0 480px' }}
        direction="column"
        justify="center"
        px={{ base: 6, md: 10 }}
        py={12}
        borderLeft={{ md: '1px solid' }}
        borderColor={{ md: isDark ? 'whiteAlpha.100' : 'gray.100' }}
        minH="100dvh"
      >
        <Box display={{ base: 'flex', md: 'none' }} justifyContent="center" mb={8}>
          <Image src="/logo.svg" alt="Wild Diary" boxSize="80px" />
        </Box>
        <AuthPanel />
      </Flex>
    </Flex>
  );
}

// ─── Main Export ──────────────────────────────────────────────────────────────
export default function Home() {
  const { isAuthenticated, user } = useAuth();
  return isAuthenticated ? <AuthenticatedHome user={user} /> : <UnauthenticatedHome />;
}
