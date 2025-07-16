# Security Policy

## Supported Versions

Use this section to tell people about which versions of your project are
currently being supported with security updates.

| Version | Supported          |
| ------- | ------------------ |
| 5.1.x   | :white_check_mark: |
| 5.0.x   | :x:                |
| 4.0.x   | :white_check_mark: |
| < 4.0   | :x:                |

## Local Development Authentication Bypass

🚨 **CRITICAL SECURITY FEATURE** 🚨

This application includes a local development authentication bypass feature that allows developers to skip authentication during local development. **This feature poses significant security risks if misused.**

### How It Works

- Set `LOCAL_DEV_AUTH_BYPASS_USER_ID` environment variable to any user ID
- The application automatically authenticates all requests as that user ID
- JWT tokens are minted automatically for the bypass user
- All authentication checks are bypassed when this variable is set

### Security Safeguards

1. **Localhost Validation**: The bypass only works when the application detects it's running on localhost (localhost, 127.0.0.1, 192.168.x.x, 10.x.x.x, 172.16.x.x, or .local domains)

2. **Aggressive Error Handling**: If the bypass variable is set but the application is not running on localhost, it throws an intentionally scary error message to prevent accidental production deployment

3. **Test Enforcement**: Automated tests validate that `.env` files in the repository do not contain this variable set to any non-empty value

### Acceptable Use

✅ **SAFE**: Setting this variable temporarily in your local environment
✅ **SAFE**: Setting this variable in `.env.local` (which should be gitignored)
✅ **SAFE**: Using this for local development and testing

### Prohibited Use

❌ **DANGEROUS**: Setting this variable in any `.env` file that gets committed to git
❌ **DANGEROUS**: Setting this variable in production, staging, or any shared environment  
❌ **DANGEROUS**: Setting this variable on any non-localhost hostname
❌ **DANGEROUS**: Deploying code with this variable set in any capacity

### Developer Responsibilities

When using this feature, you MUST:

1. **Never commit** this variable set in any `.env` file
2. **Always remove** this variable before pushing code
3. **Only use** this variable for legitimate local development
4. **Immediately remove** this variable if you see the security warning error

### Consequences of Misuse

If this variable is ever found set in:
- Production environments
- Staging environments  
- Committed code
- Shared development environments

It represents a **CRITICAL SECURITY VULNERABILITY** that could:
- Bypass all authentication controls
- Allow unauthorized access to user data
- Compromise the entire application security model
- Violate user trust and privacy

### What to Do If You See the Security Warning

If you encounter the security warning error message, you MUST:

1. **IMMEDIATELY** stop what you're doing
2. **REMOVE** the `LOCAL_DEV_AUTH_BYPASS_USER_ID` variable from your environment
3. **CHECK** all `.env` files and remove any reference to this variable
4. **VERIFY** you're running on a localhost environment
5. **NEVER** ignore or work around the security warning

Remember: We don't threaten to fire people for exposing secrets - we make threats against things people actually care about. Take this seriously.

## Reporting a Vulnerability

Use this section to tell people how to report a vulnerability.

Tell them where to go, how often they can expect to get an update on a
reported vulnerability, what to expect if the vulnerability is accepted or
declined, etc.
