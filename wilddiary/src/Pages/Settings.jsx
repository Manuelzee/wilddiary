import { useState, useEffect } from 'react';
import { useNavigate, Link as RouterLink } from 'react-router-dom';
import { useAuth } from '../Context/useAuth';
import { discoveryService } from '../Services/discoveryService';
import { useColorMode } from '@chakra-ui/react';
import {
  Box, Flex, VStack, HStack, Text, Input, InputGroup, InputLeftElement,
  InputRightElement, IconButton, Button, Badge, Divider, Switch, Select,
  Slider, SliderTrack, SliderFilledTrack, SliderThumb, Avatar, FormControl,
  FormLabel, FormHelperText, Alert, AlertIcon, AlertDescription, AlertTitle,
  Radio, RadioGroup, Stack, Textarea, useToast, Accordion, AccordionItem,
  AccordionButton, AccordionPanel, AccordionIcon, Tag, TagLabel, Tooltip,
} from '@chakra-ui/react';
import {
  MdAccountCircle, MdPerson, MdLock, MdWarning, MdSecurity, MdVisibility,
  MdBlock, MdNotifications, MdEmail, MdFavorite, MdSupportAgent, MdAutoAwesome,
  MdDarkMode, MdLightMode, MdLanguage, MdDevices, MdVerifiedUser, MdHistory,
  MdLocalHospital, MdPeople, MdHelp, MdGavel, MdDescription, MdBugReport,
  MdChevronRight, MdArrowBack, MdSearch, MdEdit, MdSave, MdKey, MdShield,
  MdNotificationsActive, MdBook, MdPhone, MdDownload, MdPalette, MdFormatSize,
  MdCategory, MdVisibilityOff, MdCheck, MdLogout, MdClose, MdPhone as MdPhone2,
} from 'react-icons/md';

// ── Section definitions ───────────────────────────────────────────────────────
const SECTIONS = [
  {
    id: 'account', label: 'Your Account', icon: MdAccountCircle,
    description: 'See information about your account, download your diary data, or learn about deactivation options.',
    items: [
      { id: 'account-info',    label: 'Account information',       description: 'See your account details like username and email address', icon: MdPerson },
      { id: 'change-password', label: 'Change your password',      description: 'Change your password at any time',                         icon: MdKey    },
      { id: 'download-data',   label: 'Download your diary data',  description: 'Get an archive of your diary entries and account data',     icon: MdDownload },
      { id: 'deactivate',      label: 'Deactivate your account',   description: 'Find out how you can deactivate your Wild Diary account',   icon: MdWarning, danger: true },
    ],
  },
  {
    id: 'privacy', label: 'Privacy & Safety', icon: MdShield,
    description: 'Manage your privacy settings and control how others interact with your diary.',
    items: [
      { id: 'post-privacy',     label: 'Default post privacy',       description: 'Choose whether your posts are anonymous or named by default', icon: MdVisibility },
      { id: 'who-can-comment',  label: 'Who can comment',             description: 'Control who can reply to your diary entries',                 icon: MdBlock      },
      { id: 'discoverability',  label: 'Discoverability & contacts',  description: 'Control whether others can find you by username or email',    icon: MdSearch     },
      { id: 'blocked-accounts', label: 'Blocked accounts',            description: 'Manage accounts blocked from viewing your profile',          icon: MdBlock      },
    ],
  },
  {
    id: 'notifications', label: 'Notifications', icon: MdNotifications,
    description: 'Select the kinds of notifications you receive about your activities and recommendations.',
    items: [
      { id: 'push-notif',      label: 'Push notifications',   description: 'Manage push notifications for this browser',                icon: MdNotificationsActive },
      { id: 'email-notif',     label: 'Email notifications',  description: 'Receive notifications and updates to your email',           icon: MdEmail               },
      { id: 'reaction-notif',  label: 'Reactions & comments', description: 'Notify me when someone supports or comments on my post',   icon: MdFavorite            },
      { id: 'counselor-notif', label: 'Counselor responses',  description: 'Get notified when a counselor engages with your diary',    icon: MdSupportAgent        },
    ],
  },
  {
    id: 'diary', label: 'Diary Preferences', icon: MdBook,
    description: 'Customise how your diary works and how your entries are displayed.',
    items: [
      { id: 'default-category',  label: 'Default post category',          description: 'Set the default category for new diary entries',                          icon: MdCategory    },
      { id: 'ai-insights',       label: 'AI-powered insights',             description: 'Enable AI analysis to suggest personalised coping strategies',            icon: MdAutoAwesome },
      { id: 'anonymous-default', label: 'Post anonymously by default',     description: 'New posts will use an anonymous identity unless you override it per post', icon: MdVisibility  },
    ],
  },
  {
    id: 'display', label: 'Display & Accessibility', icon: MdPalette,
    description: 'Manage your display settings including theme, font size, and language.',
    items: [
      { id: 'dark-mode',  label: 'Dark mode',  description: 'Switch between dark and light themes',         icon: MdDarkMode   },
      { id: 'font-size',  label: 'Font size',  description: 'Adjust the text size across Wild Diary',       icon: MdFormatSize },
      { id: 'language',   label: 'Language',   description: 'Change the display language for Wild Diary',   icon: MdLanguage   },
    ],
  },
  {
    id: 'security', label: 'Security & Account Access', icon: MdSecurity,
    description: 'Manage your security settings and see where you are currently logged in.',
    items: [
      { id: 'sessions',       label: 'Active sessions',              description: 'See and manage all devices logged into your account', icon: MdDevices   },
      { id: '2fa',            label: 'Two-factor authentication',    description: 'Add an extra layer of security to your account',      icon: MdVerifiedUser },
      { id: 'login-history',  label: 'Login history',                description: 'See recent login activity for your account',          icon: MdHistory   },
    ],
  },
  {
    id: 'counselors', label: 'Counselors & Support', icon: MdSupportAgent,
    description: 'Connect with verified mental health professionals and access support resources.',
    items: [
      { id: 'find-counselors', label: 'Find counselors',            description: 'Browse verified mental health counselors and specialists', icon: MdSupportAgent   },
      { id: 'my-counselors',   label: 'My connected counselors',    description: 'View and manage counselors you are connected with',        icon: MdPeople         },
      { id: 'crisis',          label: 'Crisis resources & hotlines', description: 'Access emergency mental health resources',               icon: MdLocalHospital  },
    ],
  },
  {
    id: 'resources', label: 'Additional Resources', icon: MdHelp,
    description: 'Access help documentation, legal policies, and report issues.',
    items: [
      { id: 'help',           label: 'Help Center',           description: 'Browse FAQs and how-to guides for Wild Diary',                     icon: MdHelp        },
      { id: 'community-rules',label: 'Community Guidelines',  description: 'Read the standards that keep Wild Diary safe and supportive',       icon: MdGavel       },
      { id: 'terms',          label: 'Terms of Service',      description: 'Review the terms governing your use of Wild Diary',                 icon: MdDescription },
      { id: 'privacy-policy', label: 'Privacy Policy',        description: 'Learn how we handle and protect your personal data',                icon: MdShield      },
      { id: 'report-problem', label: 'Report a problem',      description: "Let us know if something isn't working correctly",                  icon: MdBugReport   },
    ],
  },
];

