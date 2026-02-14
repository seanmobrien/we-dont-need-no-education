'use client';
import React from 'react';
import Box from '@mui/material/Box';
import Container from '@mui/material/Container';
import Typography from '@mui/material/Typography';
import Button from '@mui/material/Button';
import Paper from '@mui/material/Paper';
import { useTheme } from '@mui/material/styles';
import useMediaQuery from '@mui/material/useMediaQuery';
import { useRouter } from 'next/navigation';
import HomeIcon from '@mui/icons-material/Home';
import SearchIcon from '@mui/icons-material/Search';
import ArrowBackIcon from '@mui/icons-material/ArrowBack';
import ErrorOutlineIcon from '@mui/icons-material/ErrorOutline';
export default function Unauthorized() {
    const router = useRouter();
    const theme = useTheme();
    const isMobile = useMediaQuery(theme.breakpoints.down('sm'));
    const handleGoHome = () => {
        router.push('/');
    };
    const handleGoBack = () => {
        router.back();
    };
    const handleSearch = () => {
        router.push('/messages');
    };
    return (<Container maxWidth="md">
      <Box sx={{
            minHeight: '100vh',
            display: 'flex',
            flexDirection: 'column',
            justifyContent: 'center',
            alignItems: 'center',
            textAlign: 'center',
            py: 4,
        }}>
        <Paper elevation={6} sx={{
            p: 4,
            borderRadius: 3,
            maxWidth: 600,
            width: '100%',
            background: theme.palette.mode === 'dark'
                ? 'linear-gradient(135deg, #1e1e1e 0%, #2d2d2d 100%)'
                : 'linear-gradient(135deg, #ffffff 0%, #f5f5f5 100%)',
        }}>
          
          <Box sx={{ mb: 3 }}>
            <ErrorOutlineIcon sx={{
            fontSize: isMobile ? 80 : 120,
            color: theme.palette.primary.main,
            opacity: 0.8,
        }}/>
          </Box>

          
          <Typography variant={isMobile ? 'h3' : 'h2'} component="h1" gutterBottom sx={{
            fontWeight: 700,
            background: `linear-gradient(45deg, ${theme.palette.primary.main}, ${theme.palette.secondary.main})`,
            backgroundClip: 'text',
            WebkitBackgroundClip: 'text',
            WebkitTextFillColor: 'transparent',
            mb: 2,
        }}>
            403
          </Typography>

          
          <Typography variant="h5" component="h2" gutterBottom sx={{
            fontWeight: 500,
            color: theme.palette.text.primary,
            mb: 2,
        }}>
            Unauthorized Access
          </Typography>

          
          <Typography variant="body1" color="text.secondary" sx={{
            mb: 4,
            lineHeight: 1.6,
            maxWidth: 400,
            mx: 'auto',
        }}>
            You do not have permission to access this page. It may have been
            moved or is restricted. Let&apos;s get you back on track with your
            case management.
          </Typography>

          
          <Box sx={{
            display: 'flex',
            gap: 2,
            justifyContent: 'center',
            flexDirection: isMobile ? 'column' : 'row',
            alignItems: 'center',
        }}>
            <Button variant="contained" size="large" startIcon={<HomeIcon />} onClick={handleGoHome} sx={{
            px: 3,
            py: 1.5,
            borderRadius: 2,
            textTransform: 'none',
            minWidth: isMobile ? '100%' : 160,
        }}>
              Go Home
            </Button>

            <Button variant="outlined" size="large" startIcon={<SearchIcon />} onClick={handleSearch} sx={{
            px: 3,
            py: 1.5,
            borderRadius: 2,
            textTransform: 'none',
            minWidth: isMobile ? '100%' : 160,
        }}>
              Search Cases
            </Button>

            <Button variant="text" size="large" startIcon={<ArrowBackIcon />} onClick={handleGoBack} sx={{
            px: 3,
            py: 1.5,
            borderRadius: 2,
            textTransform: 'none',
            minWidth: isMobile ? '100%' : 160,
        }}>
              Go Back
            </Button>
          </Box>
        </Paper>

        
        <Typography variant="body2" color="text.secondary" sx={{
            mt: 3,
            opacity: 0.7,
        }}>
          Need help? Contact support or check the documentation.
        </Typography>
      </Box>
    </Container>);
}
//# sourceMappingURL=unauthorized.jsx.map