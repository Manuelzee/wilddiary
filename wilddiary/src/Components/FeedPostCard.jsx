import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../Context/useAuth';
import { usePosts } from '../Context/usePosts';
import {
  Box, Flex, HStack, Text, Avatar, Badge, IconButton, Button,
  Divider, Menu, MenuButton, MenuList, MenuItem,
} from '@chakra-ui/react';
import {
  MdThumbUp, MdShare, MdMoreHoriz, MdPublic, MdLock,
  MdChat, MdFlag,
} from 'react-icons/md';

const CATEGORY_SCHEME = {
  emotional: 'purple', financial: 'yellow',
  relationship: 'pink', social: 'blue', other: 'gray',
};

const timeAgo = (date) => {
  const s = Math.floor((Date.now() - new Date(date)) / 1000);
  if (s < 60) return 'just now';
  const m = Math.floor(s / 60); if (m < 60) return `${m}m`;
  const h = Math.floor(m / 60); if (h < 24) return `${h}h`;
  return `${Math.floor(h / 24)}d`;
};

export default function FeedPostCard({ post, isDark }) {
  const { isAuthenticated } = useAuth();
  const { reactPost } = usePosts();
  const navigate = useNavigate();

  const [liked, setLiked] = useState(post.liked_by_me || false);
  const [likeCount, setLikeCount] = useState(post.reactions_count || 0);

  const handleLike = async () => {
    if (!isAuthenticated) { navigate('/auth'); return; }
    const isDemo = String(post.id).startsWith('demo-');
    setLiked(v => !v);
    setLikeCount(v => liked ? v - 1 : v + 1);
    if (!isDemo) {
      const res = await reactPost(post.id);
      if (!res?.success) { setLiked(v => !v); setLikeCount(v => liked ? v + 1 : v - 1); }
    }
  };

  const isDemo    = String(post.id).startsWith('demo-');
  const isCounselor = post.author_role === 'counselor';
  const cardBg    = isDark ? '#242526' : 'white';
  const textColor = isDark ? '#e4e6eb' : '#050505';
  const subtle    = isDark ? '#b0b3b8' : '#65676b';
  const border    = isDark ? 'rgba(255,255,255,0.1)' : '#e4e6eb';
  const hoverBg   = isDark ? 'rgba(255,255,255,0.06)' : '#f2f2f2';

  return (
    <Box
      bg={cardBg} border="1px solid" borderColor={border} borderRadius="xl"
      overflow="hidden" fontFamily="'Poppins', sans-serif"
      transition="box-shadow 0.2s"
      _hover={{ boxShadow: isDark ? '0 2px 16px rgba(0,0,0,0.4)' : '0 2px 16px rgba(0,0,0,0.1)' }}
    >
      {/* ─── Header ─── */}
      <Flex align="flex-start" justify="space-between" px={4} pt={4} pb={2}>
        <HStack spacing={3} align="flex-start">
          <Box position="relative" flexShrink={0}>
            <Avatar
              size="md"
              name={post.is_anonymous ? undefined : post.author_name}
              bg={isCounselor ? 'green.500' : post.is_anonymous ? 'gray.500' : 'brand.500'}
              color="white"
              fontFamily="'Poppins', sans-serif"
            />
            {isCounselor && (
              <Box
                position="absolute" bottom="-2px" right="-2px"
                bg="green.400" borderRadius="full" w="16px" h="16px"
                display="flex" alignItems="center" justifyContent="center"
                border="2px solid" borderColor={isDark ? '#242526' : 'white'}
                fontSize="8px" color="white" fontWeight="900"
              >
                ✓
              </Box>
            )}
          </Box>

          <Box>
            <HStack spacing={1} flexWrap="wrap" align="center">
              <Text fontWeight="700" fontSize="sm" color={textColor} fontFamily="'Poppins', sans-serif">
                {post.is_anonymous ? 'Anonymous' : post.author_name}
              </Text>
              {isCounselor && (
                <Badge colorScheme="green" fontSize="8px" borderRadius="full" px={2} fontFamily="'Poppins', sans-serif">
                  Counselor
                </Badge>
              )}
              {post.has_ai_insight && (
                <Badge colorScheme="blue" fontSize="8px" borderRadius="full" px={2} fontFamily="'Poppins', sans-serif">
                  AI
                </Badge>
              )}
            </HStack>
            <HStack spacing={1} align="center">
              <Text fontSize="xs" color={subtle} fontFamily="'Poppins', sans-serif">{timeAgo(post.created_at)}</Text>
              <Text fontSize="xs" color={subtle}>·</Text>
              {post.is_anonymous
                ? <MdLock size={12} color={subtle} />
                : <MdPublic size={12} color={subtle} />
              }
              <Badge
                ml={1} fontSize="8px" borderRadius="full" textTransform="capitalize"
                colorScheme={CATEGORY_SCHEME[post.category?.toLowerCase()] || 'gray'}
                fontFamily="'Poppins', sans-serif"
              >
                {post.category}
              </Badge>
            </HStack>
          </Box>
        </HStack>

        <Menu>
          <MenuButton
            as={IconButton}
            icon={<MdMoreHoriz size={20} />}
            variant="ghost" borderRadius="full" size="sm"
            aria-label="Post options" _hover={{ bg: hoverBg }}
          />
          <MenuList bg={isDark ? '#3a3b3c' : 'white'} borderColor={border} minW="180px">
            <MenuItem
              icon={<MdFlag size={16} />} color="red.400"
              fontFamily="'Poppins', sans-serif" fontSize="sm"
              _hover={{ bg: isDark ? 'whiteAlpha.100' : 'gray.50' }}
            >
              Report post
            </MenuItem>
          </MenuList>
        </Menu>
      </Flex>

      {/* ─── Content ─── */}
      <Box px={4} pb={3}>
        <Text
          fontSize="sm" lineHeight="1.75" color={textColor}
          whiteSpace="pre-wrap" fontFamily="'Poppins', sans-serif"
        >
          {post.content}
        </Text>
      </Box>

      {/* ─── Reaction summary ─── */}
      {likeCount > 0 && (
        <Box px={4} pb={2}>
          <Flex justify="space-between" align="center">
            <HStack spacing={1}>
              <Text fontSize="13px" lineHeight="1">👍❤️😢</Text>
              <Text fontSize="xs" color={subtle} fontFamily="'Poppins', sans-serif">
                {likeCount.toLocaleString()}
              </Text>
            </HStack>
            {(post.comments_count || 0) > 0 && (
              <Text
                fontSize="xs" color={subtle} fontFamily="'Poppins', sans-serif"
                cursor="pointer" _hover={{ textDecoration: 'underline' }}
              >
                {post.comments_count} {post.comments_count === 1 ? 'comment' : 'comments'}
              </Text>
            )}
          </Flex>
        </Box>
      )}

      <Divider borderColor={border} />

      {/* ─── Action buttons ─── */}
      <HStack spacing={0} px={2} py={1}>
        <Button
          flex="1" variant="ghost" size="sm" borderRadius="xl"
          fontFamily="'Poppins', sans-serif" fontWeight="700"
          color={liked ? 'brand.500' : subtle}
          leftIcon={<MdThumbUp size={20} color={liked ? '#7c3aed' : subtle} />}
          _hover={{ bg: hoverBg }} onClick={handleLike}
        >
          {liked ? 'Supported' : 'Support'}
        </Button>

        <Button
          flex="1" variant="ghost" size="sm" borderRadius="xl"
          fontFamily="'Poppins', sans-serif" fontWeight="700" color={subtle}
          leftIcon={<MdChat size={20} color={subtle} />}
          _hover={{ bg: hoverBg }}
          onClick={() => { if (!isDemo) navigate(`/post/${post.id}`); }}
        >
          Comment
        </Button>

        <Button
          flex="1" variant="ghost" size="sm" borderRadius="xl"
          fontFamily="'Poppins', sans-serif" fontWeight="700" color={subtle}
          leftIcon={<MdShare size={20} color={subtle} />}
          _hover={{ bg: hoverBg }}
        >
          Share
        </Button>
      </HStack>
    </Box>
  );
}
