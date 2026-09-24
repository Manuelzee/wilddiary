import { Component } from 'react';
import { Box, Button, Flex, Heading, Text, VStack } from '@chakra-ui/react';
import { MdRefresh, MdHome, MdErrorOutline } from 'react-icons/md';

export default class ErrorBoundary extends Component {
  constructor(props) {
    super(props);
    this.state = { hasError: false, error: null };
  }

  static getDerivedStateFromError(error) {
    return { hasError: true, error };
  }

  componentDidCatch(error, errorInfo) {
    console.error('Unhandled Wild Diary component error:', error, errorInfo);
  }

  handleReload = () => {
    window.location.reload();
  };

  handleHome = () => {
    window.location.href = '/';
  };

  render() {
    if (this.state.hasError) {
      return (
        <Flex
          minH="100dvh"
          w="100%"
          align="center"
          justify="center"
          p={6}
          bg="#18191a"
          color="white"
          fontFamily="'Poppins', sans-serif"
        >
          <Box
            maxW="480px"
            w="100%"
            p={8}
            borderRadius="2xl"
            bg="#242526"
            border="1px solid rgba(255,255,255,0.1)"
            boxShadow="0 20px 40px rgba(0,0,0,0.5)"
            textAlign="center"
          >
            <Flex
              w="56px"
              h="56px"
              borderRadius="full"
              bg="rgba(239,68,68,0.15)"
              color="#ef4444"
              align="center"
              justify="center"
              mx="auto"
              mb={4}
            >
              <MdErrorOutline size={32} />
            </Flex>

            <Heading size="md" mb={2} color="white">
              Something went wrong
            </Heading>

            <Text fontSize="sm" color="gray.400" mb={6} lineHeight="1.6">
              A temporary issue occurred while rendering this page. You can reload the page or return to the safe harbor.
            </Text>

            <VStack spacing={3}>
              <Button
                leftIcon={<MdRefresh size={18} />}
                colorScheme="purple"
                w="100%"
                borderRadius="full"
                onClick={this.handleReload}
                fontWeight="700"
              >
                Reload Page
              </Button>
              <Button
                leftIcon={<MdHome size={18} />}
                variant="ghost"
                w="100%"
                borderRadius="full"
                color="gray.300"
                _hover={{ bg: 'whiteAlpha.100' }}
                onClick={this.handleHome}
              >
                Return to Home
              </Button>
            </VStack>
          </Box>
        </Flex>
      );
    }

    return this.props.children;
  }
}
