import { useState, useEffect } from 'react';
import { useNavigate, Link as RouterLink } from 'react-router-dom';
import { usePosts } from '../Context/usePosts';
import { useAuth } from '../Context/useAuth';
import { useColorMode } from '@chakra-ui/react';
import {
  Box, Flex, VStack, Heading, Text, Button, Textarea,
  FormControl, FormLabel, Select, Switch, HStack, Alert, AlertIcon,
  AlertDescription, Divider, useToast,
} from '@chakra-ui/react';
import { MdArrowBack, MdEditNote, MdSend, MdWarningAmber } from 'react-icons/md';

export default function CreatePost() {
  const { createPost } = usePosts();
  const { isAuthenticated } = useAuth();
  const { colorMode } = useColorMode();
  const navigate = useNavigate();
  const toast = useToast();
  const isDark = colorMode === 'dark';

  useEffect(() => {
    if (!isAuthenticated) navigate('/auth');
  }, [isAuthenticated, navigate]);

  const [content, setContent] = useState('');
  const [category, setCategory] = useState('emotional');
  const [isAnonymous, setIsAnonymous] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [safetyWarning, setSafetyWarning] = useState('');

  const TOXIC_WORDS = ["kill yourself", "kys", "hate you", "stupid", "idiot", "retard", "moron", "trash", "die", "suicide", "ugly", "worthless"];

  const handleContentChange = (e) => {
    const text = e.target.value;
    setContent(text);
    const lower = text.toLowerCase();
    setSafetyWarning(TOXIC_WORDS.some((w) => lower.includes(w))
      ? '⚠️ Trigger words detected. Your diary will be submitted, but may be blurred pending safety review.'
      : '');
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!content.trim() || submitting) return;
    setSubmitting(true);
    const res = await createPost(content, category, isAnonymous);
    if (res.success) {
      toast({
        title: res.data.moderated ? 'Submitted for moderation' : 'Diary published',
        description: res.data.moderated
          ? 'Your post was submitted and is pending safety review.'
          : 'Your diary post is now live in the community.',
        status: res.data.moderated ? 'warning' : 'success',
        duration: 4000,
        isClosable: true,
      });
      navigate('/feed');
    } else {
      toast({
        title: 'Post creation failed',
        description: res.error,
        status: 'error',
        duration: 4000,
        isClosable: true,
      });
    }
    setSubmitting(false);
  };

  const cardBg = isDark ? 'whiteAlpha.50' : 'gray.50';
  const borderColor = isDark ? 'whiteAlpha.100' : 'gray.200';

  return (
    <Box flex="1" maxW="2xl" mx="auto" w="100%" px={4} py={8} textAlign="left" fontFamily="'Poppins', sans-serif">
      {/* Back */}
      <Button
        as={RouterLink}
        to="/feed"
        variant="ghost"
        size="sm"
        mb={6}
        leftIcon={<MdArrowBack size={18} />}
        borderRadius="full"
        fontFamily="'Poppins', sans-serif"
        fontWeight="600"
      >
        Back to Feed
      </Button>

      <Box bg={cardBg} border="1px solid" borderColor={borderColor} p={8} borderRadius="2xl">
        {/* Header */}
        <HStack mb={6} spacing={3}>
          <Box p={2} bg={isDark ? 'whiteAlpha.100' : 'purple.50'} borderRadius="xl" color="brand.500">
            <MdEditNote size={28} />
          </Box>
          <Box>
            <Heading size="md" fontFamily="'Poppins', sans-serif" fontWeight="800">Write a Diary Post</Heading>
            <Text fontSize="xs" color={isDark ? 'gray.400' : 'gray.500'} fontFamily="'Poppins', sans-serif">
              Pour out what is on your mind. You are in a safe, supportive place.
            </Text>
          </Box>
        </HStack>

        {safetyWarning && (
          <Alert status="warning" borderRadius="xl" mb={4}>
            <AlertIcon />
            <AlertDescription fontSize="sm" fontFamily="'Poppins', sans-serif">{safetyWarning}</AlertDescription>
          </Alert>
        )}

        <Box as="form" onSubmit={handleSubmit}>
          <VStack spacing={5} align="stretch">
            <FormControl>
              <FormLabel fontFamily="'Poppins', sans-serif" fontWeight="600" fontSize="sm">
                Your Struggle / Thoughts
              </FormLabel>
              <Textarea
                id="content"
                rows={6}
                required
                placeholder="e.g. Lately I have been feeling really burnt out at work…"
                value={content}
                onChange={handleContentChange}
                resize="vertical"
                fontFamily="'Poppins', sans-serif"
                fontSize="sm"
                borderRadius="xl"
              />
            </FormControl>

            <HStack spacing={4} align="flex-start" flexWrap="wrap">
              <FormControl flex="1" minW="180px">
                <FormLabel fontFamily="'Poppins', sans-serif" fontWeight="600" fontSize="sm">Tag Category</FormLabel>
                <Select
                  value={category}
                  onChange={(e) => setCategory(e.target.value)}
                  fontFamily="'Poppins', sans-serif"
                  fontSize="sm"
                  borderRadius="xl"
                  sx={{ '& option': { bg: isDark ? '#000' : '#fff' } }}
                >
                  <option value="emotional">💜 Emotional / Mental Health</option>
                  <option value="financial">💰 Financial Difficulties</option>
                  <option value="relationship">🤝 Relationship Issues</option>
                  <option value="social">🌍 Social Isolation / Stress</option>
                  <option value="other">✏️ Other Struggles</option>
                </Select>
              </FormControl>

              <FormControl flex="1" minW="180px">
                <FormLabel fontFamily="'Poppins', sans-serif" fontWeight="600" fontSize="sm">Privacy Setting</FormLabel>
                <HStack
                  p={3}
                  bg={isDark ? 'whiteAlpha.50' : 'gray.100'}
                  borderRadius="xl"
                  border="1px solid"
                  borderColor={borderColor}
                  cursor="pointer"
                  onClick={() => setIsAnonymous(!isAnonymous)}
                  spacing={3}
                >
                  <Switch
                    isChecked={isAnonymous}
                    onChange={(e) => setIsAnonymous(e.target.checked)}
                    colorScheme="brand"
                    size="sm"
                  />
                  <Box textAlign="left">
                    <Text fontSize="xs" fontWeight="700" fontFamily="'Poppins', sans-serif">
                      Post Anonymously
                    </Text>
                    <Text fontSize="10px" color={isDark ? 'gray.500' : 'gray.400'} fontFamily="'Poppins', sans-serif">
                      Your profile handle will be hidden.
                    </Text>
                  </Box>
                </HStack>
              </FormControl>
            </HStack>

            <Flex justify="flex-end" pt={4} borderTop="1px solid" borderColor={borderColor}>
              <Button
                type="submit"
                isLoading={submitting}
                loadingText="Publishing…"
                isDisabled={!content.trim()}
                rightIcon={<MdSend size={16} />}
                borderRadius="full"
                fontFamily="'Poppins', sans-serif"
                fontWeight="700"
              >
                Publish Diary
              </Button>
            </Flex>
          </VStack>
        </Box>
      </Box>
    </Box>
  );
}
