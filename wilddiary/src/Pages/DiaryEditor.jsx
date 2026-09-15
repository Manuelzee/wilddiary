import { useEffect, useState } from 'react';
import { Link as RouterLink, useNavigate, useParams } from 'react-router-dom';
import { Box, Button, Flex, FormControl, FormLabel, Heading, Input, Select, Spinner, Text, Textarea, useColorMode, useToast } from '@chakra-ui/react';
import { MdArrowBack, MdDeleteOutline, MdLock, MdSave } from 'react-icons/md';
import { useAuth } from '../Context/useAuth';
import { diaryService } from '../Services/diaryService';

export default function DiaryEditor() {
  const { id } = useParams();
  const isNew = id === 'new';
  const { isAuthenticated } = useAuth();
  const navigate = useNavigate();
  const toast = useToast();
  const { colorMode } = useColorMode();
  const [entry, setEntry] = useState({ title: '', content: '', mood: 'neutral' });
  const [loading, setLoading] = useState(!isNew);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (!isAuthenticated) { navigate('/auth', { replace: true }); return; }
    if (isNew) return;
    let active = true;
    diaryService.get(id).then((data) => { if (active) setEntry(data); }).catch(() => navigate('/diary', { replace: true })).finally(() => { if (active) setLoading(false); });
    return () => { active = false; };
  }, [id, isNew, isAuthenticated, navigate]);

  const save = async (event) => {
    event.preventDefault(); setSaving(true);
    try { const saved = isNew ? await diaryService.create(entry) : await diaryService.update(id, entry); toast({ title: 'Private entry saved', status: 'success' }); navigate(`/diary/${saved.id || id}`, { replace: true }); }
    catch (error) { toast({ title: 'Could not save entry', description: error.message, status: 'error' }); }
    finally { setSaving(false); }
  };
  const remove = async () => { await diaryService.remove(id); navigate('/diary'); };
  if (loading) return <Flex py={20} justify="center"><Spinner /></Flex>;
  return <Box as="form" onSubmit={save} maxW="3xl" mx="auto" w="100%" py={8}>
    <Button as={RouterLink} to="/diary" variant="ghost" leftIcon={<MdArrowBack />} mb={5}>Back to diary</Button>
    <Flex justify="space-between" align="center" mb={2}><Heading>{isNew ? 'New reflection' : 'Edit reflection'}</Heading><Flex align="center" gap={2} color="gray.500"><MdLock /><Text fontSize="xs">Private</Text></Flex></Flex>
    <Text color="gray.500" mb={7}>Write honestly. This entry is visible only to your account.</Text>
    <FormControl mb={5} isRequired><FormLabel>Title</FormLabel><Input value={entry.title} maxLength={120} onChange={(event) => setEntry({ ...entry, title: event.target.value })} size="lg" /></FormControl>
    <FormControl mb={5}><FormLabel>How are you feeling?</FormLabel><Select value={entry.mood || 'neutral'} onChange={(event) => setEntry({ ...entry, mood: event.target.value })}><option value="calm">Calm</option><option value="hopeful">Hopeful</option><option value="neutral">Neutral</option><option value="anxious">Anxious</option><option value="sad">Sad</option><option value="angry">Angry</option></Select></FormControl>
    <FormControl isRequired><FormLabel>Your reflection</FormLabel><Textarea minH="360px" maxLength={10000} resize="vertical" value={entry.content} onChange={(event) => setEntry({ ...entry, content: event.target.value })} bg={colorMode === 'dark' ? 'whiteAlpha.50' : 'white'} /></FormControl>
    <Flex justify="space-between" mt={5}><Box>{!isNew && <Button type="button" variant="outline" colorScheme="red" leftIcon={<MdDeleteOutline />} onClick={remove}>Delete</Button>}</Box><Button type="submit" variant="brand" leftIcon={<MdSave />} isLoading={saving} isDisabled={!entry.title.trim() || !entry.content.trim()}>Save reflection</Button></Flex>
  </Box>;
}
