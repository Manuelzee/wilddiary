import { extendTheme } from '@chakra-ui/react';

const config = {
  initialColorMode: 'light',
  useSystemColorMode: false,
};

const fonts = {
  heading: `'Poppins', sans-serif`,
  body: `'Poppins', sans-serif`,
  mono: `'Poppins', monospace`,
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
      fontFamily: `'Poppins', sans-serif`,
      margin: 0,
      padding: 0,
    },
    body: {
      bg: props.colorMode === 'dark' ? '#000000' : '#ffffff',
      color: props.colorMode === 'dark' ? '#e7e9ea' : '#0f1419',
    },
    '*': {
      boxSizing: 'border-box',
    },
  }),
};

const components = {
  Button: {
    baseStyle: {
      fontFamily: `'Poppins', sans-serif`,
      fontWeight: '700',
      borderRadius: '9999px',
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
    },
  },
  Input: {
    variants: {
      outline: (props) => ({
        field: {
          fontFamily: `'Poppins', sans-serif`,
          bg: 'transparent',
          border: '1px solid',
          borderColor: props.colorMode === 'dark' ? 'whiteAlpha.300' : 'gray.300',
          color: 'black',
          borderRadius: '4px',
          _placeholder: {
            color: 'gray.400',
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
  FormLabel: {
    baseStyle: {
      fontFamily: `'Poppins', sans-serif`,
      fontSize: 'sm',
      fontWeight: '500',
      color: 'black',
    },
  },
};

const theme = extendTheme({ config, fonts, colors, styles, components });

export default theme;
