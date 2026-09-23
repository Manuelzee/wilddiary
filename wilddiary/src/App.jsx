import { BrowserRouter as Router, Routes, Route, Navigate, useLocation } from 'react-router-dom';
import { Box, Flex } from '@chakra-ui/react';
import { AuthProvider } from './Context/AuthContext';
import { useAuth } from './Context/useAuth';
import { PostProvider } from './Context/PostContext';

// Layout Components
import Navbar from './Components/Navbar';

// Pages
import { lazy, Suspense } from 'react';

const Home = lazy(() => import('./Pages/Home'));
const Auth = lazy(() => import('./Pages/Auth'));
const Feed = lazy(() => import('./Pages/Feed'));
const PostDetail = lazy(() => import('./Pages/PostDetail'));
const CreatePost = lazy(() => import('./Pages/CreatePost'));
const Profile = lazy(() => import('./Pages/Profile'));
const Settings = lazy(() => import('./Pages/Settings'));
const Chat = lazy(() => import('./Pages/Chat'));
const Diary = lazy(() => import('./Pages/Diary'));
const DiaryEditor = lazy(() => import('./Pages/DiaryEditor'));
const Insights = lazy(() => import('./Pages/Insights'));
const Counselors = lazy(() => import('./Pages/Counselors'));
const Notifications = lazy(() => import('./Pages/Notifications'));
const Safety = lazy(() => import('./Pages/Safety'));

// ─── Inner layout (reads location for full-bleed homepage detection) ──────────
function AppLayout() {
  const location = useLocation();
  const { isAuthenticated, loading } = useAuth();

  if (loading) {
    return <Flex minH="100dvh" align="center" justify="center">Restoring your session…</Flex>;
  }

  // Unauthenticated homepage and auth page get full-bleed — no Navbar/footer wrapping
  const isHomePage = location.pathname === '/';
  const isFeedPage  = location.pathname === '/feed';
  const isAuthPage  = location.pathname === '/auth';
  const isFullBleed = (isHomePage && !isAuthenticated) || isAuthPage;

  if (isFullBleed) {
    return (
      <Suspense fallback={<Flex flex="1" align="center" justify="center">Loading Wild Diary…</Flex>}><Routes>
        <Route path="/" element={<Home />} />
        <Route path="/auth" element={<Auth />} />
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes></Suspense>
    );
  }

  // Feed page manages its own 3-column layout — give it the full viewport width
  const isNoConstraint = isHomePage || isFeedPage || location.pathname === '/settings' || location.pathname === '/chat' || location.pathname === '/auth';

  return (
    <Flex direction="column" minH="100dvh">
      <Navbar />

      <Box
        as="main"
        flex="1"
        display="flex"
        flexDirection="column"
        maxW={isNoConstraint ? '100%' : '5xl'}
        mx={isNoConstraint ? 0 : 'auto'}
        w="100%"
        px={isNoConstraint ? 0 : { base: 4, md: 6, lg: 8 }}
      >
        <Suspense fallback={<Flex flex="1" align="center" justify="center">Loading Wild Diary…</Flex>}><Routes>
          <Route path="/" element={<Home />} />
          <Route path="/auth" element={<Auth />} />
          <Route path="/feed" element={<Feed />} />
          <Route path="/post/:id" element={<PostDetail />} />
          <Route path="/create" element={<ProtectedRoute><CreatePost /></ProtectedRoute>} />
          <Route path="/profile" element={<ProtectedRoute><Profile /></ProtectedRoute>} />
          <Route path="/settings" element={<ProtectedRoute><Settings /></ProtectedRoute>} />
          <Route path="/chat" element={<ProtectedRoute><Chat /></ProtectedRoute>} />
          <Route path="/ai" element={<ProtectedRoute><Chat /></ProtectedRoute>} />
          <Route path="/diary" element={<ProtectedRoute><Diary /></ProtectedRoute>} />
          <Route path="/diary/:id" element={<ProtectedRoute><DiaryEditor /></ProtectedRoute>} />
          <Route path="/insights" element={<ProtectedRoute><Insights /></ProtectedRoute>} />
          <Route path="/counselors" element={<Counselors />} />
          <Route path="/notifications" element={<ProtectedRoute><Notifications /></ProtectedRoute>} />
          <Route path="/safety" element={<Safety />} />
          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes></Suspense>
      </Box>

      {/* Footer */}
      <Box
        as="footer"
        borderTop="1px solid"
        borderColor="whiteAlpha.100"
        py={5}
        px={6}
        fontSize="xs"
        color="gray.500"
      >
        <Flex maxW="5xl" mx="auto" align="center" justify="space-between" flexWrap="wrap" gap={2}>
          <Box fontFamily="'Poppins', sans-serif">
            © {new Date().getFullYear()} Wild Diary. A safe social harbor.
          </Box>
          <Flex gap={4} fontFamily="'Poppins', sans-serif">
            {['Privacy', 'Community Rules', 'Get Immediate Help'].map((label) => (
              <Box
                key={label}
                as="a"
                href="#"
                _hover={{ color: 'brand.400' }}
                transition="color 0.2s"
              >
                {label}
              </Box>
            ))}
          </Flex>
        </Flex>
      </Box>
    </Flex>
  );
}

function ProtectedRoute({ children }) {
  const location = useLocation();
  const { isAuthenticated, loading } = useAuth();

  if (loading) {
    return <Flex flex="1" align="center" justify="center">Restoring your session…</Flex>;
  }
  if (!isAuthenticated) {
    return <Navigate to="/auth" replace state={{ from: location }} />;
  }
  return children;
}

function App() {
  return (
    <AuthProvider>
      <PostProvider>
        <Router>
          <AppLayout />
        </Router>
      </PostProvider>
    </AuthProvider>
  );
}

export default App;
