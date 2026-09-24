import { useEffect, useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useColorMode } from '@chakra-ui/react';
import {
  Alert, AlertIcon, Avatar, Box, Button, Flex, HStack, IconButton, Spinner,
  Text, Textarea, Tooltip, VStack, useToast,
} from '@chakra-ui/react';
import { MdAdd, MdArrowBack, MdAutoAwesome, MdDeleteOutline, MdSend } from 'react-icons/md';
import { useAuth } from '../Context/useAuth';
import { apiRequest } from '../Services/api';

const WELCOME = {
  id: 'welcome', role: 'assistant',
  content: "Hi, I’m Harbor. I’m here to listen and help you reflect on what you’re carrying. I’m not a therapist or emergency service, but we can take things one step at a time. What’s on your mind?",
};

export default function Chat() {
  const { isAuthenticated, user } = useAuth();
  const navigate = useNavigate();
  const toast = useToast();
  const { colorMode } = useColorMode();
  const isDark = colorMode === 'dark';
  const endRef = useRef(null);
  const [conversations, setConversations] = useState([]);
  const [activeId, setActiveId] = useState(null);
  const [messages, setMessages] = useState([WELCOME]);
  const [draft, setDraft] = useState('');
  const [loading, setLoading] = useState(true);
  const [sending, setSending] = useState(false);
  const [mobileChat, setMobileChat] = useState(false);

  const panel = isDark ? '#242526' : 'white';
  const bg = isDark ? '#18191a' : '#f0f2f5';
  const border = isDark ? 'whiteAlpha.200' : 'gray.200';
  const muted = isDark ? 'gray.400' : 'gray.600';

  useEffect(() => {
    if (!isAuthenticated) {
      navigate('/auth', { replace: true });
      return;
    }
    let active = true;
    apiRequest('/chat/conversations')
      .then((data) => { if (active) setConversations(Array.isArray(data) ? data : []); })
      .catch((error) => toast({ title: 'Could not load chats', description: error.message, status: 'error' }))
      .finally(() => { if (active) setLoading(false); });
    return () => { active = false; };
  }, [isAuthenticated, navigate, toast]);

  useEffect(() => {
    if (!activeId) return;
    let active = true;
    apiRequest(`/chat/conversations/${activeId}/messages`)
      .then((data) => { if (active) setMessages(Array.isArray(data) && data.length ? data : [WELCOME]); })
      .catch((error) => toast({ title: 'Could not open chat', description: error.message, status: 'error' }));
    return () => { active = false; };
  }, [activeId, toast]);

  useEffect(() => { endRef.current?.scrollIntoView({ behavior: 'smooth' }); }, [messages, sending]);

  const newConversation = async () => {
    try {
      const conversation = await apiRequest('/chat/conversations', { method: 'POST' });
      setConversations((items) => [conversation, ...items]);
      setActiveId(conversation.id);
      setMessages([WELCOME]);
      setMobileChat(true);
    } catch (error) { toast({ title: 'Could not start chat', description: error.message, status: 'error' }); }
  };

  const selectConversation = (id) => { setActiveId(id); setMobileChat(true); };

  const deleteConversation = async (event, id) => {
    event.stopPropagation();
    try {
      await apiRequest(`/chat/conversations/${id}`, { method: 'DELETE' });
      setConversations((items) => items.filter((item) => item.id !== id));
      if (activeId === id) { setActiveId(null); setMessages([WELCOME]); setMobileChat(false); }
    } catch (error) { toast({ title: 'Could not delete chat', description: error.message, status: 'error' }); }
  };

  const sendMessage = async (event) => {
    event.preventDefault();
    const content = draft.trim();
    if (!content || sending) return;
    let conversationId = activeId;
    try {
      if (!conversationId) {
        const conversation = await apiRequest('/chat/conversations', { method: 'POST' });
        conversationId = conversation.id;
        setActiveId(conversationId);
        setConversations((items) => [conversation, ...items]);
      }
      setDraft('');
      setMessages((items) => [...items.filter((item) => item.id !== 'welcome'), { id: `pending-${Date.now()}`, role: 'user', content }]);
      setSending(true);
      const data = await apiRequest(`/chat/conversations/${conversationId}/messages`, { method: 'POST', body: JSON.stringify({ content }) });
      setMessages((items) => [...items.filter((item) => !String(item.id).startsWith('pending-')), data.user_message, data.assistant_message]);
      setConversations((items) => items.map((item) => item.id === conversationId
        ? { ...item, title: item.title === 'New conversation' ? content.slice(0, 57) : item.title, last_message: data.assistant_message.content }
        : item));
    } catch (error) {
      setMessages((items) => items.filter((item) => !String(item.id).startsWith('pending-')));
      setDraft(content);
      toast({ title: 'Message not sent', description: error.message, status: 'error' });
    } finally { setSending(false); }
  };

  if (!isAuthenticated) return null;

  return (
    <Flex h="calc(100dvh - 56px)" bg={bg} overflow="hidden" fontFamily="'Poppins', sans-serif">
      <Box w={{ base: '100%', md: '300px' }} display={{ base: mobileChat ? 'none' : 'block', md: 'block' }}
        bg={panel} borderRight="1px solid" borderColor={border} p={3} overflowY="auto">
        <Button leftIcon={<MdAdd />} w="100%" variant="brand" mb={4} onClick={newConversation}>New conversation</Button>
        <Text px={2} mb={2} fontSize="xs" fontWeight="800" color={muted} textTransform="uppercase">Your conversations</Text>
        {loading ? <Flex justify="center" py={10}><Spinner /></Flex> : conversations.length === 0 ? (
          <Text p={3} fontSize="sm" color={muted}>No saved conversations yet.</Text>
        ) : conversations.map((conversation) => (
          <Flex key={conversation.id} onClick={() => selectConversation(conversation.id)} cursor="pointer" p={3} mb={1}
            bg={activeId === conversation.id ? (isDark ? 'whiteAlpha.100' : 'purple.50') : 'transparent'}
            borderRadius="xl" align="center" gap={2} _hover={{ bg: isDark ? 'whiteAlpha.100' : 'gray.100' }}>
            <Box minW={0} flex="1">
              <Text fontSize="sm" fontWeight="700" noOfLines={1}>{conversation.title}</Text>
              <Text fontSize="xs" color={muted} noOfLines={1}>{conversation.last_message || 'Start writing…'}</Text>
            </Box>
            <Tooltip label="Delete conversation"><IconButton aria-label="Delete conversation" icon={<MdDeleteOutline />} size="xs" variant="ghost" colorScheme="red" onClick={(event) => deleteConversation(event, conversation.id)} /></Tooltip>
          </Flex>
        ))}
      </Box>

      <Flex flex="1" display={{ base: mobileChat ? 'flex' : 'none', md: 'flex' }} direction="column" minW={0}>
        <HStack bg={panel} borderBottom="1px solid" borderColor={border} p={3} spacing={3}>
          <IconButton display={{ base: 'inline-flex', md: 'none' }} aria-label="Back to conversations" icon={<MdArrowBack />} variant="ghost" onClick={() => setMobileChat(false)} />
          <Avatar size="sm" bg="brand.500" icon={<MdAutoAwesome color="white" />} />
          <Box><Text fontWeight="800" fontSize="sm">Harbor</Text><Text fontSize="xs" color={muted}>Supportive AI companion</Text></Box>
        </HStack>
        <Alert status="info" py={2} fontSize="xs"><AlertIcon />Harbor can make mistakes and does not replace professional or emergency care. Chats are saved to your account.</Alert>

        <VStack flex="1" overflowY="auto" align="stretch" spacing={4} p={{ base: 3, md: 6 }} maxW="900px" w="100%" mx="auto">
          {messages.map((message) => (
            <Flex key={message.id} justify={message.role === 'user' ? 'flex-end' : 'flex-start'}>
              <Box maxW={{ base: '88%', md: '72%' }} px={4} py={3} borderRadius="2xl"
                bg={message.role === 'user' ? 'brand.500' : panel} color={message.role === 'user' ? 'white' : undefined}
                border={message.role === 'assistant' ? '1px solid' : 'none'} borderColor={border}>
                <Text fontSize="sm" lineHeight="1.7" whiteSpace="pre-wrap">{message.content}</Text>
              </Box>
            </Flex>
          ))}
          {sending && <HStack color={muted}><Spinner size="sm" /><Text fontSize="xs">Harbor is responding…</Text></HStack>}
          <Box ref={endRef} />
        </VStack>

        <Box as="form" onSubmit={sendMessage} p={3} bg={panel} borderTop="1px solid" borderColor={border}>
          <HStack maxW="900px" mx="auto" align="flex-end">
            <Textarea value={draft} onChange={(event) => setDraft(event.target.value)} maxLength={4000} rows={1}
              placeholder={`Message Harbor as ${user?.username}…`} resize="none" borderRadius="2xl"
              onKeyDown={(event) => { if (event.key === 'Enter' && !event.shiftKey) { event.preventDefault(); sendMessage(event); } }} />
            <IconButton type="submit" aria-label="Send message" icon={<MdSend />} isLoading={sending} isDisabled={!draft.trim()} colorScheme="purple" borderRadius="full" />
          </HStack>
          <Text textAlign="center" color={muted} fontSize="10px" mt={2}>If you are in immediate danger, contact local emergency services. In Nigeria, call 112.</Text>
        </Box>
      </Flex>
    </Flex>
  );
}
