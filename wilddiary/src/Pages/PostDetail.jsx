import { useEffect, useState } from 'react';
import { useParams, useNavigate, Link as RouterLink } from 'react-router-dom';
import { usePosts } from '../Context/usePosts';
import { useAuth } from '../Context/useAuth';
import { useColorMode, useToast, IconButton, Tooltip } from '@chakra-ui/react';
import {
  Box, Flex, VStack, HStack, Heading, Text, Button, Textarea,
  FormControl, Badge, Switch, Spinner, Link,
} from '@chakra-ui/react';
import { MdArrowBack, MdPerson, MdChatBubbleOutline, MdSend, MdAutoAwesome, MdDeleteOutline, MdFlag } from 'react-icons/md';
import { BsShieldExclamation } from 'react-icons/bs';

const TOXIC_WORDS = ["kill yourself", "kys", "hate you", "stupid", "idiot", "retard", "moron", "trash", "die", "suicide", "ugly"];

export default function PostDetail() {
  const { id } = useParams();
  const navigate = useNavigate();
  const toast = useToast();
  const { getPostDetail, getComments, addComment, getAiInsight, deletePost, deleteComment, reportComment } = usePosts();
  const { isAuthenticated, user } = useAuth();
  const { colorMode } = useColorMode();
  const isDark = colorMode === 'dark';

  const [post, setPost] = useState(null);
  const [comments, setComments] = useState([]);
  const [loading, setLoading] = useState(true);
  const [errorMsg, setErrorMsg] = useState(null);
  const [commentText, setCommentText] = useState('');
  const [isAnonymous, setIsAnonymous] = useState(false);
  const [submittingComment, setSubmittingComment] = useState(false);
  const [commentWarning, setCommentWarning] = useState('');
  const [fetchingAi, setFetchingAi] = useState(false);
  const [aiInsight, setAiInsight] = useState(null);

  useEffect(() => {
    let active = true;
    Promise.all([getPostDetail(id), getComments(id)])
      .then(([postData, commentData]) => {
        if (!active) return;
        setPost(postData);
        setAiInsight(postData?.ai_insight || null);
        setComments(Array.isArray(commentData) ? commentData : []);
      })
      .catch((error) => { if (active) setErrorMsg(error.message || 'Failed to load diary details.'); })
      .finally(() => { if (active) setLoading(false); });
    return () => { active = false; };
  // API functions come from context; the route id is the request identity.
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [id]);

  const handleCommentTextChange = (e) => {
    const val = e.target.value;
    setCommentText(val);
    const lower = val.toLowerCase();
    setCommentWarning(TOXIC_WORDS.some((w) => lower.includes(w))
      ? '⚠️ Trigger words detected. Your comment will be flagged for moderation.' : '');
  };

  const handleCommentSubmit = async (e) => {
    e.preventDefault();
    if (!commentText.trim() || submittingComment) return;
    setSubmittingComment(true);
    const res = await addComment(post.id, commentText, isAnonymous);
    if (res.success) {
      setCommentText(''); setIsAnonymous(false); setCommentWarning('');
      const updatedComments = await getComments(post.id);
      setComments(Array.isArray(updatedComments) ? updatedComments : []);
      if (res.data?.moderated) {
        toast({ title: 'Reply submitted', description: 'Your reply has been flagged for safety review.', status: 'warning', duration: 4000, isClosable: true });
      } else {
        toast({ title: 'Reply added', status: 'success', duration: 3000, isClosable: true });
      }
    } else {
      toast({ title: 'Failed to submit comment', description: res.error, status: 'error', duration: 4000, isClosable: true });
    }
    setSubmittingComment(false);
  };

  const handleDeletePost = async () => {
    if (!window.confirm('Are you sure you want to delete this diary post?')) return;
    const res = await deletePost(post.id);
    if (res.success) {
      toast({ title: 'Post deleted.', status: 'success', duration: 3000, isClosable: true });
      navigate('/feed');
    } else {
      toast({ title: 'Failed to delete post', description: res.error, status: 'error' });
    }
  };

  const handleDeleteComment = async (commentId) => {
    if (!window.confirm('Are you sure you want to delete this reply?')) return;
    const res = await deleteComment(post.id, commentId);
    if (res.success) {
      setComments(prev => prev.filter(c => c.id !== commentId));
      toast({ title: 'Reply deleted.', status: 'success', duration: 3000, isClosable: true });
    } else {
      toast({ title: 'Failed to delete reply', description: res.error, status: 'error' });
    }
  };

  const handleReportComment = async (commentId) => {
    const reason = window.prompt('Please enter the reason for reporting this reply:', 'Community guidelines violation');
    if (!reason || !reason.trim()) return;
    const res = await reportComment(post.id, commentId, reason.trim());
    if (res.success) {
      toast({ title: 'Report received.', description: 'Our moderation team will review this reply.', status: 'info', duration: 3000, isClosable: true });
      setComments(await getComments(post.id));
    } else {
      toast({ title: 'Report failed', description: res.error, status: 'error' });
    }
  };

  const handleRequestAiInsight = async () => {
    if (fetchingAi) return;
    setFetchingAi(true);
    const res = await getAiInsight(post.id);
    if (res.success) {
      setAiInsight(res.insight);
      setPost(await getPostDetail(id));
      toast({ title: 'AI insight generated', status: 'success', duration: 3000, isClosable: true });
    } else {
      toast({ title: 'AI insight retrieval failed', description: res.error, status: 'error' });
    }
    setFetchingAi(false);
  };

  const borderColor = isDark ? 'whiteAlpha.100' : 'gray.200';
  const cardBg = isDark ? 'whiteAlpha.50' : 'gray.50';
  const subtleText = isDark ? 'gray.400' : 'gray.500';

  if (loading) {
    return (
      <Flex flex="1" align="center" justify="center" direction="column" py={20} gap={4} fontFamily="'Poppins', sans-serif">
        <Spinner size="lg" color="brand.500" />
        <Text color={subtleText}>Loading diary details…</Text>
      </Flex>
    );
  }

  if (errorMsg || !post) {
    return (
      <Flex flex="1" direction="column" align="center" justify="center" maxW="2xl" mx="auto" px={4} py={16} textAlign="center" gap={4} fontFamily="'Poppins', sans-serif">
        <Box fontSize="3xl" color="red.400"><BsShieldExclamation size={48} /></Box>
        <Heading size="md" fontFamily="'Poppins', sans-serif">Diary Not Available</Heading>
        <Text color={subtleText} fontSize="sm">{errorMsg || 'This diary does not exist or has been removed.'}</Text>
        <Button as={RouterLink} to="/feed" variant="outline" borderRadius="full" fontFamily="'Poppins', sans-serif">Return to Feed</Button>
      </Flex>
    );
  }

  const isCounselor = post.author_role === 'counselor';

  return (
    <Box flex="1" maxW="4xl" mx="auto" w="100%" px={4} py={8} textAlign="left" fontFamily="'Poppins', sans-serif">
      <Button as={RouterLink} to="/feed" variant="ghost" size="sm" mb={6}
        leftIcon={<MdArrowBack size={18} />} borderRadius="full" fontFamily="'Poppins', sans-serif" fontWeight="600">
        Back to Feed
      </Button>

      <VStack spacing={6} align="stretch">
        {/* Main Post */}
        <Box p={6} border="1px solid"
          borderColor={isCounselor ? (isDark ? 'green.800' : 'green.200') : borderColor}
          bg={isCounselor ? (isDark ? 'rgba(22,101,52,0.08)' : 'rgba(240,253,244,0.9)') : cardBg}
          borderRadius="2xl">
          <Flex justify="space-between" align="flex-start">
            <HStack spacing={3}>
              <Box p={2} borderRadius="xl"
                bg={isCounselor ? (isDark ? 'green.900' : 'green.50') : (isDark ? 'whiteAlpha.100' : 'gray.100')}
                color={isCounselor ? 'green.400' : (isDark ? 'gray.400' : 'gray.500')}>
                <MdPerson size={20} />
              </Box>
              <Box>
                <HStack spacing={2}>
                  <Text fontWeight="700" fontSize="sm" fontFamily="'Poppins', sans-serif">{post.author_name}</Text>
                  {isCounselor && <Badge colorScheme="green" borderRadius="full" fontSize="9px" fontFamily="'Poppins', sans-serif">✓ Counselor</Badge>}
                </HStack>
                <Text fontSize="xs" color={subtleText} fontFamily="'Poppins', sans-serif">
                  {new Date(post.created_at).toLocaleDateString(undefined, { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' })}
                </Text>
              </Box>
            </HStack>
            <HStack spacing={2}>
              <Badge colorScheme="purple" borderRadius="md" fontSize="xs" fontFamily="'Poppins', sans-serif" textTransform="capitalize">{post.category}</Badge>
              {user && (post.user_id === user.id || user.role === 'admin') && (
                <Tooltip label="Delete diary post" hasArrow>
                  <IconButton
                    aria-label="Delete diary post"
                    icon={<MdDeleteOutline size={18} />}
                    size="xs"
                    variant="ghost"
                    colorScheme="red"
                    onClick={handleDeletePost}
                  />
                </Tooltip>
              )}
            </HStack>
          </Flex>
          <Text mt={4} fontSize="lg" lineHeight="1.8" whiteSpace="pre-wrap" fontFamily="'Poppins', sans-serif">{post.content}</Text>
        </Box>

        {/* AI Insight */}
        <Box p={6} border="1px solid" borderColor={isDark ? 'blue.800' : 'blue.200'}
          bg={isDark ? 'rgba(59,130,246,0.06)' : 'rgba(239,246,255,0.9)'}
          borderRadius="2xl" position="relative" overflow="hidden">
          <Box position="absolute" right={0} top={0} w={24} h={24} bg={isDark ? 'blue.500' : 'blue.100'} opacity={0.15} filter="blur(40px)" pointerEvents="none" />
          <HStack mb={3} color="blue.400" fontWeight="700" fontFamily="'Poppins', sans-serif">
            <MdAutoAwesome size={20} />
            <Text fontFamily="'Poppins', sans-serif">Supportive AI Advisor</Text>
          </HStack>
          {aiInsight ? (
            <Text fontSize="sm" lineHeight="1.8" color={isDark ? 'gray.300' : 'gray.700'} fontStyle="italic" fontFamily="'Poppins', sans-serif">
              "{aiInsight.startsWith('AI Insight: ') ? aiInsight.slice(12) : aiInsight}"
            </Text>
          ) : (
            <VStack align="flex-start" spacing={3}>
              <Text fontSize="xs" color={subtleText} fontFamily="'Poppins', sans-serif">
                Would you like an immediate, empathetic AI perspective to guide you or reflect on this struggle?
              </Text>
              {isAuthenticated ? (
                <Button onClick={handleRequestAiInsight} isLoading={fetchingAi} loadingText="Generating…"
                  size="sm" colorScheme="blue" borderRadius="full" leftIcon={<MdAutoAwesome size={14} />}
                  fontFamily="'Poppins', sans-serif" fontWeight="700">
                  Get AI Insight
                </Button>
              ) : (
                <Text fontSize="xs" color="orange.400" fontWeight="600" fontFamily="'Poppins', sans-serif">
                  Please sign in to access AI advisor features.
                </Text>
              )}
            </VStack>
          )}
        </Box>

        {/* Comments */}
        <Box>
          <HStack mb={4} spacing={2}>
            <MdChatBubbleOutline size={20} color={isDark ? '#555' : '#aaa'} />
            <Heading size="md" fontFamily="'Poppins', sans-serif" fontWeight="800">Replies ({comments.length})</Heading>
          </HStack>

          <VStack spacing={3} align="stretch" mb={6}>
            {comments.length === 0 ? (
              <Flex align="center" justify="center" py={10}
                border="2px dashed" borderColor={borderColor} borderRadius="2xl" textAlign="center">
                <Text color={subtleText} fontSize="sm" fontFamily="'Poppins', sans-serif">No replies yet. Be the first to share support.</Text>
              </Flex>
            ) : (
              comments.map((comment) => {
                const isComCounselor = comment.author_role === 'counselor';
                const isComUnderReview = comment.status === 'under_review';
                return (
                  <Box key={comment.id} p={4} border="1px solid"
                    borderColor={isComCounselor ? (isDark ? 'green.800' : 'green.200') : borderColor}
                    bg={isComCounselor ? (isDark ? 'rgba(22,101,52,0.06)' : 'rgba(240,253,244,0.8)') : cardBg}
                    borderRadius="xl" textAlign="left">
                    <Flex justify="space-between" align="center" mb={2}>
                      <HStack spacing={2}>
                        <Text fontWeight="700" fontSize="sm" color={isComCounselor ? 'green.400' : undefined} fontFamily="'Poppins', sans-serif">
                          {comment.author_name}
                        </Text>
                        {isComCounselor && <Badge colorScheme="green" borderRadius="full" fontSize="8px" fontFamily="'Poppins', sans-serif">✓ Counselor</Badge>}
                      </HStack>
                      <HStack spacing={1}>
                        <Text fontSize="xs" color={subtleText} fontFamily="'Poppins', sans-serif">
                          {new Date(comment.created_at).toLocaleDateString(undefined, { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' })}
                        </Text>
                        {user && (comment.user_id === user.id || post.user_id === user.id || user.role === 'admin') && (
                          <Tooltip label="Delete reply" hasArrow>
                            <IconButton
                              aria-label="Delete reply"
                              icon={<MdDeleteOutline size={14} />}
                              size="xs"
                              variant="ghost"
                              colorScheme="red"
                              onClick={() => handleDeleteComment(comment.id)}
                            />
                          </Tooltip>
                        )}
                        {user && comment.user_id !== user.id && (
                          <Tooltip label="Report reply" hasArrow>
                            <IconButton
                              aria-label="Report reply"
                              icon={<MdFlag size={14} />}
                              size="xs"
                              variant="ghost"
                              colorScheme="gray"
                              onClick={() => handleReportComment(comment.id)}
                            />
                          </Tooltip>
                        )}
                      </HStack>
                    </Flex>
                    {isComUnderReview && (
                      <Text fontSize="xs" color="orange.400" fontWeight="600" mb={2} fontFamily="'Poppins', sans-serif">⚠️ This reply is under moderation review.</Text>
                    )}
                    <Text fontSize="14px" lineHeight="1.7" whiteSpace="pre-wrap" fontFamily="'Poppins', sans-serif"
                      filter={isComUnderReview ? 'blur(4px)' : 'none'} userSelect={isComUnderReview ? 'none' : 'auto'}>
                      {comment.content}
                    </Text>
                  </Box>
                );
              })
            )}
          </VStack>

          {/* Comment form */}
          <Box p={5} bg={cardBg} border="1px solid" borderColor={borderColor} borderRadius="2xl">
            {isAuthenticated ? (
              <Box as="form" onSubmit={handleCommentSubmit}>
                <Heading size="sm" mb={4} fontFamily="'Poppins', sans-serif" fontWeight="700">Reply to this Diary</Heading>
                {commentWarning && (
                  <Text fontSize="xs" color="orange.400" fontWeight="600" mb={3} p={2}
                    bg={isDark ? 'orange.900' : 'orange.50'} borderRadius="lg" fontFamily="'Poppins', sans-serif">
                    {commentWarning}
                  </Text>
                )}
                <FormControl mb={4}>
                  <Textarea rows={3} required
                    placeholder={user?.role === 'counselor' ? 'Write your professional counselor response…' : 'Write your supportive words…'}
                    value={commentText} onChange={handleCommentTextChange} resize="vertical"
                    fontFamily="'Poppins', sans-serif" fontSize="sm" borderRadius="xl" />
                </FormControl>
                <Flex justify="space-between" align="center" flexWrap="wrap" gap={3}>
                  <HStack spacing={2} cursor="pointer" onClick={() => setIsAnonymous(!isAnonymous)}
                    fontSize="xs" color={subtleText} fontFamily="'Poppins', sans-serif" fontWeight="600">
                    <Switch size="sm" isChecked={isAnonymous} onChange={(e) => setIsAnonymous(e.target.checked)} colorScheme="brand" />
                    <Text fontFamily="'Poppins', sans-serif">Reply anonymously</Text>
                  </HStack>
                  <Button type="submit" size="sm" isLoading={submittingComment} loadingText="Replying…"
                    isDisabled={!commentText.trim()} borderRadius="full"
                    rightIcon={<MdSend size={14} />} fontFamily="'Poppins', sans-serif" fontWeight="700">
                    Post Reply
                  </Button>
                </Flex>
              </Box>
            ) : (
              <Text fontSize="sm" textAlign="center" color={subtleText} fontFamily="'Poppins', sans-serif">
                You must be <Link as={RouterLink} to="/auth" color="brand.500" fontWeight="700">signed in</Link> to offer support or leave a comment.
              </Text>
            )}
          </Box>
        </Box>
      </VStack>
    </Box>
  );
}
