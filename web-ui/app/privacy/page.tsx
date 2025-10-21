'use client';
import { Box, Container, Typography, Paper, Divider, useTheme, Button } from '@mui/material';
import { useRouter } from 'next/navigation';
import Image from 'next/image';
import {
  Security as SecurityIcon,
  Lock as LockIcon,
  CloudOff as CloudOffIcon,
  Code as CodeIcon,
} from '@mui/icons-material';

export default function PrivacyPolicy() {
  const router = useRouter();
  const theme = useTheme();

  return (
    <Box
      sx={{
        minHeight: '100vh',
        background: theme.palette.mode === 'dark' 
          ? 'linear-gradient(180deg, #0a0a0a 0%, #1a1a1a 100%)'
          : 'linear-gradient(180deg, #ffffff 0%, #f5f5f5 100%)',
        py: 4,
      }}
    >
      <Container maxWidth="md">
        {/* Header */}
        <Box sx={{ textAlign: 'center', mb: 6 }}>
          <Button
            variant="text"
            onClick={() => router.push('/')}
            sx={{ mb: 2, color: 'var(--color-primary-main)' }}
          >
            ← Back to Home
          </Button>
          <Box sx={{ mb: 3, display: 'flex', justifyContent: 'center' }}>
            <Image
              src={theme.palette.mode === 'dark' ? '/static/logo/logo-dark.png' : '/static/logo/logo-light.png'}
              alt="Title IX Advocacy Platform"
              width={100}
              height={100}
              style={{ maxWidth: '100px', height: 'auto' }}
            />
          </Box>
          <Typography
            variant="h3"
            component="h1"
            sx={{
              fontWeight: 700,
              mb: 2,
              background: 'linear-gradient(135deg, var(--color-primary-main) 0%, var(--color-secondary-main) 100%)',
              WebkitBackgroundClip: 'text',
              WebkitTextFillColor: 'transparent',
              backgroundClip: 'text',
            }}
          >
            Privacy Policy
          </Typography>
          <Typography variant="subtitle1" color="text.secondary">
            Last Updated: {new Date().toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' })}
          </Typography>
        </Box>

        <Paper
          sx={{
            p: { xs: 3, md: 5 },
            bgcolor: theme.palette.mode === 'dark' ? 'var(--color-surface-primary)' : '#fff',
            borderRadius: 2,
            border: '1px solid',
            borderColor: theme.palette.mode === 'dark' ? 'var(--color-border-main)' : '#e0e0e0',
          }}
        >
          {/* Introduction */}
          <Box sx={{ mb: 5 }}>
            <Typography variant="body1" sx={{ mb: 3, lineHeight: 1.8 }}>
              The Title IX Victim Advocacy Platform is committed to protecting the privacy and security of victims, 
              families, and advocates who use our services. This Privacy Policy outlines our practices regarding the 
              collection, use, storage, and protection of your personal information.
            </Typography>
            <Typography variant="body1" sx={{ lineHeight: 1.8 }}>
              We understand the sensitive nature of Title IX cases and have implemented comprehensive security measures 
              to ensure your data remains private, secure, and under your control at all times.
            </Typography>
          </Box>

          <Divider sx={{ my: 4 }} />

          {/* Data Security */}
          <Box sx={{ mb: 5 }}>
            <Box sx={{ display: 'flex', alignItems: 'center', mb: 2 }}>
              <SecurityIcon sx={{ fontSize: 32, color: 'var(--color-primary-main)', mr: 2 }} />
              <Typography variant="h5" component="h2" sx={{ fontWeight: 600 }}>
                Data Security & Encryption
              </Typography>
            </Box>
            <Typography variant="body1" sx={{ mb: 2, lineHeight: 1.8 }}>
              Your data security is our highest priority. We implement industry-leading security practices:
            </Typography>
            <Box component="ul" sx={{ pl: 3, '& li': { mb: 1.5, lineHeight: 1.8 } }}>
              <li>
                <Typography variant="body1">
                  <strong>Encryption at Rest:</strong> All data stored in our database is encrypted using advanced 
                  encryption standards, ensuring that your information remains secure even at the storage level.
                </Typography>
              </li>
              <li>
                <Typography variant="body1">
                  <strong>Encryption in Transit:</strong> All data transmitted between your device and our servers 
                  is encrypted using TLS/SSL protocols, protecting your information from interception during transmission.
                </Typography>
              </li>
              <li>
                <Typography variant="body1">
                  <strong>Secure Authentication:</strong> We use industry-standard OAuth 2.0 and OpenID Connect protocols 
                  for authentication, ensuring secure access to your account.
                </Typography>
              </li>
              <li>
                <Typography variant="body1">
                  <strong>Access Controls:</strong> Strict access controls ensure that only you can access your evidence 
                  and case data. Our team cannot access your private information without your explicit permission.
                </Typography>
              </li>
            </Box>
          </Box>

          <Divider sx={{ my: 4 }} />

          {/* Data Usage */}
          <Box sx={{ mb: 5 }}>
            <Box sx={{ display: 'flex', alignItems: 'center', mb: 2 }}>
              <LockIcon sx={{ fontSize: 32, color: 'var(--color-primary-main)', mr: 2 }} />
              <Typography variant="h5" component="h2" sx={{ fontWeight: 600 }}>
                How We Use Your Data
              </Typography>
            </Box>
            <Typography variant="body1" sx={{ mb: 2, lineHeight: 1.8 }}>
              We collect and process personal information solely to provide and improve our advocacy services:
            </Typography>
            <Box component="ul" sx={{ pl: 3, '& li': { mb: 1.5, lineHeight: 1.8 } }}>
              <li>
                <Typography variant="body1">
                  <strong>Evidence Analysis:</strong> Your uploaded documents and emails are processed using AI to 
                  identify Title IX violations and institutional failures, helping you build a stronger case.
                </Typography>
              </li>
              <li>
                <Typography variant="body1">
                  <strong>Account Management:</strong> We collect basic account information (email address, name) 
                  necessary to provide you access to the platform and maintain your account security.
                </Typography>
              </li>
              <li>
                <Typography variant="body1">
                  <strong>Service Improvement:</strong> We may use aggregated, anonymized data to improve our AI 
                  models and platform features, but your personal case information is never used for this purpose 
                  without your explicit consent.
                </Typography>
              </li>
            </Box>
          </Box>

          <Divider sx={{ my: 4 }} />

          {/* Data Sharing */}
          <Box sx={{ mb: 5 }}>
            <Box sx={{ display: 'flex', alignItems: 'center', mb: 2 }}>
              <CloudOffIcon sx={{ fontSize: 32, color: 'var(--color-secondary-main)', mr: 2 }} />
              <Typography variant="h5" component="h2" sx={{ fontWeight: 600 }}>
                We Never Sell or Share Your Data
              </Typography>
            </Box>
            <Typography variant="body1" sx={{ mb: 2, lineHeight: 1.8, fontWeight: 500 }}>
              We want to be absolutely clear about this commitment:
            </Typography>
            <Box component="ul" sx={{ pl: 3, '& li': { mb: 1.5, lineHeight: 1.8 } }}>
              <li>
                <Typography variant="body1">
                  <strong>No Data Sales:</strong> We will never sell your personal information or case data to third 
                  parties under any circumstances.
                </Typography>
              </li>
              <li>
                <Typography variant="body1">
                  <strong>No Data Mining:</strong> Your evidence and case information will not be mined, analyzed, 
                  or used for any purpose other than providing advocacy services to you.
                </Typography>
              </li>
              <li>
                <Typography variant="body1">
                  <strong>No Third-Party Sharing:</strong> We do not share your personal information with outside 
                  parties except as required by law or with your explicit consent.
                </Typography>
              </li>
              <li>
                <Typography variant="body1">
                  <strong>AI Processing:</strong> While we use Azure OpenAI for document analysis, your data is 
                  processed in accordance with strict privacy agreements and is not used to train public AI models.
                </Typography>
              </li>
            </Box>
          </Box>

          <Divider sx={{ my: 4 }} />

          {/* Self-Hosting */}
          <Box sx={{ mb: 5 }}>
            <Box sx={{ display: 'flex', alignItems: 'center', mb: 2 }}>
              <CodeIcon sx={{ fontSize: 32, color: 'var(--color-primary-main)', mr: 2 }} />
              <Typography variant="h5" component="h2" sx={{ fontWeight: 600 }}>
                Self-Hosting Option
              </Typography>
            </Box>
            <Typography variant="body1" sx={{ mb: 2, lineHeight: 1.8 }}>
              For users who require complete control over their data, our platform is fully open-source and available 
              for self-hosting:
            </Typography>
            <Box component="ul" sx={{ pl: 3, '& li': { mb: 1.5, lineHeight: 1.8 } }}>
              <li>
                <Typography variant="body1">
                  <strong>Complete Control:</strong> By self-hosting, you maintain complete control over your data, 
                  infrastructure, and security policies.
                </Typography>
              </li>
              <li>
                <Typography variant="body1">
                  <strong>Open Source:</strong> The entire platform codebase is available on GitHub, allowing you 
                  to review, audit, and customize the software to meet your specific needs.
                </Typography>
              </li>
              <li>
                <Typography variant="body1">
                  <strong>Resources:</strong> Visit our GitHub repositories for setup instructions and documentation:
                </Typography>
                <Box sx={{ pl: 2, mt: 1 }}>
                  <Typography variant="body2" sx={{ mb: 0.5 }}>
                    • <a 
                      href="https://github.com/seanmobrien/we-dont-need-no-education" 
                      target="_blank" 
                      rel="noopener noreferrer"
                      style={{ color: 'var(--color-primary-main)', textDecoration: 'none' }}
                    >
                      Main Platform Repository
                    </a>
                  </Typography>
                  <Typography variant="body2">
                    • <a 
                      href="https://github.com/seanmobrien/mem0" 
                      target="_blank" 
                      rel="noopener noreferrer"
                      style={{ color: 'var(--color-primary-main)', textDecoration: 'none' }}
                    >
                      Memory System (mem0)
                    </a>
                  </Typography>
                </Box>
              </li>
            </Box>
          </Box>

          <Divider sx={{ my: 4 }} />

          {/* Data Retention */}
          <Box sx={{ mb: 5 }}>
            <Typography variant="h5" component="h2" sx={{ fontWeight: 600, mb: 2 }}>
              Data Retention & Deletion
            </Typography>
            <Typography variant="body1" sx={{ mb: 2, lineHeight: 1.8 }}>
              You have full control over your data:
            </Typography>
            <Box component="ul" sx={{ pl: 3, '& li': { mb: 1.5, lineHeight: 1.8 } }}>
              <li>
                <Typography variant="body1">
                  <strong>Retention Period:</strong> We retain your case data for as long as your account is active 
                  or as needed to provide you services.
                </Typography>
              </li>
              <li>
                <Typography variant="body1">
                  <strong>Account Deletion:</strong> You may request deletion of your account and all associated data 
                  at any time. We will permanently delete your information within 30 days of your request.
                </Typography>
              </li>
              <li>
                <Typography variant="body1">
                  <strong>Data Export:</strong> You have the right to export all of your data in a machine-readable 
                  format at any time.
                </Typography>
              </li>
            </Box>
          </Box>

          <Divider sx={{ my: 4 }} />

          {/* Your Rights */}
          <Box sx={{ mb: 5 }}>
            <Typography variant="h5" component="h2" sx={{ fontWeight: 600, mb: 2 }}>
              Your Privacy Rights
            </Typography>
            <Typography variant="body1" sx={{ mb: 2, lineHeight: 1.8 }}>
              You have the following rights regarding your personal information:
            </Typography>
            <Box component="ul" sx={{ pl: 3, '& li': { mb: 1.5, lineHeight: 1.8 } }}>
              <li>
                <Typography variant="body1">
                  <strong>Right to Access:</strong> You can request a copy of all personal information we hold about you.
                </Typography>
              </li>
              <li>
                <Typography variant="body1">
                  <strong>Right to Rectification:</strong> You can request correction of any inaccurate information.
                </Typography>
              </li>
              <li>
                <Typography variant="body1">
                  <strong>Right to Erasure:</strong> You can request deletion of your personal information, subject 
                  to legal obligations.
                </Typography>
              </li>
              <li>
                <Typography variant="body1">
                  <strong>Right to Portability:</strong> You can request your data in a structured, commonly used format.
                </Typography>
              </li>
              <li>
                <Typography variant="body1">
                  <strong>Right to Object:</strong> You can object to certain types of processing of your personal information.
                </Typography>
              </li>
            </Box>
          </Box>

          <Divider sx={{ my: 4 }} />

          {/* Contact */}
          <Box sx={{ mb: 3 }}>
            <Typography variant="h5" component="h2" sx={{ fontWeight: 600, mb: 2 }}>
              Contact Us
            </Typography>
            <Typography variant="body1" sx={{ lineHeight: 1.8 }}>
              If you have any questions about this Privacy Policy or our data practices, or if you wish to exercise 
              your privacy rights, please contact us through our GitHub repository issue tracker or by opening a 
              discussion in the repository.
            </Typography>
          </Box>

          <Divider sx={{ my: 4 }} />

          {/* Changes to Policy */}
          <Box>
            <Typography variant="h5" component="h2" sx={{ fontWeight: 600, mb: 2 }}>
              Changes to This Policy
            </Typography>
            <Typography variant="body1" sx={{ lineHeight: 1.8 }}>
              We may update this Privacy Policy from time to time to reflect changes in our practices or for legal, 
              regulatory, or operational reasons. We will notify you of any material changes by posting the updated 
              policy on this page and updating the &ldquo;Last Updated&rdquo; date. We encourage you to review this policy 
              periodically to stay informed about how we protect your information.
            </Typography>
          </Box>
        </Paper>

        {/* Footer Navigation */}
        <Box sx={{ textAlign: 'center', mt: 6, mb: 4 }}>
          <Button
            variant="contained"
            onClick={() => router.push('/')}
            sx={{
              bgcolor: 'var(--color-primary-main)',
              color: '#000',
              px: 4,
              py: 1.5,
              '&:hover': {
                bgcolor: 'var(--color-primary-accent)',
              },
            }}
          >
            Return to Home
          </Button>
        </Box>
      </Container>
    </Box>
  );
}