// ── Shared styles helper ──────────────────────────────────────────────────────
function useColors() {
  const { colorMode } = useColorMode();
  const d = colorMode === 'dark';
  return {
    d,
    bg:       d ? '#18191a' : '#f0f2f5',
    panel:    d ? '#242526' : 'white',
    border:   d ? 'rgba(255,255,255,0.1)' : '#e4e6eb',
    text:     d ? '#e4e6eb' : '#050505',
    subtle:   d ? '#b0b3b8' : '#65676b',
    hover:    d ? 'rgba(255,255,255,0.07)' : 'rgba(0,0,0,0.04)',
    active:   d ? 'rgba(124,58,237,0.15)' : 'purple.50',
    inputBg:  d ? 'rgba(255,255,255,0.07)' : '#f0f2f5',
  };
}

// ── Detail panels ─────────────────────────────────────────────────────────────

function AccountInfoPanel({ user, c, updateProfile }) {
  const [editing, setEditing] = useState(false);
  const [username, setUsername] = useState(user?.username || '');
  const [email, setEmail] = useState(user?.email || '');
  const toast = useToast();

  const save = async () => {
    const result = await updateProfile({ username, email });
    if (!result.success) return toast({ title: 'Update failed', description: result.error, status: 'error', duration: 3000, isClosable: true });
    setEditing(false);
    toast({ title: 'Account updated', status: 'success', duration: 3000, isClosable: true, position: 'top-right' });
  };

  return (
    <VStack spacing={5} align="stretch">
      <HStack spacing={4} align="center">
        <Avatar size="lg" name={user?.username} bg="brand.500" color="white" fontFamily="'Poppins', sans-serif" />
        <Box>
          <Text fontWeight="700" fontSize="lg" color={c.text} fontFamily="'Poppins', sans-serif" textTransform="capitalize">{user?.username}</Text>
          <Badge colorScheme={user?.role === 'counselor' ? 'green' : 'purple'} borderRadius="full" fontFamily="'Poppins', sans-serif" textTransform="capitalize">
            {user?.role || 'user'}
          </Badge>
        </Box>
        <Button ml="auto" size="sm" leftIcon={editing ? <MdClose size={14} /> : <MdEdit size={14} />}
          variant="outline" borderRadius="full" fontFamily="'Poppins', sans-serif"
          onClick={() => setEditing(v => !v)}>
          {editing ? 'Cancel' : 'Edit'}
        </Button>
      </HStack>
      <Divider borderColor={c.border} />
      <FormControl>
        <FormLabel fontFamily="'Poppins', sans-serif" fontSize="sm" color={c.text} fontWeight="700">Username</FormLabel>
        <Input value={username} onChange={e => setUsername(e.target.value)} isReadOnly={!editing}
          bg={editing ? c.inputBg : 'transparent'} border={editing ? '1px solid' : 'none'} borderColor={c.border}
          fontFamily="'Poppins', sans-serif" fontSize="sm" color={c.text} pl={editing ? 3 : 0} />
      </FormControl>
      <FormControl>
        <FormLabel fontFamily="'Poppins', sans-serif" fontSize="sm" color={c.text} fontWeight="700">Email address</FormLabel>
        <Input value={email} onChange={e => setEmail(e.target.value)} isReadOnly={!editing}
          bg={editing ? c.inputBg : 'transparent'} border={editing ? '1px solid' : 'none'} borderColor={c.border}
          fontFamily="'Poppins', sans-serif" fontSize="sm" color={c.text} pl={editing ? 3 : 0} type="email" />
      </FormControl>
      <FormControl>
        <FormLabel fontFamily="'Poppins', sans-serif" fontSize="sm" color={c.text} fontWeight="700">Phone number</FormLabel>
        <Input placeholder="Not set" isReadOnly={!editing}
          bg={editing ? c.inputBg : 'transparent'} border={editing ? '1px solid' : 'none'} borderColor={c.border}
          fontFamily="'Poppins', sans-serif" fontSize="sm" color={c.subtle} pl={editing ? 3 : 0} />
        <FormHelperText fontFamily="'Poppins', sans-serif" fontSize="xs" color={c.subtle}>Optional — used for account recovery only</FormHelperText>
      </FormControl>
      {editing && (
        <Button leftIcon={<MdSave size={16} />} onClick={save} borderRadius="full" fontFamily="'Poppins', sans-serif" alignSelf="flex-start">
          Save changes
        </Button>
      )}
    </VStack>
  );
}

function ChangePasswordPanel({ c, changePassword, navigate }) {
  const [show, setShow] = useState({ curr: false, next: false, confirm: false });
  const [pw, setPw] = useState({ curr: '', next: '', confirm: '' });
  const toast = useToast();

  const submit = async () => {
    if (!pw.curr) return toast({ title: 'Enter your current password', status: 'warning', duration: 2500, isClosable: true, position: 'top-right' });
    if (pw.next.length < 8) return toast({ title: 'Password too short', description: 'New password must be at least 8 characters', status: 'error', duration: 2500, isClosable: true, position: 'top-right' });
    if (pw.next !== pw.confirm) return toast({ title: 'Passwords do not match', status: 'error', duration: 2500, isClosable: true, position: 'top-right' });
    const result = await changePassword(pw.curr, pw.next);
    if (!result.success) return toast({ title: 'Password update failed', description: result.error, status: 'error', duration: 3000, isClosable: true });
    toast({ title: 'Password updated', description: 'Please sign in again.', status: 'success', duration: 3000, isClosable: true, position: 'top-right' });
    setPw({ curr: '', next: '', confirm: '' });
    navigate('/auth');
  };

  return (
    <VStack spacing={5} align="stretch">
      {[['curr', 'Current password'], ['next', 'New password'], ['confirm', 'Confirm new password']].map(([k, label]) => (
        <FormControl key={k}>
          <FormLabel fontFamily="'Poppins', sans-serif" fontSize="sm" color={c.text} fontWeight="700">{label}</FormLabel>
          <InputGroup>
            <Input type={show[k] ? 'text' : 'password'} value={pw[k]} onChange={e => setPw(p => ({ ...p, [k]: e.target.value }))}
              bg={c.inputBg} border="1px solid" borderColor={c.border} borderRadius="lg" fontFamily="'Poppins', sans-serif" fontSize="sm" color={c.text} />
            <InputRightElement><IconButton aria-label={`Toggle ${label.toLowerCase()} visibility`} icon={show[k] ? <MdVisibilityOff size={16} /> : <MdVisibility size={16} />} variant="ghost" size="xs" onClick={() => setShow(s => ({ ...s, [k]: !s[k] }))} /></InputRightElement>
          </InputGroup>
          {k === 'next' && <FormHelperText fontFamily="'Poppins', sans-serif" fontSize="xs" color={c.subtle}>At least 8 characters</FormHelperText>}
        </FormControl>
      ))}
      <Button onClick={submit} borderRadius="full" fontFamily="'Poppins', sans-serif" alignSelf="flex-start">
        Update password
      </Button>
      <Text fontSize="xs" color={c.subtle} fontFamily="'Poppins', sans-serif">
        After changing your password you will be asked to sign in again on all devices.
      </Text>
    </VStack>
  );
}

