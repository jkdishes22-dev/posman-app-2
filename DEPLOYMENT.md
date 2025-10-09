# Deployment Guide for POS Management System

This guide covers deploying the POS Management System to Vercel using GitHub Actions CI/CD pipeline.

## Prerequisites

1. **Vercel Account**: Sign up at [vercel.com](https://vercel.com) with the Hobby plan
2. **GitHub Repository**: Your code should be in a GitHub repository
3. **Database**: MySQL database (can be hosted on Vercel, PlanetScale, or any MySQL provider)

## Setup Instructions

### 1. Vercel Setup

1. **Create Vercel Project**:
   - Go to [vercel.com/dashboard](https://vercel.com/dashboard)
   - Click "New Project"
   - Import your GitHub repository
   - Choose the Hobby plan

2. **Get Vercel Credentials**:
   - Go to [vercel.com/account/tokens](https://vercel.com/account/tokens)
   - Create a new token with appropriate permissions
   - Note down the token

3. **Get Project Information**:
   - In your Vercel project settings, find:
     - Organization ID (`VERCEL_ORG_ID`)
     - Project ID (`VERCEL_PROJECT_ID`)

### 2. GitHub Secrets Configuration

Add the following secrets to your GitHub repository:

**Go to**: `Settings` → `Secrets and variables` → `Actions` → `New repository secret`

#### Required Secrets:

```
VERCEL_TOKEN=your_vercel_token_here
VERCEL_ORG_ID=your_organization_id
VERCEL_PROJECT_ID=your_project_id
```

#### Database Secrets (Production):
```
DATABASE_URL=mysql://username:password@host:port/database_name
MYSQL_HOST=your_mysql_host
MYSQL_PORT=3306
MYSQL_USERNAME=your_username
MYSQL_PASSWORD=your_password
MYSQL_DATABASE=your_database_name
```

#### Database Secrets (Preview):
```
DATABASE_URL_PREVIEW=mysql://username:password@preview_host:port/preview_database
MYSQL_HOST_PREVIEW=your_preview_mysql_host
MYSQL_USERNAME_PREVIEW=your_preview_username
MYSQL_PASSWORD_PREVIEW=your_preview_password
MYSQL_DATABASE_PREVIEW=your_preview_database_name
```

#### Application Secrets:
```
JWT_SECRET=your_jwt_secret_key_here
NEXTAUTH_SECRET=your_nextauth_secret_here
NEXTAUTH_URL=https://your-app.vercel.app
```

### 3. Environment Variables in Vercel

1. **Go to your Vercel project dashboard**
2. **Navigate to Settings → Environment Variables**
3. **Add the following variables**:

#### Production Environment:
```
DATABASE_URL=mysql://username:password@host:port/database_name
MYSQL_HOST=your_mysql_host
MYSQL_PORT=3306
MYSQL_USERNAME=your_username
MYSQL_PASSWORD=your_password
MYSQL_DATABASE=your_database_name
JWT_SECRET=your_jwt_secret_key_here
NEXTAUTH_SECRET=your_nextauth_secret_here
NEXTAUTH_URL=https://your-app.vercel.app
NODE_ENV=production
```

#### Preview Environment:
```
DATABASE_URL=mysql://username:password@preview_host:port/preview_database
MYSQL_HOST=your_preview_mysql_host
MYSQL_PORT=3306
MYSQL_USERNAME=your_preview_username
MYSQL_PASSWORD=your_preview_password
MYSQL_DATABASE=your_preview_database_name
JWT_SECRET=your_jwt_secret_key_here
NEXTAUTH_SECRET=your_nextauth_secret_here
NEXTAUTH_URL=https://your-app-git-branch.vercel.app
NODE_ENV=production
```

## CI/CD Pipeline Overview

The pipeline includes the following workflows:

### 1. **CI Pipeline** (`.github/workflows/ci.yml`)
- Runs on every push and pull request
- Tests on Node.js 18.x and 20.x
- Performs TypeScript type checking
- Runs ESLint
- Builds the application
- Runs security audit

### 2. **Production Deployment** (`.github/workflows/deploy-vercel.yml`)
- Triggers on pushes to `main` branch
- Deploys to Vercel production environment
- Includes all quality checks before deployment

### 3. **Preview Deployment** (`.github/workflows/deploy-preview.yml`)
- Triggers on pushes to `develop` and feature branches
- Creates preview deployments for testing
- Uses separate preview database

### 4. **Database Migration** (`.github/workflows/database-migration.yml`)
- Runs when database-related files change
- Executes database migrations automatically
- Verifies migration status

### 5. **Cleanup** (`.github/workflows/cleanup.yml`)
- Runs weekly to clean up old deployments
- Helps manage Vercel deployment limits

## Deployment Process

### Automatic Deployment

1. **Push to `main` branch** → Triggers production deployment
2. **Push to `develop` or feature branches** → Triggers preview deployment
3. **Create Pull Request** → Triggers CI pipeline and preview deployment

### Manual Deployment

1. **Go to GitHub Actions tab**
2. **Select the desired workflow**
3. **Click "Run workflow"**
4. **Choose the branch and click "Run workflow"**

## Database Setup

### Option 1: Vercel Postgres (Recommended for Hobby Plan)
1. Go to your Vercel project dashboard
2. Navigate to Storage tab
3. Create a new Postgres database
4. Update your environment variables to use the Postgres connection string

### Option 2: External MySQL Database
1. Use services like PlanetScale, Railway, or AWS RDS
2. Configure the connection details in environment variables
3. Ensure the database is accessible from Vercel's IP ranges

### Option 3: Vercel MySQL (If Available)
1. Check Vercel's database offerings
2. Create a MySQL database if available
3. Configure connection details

## Monitoring and Troubleshooting

### 1. **Check Deployment Status**
- Go to GitHub Actions tab in your repository
- Check the status of recent workflow runs
- Review logs for any errors

### 2. **Vercel Dashboard**
- Monitor deployments in Vercel dashboard
- Check function logs for API issues
- Review performance metrics

### 3. **Common Issues**

#### Build Failures:
- Check TypeScript errors
- Verify all dependencies are installed
- Ensure environment variables are set correctly

#### Database Connection Issues:
- Verify database credentials
- Check if database is accessible from Vercel
- Ensure database server allows external connections

#### API Route Issues:
- Check Vercel function logs
- Verify API route structure
- Ensure proper error handling

### 4. **Logs and Debugging**
- **GitHub Actions Logs**: Available in the Actions tab
- **Vercel Function Logs**: Available in Vercel dashboard
- **Application Logs**: Check your application's logging configuration

## Security Considerations

1. **Environment Variables**: Never commit sensitive data to the repository
2. **Database Access**: Use strong passwords and restrict access
3. **JWT Secrets**: Use strong, unique secrets
4. **CORS Configuration**: Configure CORS properly for production
5. **Rate Limiting**: Implement rate limiting for API endpoints

## Performance Optimization

1. **Image Optimization**: Use Next.js Image component
2. **Code Splitting**: Leverage Next.js automatic code splitting
3. **Caching**: Implement proper caching strategies
4. **Database Indexing**: Ensure proper database indexes
5. **CDN**: Vercel automatically provides CDN for static assets

## Backup and Recovery

1. **Database Backups**: Set up regular database backups
2. **Code Backups**: GitHub provides code backup
3. **Environment Variables**: Document all environment variables
4. **Deployment History**: Vercel maintains deployment history

## Cost Management (Hobby Plan)

- **Function Execution Time**: 100GB-hours per month
- **Bandwidth**: 100GB per month
- **Build Minutes**: 6000 minutes per month
- **Deployments**: Unlimited
- **Domains**: 1 custom domain

Monitor your usage in the Vercel dashboard to stay within limits.

## Support and Resources

- **Vercel Documentation**: [vercel.com/docs](https://vercel.com/docs)
- **GitHub Actions Documentation**: [docs.github.com/en/actions](https://docs.github.com/en/actions)
- **Next.js Deployment**: [nextjs.org/docs/deployment](https://nextjs.org/docs/deployment)

## Next Steps

1. Set up your Vercel account and project
2. Configure GitHub secrets
3. Set up your database
4. Push your code to trigger the first deployment
5. Monitor the deployment process
6. Test your application in production

For any issues or questions, refer to the troubleshooting section or contact support.