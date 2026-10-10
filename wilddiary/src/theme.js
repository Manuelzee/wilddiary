import { extendTheme } from '@chakra-ui/react';

const config = {
  initialColorMode: 'light',
  useSystemColorMode: false,
};

// ── Wild Diary system font ──
// Uses the font the device already has installed (San Francisco on iOS/macOS,
// Roboto on Android, Segoe UI on Windows), so no font file is downloaded and
// text matches the operating system. Emoji fonts come last so 💜 etc. render.
export const SYSTEM_FONT = [
  'system-ui', '-apple-system', 'BlinkMacSystemFont', '"Segoe UI"', 'Roboto',
  '"Helvetica Neue"', 'Arial', '"Noto Sans"', 'sans-serif',
  '"Apple Color Emoji"', '"Segoe UI Emoji"', '"Segoe UI Symbol"', '"Noto Color Emoji"',
].join(', ');

export const SYSTEM_MONO_FONT = 'ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, "Liberation Mono", monospace';

const fonts = {
  heading: SYSTEM_FONT,
  body: SYSTEM_FONT,
  mono: SYSTEM_MONO_FONT,
};

const colors = {
  brand: {
    50:  '#f3ebff',
    100: '#e0ccff',
    200: '#c4a3ff',
    300: '#a77aff',
    400: '#8b52ff',
    500: '#7c3aed',
    600: '#6d28d9',
    700: '#5b21b6',
    800: '#4c1d95',
    900: '#3b0764',
  },
};

const styles = {
  global: (props) => ({
    'html, body, #root': {
      fontFamily: 'body',
      margin: 0,
      padding: 0,
    },
    html: {
      // Stop iOS/Android from inflating text sizes after rotation.
      WebkitTextSizeAdjust: '100%',
      textSizeAdjust: '100%',
    },
    body: {
      bg: props.colorMode === 'dark' ? '#000000' : '#ffffff',
      color: props.colorMode === 'dark' ? '#e7e9ea' : '#0f1419',
      lineHeight: 'base',
      // Remove the grey flash on tap in mobile browsers; buttons use their own pressed state.
      WebkitTapHighlightColor: 'transparent',
    },
    '*': {
      boxSizing: 'border-box',
    },
  }),
};

// Shared field styles. 16px text on phones stops iOS Safari from zooming in when a field is tapped.
const fieldText = { fontSize: { base: '16px', md: 'sm' } };

const components = {
  Button: {
    baseStyle: {
      fontWeight: '600',
      borderRadius: '9999px',
      lineHeight: '1.2',
      // Labels never wrap or get squeezed out of the button shape.
      whiteSpace: 'nowrap',
      flexShrink: 0,
      _active: { transform: 'scale(0.97)' },
    },
    // Compact, consistent sizes: the label sits comfortably inside the pill.
    sizes: {
      xs: { h: '28px', minW: '28px', px: '10px', fontSize: '12px', iconSpacing: '4px' },
      sm: { h: '34px', minW: '34px', px: '14px', fontSize: '13px', iconSpacing: '6px' },
      md: { h: '40px', minW: '40px', px: '18px', fontSize: '14px', iconSpacing: '6px' },
      lg: { h: '48px', minW: '48px', px: '24px', fontSize: '16px', iconSpacing: '8px' },
    },
    variants: {
      solid: (props) => ({
        bg: props.colorMode === 'dark' ? 'white' : 'black',
        color: props.colorMode === 'dark' ? 'black' : 'white',
        _hover: {
          bg: props.colorMode === 'dark' ? 'whiteAlpha.800' : 'gray.800',
          opacity: 0.9,
        },
      }),
      outline: (props) => ({
        border: '1px solid',
        borderColor: props.colorMode === 'dark' ? 'whiteAlpha.300' : 'gray.300',
        color: props.colorMode === 'dark' ? 'white' : 'black',
        bg: 'transparent',
        _hover: {
          bg: props.colorMode === 'dark' ? 'whiteAlpha.100' : 'gray.50',
        },
      }),
      brand: {
        bg: 'brand.500',
        color: 'white',
        _hover: { bg: 'brand.600' },
      },
    },
    defaultProps: {
      variant: 'solid',
      size: 'md',
    },
  },
  IconButton: {
    baseStyle: { flexShrink: 0 },
  },
  Input: {
    sizes: {
      sm: { field: fieldText },
      md: { field: fieldText },
    },
    variants: {
      outline: (props) => ({
        field: {
          bg: 'transparent',
          border: '1px solid',
          borderColor: props.colorMode === 'dark' ? 'whiteAlpha.300' : 'gray.300',
          color: props.colorMode === 'dark' ? 'whiteAlpha.900' : 'gray.900',
          borderRadius: '8px',
          _placeholder: {
            color: props.colorMode === 'dark' ? 'whiteAlpha.500' : 'gray.400',
          },
          _focus: {
            borderColor: 'brand.500',
            boxShadow: '0 0 0 1px #7c3aed',
          },
          _hover: {
            borderColor: props.colorMode === 'dark' ? 'whiteAlpha.500' : 'gray.400',
          },
        },
      }),
    },
    defaultProps: { variant: 'outline' },
  },
  Textarea: {
    baseStyle: fieldText,
    sizes: { sm: fieldText, md: fieldText },
  },
  Select: {
    sizes: {
      sm: { field: fieldText },
      md: { field: fieldText },
    },
  },
  FormLabel: {
    baseStyle: (props) => ({
      fontSize: 'sm',
      fontWeight: '600',
      color: props.colorMode === 'dark' ? 'whiteAlpha.900' : 'gray.800',
    }),
  },
  // Smaller headings on phones; desktop sizes unchanged.
  Heading: {
    baseStyle: { letterSpacing: '-0.02em', fontWeight: '700' },
    sizes: {
      '2xl': { fontSize: { base: '3xl', md: '5xl' }, lineHeight: 1.15 },
      xl: { fontSize: { base: '2xl', md: '4xl' }, lineHeight: 1.2 },
      lg: { fontSize: { base: 'xl', md: '3xl' }, lineHeight: 1.25 },
      md: { fontSize: { base: 'lg', md: 'xl' }, lineHeight: 1.3 },
      sm: { fontSize: 'md', lineHeight: 1.35 },
      xs: { fontSize: 'sm', lineHeight: 1.4 },
    },
  },
};

const theme = extendTheme({ config, fonts, colors, styles, components });

export default theme;