function DownloadDataPanel({ c }) {
  const toast = useToast();
  const [downloading, setDownloading] = useState(false);

  const handleDownload = async () => {
    setDownloading(true);
    try {
      const data = await discoveryService.exportData();
      const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `wilddiary-export-${data.user?.username || 'user'}.json`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
      toast({ title: 'Archive downloaded', description: 'Your personal diary data has been exported successfully.', status: 'success', duration: 4000, isClosable: true, position: 'top-right' });
    } catch (err) {
      toast({ title: 'Download failed', description: err.message, status: 'error', duration: 4000, isClosable: true, position: 'top-right' });
    } finally {
      setDownloading(false);
    }
  };

  return (
    <VStack spacing={5} align="stretch">
      <Alert status="info" borderRadius="xl" bg={c.d ? 'rgba(59,130,246,0.08)' : 'blue.50'} border="1px solid" borderColor={c.d ? 'blue.800' : 'blue.200'}>
        <AlertIcon /><AlertDescription fontFamily="'Poppins', sans-serif" fontSize="sm">Your archive includes your profile, private diary entries, community posts, and comments.</AlertDescription>
      </Alert>
      {['Private diary entries & content', 'Community posts you shared', 'Comments and responses', 'Account information', 'Privacy preferences'].map(item => (
        <HStack key={item} p={3} bg={c.inputBg} borderRadius="xl" spacing={3}>
          <MdCheck size={16} color="#7c3aed" />
          <Text fontSize="sm" color={c.text} fontFamily="'Poppins', sans-serif">{item}</Text>
        </HStack>
      ))}
      <Button
        leftIcon={<MdDownload size={16} />}
        borderRadius="full"
        fontFamily="'Poppins', sans-serif"
        alignSelf="flex-start"
        isLoading={downloading}
        loadingText="Exporting data…"
        onClick={handleDownload}
      >
        Download JSON Archive
      </Button>
      <Text fontSize="xs" color={c.subtle} fontFamily="'Poppins', sans-serif">
        Your complete data archive will be generated and downloaded directly to your device.
      </Text>
    </VStack>
  );
}

function DeactivatePanel({ c, deactivateAccount, navigate }) {
  const [confirm, setConfirm] = useState('');
  return (
    <VStack spacing={5} align="stretch">
      <Alert status="error" borderRadius="xl">
        <AlertIcon /><Box>
          <AlertTitle fontFamily="'Poppins', sans-serif" fontSize="sm">This action is reversible</AlertTitle>
          <AlertDescription fontFamily="'Poppins', sans-serif" fontSize="xs">Deactivating disables sign-in and permanently anonymizes your existing contributions. Contact support if you need account recovery.</AlertDescription>
        </Box>
      </Alert>
      {['Your existing diary entries and replies will become anonymous', 'Your account will no longer be able to sign in', 'Your data remains subject to the retention policy', 'Contact support before proceeding if you need an archive'].map(item => (
        <HStack key={item} p={3} bg={c.inputBg} borderRadius="xl" spacing={3}>
          <MdWarning size={16} color="#EF4444" />
          <Text fontSize="sm" color={c.text} fontFamily="'Poppins', sans-serif">{item}</Text>
        </HStack>
      ))}
      <FormControl>
        <FormLabel fontFamily="'Poppins', sans-serif" fontSize="sm" color={c.text} fontWeight="700">Type DEACTIVATE to confirm</FormLabel>
        <Input value={confirm} onChange={e => setConfirm(e.target.value)} placeholder="DEACTIVATE"
          bg={c.inputBg} border="1px solid" borderColor="red.400" borderRadius="lg"
          fontFamily="'Poppins', sans-serif" fontSize="sm" color={c.text} />
      </FormControl>
      <Button
        colorScheme="red" borderRadius="full" fontFamily="'Poppins', sans-serif" alignSelf="flex-start"
        isDisabled={confirm !== 'DEACTIVATE'}
        onClick={async () => {
          const result = await deactivateAccount();
          if (result.success) navigate('/');
        }}>
        Deactivate account
      </Button>
    </VStack>
  );
}

function RadioSettingPanel({ desc, options, defaultVal, c }) {
  const [val, setVal] = useState(defaultVal);
  const toast = useToast();
  return (
    <VStack spacing={5} align="stretch">
      <Text fontSize="sm" color={c.subtle} fontFamily="'Poppins', sans-serif">{desc}</Text>
      <RadioGroup value={val} onChange={setVal}>
        <Stack spacing={3}>
          {options.map(o => (
            <Box key={o.value} p={4} bg={val === o.value ? c.active : c.inputBg}
              borderRadius="xl" border="2px solid" borderColor={val === o.value ? 'brand.500' : 'transparent'}
              cursor="pointer" onClick={() => setVal(o.value)} transition="all 0.15s">
              <Radio value={o.value} colorScheme="purple" fontFamily="'Poppins', sans-serif">
                <Box ml={2}>
                  <Text fontWeight="700" fontSize="sm" color={c.text} fontFamily="'Poppins', sans-serif">{o.label}</Text>
                  <Text fontSize="xs" color={c.subtle} fontFamily="'Poppins', sans-serif">{o.note}</Text>
                </Box>
              </Radio>
            </Box>
          ))}
        </Stack>
      </RadioGroup>
      <Button borderRadius="full" fontFamily="'Poppins', sans-serif" alignSelf="flex-start"
        onClick={() => toast({ title: 'Preference saved', status: 'success', duration: 2000, isClosable: true, position: 'top-right' })}>
        Save
      </Button>
    </VStack>
  );
}

function ToggleListPanel({ items, c }) {
  const [vals, setVals] = useState(Object.fromEntries(items.map(i => [i.key, i.default])));
  const toast = useToast();

  useEffect(() => {
    let active = true;
    discoveryService.getPreferences().then(res => {
      if (active && res?.preferences) {
        const p = res.preferences;
        setVals(prev => ({
          ...prev,
          ...(p.default_anonymous !== undefined ? { anonymous: Boolean(p.default_anonymous), 'anonymous-default': Boolean(p.default_anonymous) } : {}),
          ...(p.email_notifications !== undefined ? { email: Boolean(p.email_notifications), 'email-notif': Boolean(p.email_notifications) } : {}),
          ...(p.reaction_notifications !== undefined ? { reaction: Boolean(p.reaction_notifications), 'reaction-notif': Boolean(p.reaction_notifications) } : {}),
          ...(p.counselor_notifications !== undefined ? { counselor: Boolean(p.counselor_notifications), 'counselor-notif': Boolean(p.counselor_notifications) } : {}),
        }));
      }
    }).catch(() => {});
    return () => { active = false; };
  }, []);

  const handleToggle = async (key, checked) => {
    const next = { ...vals, [key]: checked };
    setVals(next);
    try {
      await discoveryService.updatePreferences({
        default_anonymous: next['anonymous-default'] ?? next.anonymous ?? true,
        email_notifications: next['email-notif'] ?? next.email ?? true,
        reaction_notifications: next['reaction-notif'] ?? next.reaction ?? true,
        counselor_notifications: next['counselor-notif'] ?? next.counselor ?? true,
      });
      toast({ title: 'Preference updated', status: 'success', duration: 1500, isClosable: true, position: 'top-right' });
    } catch {
      // Keep optimistic UI
    }
  };

  return (
    <VStack spacing={0} align="stretch" divider={<Divider borderColor={c.border} />}>
      {items.map(item => (
        <Flex key={item.key} justify="space-between" align="center" py={4} px={2}>
          <Box flex="1" pr={4}>
            <Text fontWeight="700" fontSize="sm" color={c.text} fontFamily="'Poppins', sans-serif">{item.label}</Text>
            <Text fontSize="xs" color={c.subtle} fontFamily="'Poppins', sans-serif" mt={0.5}>{item.note}</Text>
          </Box>
          <Switch isChecked={vals[item.key] ?? item.default} onChange={e => handleToggle(item.key, e.target.checked)} colorScheme="purple" size="md" />
        </Flex>
      ))}
    </VStack>
  );
}

