import { useState } from 'react';
import { Link as RouterLink, useNavigate } from 'react-router-dom';
import { useAuth } from '../Context/useAuth';
import { useColorMode } from '@chakra-ui/react';
import {
  Box, Flex, VStack, Heading, Text, Button, Input, FormControl,
  FormLabel, InputGroup, InputLeftElement, InputRightElement,
  IconButton, HStack, Link, Image, useToast, Select,
} from '@chakra-ui/react';
import {
  MdEmail, MdLock, MdPerson, MdVisibility, MdVisibilityOff,
  MdArrowForward,
} from 'react-icons/md';

// ─── Helper: generate year/month/day options ──────────────────────────────────
const days = Array.from({ length: 31 }, (_, i) => i + 1);
const months = [
  'January','February','March','April','May','June',
  'July','August','September','October','November','December',
];
const currentYear = new Date().getFullYear();
const years = Array.from({ length: 100 }, (_, i) => currentYear - i);
const makeUsername = (firstName, surname) => `${firstName}_${surname}`
  .replace(/[^A-Za-z0-9_]/g, '')
  .replace(/_+/g, '_')
  .replace(/^_|_$/g, '')
  .slice(0, 30);

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
    firstName: '', surname: '', email: '', password: '',
    dobDay: '', dobMonth: '', dobYear: '', gender: '',
  });

  const handleChange = (e) =>
    setFormData({ ...formData, [e.target.name]: e.target.value });

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    if (isRegister) {
      const username = makeUsername(formData.firstName, formData.surname);
      const res = await register(username, formData.email, formData.password);
      if (res.success) {
        toast({ title: 'Account created!', status: 'success', duration: 3000, isClosable: true });
        navigate('/feed');
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
    setFormData({ firstName: '', surname: '', email: '', password: '', dobDay: '', dobMonth: '', dobYear: '', gender: '' });
  };

  const iconColor = isDark ? '#555' : '#aaa';
  const borderColor = isDark ? 'whiteAlpha.200' : 'gray.200';
  const subtleText = 'gray.500';
  const selectSx = { '& option': { bg: isDark ? '#1a1a1a' : '#fff', color: isDark ? '#fff' : '#000' } };

  return (
    <Box as="form" onSubmit={handleSubmit} w="100%" maxW="420px">

      <Heading
        as="h6"
        fontSize="md"
        fontWeight="700"
        fontFamily="'Poppins', sans-serif"
        mb={6}
        lineHeight="1.3"
        textAlign="center"
        color="black"
      >
        {isRegister ? 'Create an account' : 'Sign in to your diary'}
      </Heading>

      <VStack spacing={4} align="stretch">
        {/* ── Registration fields ── */}
        {isRegister && (
          <>
            {/* Name row */}
            <FormControl>
              <FormLabel fontSize="sm" fontFamily="'Poppins', sans-serif" color="black">Name</FormLabel>
              <HStack>
                <Input
                  name="firstName"
                  placeholder="First name"
                  value={formData.firstName}
                  onChange={handleChange}
                  required
                  size="lg"
                  fontFamily="'Poppins', sans-serif"
                />
                <Input
                  name="surname"
                  placeholder="Surname"
                  value={formData.surname}
                  onChange={handleChange}
                  required
                  size="lg"
                  fontFamily="'Poppins', sans-serif"
                />
              </HStack>
            </FormControl>

            {/* Date of birth */}
            <FormControl>
              <FormLabel fontSize="sm" fontFamily="'Poppins', sans-serif" color="black">Date of birth</FormLabel>
              <HStack>
                <Select
                  name="dobDay" placeholder="Day" value={formData.dobDay}
                  onChange={handleChange} size="lg" fontFamily="'Poppins', sans-serif"
                  borderColor={borderColor} sx={selectSx}
                >
                  {days.map(d => <option key={d} value={d}>{d}</option>)}
                </Select>
                <Select
                  name="dobMonth" placeholder="Month" value={formData.dobMonth}
                  onChange={handleChange} size="lg" fontFamily="'Poppins', sans-serif"
                  borderColor={borderColor} sx={selectSx}
                >
                  {months.map((m, i) => <option key={m} value={i + 1}>{m}</option>)}
                </Select>
                <Select
                  name="dobYear" placeholder="Year" value={formData.dobYear}
                  onChange={handleChange} size="lg" fontFamily="'Poppins', sans-serif"
                  borderColor={borderColor} sx={selectSx}
                >
                  {years.map(y => <option key={y} value={y}>{y}</option>)}
                </Select>
              </HStack>
            </FormControl>

            {/* Gender */}
            <FormControl>
              <FormLabel fontSize="sm" fontFamily="'Poppins', sans-serif" color="black">Gender</FormLabel>
              <Select
                name="gender" placeholder="Select your gender" value={formData.gender}
                onChange={handleChange} size="lg" fontFamily="'Poppins', sans-serif"
                borderColor={borderColor} sx={selectSx}
              >
                <option value="female">Female</option>
                <option value="male">Male</option>
                <option value="other">Other</option>
                <option value="prefer_not">Prefer not to say</option>
              </Select>
            </FormControl>
          </>
        )}

        {/* Email */}
        <FormControl>
          <FormLabel fontSize="sm" fontFamily="'Poppins', sans-serif" color="black">
            {isRegister ? 'Mobile number or email address' : 'Email address'}
          </FormLabel>
          <InputGroup>
            <InputLeftElement pointerEvents="none" h="full">
              <MdEmail size={18} color={iconColor} />
            </InputLeftElement>
            <Input
              name="email"
              type="email"
              placeholder={isRegister ? 'Mobile number or email address' : 'you@example.com'}
              value={formData.email}
              onChange={handleChange}
              required
              size="lg"
              pl="42px"
              fontFamily="'Poppins', sans-serif"
            />
          </InputGroup>
        </FormControl>

        {/* Password */}
        <FormControl>
          <FormLabel fontSize="sm" fontFamily="'Poppins', sans-serif" color="black">Password</FormLabel>
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

        {/* Submit */}
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
          {isRegister ? 'Submit' : 'Sign In'}
        </Button>

        {/* Switch mode link */}
        <Text fontSize="sm" color={subtleText} textAlign="center" fontFamily="'Poppins', sans-serif">
          {isRegister ? (
            <>
              I already have an account.{' '}
              <Link as="button" type="button" color="brand.500" fontWeight="700"
                _hover={{ textDecoration: 'underline' }} onClick={() => switchMode(false)}
                fontFamily="'Poppins', sans-serif">
                Sign in
              </Link>
            </>
          ) : (
            <>
              Don&apos;t have an account?{' '}
              <Link as="button" type="button" color="brand.500" fontWeight="700"
                _hover={{ textDecoration: 'underline' }} onClick={() => switchMode(true)}
                fontFamily="'Poppins', sans-serif">
                Create an account
              </Link>
            </>
          )}
        </Text>
      </VStack>

      {isRegister && (
        <Text fontSize="xs" color={subtleText} mt={6} lineHeight="1.6" fontFamily="'Poppins', sans-serif">
          By tapping Submit, you agree to our{' '}
          <Link href="#" color={subtleText} textDecoration="underline">Terms</Link>,{' '}
          <Link href="#" color={subtleText} textDecoration="underline">Privacy Policy</Link> and{' '}
          <Link href="#" color={subtleText} textDecoration="underline">Community Rules</Link>.
        </Text>
      )}
    </Box>
  );
}

