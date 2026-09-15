import { useEffect, useState } from 'react';
import { useAuth } from '../Context/useAuth';
import { useNavigate, Link as RouterLink } from 'react-router-dom';
import { useColorMode } from '@chakra-ui/react';
import {
  Box, Flex, VStack, HStack, Heading, Text, Button, Input,
  FormControl, FormLabel, InputGroup, InputLeftElement,
  InputRightElement, IconButton, Link, Divider,
  Image, useToast,
} from '@chakra-ui/react';
import { MdLock, MdEmail, MdPerson, MdVisibility, MdVisibilityOff, MdMenuBook, MdArrowForward } from 'react-icons/md';

export default function Auth() {
  const { login, register, isAuthenticated } = useAuth();
  const { colorMode } = useColorMode();
  const navigate = useNavigate();
  const toast = useToast();
  const isDark = colorMode === 'dark';

  const [isRegister, setIsRegister] = useState(false);
  const [showPw, setShowPw] = useState(false);
  const [formData, setFormData] = useState({ username: '', email: '', password: '', role: 'user' });
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
      const res = await register(formData.username, formData.email, formData.password);
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

  const switchMode = (toReg) => { setIsRegister(toReg); setFormData({ username: '', email: '', password: '', role: 'user' }); };
  const iconColor = isDark ? '#666' : '#aaa';
  const subtleText = 'gray.500';

  return (
    <Flex flex="1" align="center" justify="center" py={12} px={4}>
      <Box w="100%" maxW="420px">
        <VStack spacing={2} mb={8} align="flex-start">
          <HStack spacing={3} mb={2}>
            <Image src="/logo.svg" alt="Wild Diary" boxSize="40px" />
            <Text fontWeight="800" fontSize="xl" fontFamily="'Poppins', sans-serif" color={isDark ? 'white' : 'black'}>
              Wild Diary
            </Text>
          </HStack>
          <Heading fontSize="2xl" fontWeight="800" fontFamily="'Poppins', sans-serif">
            {isRegister ? 'Create an account' : 'Sign in to your diary'}
          </Heading>
          <Text color={subtleText} fontSize="sm" fontFamily="'Poppins', sans-serif">
            {isRegister ? 'Join thousands sharing and healing together.' : 'A safe, supportive space to share struggles.'}
          </Text>
        </VStack>

        <Box as="form" onSubmit={handleSubmit}>
          <VStack spacing={4} align="stretch">
            {isRegister && (
              <FormControl>
                <FormLabel fontFamily="'Poppins', sans-serif" fontSize="sm">Username</FormLabel>
                <InputGroup>
                  <InputLeftElement pointerEvents="none" h="full"><MdPerson size={18} color={iconColor} /></InputLeftElement>
                  <Input name="username" placeholder="e.g. HopefulBear" value={formData.username} onChange={handleChange}
                    required size="lg" pl="42px" fontFamily="'Poppins', sans-serif" />
                </InputGroup>
              </FormControl>
            )}
            <FormControl>
              <FormLabel fontFamily="'Poppins', sans-serif" fontSize="sm">Email address</FormLabel>
              <InputGroup>
                <InputLeftElement pointerEvents="none" h="full"><MdEmail size={18} color={iconColor} /></InputLeftElement>
                <Input name="email" type="email" placeholder="you@example.com" value={formData.email}
                  onChange={handleChange} required size="lg" pl="42px" fontFamily="'Poppins', sans-serif" />
              </InputGroup>
            </FormControl>
            <FormControl>
              <FormLabel fontFamily="'Poppins', sans-serif" fontSize="sm">Password</FormLabel>
              <InputGroup>
                <InputLeftElement pointerEvents="none" h="full"><MdLock size={18} color={iconColor} /></InputLeftElement>
                <Input name="password" type={showPw ? 'text' : 'password'} placeholder="••••••••" value={formData.password}
                  onChange={handleChange} required size="lg" pl="42px" pr="48px" fontFamily="'Poppins', sans-serif" />
                <InputRightElement h="full">
                  <IconButton aria-label={showPw ? 'Hide' : 'Show'} icon={showPw ? <MdVisibilityOff size={18} /> : <MdVisibility size={18} />}
                    size="sm" variant="ghost" borderRadius="full" onClick={() => setShowPw(v => !v)} />
                </InputRightElement>
              </InputGroup>
            </FormControl>
            <Button type="submit" size="lg" isLoading={loading} loadingText="Please wait…" w="100%"
              fontFamily="'Poppins', sans-serif" fontWeight="700" borderRadius="full"
              rightIcon={!loading ? <MdArrowForward size={18} /> : undefined} mt={2}>
              {isRegister ? 'Create Account' : 'Sign In'}
            </Button>
            <Text fontSize="sm" color={subtleText} textAlign="center" fontFamily="'Poppins', sans-serif">
              {isRegister ? (
                <>Already have an account?{' '}<Link as="button" type="button" color="brand.500" fontWeight="700" onClick={() => switchMode(false)} fontFamily="'Poppins', sans-serif">Sign in</Link></>
              ) : (
                <>New to Wild Diary?{' '}<Link as="button" type="button" color="brand.500" fontWeight="700" onClick={() => switchMode(true)} fontFamily="'Poppins', sans-serif">Create an account</Link></>
              )}
            </Text>
            <HStack><Divider /><Text fontSize="xs" color={subtleText} px={2} flexShrink={0}>or</Text><Divider /></HStack>
            <Button as={RouterLink} to="/feed" size="lg" variant="outline" w="100%"
              fontFamily="'Poppins', sans-serif" fontWeight="600" borderRadius="full" leftIcon={<MdMenuBook size={18} />}>
              Browse as Guest
            </Button>
          </VStack>
        </Box>
      </Box>
    </Flex>
  );
}
