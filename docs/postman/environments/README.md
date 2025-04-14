# HealthAssist Pro - Postman Environments

This directory contains Postman environment templates for different deployment scenarios of the HealthAssist Pro API.

## Available Environments

1. **Local Development** (`local.postman_environment.json`)
   - For testing against a locally running development server
   - Base URL: `http://localhost:3000`
   - WebSocket URL: `ws://localhost:3000/ws`
   - Includes default test credentials

2. **Staging** (`staging.postman_environment.json`)
   - For testing against the staging environment
   - Base URL: `https://staging-api.healthassist.pro`
   - WebSocket URL: `wss://staging-api.healthassist.pro/ws`
   - Uses staging-specific test accounts

3. **Production** (`production.postman_environment.json`)
   - For testing against the production environment
   - Base URL: `https://api.healthassist.pro`
   - WebSocket URL: `wss://api.healthassist.pro/ws`
   - Credentials must be provided manually

## Environment Variables

Each environment includes the following variables:

| Variable    | Description                                      | Example Value                    |
|------------|--------------------------------------------------|----------------------------------|
| baseUrl    | Base URL for the API                             | http://localhost:3000            |
| authToken  | JWT authentication token (set after login)        | eyJhbGciOiJIUzI1...            |
| email      | User email for authentication                     | test@example.com                |
| password   | User password for authentication                  | password123                     |
| groupName  | Default notification group name for testing       | important                       |
| wsUrl      | WebSocket connection URL                         | ws://localhost:3000/ws          |

## Setup Instructions

1. Import the desired environment file into Postman:
   - Click "Environments" in the sidebar
   - Click "Import"
   - Select the environment file

2. Configure environment-specific values:
   - Local: Ready to use with default values
   - Staging: Set your staging credentials
   - Production: Set your production credentials

3. Select the environment from the environment dropdown in Postman

## Security Notes

1. **Local Environment**
   - Includes default test credentials
   - Safe to commit to version control

2. **Staging Environment**
   - Password field left blank for security
   - Use dedicated staging test accounts
   - Do not use production credentials

3. **Production Environment**
   - All sensitive fields left blank
   - Never commit production credentials
   - Each team member should maintain their own credentials

## Usage Tips

1. **Token Management**
   - The `authToken` variable is automatically set after successful login
   - Tokens expire after a set period
   - Re-run the login request to get a new token

2. **WebSocket Testing**
   - Use the `wsUrl` variable for WebSocket connections
   - Remember to include the auth token in the connection message

3. **Environment Switching**
   - Always verify the active environment before testing
   - Clear sensitive data when switching environments
   - Use the "Reset All Variables" feature when needed

## Troubleshooting

1. **Authentication Issues**
   - Verify correct credentials are set
   - Check if token has expired
   - Ensure correct environment is selected

2. **Connection Issues**
   - Verify the `baseUrl` is correct
   - Check if the API server is running
   - Confirm network connectivity

3. **WebSocket Issues**
   - Verify WebSocket support in the environment
   - Check if the WebSocket server is running
   - Confirm the `wsUrl` is correct

## Contributing

When adding new variables to environments:

1. Add them to all environment files
2. Update this README with the new variable
3. Provide default values for local environment
4. Leave sensitive values blank in staging/production 