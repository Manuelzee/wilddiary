import { BrowserRouter as Router, Routes, Route, Navigate, useLocation } from 'react-router-dom';
import { Box, Flex } from '@chakra-ui/react';
import { AuthProvider } from './Context/AuthContext';
import { useAuth } from './Context/useAuth';
import { PostProvider } from './Context/PostContext';

// Layout Components
import Navbar from './Components/Navbar';
import ErrorBoundary from './Components/ErrorBoundary';

// Pages - Direct imports for 100% reliable chunk resolution and instant navigation
import Home from './Pages/Home';
import Auth from './Pages/Auth';
import Feed from './Pages/Feed';
import PostDetail from './Pages/PostDetail';
import CreatePost from './Pages/CreatePost';
import Profile from './Pages/Profile';
import Settings from './Pages/Settings';
import Chat from './Pages/Chat';
import Diary from './Pages/Diary';
import DiaryEditor from './Pages/DiaryEditor';
import Insights from './Pages/Insights';
import Counselors from './Pages/Counselors';
import Notifications from './Pages/Notifications';
import Safety from './Pages/Safety';

// ─── Inner layout (reads location for full-bleed homepage & auth detection) ───
function AppLayout() {
  const location = useLocation();
  const { isAuthenticated, loading } = useAuth();

  if (loading) {
    return <Flex minH="100dvh" align="center" justify="center" fontFamily="'Poppins', sans-serif">Restoring your session…</Flex>;
  }

  // Unauthenticated homepage and auth page get full-bleed — no Navbar/footer wrapping
  const isHomePage = location.pathname === '/';
  const isFeedPage  = location.pathname === '/feed';
  const isAuthPage  = location.pathname === '/auth';
  const isFullBleed = (isHomePage && !isAuthenticated) || isAuthPage;

  // Pages that manage their own width constraints
  const isNoConstraint = isHomePage || isFeedPage || location.pathname === '/settings' || location.pathname === '/chat' || location.pathname === '/ai' || isAuthPage;

  const routesElement = (
    <Routes>
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
    </Routes>
  );

  if (isFullBleed) {
    return (
      <ErrorBoundary>
        {routesElement}
      </ErrorBoundary>
    );
  }

  return (
    <ErrorBoundary>
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
          {routesElement}
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
              <Box as="a" href="/safety" _hover={{ color: 'brand.400' }} transition="color 0.2s">
                Safety Center
              </Box>
              <Box as="a" href="/counselors" _hover={{ color: 'brand.400' }} transition="color 0.2s">
                Counselors
              </Box>
              <Box as="a" href="/safety" _hover={{ color: 'brand.400' }} transition="color 0.2s">
                Get Immediate Help
              </Box>
            </Flex>
          </Flex>
        </Box>
      </Flex>
    </ErrorBoundary>
  );
}

function ProtectedRoute({ children }) {
  const location = useLocation();
  const { isAuthenticated, loading } = useAuth();

  if (loading) {
    return <Flex flex="1" align="center" justify="center" fontFamily="'Poppins', sans-serif">Restoring your session…</Flex>;
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