function SessionsPanel({ c }) {
  const SESSIONS = [
    { device: 'Chrome on Windows', location: 'Lagos, Nigeria', time: 'Active now', current: true },
    { device: 'Safari on iPhone',  location: 'Abuja, Nigeria', time: '2 days ago',  current: false },
    { device: 'Firefox on Mac',    location: 'London, UK',      time: '5 days ago',  current: false },
  ];
  return (
    <VStack spacing={3} align="stretch">
      {SESSIONS.map((s, i) => (
        <Flex key={i} p={4} bg={s.current ? (c.d ? 'rgba(124,58,237,0.12)' : 'purple.50') : c.inputBg}
          borderRadius="xl" border="1px solid" borderColor={s.current ? 'brand.500' : c.border}
          align="center" justify="space-between">
          <Box>
            <HStack spacing={2} mb={1}>
              <Text fontWeight="700" fontSize="sm" color={c.text} fontFamily="'Poppins', sans-serif">{s.device}</Text>
              {s.current && <Badge colorScheme="green" borderRadius="full" fontSize="8px" fontFamily="'Poppins', sans-serif">Current</Badge>}
            </HStack>
            <Text fontSize="xs" color={c.subtle} fontFamily="'Poppins', sans-serif">{s.location} · {s.time}</Text>
          </Box>
          {!s.current && (
            <Button size="xs" colorScheme="red" variant="outline" borderRadius="full" fontFamily="'Poppins', sans-serif">
              Log out
            </Button>
          )}
        </Flex>
      ))}
      <Button variant="outline" colorScheme="red" borderRadius="full" fontFamily="'Poppins', sans-serif" alignSelf="flex-start">
        Log out of all other sessions
      </Button>
    </VStack>
  );
}

function CrisisPanel({ c }) {
  const LINES = [
    { country: '🇳🇬 Nigeria',   name: 'SURPIN Crisis Line',         number: '08111 909 909',   available: '24/7' },
    { country: '🇬🇧 UK',         name: 'Samaritans',                  number: '116 123',          available: '24/7' },
    { country: '🇺🇸 USA',        name: 'Crisis Text Line',            number: 'Text HOME to 741741', available: '24/7' },
    { country: '🌍 International', name: 'WHO Mental Health',         number: 'findahelpline.com',   available: 'Online' },
  ];
  return (
    <VStack spacing={4} align="stretch">
      <Alert status="warning" borderRadius="xl">
        <AlertIcon />
        <AlertDescription fontFamily="'Poppins', sans-serif" fontSize="sm" fontWeight="700">
          If you are in immediate danger, call your local emergency services (e.g. 199, 911, or 999).
        </AlertDescription>
      </Alert>
      {LINES.map(l => (
        <Box key={l.name} p={4} bg={c.inputBg} borderRadius="xl" border="1px solid" borderColor={c.border}>
          <Text fontSize="xs" color={c.subtle} fontFamily="'Poppins', sans-serif" mb={1}>{l.country}</Text>
          <Text fontWeight="700" fontSize="sm" color={c.text} fontFamily="'Poppins', sans-serif">{l.name}</Text>
          <HStack mt={1} justify="space-between">
            <Text fontSize="sm" color="brand.400" fontWeight="700" fontFamily="'Poppins', sans-serif">{l.number}</Text>
            <Badge colorScheme="green" borderRadius="full" fontFamily="'Poppins', sans-serif" fontSize="9px">{l.available}</Badge>
          </HStack>
        </Box>
      ))}
      <Text fontSize="xs" color={c.subtle} fontFamily="'Poppins', sans-serif" textAlign="center">
        Wild Diary is not a crisis service. If you need immediate help, please call one of the numbers above.
      </Text>
    </VStack>
  );
}

function HelpPanel({ c }) {
  const FAQS = [
    { q: 'How do I post anonymously?',                 a: 'When creating a post, toggle the "Post anonymously" switch. Your username will be hidden from all users, including counselors.' },
    { q: 'Can counselors see who I really am?',        a: 'No. If you post anonymously, counselors only see your post content. They cannot see your username or personal details.' },
    { q: 'How does AI insight work?',                  a: 'Our AI reads your diary entry and suggests coping strategies based on the emotions detected. No personal data is stored by the AI model.' },
    { q: 'How do I delete a diary entry?',             a: 'Open the post, tap the ⋯ menu and choose "Delete post". This is permanent and cannot be undone.' },
    { q: 'How do I report harmful content?',          a: 'Tap the ⋯ menu on any post or comment and choose "Report post". Our moderation team reviews all reports within 24 hours.' },
    { q: 'Is my diary data private?',                  a: 'Yes. Posts marked as anonymous are displayed without your name. You can also post privately (visible only to counselors). See our Privacy Policy for full details.' },
  ];
  return (
    <Accordion allowMultiple>
      {FAQS.map(({ q, a }) => (
        <AccordionItem key={q} border="none" mb={2}>
          <AccordionButton bg={c.inputBg} borderRadius="xl" px={4} py={3} _hover={{ bg: c.hover }} _expanded={{ bg: c.d ? 'rgba(124,58,237,0.12)' : 'purple.50', borderBottomRadius: 0 }}>
            <Box flex="1" textAlign="left" fontFamily="'Poppins', sans-serif" fontSize="sm" fontWeight="700" color={c.text}>{q}</Box>
            <AccordionIcon color={c.subtle} />
          </AccordionButton>
          <AccordionPanel bg={c.inputBg} borderBottomRadius="xl" px={4} pb={4}>
            <Text fontSize="sm" color={c.subtle} fontFamily="'Poppins', sans-serif" lineHeight="1.7">{a}</Text>
          </AccordionPanel>
        </AccordionItem>
      ))}
    </Accordion>
  );
}

function PolicyPanel({ title, content, c }) {
  return (
    <Box bg={c.inputBg} borderRadius="xl" p={5} border="1px solid" borderColor={c.border}>
      <Text fontWeight="700" color={c.text} mb={3}>{title}</Text>
      <Text fontSize="sm" color={c.subtle} fontFamily="'Poppins', sans-serif" lineHeight="1.8" whiteSpace="pre-line">
        {content}
      </Text>
    </Box>
  );
}

