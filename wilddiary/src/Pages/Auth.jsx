import { useEffect, useState } from 'react';
import { useAuth } from '../Context/useAuth';
import { useNavigate } from 'react-router-dom';
import {
  Box, Flex, VStack, HStack, Heading, Text, Button, Input,
  FormControl, FormLabel, InputGroup,
  InputRightElement, IconButton, Link, Select,
  Image, useToast, Divider,
} from '@chakra-ui/react';
import { MdVisibility, MdVisibilityOff } from 'react-icons/md';

// ─── Helper: generate year/month/day options ──────────────────────────────────
const days = Array.from({ length: 31 }, (_, i) => i + 1);
const months = [
  'January', 'February', 'March', 'April', 'May', 'June',
  'July', 'August', 'September', 'October', 'November', 'December',
];
const currentYear = new Date().getFullYear();
const years = Array.from({ length: 100 }, (_, i) => currentYear - i);
const makeUsername = (firstName, surname) => `${firstName}_${surname}`
  .replace(/[^A-Za-z0-9_]/g, '')
  .replace(/_+/g, '_')
  .replace(/^_|_$/g, '')
  .slice(0, 30);

export default function Auth() {
  const { login, register, isAuthenticated } = useAuth();
  const navigate = useNavigate();
  const toast = useToast();

  const [isRegister, setIsRegister] = useState(false);
  const [showPw, setShowPw] = useState(false);
  const [formData, setFormData] = useState({
    firstName: '', surname: '', email: '', password: '',
    dobDay: '', dobMonth: '', dobYear: '', gender: '',
  });
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (isAuthenticated) navigate('/feed', { replace: true });
  }, [isAuthenticated, navigate]);

  if (isAuthenticated) return null;

  const handleChange = (e) => setFormData({ ...formData, [e.target.name]: e.target.value });

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

  const subtleText = 'gray.500';
  const borderColor = 'gray.200';
  const selectSx = { '& option': { bg: '#fff', color: '#000' } };

  return (
    <Flex
      minH="100dvh"
      bg="white"
      position="relative"
      w="100%"
    >
      {/* ════════════════════════════════════════════════════════════════════════
          LEFT PANEL — Logo + Tagline beside Hero image (hidden on mobile)
          ════════════════════════════════════════════════════════════════════════ */}
      <Flex
        flex="1"
        align="center"
        justify="center"
        display={{ base: 'none', md: 'flex' }}
        px={{ md: 8, lg: 12 }}
        py={10}
        bg="white"
        position="relative"
        overflow="hidden"
      >
        <Box w="100%" maxW="760px" h={{ md: '600px', lg: '680px' }} position="relative" zIndex={1}>
          {/* Logo */}
          <Image
            src="/app-logo.jpg"
            alt="Wild Diary Logo"
            boxSize="48px"
            borderRadius="full"
            objectFit="cover"
            position="absolute"
            top={0}
            left={0}
            zIndex={2}
          />

          {/* Large artwork anchored to the upper-right, as in the reference composition */}
          <Image
            src="/auth-hero.jpg"
            alt="A safe community for mental wellness"
            position="absolute"
            top={{ md: 30, lg: 20 }}
            right={0}
            w={{ md: '68%', lg: '70%' }}
            h={{ md: '78%', lg: '82%' }}
            objectFit="cover"
            objectPosition="center"
            borderRadius="2xl"
            boxShadow="0 20px 60px rgba(124,58,237,0.12), 0 8px 24px rgba(0,0,0,0.06)"
          />

          {/* Narrow, low-set tagline aligned to the left of the artwork */}
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
            <Box as="span" bgGradient="linear(to-r, brand.500, blue.500)" bgClip="text">
              struggles.
            </Box>
          </Text>
        </Box>
      </Flex>

      {/* ════════════════════════════════════════════════════════════════════════
          RIGHT PANEL — Auth Form
          ════════════════════════════════════════════════════════════════════════ */}
      <Flex
        flex={{ base: '1', md: '0 0 480px', lg: '0 0 520px' }}
        direction="column"
        justify="center"
        align="center"
        px={{ base: 6, md: 10 }}
        py={12}
        borderLeft={{ md: '1px solid' }}
        borderColor={{ md: 'gray.100' }}
        minH="100dvh"
        overflowY="auto"
        bg="white"
      >
        {/* Mobile-only logo */}
        <Box display={{ base: 'block', md: 'none' }} mb={6}>
          <Image src="/app-logo.jpg" alt="Logo" boxSize="48px" borderRadius="full" objectFit="cover" mx="auto" />
        </Box>

        <Box w="100%" maxW="500px">
          {/* Header */}
          <Heading
            as="h6"
            fontSize="md"
            fontWeight="700"
            fontFamily="'Poppins', sans-serif"
            lineHeight="1.3"
            textAlign={{ base: 'center', md: 'left' }}
            color="black"
            mb={5}
          >
            {isRegister ? 'Create an account' : 'Sign in to your diary'}
          </Heading>

          {/* Form */}
          <Box
            as="form"
            onSubmit={handleSubmit}
            bg="white"
            p={{ base: 5, md: 8 }}
            borderRadius="xl"
            border="1px solid"
            borderColor="gray.200"
            boxShadow="0 2px 12px rgba(0,0,0,0.06)"
          >
            <VStack spacing={4} align="stretch">
              {/* Registration fields */}
              {isRegister && (
                <>
                  {/* Name */}
                  <FormControl>
                    <FormLabel fontFamily="'Poppins', sans-serif" fontSize="sm" color="gray.700">Name</FormLabel>
                    <HStack>
                      <Input name="firstName" placeholder="First name" value={formData.firstName}
                        onChange={handleChange} required size="lg" fontFamily="'Poppins', sans-serif"
                        bg="gray.50" borderColor="gray.300" borderRadius="lg" color="black"
                        _focus={{ borderColor: 'brand.500', boxShadow: '0 0 0 1px #7c3aed', bg: 'white' }}
                        _hover={{ borderColor: 'gray.400' }} />
                      <Input name="surname" placeholder="Surname" value={formData.surname}
                        onChange={handleChange} required size="lg" fontFamily="'Poppins', sans-serif"
                        bg="gray.50" borderColor="gray.300" borderRadius="lg" color="black"
                        _focus={{ borderColor: 'brand.500', boxShadow: '0 0 0 1px #7c3aed', bg: 'white' }}
                        _hover={{ borderColor: 'gray.400' }} />
                    </HStack>
                  </FormControl>

                  {/* Date of birth */}
                  <FormControl>
                    <FormLabel fontFamily="'Poppins', sans-serif" fontSize="sm" color="gray.700">Date of birth</FormLabel>
                    <HStack>
                      <Select name="dobDay" placeholder="Day" value={formData.dobDay}
                        onChange={handleChange} size="lg" fontFamily="'Poppins', sans-serif"
                        borderColor={borderColor} sx={selectSx}>
                        {days.map(d => <option key={d} value={d}>{d}</option>)}
                      </Select>
                      <Select name="dobMonth" placeholder="Month" value={formData.dobMonth}
                        onChange={handleChange} size="lg" fontFamily="'Poppins', sans-serif"
                        borderColor={borderColor} sx={selectSx}>
                        {months.map((m, i) => <option key={m} value={i + 1}>{m}</option>)}
                      </Select>
                      <Select name="dobYear" placeholder="Year" value={formData.dobYear}
                        onChange={handleChange} size="lg" fontFamily="'Poppins', sans-serif"
                        borderColor={borderColor} sx={selectSx}>
                        {years.map(y => <option key={y} value={y}>{y}</option>)}
                      </Select>
                    </HStack>
                  </FormControl>

                  {/* Gender */}
                  <FormControl>
                    <FormLabel fontFamily="'Poppins', sans-serif" fontSize="sm" color="gray.700">Gender</FormLabel>
                    <Select name="gender" placeholder="Select your gender" value={formData.gender}
                      onChange={handleChange} size="lg" fontFamily="'Poppins', sans-serif"
                      borderColor={borderColor} sx={selectSx}>
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
                <FormLabel fontFamily="'Poppins', sans-serif" fontSize="sm" mb={1} color="gray.700">
                  {isRegister ? 'Mobile number or email address' : 'Email address'}
                </FormLabel>
                <Input
                  name="email"
                  type="email"
                  placeholder={isRegister ? 'Mobile number or email address' : 'Email address or phone number'}
                  value={formData.email}
                  onChange={handleChange}
                  required
                  size="lg"
                  fontFamily="'Poppins', sans-serif"
                  bg="gray.50"
                  border="1px solid"
                  borderColor="gray.300"
                  borderRadius="lg"
                  _focus={{
                    borderColor: 'brand.500',
                    boxShadow: '0 0 0 1px #7c3aed',
                    bg: 'white',
                  }}
                  _hover={{ borderColor: 'gray.400' }}
                  color="black"
                />
              </FormControl>

              {/* Password */}
              <FormControl>
                <FormLabel fontFamily="'Poppins', sans-serif" fontSize="sm" mb={1} color="gray.700">
                  Password
                </FormLabel>
                <InputGroup>
                  <Input
                    name="password"
                    type={showPw ? 'text' : 'password'}
                    placeholder="Password"
                    value={formData.password}
                    onChange={handleChange}
                    required
                    size="lg"
                    pr="48px"
                    fontFamily="'Poppins', sans-serif"
                    bg="gray.50"
                    border="1px solid"
                    borderColor="gray.300"
                    borderRadius="lg"
                    _focus={{
                      borderColor: 'brand.500',
                      boxShadow: '0 0 0 1px #7c3aed',
                      bg: 'white',
                    }}
                    _hover={{ borderColor: 'gray.400' }}
                    color="black"
                  />
                  <InputRightElement h="full">
                    <IconButton aria-label={showPw ? 'Hide' : 'Show'} icon={showPw ? <MdVisibilityOff size={18} /> : <MdVisibility size={18} />}
                      size="sm" variant="ghost" borderRadius="full" onClick={() => setShowPw(v => !v)} />
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
                borderRadius="lg"
                bg="brand.500"
                color="white"
                _hover={{ bg: 'brand.600', transform: 'translateY(-1px)', boxShadow: '0 4px 14px rgba(124,58,237,0.4)' }}
                _active={{ bg: 'brand.700', transform: 'translateY(0)' }}
                transition="all 0.2s ease"
                mt={2}
              >
                {isRegister ? 'Sign Up' : 'Log In'}
              </Button>

              {/* Forgot password (login only) */}
              {!isRegister && (
                <Link
                  href="#"
                  fontSize="sm"
                  color="brand.500"
                  fontWeight="600"
                  fontFamily="'Poppins', sans-serif"
                  textAlign="center"
                  _hover={{ textDecoration: 'underline' }}
                  display="block"
                >
                  Forgotten password?
                </Link>
              )}

              {/* Divider */}
              <Flex align="center" my={1}>
                <Divider borderColor="gray.200" />
              </Flex>

              {/* Switch mode button */}
              <Button
                onClick={() => switchMode(!isRegister)}
                size="lg"
                w="100%"
                fontFamily="'Poppins', sans-serif"
                fontWeight="700"
                fontSize="md"
                borderRadius="lg"
                variant="outline"
                borderColor="brand.500"
                color="brand.500"
                _hover={{
                  bg: 'brand.50',
                  transform: 'translateY(-1px)',
                }}
                _active={{ transform: 'translateY(0)' }}
                transition="all 0.2s ease"
              >
                {isRegister ? 'Already have an account? Log in' : 'Create new account'}
              </Button>
            </VStack>
          </Box>

          {isRegister && (
            <Text fontSize="xs" color={subtleText} mt={6} lineHeight="1.6" fontFamily="'Poppins', sans-serif" textAlign="center">
              By tapping Sign Up, you agree to our{' '}
              <Link href="#" color={subtleText} textDecoration="underline">Terms</Link>,{' '}
              <Link href="#" color={subtleText} textDecoration="underline">Privacy Policy</Link> and{' '}
              <Link href="#" color={subtleText} textDecoration="underline">Community Rules</Link>.
            </Text>
          )}
        </Box>
      </Flex>
    </Flex>
  );
}