// ─── Authenticated landing ────────────────────────────────────────────────────
function AuthenticatedHome({ user }) {
  const { colorMode } = useColorMode();
  const isDark = colorMode === 'dark';

  return (
    <Flex minH="100dvh" align="center" justify="center" direction="column" gap={10}
      px={6} py={16} bg={isDark ? 'black' : 'white'} position="relative">
      <VStack spacing={4} textAlign="center" maxW="500px">
        <Image src="/app-logo.jpg" alt="Logo" boxSize="96px" borderRadius="full" objectFit="cover" />
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

// ─── Unauthenticated split layout ─────────────────────────────────────────────
function UnauthenticatedHome() {
  const { colorMode } = useColorMode();
  const isDark = colorMode === 'dark';

  return (
    <Flex minH="100dvh" bg="white" position="relative">
      {/* LEFT — Logo + Hero collage + tagline */}
      <Flex flex="1" align="center" justify="center" display={{ base: 'none', md: 'flex' }} px={8}
        bg="white">
        <Box w="100%" maxW="760px" h={{ md: '600px', lg: '680px' }} position="relative">
          <Image src="/app-logo.jpg" alt="Logo" boxSize="48px" borderRadius="full" objectFit="cover"
            position="absolute" top={0} left={0} zIndex={2} />
          <Image
            src="/hero-collage.jpg"
            alt="Mental health journaling"
            position="absolute"
            top={{ md: 30, lg: 20 }}
            right={0}
            w={{ md: '68%', lg: '70%' }}
            h={{ md: '78%', lg: '82%' }}
            borderRadius="2xl"
            objectFit="cover"
            boxShadow="2xl"
          />
          <Text
            position="absolute"
            left={0}
            bottom={{ md: 10, lg: 16 }}
            zIndex={2}
            fontSize="36px"
            fontWeight="800"
            fontFamily="'Poppins', sans-serif"
            lineHeight="1.18"
            color="black"
            letterSpacing="-0.8px"
            maxW={{ md: '190px', lg: '230px' }}
          >
            A safe, supportive space to share{' '}
            <Box as="span" color="blue.500">struggles.</Box>
          </Text>
        </Box>
      </Flex>

      {/* RIGHT — Form */}
      <Flex
        flex={{ base: '1', md: '0 0 520px' }}
        direction="column"
        justify="center"
        align="center"
        px={{ base: 6, md: 10 }}
        py={12}
        borderLeft={{ md: '1px solid' }}
        borderColor={{ md: isDark ? 'whiteAlpha.100' : 'gray.100' }}
        minH="100dvh"
        overflowY="auto"
        bg="white"
      >
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