function ReportPanel({ c }) {
  const [type, setType] = useState('');
  const [desc, setDesc] = useState('');
  const toast = useToast();
  return (
    <VStack spacing={4} align="stretch">
      <FormControl>
        <FormLabel fontFamily="'Poppins', sans-serif" fontSize="sm" color={c.text} fontWeight="700">Type of problem</FormLabel>
        <Select value={type} onChange={e => setType(e.target.value)} bg={c.inputBg} border="1px solid" borderColor={c.border}
          fontFamily="'Poppins', sans-serif" fontSize="sm" color={c.text} borderRadius="lg">
          <option value="">Select a category</option>
          <option value="bug">Something is not working (Bug)</option>
          <option value="content">Harmful or inappropriate content</option>
          <option value="account">Account access problem</option>
          <option value="privacy">Privacy concern</option>
          <option value="safety">Safety concern</option>
          <option value="other">Other</option>
        </Select>
      </FormControl>
      <FormControl>
        <FormLabel fontFamily="'Poppins', sans-serif" fontSize="sm" color={c.text} fontWeight="700">Description</FormLabel>
        <Textarea value={desc} onChange={e => setDesc(e.target.value)} placeholder="Describe the problem in detail..."
          bg={c.inputBg} border="1px solid" borderColor={c.border} borderRadius="lg"
          fontFamily="'Poppins', sans-serif" fontSize="sm" color={c.text} rows={5} />
        <FormHelperText fontFamily="'Poppins', sans-serif" fontSize="xs" color={c.subtle}>{desc.length}/1000</FormHelperText>
      </FormControl>
      <Button borderRadius="full" fontFamily="'Poppins', sans-serif" alignSelf="flex-start"
        isDisabled={!type || !desc}
        onClick={() => { toast({ title: 'Report submitted', description: 'Our team will review it shortly. Thank you.', status: 'success', duration: 4000, isClosable: true, position: 'top-right' }); setType(''); setDesc(''); }}>
        Submit report
      </Button>
    </VStack>
  );
}

function DarkModePanel({ c, isDark, toggleColorMode }) {
  return (
    <VStack spacing={5} align="stretch">
      <Text fontSize="sm" color={c.subtle} fontFamily="'Poppins', sans-serif">Choose how Wild Diary looks to you. Select a single theme, or sync with your system setting.</Text>
      {[
        { id: 'light', label: 'Light', note: 'Classic light theme', active: !isDark },
        { id: 'dark',  label: 'Dark',  note: 'Easier on the eyes at night', active: isDark },
      ].map(opt => (
        <Flex key={opt.id} p={4} bg={opt.active ? (c.d ? 'rgba(124,58,237,0.12)' : 'purple.50') : c.inputBg}
          borderRadius="xl" border="2px solid" borderColor={opt.active ? 'brand.500' : 'transparent'}
          align="center" justify="space-between" cursor="pointer"
          onClick={() => { if (opt.id === 'dark' && !isDark) toggleColorMode(); if (opt.id === 'light' && isDark) toggleColorMode(); }}
          transition="all 0.15s">
          <HStack spacing={3}>
            {opt.id === 'dark' ? <MdDarkMode size={20} color={c.d ? '#e4e6eb' : '#050505'} /> : <MdLightMode size={20} color={c.d ? '#e4e6eb' : '#050505'} />}
            <Box>
              <Text fontWeight="700" fontSize="sm" color={c.text} fontFamily="'Poppins', sans-serif">{opt.label}</Text>
              <Text fontSize="xs" color={c.subtle} fontFamily="'Poppins', sans-serif">{opt.note}</Text>
            </Box>
          </HStack>
          {opt.active && <MdCheck size={20} color="#7c3aed" />}
        </Flex>
      ))}
    </VStack>
  );
}

