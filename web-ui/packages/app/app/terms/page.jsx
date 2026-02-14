'use client';
import Box from '@mui/material/Box';
import Button from '@mui/material/Button';
import Container from '@mui/material/Container';
import Divider from '@mui/material/Divider';
import Paper from '@mui/material/Paper';
import Typography from '@mui/material/Typography';
import { useTheme } from '@mui/material/styles';
import Image from 'next/image';
import { useRouter } from 'next/navigation';
import GavelIcon from '@mui/icons-material/Gavel';
import VerifiedUserIcon from '@mui/icons-material/VerifiedUser';
import BlockIcon from '@mui/icons-material/Block';
import WarningIcon from '@mui/icons-material/Warning';
import CodeIcon from '@mui/icons-material/Code';
import BalanceIcon from '@mui/icons-material/Balance';
export default function TermsOfService() {
    const router = useRouter();
    const theme = useTheme();
    return (<Box sx={{
            minHeight: '100vh',
            background: theme.palette.mode === 'dark'
                ? 'linear-gradient(180deg, #0a0a0a 0%, #1a1a1a 100%)'
                : 'linear-gradient(180deg, #ffffff 0%, #f5f5f5 100%)',
            py: 4,
        }}>
      <Container maxWidth="md">
        
        <Box sx={{ textAlign: 'center', mb: 6 }}>
          <Button variant="text" onClick={() => router.push('/')} sx={{ mb: 2, color: 'var(--color-primary-main)' }}>
            ← Back to Home
          </Button>
          <Box sx={{ mb: 3, display: 'flex', justifyContent: 'center' }}>
            <Image src={theme.palette.mode === 'dark'
            ? '/static/logo/logo-dark.png'
            : '/static/logo/logo-light.png'} alt="Title IX Advocacy Platform" width={100} height={100} style={{ maxWidth: '100px', height: 'auto' }}/>
          </Box>
          <Typography variant="h3" component="h1" sx={{
            fontWeight: 700,
            mb: 2,
            background: 'linear-gradient(135deg, var(--color-primary-main) 0%, var(--color-secondary-main) 100%)',
            WebkitBackgroundClip: 'text',
            WebkitTextFillColor: 'transparent',
            backgroundClip: 'text',
        }}>
            Terms of Service
          </Typography>
          <Typography variant="subtitle1" color="text.secondary">
            Last Updated: 10/22/25
          </Typography>
        </Box>

        <Paper sx={{
            p: { xs: 3, md: 5 },
            bgcolor: theme.palette.mode === 'dark'
                ? 'var(--color-surface-primary)'
                : '#fff',
            borderRadius: 2,
            border: '1px solid',
            borderColor: theme.palette.mode === 'dark'
                ? 'var(--color-border-main)'
                : '#e0e0e0',
        }}>
          
          <Box sx={{ mb: 5 }}>
            <Typography variant="body1" sx={{ mb: 3, lineHeight: 1.8 }}>
              Welcome to the Title IX Victim Advocacy Platform. By accessing or
              using this platform, you agree to be bound by these Terms of
              Service and our Educational Justice License v1.0. This platform
              exists to empower victims, families, and advocates in fighting
              back against educational institutions that mishandle Title IX
              cases.
            </Typography>
            <Typography variant="body1" sx={{ lineHeight: 1.8, fontWeight: 500 }}>
              Please read these terms carefully. They include important
              information about who may use this platform, limitations of
              liability, and your rights as a user.
            </Typography>
          </Box>

          <Divider sx={{ my: 4 }}/>

          
          <Box sx={{ mb: 5 }}>
            <Box sx={{ display: 'flex', alignItems: 'center', mb: 2 }}>
              <VerifiedUserIcon sx={{ fontSize: 32, color: 'var(--color-primary-main)', mr: 2 }}/>
              <Typography variant="h5" component="h2" sx={{ fontWeight: 600 }}>
                Who May Use This Platform
              </Typography>
            </Box>
            <Typography variant="body1" sx={{ mb: 2, lineHeight: 1.8 }}>
              This platform is designed for and may be freely used by:
            </Typography>
            <Box component="ul" sx={{ pl: 3, '& li': { mb: 1.5, lineHeight: 1.8 } }}>
              <li>
                <Typography variant="body1">
                  <strong>Students and Parents:</strong> Victims of Title IX
                  violations, harassment, discrimination, or institutional
                  misconduct, along with their families and guardians.
                </Typography>
              </li>
              <li>
                <Typography variant="body1">
                  <strong>Legal Advocates:</strong> Attorneys, legal aid
                  organizations, and advocates representing victims in Title IX
                  and educational justice cases.
                </Typography>
              </li>
              <li>
                <Typography variant="body1">
                  <strong>Education Journalists:</strong> Reporters and
                  journalists investigating educational institutional failures
                  and civil rights violations.
                </Typography>
              </li>
              <li>
                <Typography variant="body1">
                  <strong>Civil Rights Organizations:</strong> Nonprofit and
                  advocacy organizations working to advance educational equity,
                  student safety, and institutional transparency.
                </Typography>
              </li>
              <li>
                <Typography variant="body1">
                  <strong>Researchers and Developers:</strong> Individuals
                  working to support Title IX compliance, student safety, or
                  institutional accountability.
                </Typography>
              </li>
            </Box>
          </Box>

          <Divider sx={{ my: 4 }}/>

          
          <Box sx={{ mb: 5 }}>
            <Box sx={{ display: 'flex', alignItems: 'center', mb: 2 }}>
              <BlockIcon sx={{
            fontSize: 32,
            color: 'var(--color-secondary-main)',
            mr: 2,
        }}/>
              <Typography variant="h5" component="h2" sx={{ fontWeight: 600 }}>
                Prohibited Use & Restricted Entities
              </Typography>
            </Box>
            <Typography variant="body1" sx={{ mb: 2, lineHeight: 1.8, fontWeight: 500 }}>
              Under our Educational Justice License v1.0, the following parties
              are PROHIBITED from using this platform or any content, analyses,
              or materials generated by it:
            </Typography>

            <Box sx={{ mb: 3 }}>
              <Typography variant="h6" sx={{ fontWeight: 600, mb: 2, color: 'error.main' }}>
                ⚠️ Educational Institutions with Documented Violations
              </Typography>
              <Typography variant="body1" sx={{ mb: 2, lineHeight: 1.8 }}>
                Any educational institution, government body, contractor, or
                representative that has:
              </Typography>
              <Box component="ul" sx={{ pl: 3, '& li': { mb: 1.5, lineHeight: 1.8 } }}>
                <li>
                  <Typography variant="body1">
                    Retaliated against complainants or witnesses in Title IX or
                    civil rights complaints
                  </Typography>
                </li>
                <li>
                  <Typography variant="body1">
                    Suppressed, obstructed, or failed to properly investigate
                    reports of harassment, violence, or discrimination
                  </Typography>
                </li>
                <li>
                  <Typography variant="body1">
                    Falsified, denied, or withheld access to investigative
                    records in violation of Title IX, FERPA, ADA, IDEA, or
                    equivalent state/federal laws
                  </Typography>
                </li>
                <li>
                  <Typography variant="body1">
                    Employed surveillance, obfuscation, or technical means to
                    undermine parental or student rights in educational
                    investigations
                  </Typography>
                </li>
              </Box>
            </Box>

            <Box sx={{ mb: 3 }}>
              <Typography variant="h6" sx={{ fontWeight: 600, mb: 2, color: 'error.main' }}>
                Specifically Listed Prohibited Entities
              </Typography>
              <Typography variant="body1" sx={{ mb: 2, lineHeight: 1.8 }}>
                Organizations and entities listed in our{' '}
                <code style={{
            backgroundColor: theme.palette.mode === 'dark' ? '#333' : '#f5f5f5',
            padding: '2px 6px',
            borderRadius: '4px',
        }}>
                  PROHIBITED_ENTITIES.md
                </code>{' '}
                file are permanently banned from using this platform or any
                generated content. Current prohibited entities include:
              </Typography>
              <Box component="ul" sx={{ pl: 3, '& li': { mb: 1.5, lineHeight: 1.8 } }}>
                <li>
                  <Typography variant="body1">
                    <strong>Prior Lake Savage Area Schools</strong> (MN, School
                    District 719, domain: plsas.org) - Due to documented
                    retaliation against complainants and obstruction of Title IX
                    investigations
                  </Typography>
                </li>
              </Box>
              <Typography variant="body2" sx={{ mt: 2, lineHeight: 1.8 }}>
                This list is maintained publicly and subject to updates.
                Entities may request review by submitting an issue to our GitHub
                repository.
              </Typography>
            </Box>

            <Box sx={{
            p: 3,
            bgcolor: theme.palette.mode === 'dark' ? '#2d1f1f' : '#fff3e0',
            borderRadius: 2,
            border: '2px solid',
            borderColor: 'error.main',
        }}>
              <Typography variant="body1" sx={{ fontWeight: 600, mb: 1, color: 'error.main' }}>
                IMPORTANT: Prohibition Extends to Generated Content
              </Typography>
              <Typography variant="body1" sx={{ lineHeight: 1.8 }}>
                Prohibited parties may not use, review, rely on, or derive any
                benefit from any outputs, data, reports, models, analyses, or
                materials generated using this platform, regardless of how such
                content is obtained (including through third parties or public
                disclosure).
              </Typography>
            </Box>
          </Box>

          <Divider sx={{ my: 4 }}/>

          
          <Box sx={{ mb: 5 }}>
            <Box sx={{ display: 'flex', alignItems: 'center', mb: 2 }}>
              <BalanceIcon sx={{ fontSize: 32, color: 'var(--color-primary-main)', mr: 2 }}/>
              <Typography variant="h5" component="h2" sx={{ fontWeight: 600 }}>
                Purpose & Intended Use
              </Typography>
            </Box>
            <Typography variant="body1" sx={{ mb: 2, lineHeight: 1.8 }}>
              This platform provides AI-powered tools to help victims, families,
              and advocates:
            </Typography>
            <Box component="ul" sx={{ pl: 3, '& li': { mb: 1.5, lineHeight: 1.8 } }}>
              <li>
                <Typography variant="body1">
                  <strong>Analyze Evidence:</strong> Process emails, documents,
                  and communications to identify potential Title IX violations
                  and institutional failures
                </Typography>
              </li>
              <li>
                <Typography variant="body1">
                  <strong>Build Cases:</strong> Organize and structure evidence
                  to support advocacy efforts, legal action, or administrative
                  complaints
                </Typography>
              </li>
              <li>
                <Typography variant="body1">
                  <strong>Identify Patterns:</strong> Discover similar patterns
                  of institutional misconduct across cases to strengthen
                  advocacy strategies
                </Typography>
              </li>
              <li>
                <Typography variant="body1">
                  <strong>Level the Playing Field:</strong> Access advanced
                  analysis capabilities typically requiring expensive legal
                  teams
                </Typography>
              </li>
            </Box>
          </Box>

          <Divider sx={{ my: 4 }}/>

          
          <Box sx={{ mb: 5 }}>
            <Box sx={{ display: 'flex', alignItems: 'center', mb: 2 }}>
              <WarningIcon sx={{
            fontSize: 32,
            color: 'var(--color-secondary-main)',
            mr: 2,
        }}/>
              <Typography variant="h5" component="h2" sx={{ fontWeight: 600 }}>
                Disclaimer of Warranties & Limitations
              </Typography>
            </Box>

            <Box sx={{ mb: 3 }}>
              <Typography variant="h6" sx={{ fontWeight: 600, mb: 2, color: 'warning.main' }}>
                Not Legal Advice
              </Typography>
              <Typography variant="body1" sx={{ mb: 2, lineHeight: 1.8 }}>
                <strong>
                  This platform does not provide legal advice and is not a
                  substitute for consultation with a qualified attorney.
                </strong>{' '}
                The analyses, insights, and recommendations generated by this
                platform are tools to assist your advocacy efforts but should
                not be relied upon as legal counsel.
              </Typography>
              <Typography variant="body1" sx={{ lineHeight: 1.8 }}>
                We strongly recommend consulting with an attorney experienced in
                Title IX and educational law before taking legal action.
              </Typography>
            </Box>

            <Box sx={{ mb: 3 }}>
              <Typography variant="h6" sx={{ fontWeight: 600, mb: 2, color: 'warning.main' }}>
                AI-Generated Content
              </Typography>
              <Typography variant="body1" sx={{ mb: 2, lineHeight: 1.8 }}>
                This platform uses artificial intelligence to analyze documents
                and generate insights. While we strive for accuracy, AI systems
                can make mistakes, miss important details, or misinterpret
                context.
              </Typography>
              <Typography variant="body1" sx={{ lineHeight: 1.8 }}>
                <strong>
                  You are responsible for reviewing, verifying, and validating
                  all AI-generated analyses
                </strong>{' '}
                before relying on them. Do not use AI-generated content as the
                sole basis for legal decisions or actions.
              </Typography>
            </Box>

            <Box sx={{ mb: 3 }}>
              <Typography variant="h6" sx={{ fontWeight: 600, mb: 2, color: 'warning.main' }}>
                &ldquo;AS IS&rdquo; Provision
              </Typography>
              <Typography variant="body1" sx={{ lineHeight: 1.8 }}>
                THE PLATFORM IS PROVIDED &ldquo;AS IS&rdquo; WITHOUT WARRANTY OF
                ANY KIND, EXPRESS OR IMPLIED, INCLUDING BUT NOT LIMITED TO
                WARRANTIES OF MERCHANTABILITY, FITNESS FOR A PARTICULAR PURPOSE,
                OR NON-INFRINGEMENT. WE DO NOT WARRANT THAT THE PLATFORM WILL BE
                UNINTERRUPTED, ERROR-FREE, OR FREE OF VIRUSES OR OTHER HARMFUL
                COMPONENTS.
              </Typography>
            </Box>
          </Box>

          <Divider sx={{ my: 4 }}/>

          
          <Box sx={{ mb: 5 }}>
            <Box sx={{ display: 'flex', alignItems: 'center', mb: 2 }}>
              <GavelIcon sx={{ fontSize: 32, color: 'var(--color-primary-main)', mr: 2 }}/>
              <Typography variant="h5" component="h2" sx={{ fontWeight: 600 }}>
                Limitation of Liability
              </Typography>
            </Box>
            <Typography variant="body1" sx={{ mb: 2, lineHeight: 1.8 }}>
              TO THE MAXIMUM EXTENT PERMITTED BY LAW:
            </Typography>
            <Box component="ul" sx={{ pl: 3, '& li': { mb: 1.5, lineHeight: 1.8 } }}>
              <li>
                <Typography variant="body1">
                  IN NO EVENT SHALL THE AUTHORS, CONTRIBUTORS, OR COPYRIGHT
                  HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES, OR OTHER LIABILITY
                  ARISING FROM THE USE OR INABILITY TO USE THE PLATFORM
                </Typography>
              </li>
              <li>
                <Typography variant="body1">
                  WE ARE NOT LIABLE FOR ANY DIRECT, INDIRECT, INCIDENTAL,
                  SPECIAL, CONSEQUENTIAL, OR PUNITIVE DAMAGES, INCLUDING BUT NOT
                  LIMITED TO LOSS OF PROFITS, DATA, USE, GOODWILL, OR OTHER
                  INTANGIBLE LOSSES
                </Typography>
              </li>
              <li>
                <Typography variant="body1">
                  WE ARE NOT RESPONSIBLE FOR ANY OUTCOMES OF LEGAL PROCEEDINGS,
                  ADVOCACY EFFORTS, OR OTHER ACTIONS TAKEN BASED ON INFORMATION
                  OR ANALYSES PROVIDED BY THIS PLATFORM
                </Typography>
              </li>
              <li>
                <Typography variant="body1">
                  YOU ASSUME ALL RISK AND RESPONSIBILITY FOR YOUR USE OF THE
                  PLATFORM AND ANY DECISIONS MADE BASED ON INFORMATION OBTAINED
                  THROUGH IT
                </Typography>
              </li>
            </Box>
          </Box>

          <Divider sx={{ my: 4 }}/>

          
          <Box sx={{ mb: 5 }}>
            <Typography variant="h5" component="h2" sx={{ fontWeight: 600, mb: 2 }}>
              Your Responsibilities
            </Typography>
            <Typography variant="body1" sx={{ mb: 2, lineHeight: 1.8 }}>
              By using this platform, you agree to:
            </Typography>
            <Box component="ul" sx={{ pl: 3, '& li': { mb: 1.5, lineHeight: 1.8 } }}>
              <li>
                <Typography variant="body1">
                  <strong>Verify Your Eligibility:</strong> Confirm that you are
                  not a prohibited entity under our Educational Justice License
                </Typography>
              </li>
              <li>
                <Typography variant="body1">
                  <strong>Use Responsibly:</strong> Use the platform only for
                  legitimate advocacy and legal purposes
                </Typography>
              </li>
              <li>
                <Typography variant="body1">
                  <strong>Protect Your Data:</strong> Maintain appropriate
                  security measures for your account and uploaded materials
                </Typography>
              </li>
              <li>
                <Typography variant="body1">
                  <strong>Verify AI Output:</strong> Review and validate all
                  AI-generated analyses before relying on them
                </Typography>
              </li>
              <li>
                <Typography variant="body1">
                  <strong>Respect Privacy:</strong> Handle sensitive information
                  appropriately and in compliance with applicable privacy laws
                </Typography>
              </li>
              <li>
                <Typography variant="body1">
                  <strong>No Circumvention:</strong> Not act as a conduit to
                  provide platform access or generated content to prohibited
                  entities
                </Typography>
              </li>
            </Box>
          </Box>

          <Divider sx={{ my: 4 }}/>

          
          <Box sx={{ mb: 5 }}>
            <Typography variant="h5" component="h2" sx={{ fontWeight: 600, mb: 2 }}>
              License Enforcement & Termination
            </Typography>
            <Typography variant="body1" sx={{ mb: 2, lineHeight: 1.8 }}>
              Violations of these Terms of Service or our Educational Justice
              License will result in:
            </Typography>
            <Box component="ul" sx={{ pl: 3, '& li': { mb: 1.5, lineHeight: 1.8 } }}>
              <li>
                <Typography variant="body1">
                  <strong>Automatic Termination:</strong> Immediate and
                  automatic revocation of all rights granted under these terms
                </Typography>
              </li>
              <li>
                <Typography variant="body1">
                  <strong>Public Disclosure:</strong> License violations may be
                  publicly disclosed on our GitHub repository
                </Typography>
              </li>
              <li>
                <Typography variant="body1">
                  <strong>Regulatory Reporting:</strong> Violations may be
                  reported to appropriate regulatory bodies and oversight
                  agencies
                </Typography>
              </li>
              <li>
                <Typography variant="body1">
                  <strong>Permanent Ban:</strong> Violating entities will be
                  permanently blocked from accessing updates, support, and
                  future contributions
                </Typography>
              </li>
              <li>
                <Typography variant="body1">
                  <strong>Legal Action:</strong> Continued use after termination
                  constitutes infringement and may result in legal proceedings
                </Typography>
              </li>
            </Box>
          </Box>

          <Divider sx={{ my: 4 }}/>

          
          <Box sx={{ mb: 5 }}>
            <Box sx={{ display: 'flex', alignItems: 'center', mb: 2 }}>
              <CodeIcon sx={{ fontSize: 32, color: 'var(--color-primary-main)', mr: 2 }}/>
              <Typography variant="h5" component="h2" sx={{ fontWeight: 600 }}>
                Open Source & Self-Hosting
              </Typography>
            </Box>
            <Typography variant="body1" sx={{ mb: 2, lineHeight: 1.8 }}>
              This platform is fully open source and available for self-hosting:
            </Typography>
            <Box component="ul" sx={{ pl: 3, '& li': { mb: 1.5, lineHeight: 1.8 } }}>
              <li>
                <Typography variant="body1">
                  <strong>Complete Source Access:</strong> All code is available
                  on GitHub for review, modification, and self-hosting
                </Typography>
              </li>
              <li>
                <Typography variant="body1">
                  <strong>Same License Terms:</strong> Self-hosted instances are
                  subject to the same Educational Justice License restrictions
                </Typography>
              </li>
              <li>
                <Typography variant="body1">
                  <strong>No Sublicensing:</strong> You may not sublicense the
                  platform or generated content to prohibited entities
                </Typography>
              </li>
              <li>
                <Typography variant="body1">
                  <strong>Derivative Works:</strong> Derivative works must
                  maintain the same license restrictions and may not be used to
                  circumvent prohibited use provisions
                </Typography>
              </li>
            </Box>
          </Box>

          <Divider sx={{ my: 4 }}/>

          
          <Box sx={{ mb: 5 }}>
            <Typography variant="h5" component="h2" sx={{ fontWeight: 600, mb: 2 }}>
              Indemnification
            </Typography>
            <Typography variant="body1" sx={{ lineHeight: 1.8 }}>
              You agree to indemnify, defend, and hold harmless the platform
              authors, contributors, and copyright holders from any claims,
              liabilities, damages, losses, costs, or expenses (including
              reasonable attorneys&apos; fees) arising out of or related to your
              use of the platform, violation of these terms, or violation of any
              rights of another party.
            </Typography>
          </Box>

          <Divider sx={{ my: 4 }}/>

          
          <Box sx={{ mb: 5 }}>
            <Typography variant="h5" component="h2" sx={{ fontWeight: 600, mb: 2 }}>
              Governing Law & Dispute Resolution
            </Typography>
            <Typography variant="body1" sx={{ mb: 2, lineHeight: 1.8 }}>
              These Terms of Service shall be governed by and construed in
              accordance with the laws of the United States and the State of
              Minnesota, without regard to conflict of law principles.
            </Typography>
            <Typography variant="body1" sx={{ lineHeight: 1.8 }}>
              Any disputes arising from these terms or your use of the platform
              shall be resolved through good faith negotiation, and if
              necessary, through arbitration or litigation in Minnesota state or
              federal courts.
            </Typography>
          </Box>

          <Divider sx={{ my: 4 }}/>

          
          <Box sx={{ mb: 5 }}>
            <Typography variant="h5" component="h2" sx={{ fontWeight: 600, mb: 2 }}>
              Changes to These Terms
            </Typography>
            <Typography variant="body1" sx={{ mb: 2, lineHeight: 1.8 }}>
              We reserve the right to update these Terms of Service at any time.
              Material changes will be communicated through:
            </Typography>
            <Box component="ul" sx={{ pl: 3, '& li': { mb: 1.5, lineHeight: 1.8 } }}>
              <li>
                <Typography variant="body1">
                  Updated &ldquo;Last Modified&rdquo; date at the top of this
                  page
                </Typography>
              </li>
              <li>
                <Typography variant="body1">
                  Notification on the platform homepage
                </Typography>
              </li>
              <li>
                <Typography variant="body1">
                  Announcements in our GitHub repository
                </Typography>
              </li>
            </Box>
            <Typography variant="body1" sx={{ mt: 2, lineHeight: 1.8 }}>
              Your continued use of the platform after changes take effect
              constitutes acceptance of the updated terms.
            </Typography>
          </Box>

          <Divider sx={{ my: 4 }}/>

          
          <Box sx={{ mb: 3 }}>
            <Typography variant="h5" component="h2" sx={{ fontWeight: 600, mb: 2 }}>
              Contact & Questions
            </Typography>
            <Typography variant="body1" sx={{ mb: 2, lineHeight: 1.8 }}>
              If you have questions about these Terms of Service or our
              Educational Justice License, please:
            </Typography>
            <Box component="ul" sx={{ pl: 3, '& li': { mb: 1.5, lineHeight: 1.8 } }}>
              <li>
                <Typography variant="body1">
                  Open an issue on our GitHub repository:{' '}
                  <a href="https://github.com/seanmobrien/we-dont-need-no-education" target="_blank" rel="noopener noreferrer" style={{ color: 'var(--color-primary-main)' }}>
                    github.com/seanmobrien/we-dont-need-no-education
                  </a>
                </Typography>
              </li>
              <li>
                <Typography variant="body1">
                  Start a discussion in the repository&apos;s discussion section
                </Typography>
              </li>
              <li>
                <Typography variant="body1">
                  Review our full license text in the{' '}
                  <code style={{
            backgroundColor: theme.palette.mode === 'dark' ? '#333' : '#f5f5f5',
            padding: '2px 6px',
            borderRadius: '4px',
        }}>
                    LICENSE.md
                  </code>{' '}
                  file
                </Typography>
              </li>
            </Box>
          </Box>

          <Divider sx={{ my: 4 }}/>

          
          <Box sx={{
            p: 3,
            bgcolor: theme.palette.mode === 'dark'
                ? 'var(--color-surface-secondary)'
                : '#f5f5f5',
            borderRadius: 2,
            border: '1px solid',
            borderColor: theme.palette.mode === 'dark'
                ? 'var(--color-border-main)'
                : '#e0e0e0',
        }}>
            <Typography variant="h6" sx={{
            fontWeight: 600,
            mb: 2,
            color: 'var(--color-primary-main)',
        }}>
              Acknowledgment
            </Typography>
            <Typography variant="body1" sx={{ lineHeight: 1.8 }}>
              BY USING THIS PLATFORM, YOU ACKNOWLEDGE THAT YOU HAVE READ,
              UNDERSTOOD, AND AGREE TO BE BOUND BY THESE TERMS OF SERVICE AND
              THE EDUCATIONAL JUSTICE LICENSE V1.0. IF YOU DO NOT AGREE TO THESE
              TERMS OR ARE A PROHIBITED ENTITY, YOU MUST NOT USE THIS PLATFORM.
            </Typography>
          </Box>
        </Paper>

        
        <Box sx={{ textAlign: 'center', mt: 6, mb: 4 }}>
          <Button variant="contained" onClick={() => router.push('/')} sx={{
            bgcolor: 'var(--color-primary-main)',
            mr: 2,
            color: '#000',
            px: 4,
            py: 1.5,
            '&:hover': {
                bgcolor: 'var(--color-secondary-accent)',
            },
        }}>
            Return to Home
          </Button>
          <Button variant="outlined" onClick={() => router.push('/privacy')} sx={{
            borderColor: 'var(--color-primary-main)',
            color: 'var(--color-primary-main)',
            '&:hover': {
                borderColor: 'var(--color-secondary-accent)',
                color: 'var(--color-secondary-accent)',
            },
        }}>
            Privacy Policy
          </Button>
        </Box>
      </Container>
    </Box>);
}
//# sourceMappingURL=page.jsx.map