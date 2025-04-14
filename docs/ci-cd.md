# HealthAssist Pro CI/CD Pipeline

## Overview

This document describes the Continuous Integration and Continuous Deployment (CI/CD) pipeline for the HealthAssist Pro application. The pipeline is implemented using GitHub Actions and automates testing, building, and deployment processes.

## Pipeline Structure

The pipeline consists of four main jobs:

1. **Validate and Test**
2. **Build and Package**
3. **Deploy to Staging**
4. **Deploy to Production**

### Workflow Triggers

The pipeline is triggered on:
- Push to `main` or `develop` branches
- Pull requests targeting `main` or `develop` branches

## Jobs Description

### 1. Validate and Test

This job runs on every push and pull request:

- Sets up Node.js environment
- Installs dependencies for both frontend and backend
- Runs linting checks
- Performs TypeScript type checking
- Executes test suites with coverage
- Uploads coverage reports to Codecov

### 2. Build and Package

Runs after successful validation on push events to `main` or `develop`:

- Builds frontend application
- Builds backend application
- Creates and uploads build artifacts

### 3. Deploy to Staging

Runs after successful build when pushing to `develop`:

- Downloads build artifacts
- Deploys to Azure Web App staging environment
- Uses staging-specific configuration

### 4. Deploy to Production

Runs after successful build when pushing to `main`:

- Downloads build artifacts
- Deploys to Azure Web App production environment
- Uses production-specific configuration

## Environment Variables

Required environment variables:

```
NODE_VERSION: '18.x'
FRONTEND_DIR: frontend
BACKEND_DIR: backend
```

## Secrets

The following secrets must be configured in GitHub:

- `AZURE_WEBAPP_PUBLISH_PROFILE_STAGING`: Azure Web App publish profile for staging
- `AZURE_WEBAPP_PUBLISH_PROFILE_PROD`: Azure Web App publish profile for production

## Deployment Environments

### Staging
- URL: https://staging-api.healthassist.pro
- Branch: develop
- Auto-deployment: Yes
- Required approvals: No

### Production
- URL: https://api.healthassist.pro
- Branch: main
- Auto-deployment: Yes
- Required approvals: Yes

## Quality Gates

The following quality gates must pass before deployment:

1. All tests passing
2. Code coverage >= 80%
3. No linting errors
4. Successful TypeScript compilation
5. All dependencies successfully installed

## Monitoring and Logging

- Build logs available in GitHub Actions
- Deployment logs available in Azure Portal
- Application logs sent to Azure Application Insights

## Rollback Procedure

To rollback a deployment:

1. Identify the last successful deployment in GitHub Actions
2. Use Azure Portal to revert to the previous deployment slot
3. Verify the application is functioning correctly
4. If needed, revert the code changes in the repository

## Contributing

When contributing to the project:

1. Create a feature branch from `develop`
2. Make your changes
3. Ensure all tests pass locally
4. Create a pull request targeting `develop`
5. Wait for CI checks to pass
6. Get code review approval
7. Merge your changes

## Troubleshooting

Common issues and solutions:

### Failed Tests
- Check the test logs in GitHub Actions
- Run tests locally to reproduce the issue
- Verify test environment variables

### Failed Deployment
- Check Azure deployment logs
- Verify publish profile secrets
- Confirm build artifacts were created correctly

### Environment Issues
- Verify environment variables are set correctly
- Check Node.js version compatibility
- Confirm dependency versions match

## Contact

For CI/CD pipeline issues:
- Create a GitHub issue
- Contact DevOps team: devops@healthassist.pro
- Check status page: https://status.healthassist.pro 