// ── Render correct detail for selected item ───────────────────────────────────
function getDetailContent(itemId, { c, user, isDark, toggleColorMode, updateProfile, changePassword, deactivateAccount, navigate }) {
  switch (itemId) {
    case 'account-info':
      return <AccountInfoPanel user={user} c={c} updateProfile={updateProfile} />;

    case 'change-password':
      return <ChangePasswordPanel c={c} changePassword={changePassword} navigate={navigate} />;

    case 'download-data':
      return <DownloadDataPanel c={c} />;

    case 'deactivate':
      return <DeactivatePanel c={c} deactivateAccount={deactivateAccount} navigate={navigate} />;

    case 'post-privacy':
      return <RadioSettingPanel c={c} desc="Choose the default privacy for your diary posts."
        options={[
          { value: 'anonymous', label: 'Anonymous',          note: 'Your name is never shown on any post'    },
          { value: 'named',     label: 'Show my username',   note: 'Your username appears on every post'     },
          { value: 'choose',    label: 'Ask me each time',   note: 'You choose anonymity per post (default)' },
        ]} defaultVal="anonymous" />;

    case 'who-can-comment':
      return <RadioSettingPanel c={c} desc="Control who is allowed to comment on your diary entries."
        options={[
          { value: 'everyone',    label: 'Everyone',             note: 'Any member of Wild Diary can comment'    },
          { value: 'friends',     label: 'Friends only',         note: 'Only users you follow can comment'       },
          { value: 'counselors',  label: 'Verified counselors',  note: 'Only certified counselors can comment'   },
          { value: 'none',        label: 'No one',               note: 'Disable comments on all your entries'    },
        ]} defaultVal="everyone" />;

    case 'discoverability':
      return <ToggleListPanel c={c} items={[
        { key: 'byUsername', label: 'Findable by username',    note: 'Allow others to search and find your profile by username', default: true  },
        { key: 'byEmail',    label: 'Findable by email',       note: 'Allow others to find you using your email address',        default: false },
        { key: 'inSearch',   label: 'Appear in search results', note: 'Show your profile when someone searches the community',   default: true  },
      ]} />;

    case 'blocked-accounts':
      return (
        <VStack spacing={4} align="stretch">
          <InputGroup>
            <InputLeftElement><MdSearch color={c.subtle} size={16} /></InputLeftElement>
            <Input placeholder="Search blocked accounts…" bg={c.inputBg} border="1px solid" borderColor={c.border}
              borderRadius="lg" fontFamily="'Poppins', sans-serif" fontSize="sm" color={c.text} pl="36px" />
          </InputGroup>
          <Box py={10} textAlign="center">
            <MdBlock size={40} color={c.subtle} style={{ margin: '0 auto 8px' }} />
            <Text fontSize="sm" color={c.subtle} fontFamily="'Poppins', sans-serif">You have not blocked any accounts yet.</Text>
          </Box>
        </VStack>
      );

    case 'push-notif':
      return <ToggleListPanel c={c} items={[
        { key: 'master',    label: 'Enable push notifications',  note: 'Master switch for all push notifications',                     default: true  },
        { key: 'comments',  label: 'Comments on my posts',       note: 'When someone comments on a diary entry you wrote',             default: true  },
        { key: 'reactions', label: 'Reactions to my posts',      note: 'When someone supports one of your diary entries',              default: true  },
        { key: 'counselor', label: 'Counselor responses',        note: 'When a counselor replies to or engages with your post',        default: true  },
        { key: 'friends',   label: 'New friend activity',        note: 'When someone adds you or accepts your friend request',         default: false },
        { key: 'community', label: 'Community announcements',    note: 'Important updates and news from Wild Diary',                   default: true  },
      ]} />;

    case 'email-notif':
      return <ToggleListPanel c={c} items={[
        { key: 'digest',   label: 'Weekly digest',        note: 'A summary of community highlights delivered every Monday',      default: true  },
        { key: 'security', label: 'Security alerts',      note: 'Alerts about suspicious login attempts or password changes',    default: true  },
        { key: 'marketing',label: 'Product updates',      note: 'News about new Wild Diary features and improvements',           default: false },
        { key: 'counselor',label: 'Counselor messages',   note: 'Email me when a counselor sends you a private message',         default: true  },
      ]} />;

    case 'reaction-notif':
      return <ToggleListPanel c={c} items={[
        { key: 'support',   label: 'Support reactions',   note: 'When someone clicks Support on your diary entry',              default: true  },
        { key: 'comments',  label: 'New comments',        note: 'When someone comments on a post you created or also commented', default: true  },
        { key: 'mentions',  label: 'Mentions',            note: 'When someone mentions your username in a post or comment',     default: true  },
      ]} />;

    case 'counselor-notif':
      return <ToggleListPanel c={c} items={[
        { key: 'reply',    label: 'Counselor replies',       note: 'When a verified counselor responds to your diary entry',    default: true  },
        { key: 'follows',  label: 'Counselor follows me',    note: 'When a counselor follows your journal',                    default: true  },
        { key: 'live',     label: 'Counselor live sessions', note: 'When a counselor you follow starts a live support session', default: false },
      ]} />;

    case 'default-category':
      return (
        <VStack spacing={5} align="stretch">
          <Text fontSize="sm" color={c.subtle} fontFamily="'Poppins', sans-serif">New diary entries will default to this category. You can change it per post.</Text>
          <FormControl>
            <FormLabel fontFamily="'Poppins', sans-serif" fontSize="sm" color={c.text} fontWeight="700">Default category</FormLabel>
            <Select bg={c.inputBg} border="1px solid" borderColor={c.border} fontFamily="'Poppins', sans-serif" fontSize="sm" color={c.text} borderRadius="lg">
              <option value="emotional">💜 Emotional</option>
              <option value="financial">💰 Financial</option>
              <option value="relationship">🤝 Relationship</option>
              <option value="social">🌍 Social</option>
              <option value="other">📝 Other</option>
            </Select>
          </FormControl>
          <Button borderRadius="full" fontFamily="'Poppins', sans-serif" alignSelf="flex-start">Save</Button>
        </VStack>
      );

    case 'ai-insights':
      return (
        <VStack spacing={5} align="stretch">
          <Box p={4} bg={c.d ? 'rgba(124,58,237,0.08)' : 'purple.50'} borderRadius="xl" border="1px solid" borderColor={c.d ? 'purple.800' : 'purple.200'}>
            <HStack mb={2}><MdAutoAwesome size={18} color="#7c3aed" /><Text fontWeight="700" fontSize="sm" color={c.text} fontFamily="'Poppins', sans-serif">How AI Insights work</Text></HStack>
            <Text fontSize="xs" color={c.subtle} fontFamily="'Poppins', sans-serif" lineHeight="1.7">When enabled, our AI reads your diary entry and suggests personalised coping strategies, journalling prompts, and self-care tips. No raw personal data is stored by the AI model after analysis.</Text>
          </Box>
          <ToggleListPanel c={c} items={[
            { key: 'aiEnabled',  label: 'Enable AI insights',          note: 'Analyse my posts and suggest personalised coping strategies',   default: true  },
            { key: 'aiPrompts',  label: 'Journalling prompts',         note: 'Suggest writing prompts when you start a new diary entry',       default: true  },
            { key: 'aiMood',     label: 'Mood pattern detection',      note: 'Track mood trends across your entries over time',                default: false },
          ]} />
        </VStack>
      );

    case 'anonymous-default':
      return (
        <VStack spacing={5} align="stretch">
          <Alert status="info" borderRadius="xl" bg={c.d ? 'rgba(59,130,246,0.08)' : 'blue.50'} border="1px solid" borderColor={c.d ? 'blue.800' : 'blue.200'}>
            <AlertIcon />
            <AlertDescription fontFamily="'Poppins', sans-serif" fontSize="sm">When posting anonymously, no one — including counselors — can see your username.</AlertDescription>
          </Alert>
          <ToggleListPanel c={c} items={[
            { key: 'anonDefault', label: 'Post anonymously by default', note: 'New posts hide your username unless you choose to reveal it', default: true },
          ]} />
        </VStack>
      );

    case 'dark-mode':
      return <DarkModePanel c={c} isDark={isDark} toggleColorMode={toggleColorMode} />;

    case 'font-size':
      return (
        <VStack spacing={6} align="stretch">
          <Text fontSize="sm" color={c.subtle} fontFamily="'Poppins', sans-serif">Adjust how large text appears across Wild Diary.</Text>
          <Box p={5} bg={c.inputBg} borderRadius="xl">
            <Text fontSize="md" color={c.text} fontFamily="'Poppins', sans-serif" mb={1} fontWeight="600">Preview text</Text>
            <Text fontSize="sm" color={c.subtle} fontFamily="'Poppins', sans-serif">This is how your diary entries and posts will look.</Text>
          </Box>
          <Box px={2}>
            <Slider defaultValue={50} min={0} max={100} step={50} colorScheme="purple">
              <SliderTrack><SliderFilledTrack /></SliderTrack>
              <SliderThumb boxSize={5} />
            </Slider>
            <Flex justify="space-between" mt={1}>
              {['Small', 'Medium', 'Large'].map(s => (
                <Text key={s} fontSize="xs" color={c.subtle} fontFamily="'Poppins', sans-serif">{s}</Text>
              ))}
            </Flex>
          </Box>
        </VStack>
      );

    case 'language':
      return (
        <VStack spacing={5} align="stretch">
          <FormControl>
            <FormLabel fontFamily="'Poppins', sans-serif" fontSize="sm" color={c.text} fontWeight="700">Display language</FormLabel>
            <Select bg={c.inputBg} border="1px solid" borderColor={c.border} fontFamily="'Poppins', sans-serif" fontSize="sm" color={c.text} borderRadius="lg">
              <option value="en">English (UK)</option>
              <option value="en-us">English (US)</option>
              <option value="fr">Français</option>
              <option value="es">Español</option>
              <option value="pt">Português</option>
              <option value="yo">Yorùbá</option>
              <option value="ha">Hausa</option>
              <option value="ig">Igbo</option>
            </Select>
          </FormControl>
          <Button borderRadius="full" fontFamily="'Poppins', sans-serif" alignSelf="flex-start">Save</Button>
        </VStack>
      );

    case 'sessions':
      return <SessionsPanel c={c} />;

    case '2fa':
      return (
        <VStack spacing={5} align="stretch">
          <Alert status="info" borderRadius="xl" bg={c.d ? 'rgba(59,130,246,0.08)' : 'blue.50'} border="1px solid" borderColor={c.d ? 'blue.800' : 'blue.200'}>
            <AlertIcon /><AlertDescription fontFamily="'Poppins', sans-serif" fontSize="sm">Two-factor authentication adds an extra layer of security by requiring a code from your phone whenever you sign in.</AlertDescription>
          </Alert>
          <ToggleListPanel c={c} items={[
            { key: '2faEnabled', label: 'Enable two-factor authentication', note: 'You will be prompted for a code on each new login', default: false },
          ]} />
          <Box p={4} bg={c.inputBg} borderRadius="xl" border="1px solid" borderColor={c.border}>
            <Text fontWeight="700" fontSize="sm" color={c.text} fontFamily="'Poppins', sans-serif" mb={1}>Current status</Text>
            <HStack>
              <Badge colorScheme="orange" borderRadius="full" fontFamily="'Poppins', sans-serif">Not enabled</Badge>
              <Text fontSize="xs" color={c.subtle} fontFamily="'Poppins', sans-serif">Enable the toggle above to set up 2FA</Text>
            </HStack>
          </Box>
        </VStack>
      );

    case 'login-history':
      return (
        <VStack spacing={3} align="stretch">
          {[
            { time: 'Today, 09:14',       browser: 'Chrome 126', os: 'Windows 11',  ip: '102.88.xx.xx', location: 'Lagos, NG',    success: true  },
            { time: 'Yesterday, 22:05',   browser: 'Safari 17',  os: 'iOS 17',      ip: '102.89.xx.xx', location: 'Abuja, NG',    success: true  },
            { time: '3 days ago, 14:32',  browser: 'Unknown',    os: 'Unknown',     ip: '45.xx.xx.xx',  location: 'Unknown',      success: false },
          ].map((ev, i) => (
            <HStack key={i} p={4} bg={ev.success ? c.inputBg : (c.d ? 'rgba(239,68,68,0.08)' : 'red.50')}
              borderRadius="xl" border="1px solid" borderColor={ev.success ? c.border : 'red.300'} align="flex-start">
              <Box pt="2px">
                {ev.success ? <MdVerifiedUser size={18} color="#22c55e" /> : <MdWarning size={18} color="#ef4444" />}
              </Box>
              <Box flex="1">
                <Text fontWeight="700" fontSize="sm" color={c.text} fontFamily="'Poppins', sans-serif">{ev.time}</Text>
                <Text fontSize="xs" color={c.subtle} fontFamily="'Poppins', sans-serif">{ev.browser} · {ev.os} · {ev.location}</Text>
                {!ev.success && <Badge colorScheme="red" borderRadius="full" fontSize="8px" mt={1} fontFamily="'Poppins', sans-serif">Failed attempt</Badge>}
              </Box>
            </HStack>
          ))}
        </VStack>
      );

    case 'find-counselors':
      return (
        <VStack spacing={5} align="center" py={8}>
          <MdSupportAgent size={48} color="#7c3aed" />
          <Text fontWeight="700" fontSize="lg" color={c.text} fontFamily="'Poppins', sans-serif" textAlign="center">Find a Counselor</Text>
          <Text fontSize="sm" color={c.subtle} fontFamily="'Poppins', sans-serif" textAlign="center" maxW="320px">
            Browse our directory of verified mental health professionals. All counselors on Wild Diary are credentialed and background-checked.
          </Text>
          <Button as={RouterLink} to="/feed?tab=counselors" borderRadius="full" fontFamily="'Poppins', sans-serif">
            Browse Counselors
          </Button>
        </VStack>
      );

    case 'my-counselors':
      return (
        <VStack spacing={4} align="stretch" py={8} textAlign="center">
          <MdPeople size={48} color={c.subtle} style={{ margin: '0 auto' }} />
          <Text fontWeight="700" color={c.text} fontFamily="'Poppins', sans-serif">No connected counselors yet</Text>
          <Text fontSize="sm" color={c.subtle} fontFamily="'Poppins', sans-serif" maxW="320px" mx="auto">
            Once a counselor responds to your diary or you connect with one, they will appear here.
          </Text>
          <Button as={RouterLink} to="/feed?tab=counselors" variant="outline" borderRadius="full" fontFamily="'Poppins', sans-serif" alignSelf="center">
            Find counselors
          </Button>
        </VStack>
      );

    case 'crisis':
      return <CrisisPanel c={c} />;

    case 'help':
      return <HelpPanel c={c} />;

    case 'community-rules':
      return <PolicyPanel c={c} title="Community Guidelines" content={`Wild Diary is a safe, supportive space for people to share their thoughts, feelings, and experiences. To keep it that way, we ask all members to follow these guidelines:\n\n1. Be kind and supportive — treat every diary entry as you would want your own to be treated.\n\n2. No harassment or hate — discrimination, bullying, or targeted attacks are not tolerated and will result in immediate removal.\n\n3. Do not share personal information — never post someone else's personal details (name, address, phone number) without their consent.\n\n4. No self-harm promotion — content that encourages or glorifies self-harm or suicide will be removed and the account referred to our safety team.\n\n5. Respect anonymity — do not attempt to identify anonymous users. Violation of this rule results in a permanent ban.\n\n6. Keep it real — Wild Diary is not a place for spam, advertising, or misinformation.\n\n7. Report, don't retaliate — if you see content that violates these guidelines, please use the Report function rather than engaging directly.\n\nViolations are reviewed by our moderation team. Serious or repeated violations may result in account suspension or permanent removal.`} />;

    case 'terms':
      return <PolicyPanel c={c} title="Terms of Service" content={`By using Wild Diary, you agree to these terms. Please read them carefully.\n\n1. Eligibility — You must be at least 16 years old to use Wild Diary.\n\n2. Your content — You own the diary entries you post. By posting, you grant Wild Diary a licence to display and distribute your content within the platform.\n\n3. Prohibited conduct — You agree not to post harmful, illegal, or deceptive content, and not to attempt to circumvent platform security.\n\n4. Account security — You are responsible for maintaining the security of your account credentials.\n\n5. Platform changes — Wild Diary reserves the right to modify or discontinue features with reasonable notice.\n\n6. Limitation of liability — Wild Diary is not a medical service and does not provide clinical mental health advice. In a crisis, please contact emergency services.\n\n7. Governing law — These terms are governed by the laws of Nigeria.\n\nLast updated: July 2026`} />;

    case 'privacy-policy':
      return <PolicyPanel c={c} title="Privacy Policy" content={`Your privacy is important to us. This policy explains what data we collect, how we use it, and your rights.\n\nWhat we collect:\n• Account information (username, email, optional phone number)\n• Diary content you post to the platform\n• Usage data (pages visited, features used)\n• Device and browser information\n\nHow we use your data:\n• To operate and improve the Wild Diary platform\n• To match you with relevant counselors (with your consent)\n• To send transactional and optional marketing communications\n• To detect and prevent abuse or security threats\n\nWhat we do NOT do:\n• We do not sell your personal data to third parties\n• We do not share anonymous posts with advertisers\n• We do not use your diary content to train AI models without separate consent\n\nYour rights:\n• Access — request a copy of your data at any time via Settings\n• Deletion — request account and data deletion by contacting us\n• Correction — update your account information in Settings\n• Opt-out — unsubscribe from emails at any time\n\nData is stored on secure servers in the EU. For questions, email privacy@wilddiary.com.\n\nLast updated: July 2026`} />;

    case 'report-problem':
      return <ReportPanel c={c} />;

    default:
      return (
        <Box py={16} textAlign="center">
          <MdSettings size={40} color={c.subtle} style={{ margin: '0 auto 12px' }} />
          <Text color={c.subtle} fontFamily="'Poppins', sans-serif" fontSize="sm">Select an item from the list to see its settings.</Text>
        </Box>
      );
  }
}

