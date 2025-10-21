'use client';
import { Box, Button, Container, Typography, Grid, Card, CardContent, useTheme } from '@mui/material';
import { useSession } from 'next-auth/react';
import { useRouter } from 'next/navigation';
import Image from 'next/image';
import {
  Email as EmailIcon,
  Chat as ChatIcon,
  Search as SearchIcon,
  Assessment as AssessmentIcon,
  Security as SecurityIcon,
  Storage as StorageIcon,
} from '@mui/icons-material';

export default function Home() {
  const { data: session } = useSession();
  const router = useRouter();
  const theme = useTheme();

  const handleGetStarted = () => {
    if (session) {
      router.push('/messages');
    } else {
      router.push('/auth/signin');
    }
  };

  const features = [
    {
      icon: <EmailIcon sx={{ fontSize: 48, color: 'var(--color-primary-main)' }} />,
      title: 'Email Evidence Management',
      description: 'Import, organize, and analyze email communications to build comprehensive cases from institutional correspondence.',
    },
    {
      icon: <ChatIcon sx={{ fontSize: 48, color: 'var(--color-primary-main)' }} />,
      title: 'AI-Powered Analysis',
      description: 'Leverage advanced AI to identify Title IX violations, institutional failures, and critical evidence in school communications.',
    },
    {
      icon: <SearchIcon sx={{ fontSize: 48, color: 'var(--color-primary-main)' }} />,
      title: 'Smart Document Search',
      description: 'Semantic search capabilities find similar patterns of institutional misconduct across all your evidence.',
    },
    {
      icon: <AssessmentIcon sx={{ fontSize: 48, color: 'var(--color-primary-main)' }} />,
      title: 'Case Building Dashboard',
      description: 'Real-time monitoring of evidence analysis and case strength with comprehensive reporting tools.',
    },
    {
      icon: <SecurityIcon sx={{ fontSize: 48, color: 'var(--color-primary-main)' }} />,
      title: 'Privacy-First Design',
      description: 'Your data is encrypted at rest and in transit. We never sell, mine, or share your information with third parties.',
    },
    {
      icon: <StorageIcon sx={{ fontSize: 48, color: 'var(--color-primary-main)' }} />,
      title: 'Self-Hosting Available',
      description: 'Complete control over your data with the ability to self-host the entire platform on your own infrastructure.',
    },
  ];

  return (
    <Box
      sx={{
        minHeight: '100vh',
        background: theme.palette.mode === 'dark' 
          ? 'linear-gradient(180deg, #0a0a0a 0%, #1a1a1a 100%)'
          : 'linear-gradient(180deg, #ffffff 0%, #f5f5f5 100%)',
      }}
    >
      {/* Hero Section */}
      <Container maxWidth="lg">
        <Box
          sx={{
            pt: { xs: 8, md: 12 },
            pb: { xs: 6, md: 10 },
            textAlign: 'center',
          }}
        >
          <Box sx={{ mb: 4, display: 'flex', justifyContent: 'center' }}>
            <Image
              src={theme.palette.mode === 'dark' ? '/static/logo/logo-dark.png' : '/static/logo/logo-light.png'}
              alt="Title IX Advocacy Platform"
              width={200}
              height={200}
              priority
              style={{ maxWidth: '200px', height: 'auto' }}
            />
          </Box>
          
          <Typography
            variant="h2"
            component="h1"
            sx={{
              fontWeight: 700,
              mb: 3,
              fontSize: { xs: '2rem', md: '3.5rem' },
              background: 'linear-gradient(135deg, var(--color-primary-main) 0%, var(--color-secondary-main) 100%)',
              WebkitBackgroundClip: 'text',
              WebkitTextFillColor: 'transparent',
              backgroundClip: 'text',
            }}
          >
            Title IX Victim Advocacy Platform
          </Typography>

          <Typography
            variant="h5"
            sx={{
              mb: 4,
              color: 'text.secondary',
              maxWidth: '800px',
              mx: 'auto',
              fontSize: { xs: '1.1rem', md: '1.5rem' },
            }}
          >
            Empowering victims, families, and advocates to fight back against educational institutions that mishandle Title IX cases
          </Typography>

          <Box sx={{ display: 'flex', gap: 2, justifyContent: 'center', flexWrap: 'wrap' }}>
            <Button
              variant="contained"
              size="large"
              onClick={handleGetStarted}
              sx={{
                bgcolor: 'var(--color-primary-main)',
                color: '#000',
                px: 4,
                py: 1.5,
                fontSize: '1.1rem',
                '&:hover': {
                  bgcolor: 'var(--color-primary-accent)',
                },
              }}
            >
              Get Started
            </Button>
            <Button
              variant="outlined"
              size="large"
              onClick={() => router.push('/privacy')}
              sx={{
                borderColor: 'var(--color-primary-main)',
                color: 'var(--color-primary-main)',
                px: 4,
                py: 1.5,
                fontSize: '1.1rem',
                '&:hover': {
                  borderColor: 'var(--color-primary-accent)',
                  bgcolor: 'rgba(25, 191, 207, 0.1)',
                },
              }}
            >
              Learn More
            </Button>
          </Box>
        </Box>

        {/* Why This Platform Section */}
        <Box sx={{ py: { xs: 6, md: 10 } }}>
          <Typography
            variant="h3"
            component="h2"
            sx={{
              textAlign: 'center',
              mb: 3,
              fontWeight: 600,
            }}
          >
            Why We Built This
          </Typography>
          <Typography
            variant="body1"
            sx={{
              textAlign: 'center',
              maxWidth: '900px',
              mx: 'auto',
              mb: 6,
              fontSize: '1.1rem',
              lineHeight: 1.8,
              color: 'text.secondary',
            }}
          >
            When educational institutions suppress or improperly process instances of abuse, harassment, or other illegal activity, 
            victims and families are often left without resources to fight back. This platform levels the playing field by providing 
            advanced AI-powered document analysis capabilities that would typically require expensive legal teams. We believe every 
            victim deserves access to powerful tools to hold institutions accountable.
          </Typography>
        </Box>

        {/* Features Grid */}
        <Box sx={{ py: { xs: 6, md: 10 } }}>
          <Typography
            variant="h3"
            component="h2"
            sx={{
              textAlign: 'center',
              mb: 6,
              fontWeight: 600,
            }}
          >
            Powerful Features for Advocacy
          </Typography>
          
          <Grid container spacing={4}>
            {features.map((feature, index) => (
              <Grid item xs={12} md={6} lg={4} key={index}>
                <Card
                  sx={{
                    height: '100%',
                    bgcolor: theme.palette.mode === 'dark' ? 'var(--color-surface-primary)' : '#fff',
                    borderRadius: 2,
                    border: '1px solid',
                    borderColor: theme.palette.mode === 'dark' ? 'var(--color-border-main)' : '#e0e0e0',
                    transition: 'all 0.3s ease',
                    '&:hover': {
                      transform: 'translateY(-4px)',
                      borderColor: 'var(--color-primary-main)',
                      boxShadow: `0 8px 24px ${theme.palette.mode === 'dark' ? 'rgba(25, 191, 207, 0.2)' : 'rgba(0, 0, 0, 0.1)'}`,
                    },
                  }}
                >
                  <CardContent sx={{ p: 3 }}>
                    <Box sx={{ mb: 2 }}>
                      {feature.icon}
                    </Box>
                    <Typography variant="h5" component="h3" sx={{ mb: 2, fontWeight: 600 }}>
                      {feature.title}
                    </Typography>
                    <Typography variant="body2" color="text.secondary" sx={{ lineHeight: 1.7 }}>
                      {feature.description}
                    </Typography>
                  </CardContent>
                </Card>
              </Grid>
            ))}
          </Grid>
        </Box>

        {/* Technology Stack Section */}
        <Box sx={{ py: { xs: 6, md: 10 } }}>
          <Typography
            variant="h3"
            component="h2"
            sx={{
              textAlign: 'center',
              mb: 3,
              fontWeight: 600,
            }}
          >
            Built on Modern Technology
          </Typography>
          <Typography
            variant="body1"
            sx={{
              textAlign: 'center',
              maxWidth: '900px',
              mx: 'auto',
              mb: 6,
              fontSize: '1.1rem',
              lineHeight: 1.8,
              color: 'text.secondary',
            }}
          >
            Our platform combines cutting-edge AI technology with robust security and privacy protections:
          </Typography>
          <Grid container spacing={3} sx={{ maxWidth: '800px', mx: 'auto' }}>
            <Grid item xs={12} sm={6}>
              <Box sx={{ textAlign: 'center', p: 2 }}>
                <Typography variant="h6" sx={{ mb: 1, color: 'var(--color-primary-main)' }}>
                  AI-Powered Intelligence
                </Typography>
                <Typography variant="body2" color="text.secondary">
                  Azure OpenAI and LangChain4j for sophisticated evidence analysis
                </Typography>
              </Box>
            </Grid>
            <Grid item xs={12} sm={6}>
              <Box sx={{ textAlign: 'center', p: 2 }}>
                <Typography variant="h6" sx={{ mb: 1, color: 'var(--color-primary-main)' }}>
                  Secure Infrastructure
                </Typography>
                <Typography variant="body2" color="text.secondary">
                  PostgreSQL with encryption at rest and in transit
                </Typography>
              </Box>
            </Grid>
            <Grid item xs={12} sm={6}>
              <Box sx={{ textAlign: 'center', p: 2 }}>
                <Typography variant="h6" sx={{ mb: 1, color: 'var(--color-primary-main)' }}>
                  Modern Web Stack
                </Typography>
                <Typography variant="body2" color="text.secondary">
                  Next.js 15, TypeScript, and Material UI for a seamless experience
                </Typography>
              </Box>
            </Grid>
            <Grid item xs={12} sm={6}>
              <Box sx={{ textAlign: 'center', p: 2 }}>
                <Typography variant="h6" sx={{ mb: 1, color: 'var(--color-primary-main)' }}>
                  Open Source
                </Typography>
                <Typography variant="body2" color="text.secondary">
                  Fully open-source and available for self-hosting
                </Typography>
              </Box>
            </Grid>
          </Grid>
        </Box>

        {/* CTA Section */}
        <Box
          sx={{
            py: { xs: 8, md: 12 },
            textAlign: 'center',
          }}
        >
          <Typography
            variant="h3"
            component="h2"
            sx={{
              mb: 3,
              fontWeight: 600,
            }}
          >
            Ready to Take Action?
          </Typography>
          <Typography
            variant="body1"
            sx={{
              mb: 4,
              fontSize: '1.1rem',
              color: 'text.secondary',
              maxWidth: '700px',
              mx: 'auto',
            }}
          >
            Join victims and advocates using AI-powered tools to hold educational institutions accountable for Title IX violations.
          </Typography>
          <Button
            variant="contained"
            size="large"
            onClick={handleGetStarted}
            sx={{
              bgcolor: 'var(--color-secondary-main)',
              color: '#fff',
              px: 5,
              py: 2,
              fontSize: '1.2rem',
              '&:hover': {
                bgcolor: 'var(--color-secondary-light)',
              },
            }}
          >
            Get Started Now
          </Button>
        </Box>

        {/* Footer */}
        <Box
          sx={{
            borderTop: '1px solid',
            borderColor: theme.palette.mode === 'dark' ? 'var(--color-border-main)' : '#e0e0e0',
            py: 4,
            textAlign: 'center',
          }}
        >
          <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
            Open Source • Privacy-First • Self-Hostable
          </Typography>
          <Box sx={{ display: 'flex', gap: 3, justifyContent: 'center', flexWrap: 'wrap' }}>
            <Button
              variant="text"
              size="small"
              href="https://github.com/seanmobrien/we-dont-need-no-education"
              target="_blank"
              sx={{ color: 'var(--color-primary-main)' }}
            >
              GitHub Repository
            </Button>
            <Button
              variant="text"
              size="small"
              href="https://github.com/seanmobrien/mem0"
              target="_blank"
              sx={{ color: 'var(--color-primary-main)' }}
            >
              Memory System (mem0)
            </Button>
            <Button
              variant="text"
              size="small"
              onClick={() => router.push('/privacy')}
              sx={{ color: 'var(--color-primary-main)' }}
            >
              Privacy Policy
            </Button>
          </Box>
        </Box>
      </Container>
    </Box>
  );
}
