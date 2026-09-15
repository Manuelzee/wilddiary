import { useState } from 'react';
import { Link as RouterLink, useNavigate } from 'react-router-dom';
import { useAuth } from '../Context/useAuth';
import { usePosts } from '../Context/usePosts';
import { useColorMode } from '@chakra-ui/react';
import {
  Box, Flex, HStack, Text, Badge, Button, Alert,
  AlertIcon, AlertDescription,
} from '@chakra-ui/react';
import { MdFavoriteBorder, MdFavorite, MdChatBubbleOutline, MdOutlineFlag, MdAutoAwesome, MdPerson } from 'react-icons/md';
import { BsShieldExclamation } from 'react-icons/bs';

const CATEGORY_COLORS = {
  emotional:    { scheme: 'purple' },
  financial:    { scheme: 'yellow' },
  relationship: { scheme: 'pink' },
  social:       { scheme: 'blue' },
  other:        { scheme: 'gray' },
};

export default function PostCard({ post }) {
  const { reactPost, reportPost } = usePosts();
  const { isAuthenticated } = useAuth();
  const { colorMode } = useColorMode();
  const navigate = useNavigate();
  const isDark = colorMode === 'dark';

  const [likeCount, setLikeCount] = useState(post.reactions_count || 0);
  const [liked, setLiked] = useState(post.liked_by_me || false);
  const [status, setStatus] = useState(post.status || 'active');
  const [revealBlurred, setRevealBlurred] = useState(false);
  const [reporting, setReporting] = useState(false);

  const handleLike = async (e) => {
    e.preventDefault(); e.stopPropagation();
    if (!isAuthenticated) { navigate('/auth'); return; }
    setLiked(!liked);
    setLikeCount(liked ? likeCount - 1 : likeCount + 1);
    const res = await reactPost(post.id);
    if (!res.success) { setLiked(liked); setLikeCount(likeCount); }
  };

  const handleReport = async (e) => {
    e.preventDefault(); e.stopPropagation();
    if (!isAuthenticated) { navigate('/auth'); return; }
    const reason = prompt('Why are you reporting this post?');
    if (!reason) return;
    setReporting(true);
    const res = await reportPost(post.id, reason);
    if (res.success) { setStatus('under_review'); alert('Post is now under review.'); }
    setReporting(false);
  };

  const isCounselor = post.author_role === 'counselor';
  const isUnderReview = status === 'under_review';
  const catColor = CATEGORY_COLORS[post.category?.toLowerCase()] || CATEGORY_COLORS.other;
  const borderColor = isCounselor
    ? (isDark ? 'green.800' : 'green.200')
    : (isDark ? 'whiteAlpha.100' : 'gray.200');
  const cardBg = isCounselor
    ? (isDark ? 'rgba(22,101,52,0.08)' : 'rgba(240,253,244,0.9)')
    : (isDark ? 'rgba(255,255,255,0.03)' : 'white');

  return (
    <Box
      p={6} border="1px solid" borderColor={borderColor} borderRadius="2xl" bg={cardBg}
      textAlign="left" transition="border-color 0.2s, background 0.2s"
      _hover={{ borderColor: isCounselor ? (isDark ? 'green.600' : 'green.400') : (isDark ? 'whiteAlpha.300' : 'gray.300') }}
      fontFamily="'Poppins', sans-serif"
    >
      {/* Header */}
      <Flex justify="space-between" align="flex-start">
        <HStack spacing={3}>
          <Box
            p={2} borderRadius="xl"
            bg={isCounselor ? (isDark ? 'green.900' : 'green.50') : (isDark ? 'whiteAlpha.100' : 'gray.100')}
            color={isCounselor ? 'green.400' : (isDark ? 'gray.400' : 'gray.500')}
          >
            <MdPerson size={20} />
          </Box>
          <Box>
            <HStack spacing={2}>
              <Text fontWeight="700" fontSize="sm">{post.author_name}</Text>
              {isCounselor && <Badge colorScheme="green" borderRadius="full" fontSize="9px" fontFamily="'Poppins', sans-serif">✓ Counselor</Badge>}
            </HStack>
            <Text fontSize="xs" color={isDark ? 'gray.500' : 'gray.400'} fontFamily="'Poppins', sans-serif">
              {new Date(post.created_at).toLocaleDateString(undefined, { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' })}
            </Text>
          </Box>
        </HStack>
        <Badge colorScheme={catColor.scheme} borderRadius="md" fontSize="xs" fontFamily="'Poppins', sans-serif" textTransform="capitalize">
          {post.category}
        </Badge>
      </Flex>

      {/* Content */}
      <Box mt={4}>
        {isUnderReview && (
          <Alert status="warning" borderRadius="xl" mb={3} fontSize="sm">
            <AlertIcon />
            <AlertDescription fontFamily="'Poppins', sans-serif">
              <Text fontWeight="700" fontSize="xs">Content Under Moderation Review</Text>
              <Text fontSize="xs" color={isDark ? 'gray.400' : 'gray.600'}>This post has been reported and is under safety review.</Text>
              {!revealBlurred && (
                <Button variant="link" size="xs" color="orange.400" fontFamily="'Poppins', sans-serif"
                  onClick={(e) => { e.preventDefault(); e.stopPropagation(); setRevealBlurred(true); }}>
                  Reveal content anyway
                </Button>
              )}
            </AlertDescription>
          </Alert>
        )}
        <Text
          fontSize="15px" lineHeight="1.7" whiteSpace="pre-wrap"
          color={isDark ? 'gray.300' : 'gray.700'} fontFamily="'Poppins', sans-serif"
          filter={isUnderReview && !revealBlurred ? 'blur(4px)' : 'none'}
          userSelect={isUnderReview && !revealBlurred ? 'none' : 'auto'}
          pointerEvents={isUnderReview && !revealBlurred ? 'none' : 'auto'}
          transition="filter 0.3s"
        >
          {post.content}
        </Text>
      </Box>

      {/* Footer */}
      <Flex align="center" justify="space-between" mt={5} pt={4}
        borderTop="1px solid" borderColor={isDark ? 'whiteAlpha.100' : 'gray.100'}
        fontSize="sm" color={isDark ? 'gray.400' : 'gray.500'}>
        <HStack spacing={5}>
          <Box as="button" onClick={handleLike} display="flex" alignItems="center" gap="6px"
            fontWeight={liked ? '700' : '500'} color={liked ? 'brand.500' : undefined}
            bg="none" border="none" cursor="pointer" fontFamily="'Poppins', sans-serif"
            _hover={{ color: 'brand.400' }} transition="color 0.2s, transform 0.15s" _active={{ transform: 'scale(0.95)' }}>
            {liked ? <MdFavorite size={18} color="#7c3aed" /> : <MdFavoriteBorder size={18} />}
            <Text as="span">{likeCount} {liked ? 'Supported' : 'Support'}</Text>
          </Box>

          <Box as={RouterLink} to={`/post/${post.id}`} display="flex" alignItems="center" gap="6px"
            textDecoration="none" color={isDark ? 'gray.400' : 'gray.500'} fontFamily="'Poppins', sans-serif"
            _hover={{ color: 'brand.400' }} transition="color 0.2s" onClick={(e) => e.stopPropagation()}>
            <MdChatBubbleOutline size={18} />
            <Text as="span">{post.comments_count || 0} Comments</Text>
          </Box>

          {post.has_ai_insight && (
            <Badge colorScheme="blue" borderRadius="md" fontSize="10px" display="flex" alignItems="center" gap="4px" fontFamily="'Poppins', sans-serif">
              <MdAutoAwesome size={12} /> AI Response
            </Badge>
          )}
        </HStack>

        {status !== 'under_review' && (
          <Box as="button" onClick={handleReport} display="flex" alignItems="center" gap="4px"
            fontSize="xs" fontWeight="600" bg="none" border="none"
            cursor={reporting ? 'not-allowed' : 'pointer'} opacity={reporting ? 0.5 : 1}
            color={isDark ? 'gray.500' : 'gray.400'} fontFamily="'Poppins', sans-serif"
            _hover={{ color: 'red.400' }} transition="color 0.2s">
            <MdOutlineFlag size={15} />
            <Text as="span">Report</Text>
          </Box>
        )}
      </Flex>
    </Box>
  );
}