// ── Main export ───────────────────────────────────────────────────────────────
export default function Settings() {
  const { user, updateProfile, changePassword, deactivateAccount } = useAuth();
  const { colorMode, toggleColorMode } = useColorMode();
  const navigate = useNavigate();
  const isDark = colorMode === 'dark';

  const [activeSectionId, setActiveSectionId] = useState('account');
  const [activeItemId, setActiveItemId]       = useState('account-info');
  const [search, setSearch]                   = useState('');
  const [mobileView, setMobileView]           = useState('sections'); // 'sections' | 'items' | 'detail'

  const c = useColors();

  const activeSection = SECTIONS.find(s => s.id === activeSectionId);
  const activeItem    = activeSection?.items.find(i => i.id === activeItemId);

  const filteredSections = search.trim()
    ? SECTIONS.filter(s =>
        s.label.toLowerCase().includes(search.toLowerCase()) ||
        s.items.some(i => i.label.toLowerCase().includes(search.toLowerCase()))
      )
    : SECTIONS;

  const selectSection = (id) => {
    setActiveSectionId(id);
    setActiveItemId(SECTIONS.find(s => s.id === id)?.items[0]?.id || '');
    setMobileView('items');
  };

  const selectItem = (id) => {
    setActiveItemId(id);
    setMobileView('detail');
  };

  return (
    <Box bg={c.bg} minH="calc(100vh - 56px)">
      <Flex maxW="1200px" mx="auto" h="calc(100vh - 56px)">

        {/* ── LEFT: Section nav ── */}
        <Box
          w={{ base: '100%', md: '280px' }}
          flexShrink={0}
          borderRight="1px solid"
          borderColor={c.border}
          overflowY="auto"
          py={4} px={3}
          bg={c.panel}
          display={{ base: mobileView === 'sections' ? 'flex' : 'none', md: 'flex' }}
          flexDirection="column"
          gap={1}
          sx={{ '&::-webkit-scrollbar': { width: '0px' } }}
        >
          <Text fontWeight="900" fontSize="xl" color={c.text} fontFamily="'Poppins', sans-serif" px={2} mb={3}>
            Settings
          </Text>

          <InputGroup size="sm" mb={2}>
            <InputLeftElement pointerEvents="none" h="full">
              <MdSearch color={c.subtle} size={16} />
            </InputLeftElement>
            <Input
              placeholder="Search settings…"
              value={search} onChange={e => setSearch(e.target.value)}
              borderRadius="full" bg={c.inputBg} border="none"
              fontFamily="'Poppins', sans-serif" fontSize="sm" color={c.text}
              _focus={{ boxShadow: 'none' }} pl="32px"
            />
          </InputGroup>

          {filteredSections.map(section => {
            const Icon = section.icon;
            const isActive = activeSectionId === section.id;
            return (
              <Box
                key={section.id}
                display="flex" alignItems="center" gap={3}
                p="8px 10px" borderRadius="xl" cursor="pointer"
                bg={isActive ? c.active : 'transparent'}
                color={isActive ? 'brand.500' : c.text}
                _hover={{ bg: isActive ? c.active : c.hover }}
                onClick={() => selectSection(section.id)}
                transition="all 0.15s"
                fontFamily="'Poppins', sans-serif"
              >
                <Flex w="36px" h="36px" borderRadius="full" flexShrink={0}
                  bg={isActive ? (isDark ? 'rgba(124,58,237,0.2)' : 'purple.100') : (isDark ? 'rgba(255,255,255,0.1)' : '#e4e6eb')}
                  align="center" justify="center">
                  <Icon size={18} color={isActive ? '#7c3aed' : (isDark ? '#e4e6eb' : '#65676b')} />
                </Flex>
                <Text fontSize="sm" fontWeight={isActive ? '700' : '600'} fontFamily="'Poppins', sans-serif">
                  {section.label}
                </Text>
              </Box>
            );
          })}
        </Box>

        {/* ── CENTER: Section items ── */}
        <Box
          w={{ base: '100%', md: '340px', lg: '380px' }}
          flexShrink={0}
          borderRight="1px solid"
          borderColor={c.border}
          overflowY="auto"
          bg={c.d ? '#1c1d1f' : '#fafafa'}
          display={{ base: mobileView === 'items' ? 'flex' : 'none', md: 'flex' }}
          flexDirection="column"
          sx={{ '&::-webkit-scrollbar': { width: '0px' } }}
        >
          {/* Mobile back */}
          <Box display={{ base: 'flex', md: 'none' }} p={3}>
            <Button leftIcon={<MdArrowBack size={16} />} variant="ghost" size="sm" onClick={() => setMobileView('sections')} fontFamily="'Poppins', sans-serif">
              Back
            </Button>
          </Box>

          {activeSection && (
            <>
              <Box px={5} pt={5} pb={3}>
                <Text fontWeight="900" fontSize="lg" color={c.text} fontFamily="'Poppins', sans-serif" mb={1}>
                  {activeSection.label}
                </Text>
                <Text fontSize="xs" color={c.subtle} fontFamily="'Poppins', sans-serif" lineHeight="1.6">
                  {activeSection.description}
                </Text>
              </Box>
              <Divider borderColor={c.border} />
              <VStack spacing={0} align="stretch" divider={<Divider borderColor={c.border} />}>
                {activeSection.items.map(item => {
                  const Icon = item.icon;
                  const isActive = activeItemId === item.id;
                  return (
                    <Flex
                      key={item.id}
                      align="center" px={5} py={4} cursor="pointer" gap={3}
                      bg={isActive ? c.active : 'transparent'}
                      _hover={{ bg: isActive ? c.active : c.hover }}
                      onClick={() => selectItem(item.id)}
                      transition="background 0.15s"
                    >
                      <Flex w="38px" h="38px" borderRadius="full" flexShrink={0}
                        bg={isDark ? 'rgba(255,255,255,0.08)' : '#e4e6eb'}
                        align="center" justify="center">
                        <Icon size={18} color={item.danger ? '#ef4444' : (isDark ? '#b0b3b8' : '#65676b')} />
                      </Flex>
                      <Box flex="1" minW={0}>
                        <Text fontWeight="700" fontSize="sm" color={item.danger ? 'red.400' : c.text}
                          fontFamily="'Poppins', sans-serif" noOfLines={1}>
                          {item.label}
                        </Text>
                        <Text fontSize="xs" color={c.subtle} fontFamily="'Poppins', sans-serif" noOfLines={2} lineHeight="1.5" mt={0.5}>
                          {item.description}
                        </Text>
                      </Box>
                      <MdChevronRight size={20} color={isActive ? '#7c3aed' : c.subtle} />
                    </Flex>
                  );
                })}
              </VStack>
            </>
          )}
        </Box>

        {/* ── RIGHT: Detail panel ── */}
        <Box
          flex="1"
          overflowY="auto"
          bg={c.panel}
          display={{ base: mobileView === 'detail' ? 'flex' : 'none', md: 'flex' }}
          flexDirection="column"
          sx={{ '&::-webkit-scrollbar': { width: '4px' } }}
        >
          {/* Mobile back */}
          <Box display={{ base: 'flex', md: 'none' }} p={3}>
            <Button leftIcon={<MdArrowBack size={16} />} variant="ghost" size="sm" onClick={() => setMobileView('items')} fontFamily="'Poppins', sans-serif">
              Back
            </Button>
          </Box>

          {activeItem ? (
            <Box p={6} maxW="600px">
              <Text fontWeight="900" fontSize="lg" color={c.text} fontFamily="'Poppins', sans-serif" mb={1}>
                {activeItem.label}
              </Text>
              <Text fontSize="sm" color={c.subtle} fontFamily="'Poppins', sans-serif" mb={5} lineHeight="1.6">
                {activeItem.description}
              </Text>
              <Divider borderColor={c.border} mb={5} />
              {getDetailContent(activeItemId, { c, user, isDark, toggleColorMode, updateProfile, changePassword, deactivateAccount, navigate })}
            </Box>
          ) : (
            <Flex flex="1" align="center" justify="center" direction="column" gap={3} p={6}>
              <MdSettings size={48} color={c.subtle} />
              <Text color={c.subtle} fontFamily="'Poppins', sans-serif" fontSize="sm" textAlign="center">
                Select a section and item from the left to view its settings.
              </Text>
            </Flex>
          )}
        </Box>
      </Flex>
    </Box>
  );
}
