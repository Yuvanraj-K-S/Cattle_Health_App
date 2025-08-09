# Migration to Multi-Tenant Architecture

This guide provides instructions for migrating your existing single-tenant application to a multi-tenant architecture.

## Overview

The migration script will:

1. Create a default farm for each existing user
2. Set up proper relationships between users and farms
3. Migrate existing cattle to the new farm structure
4. Ensure backward compatibility with existing data

## Prerequisites

- Node.js installed
- MongoDB connection string configured in `.env`
- Backup of your database (recommended)

## Migration Steps

### 1. Backup Your Database

Before running the migration, it's **strongly recommended** to create a backup of your database:

```bash
mongodump --uri="YOUR_MONGODB_URI" --out=./backup-$(date +%F)
```

### 2. Update Environment Variables

Ensure your `.env` file has the following variables:

```env
NODE_ENV=production
PORT=3001
MONGO_URI=your_mongodb_connection_string
JWT_SECRET=your_jwt_secret
JWT_EXPIRE=30d
```

### 3. Run the Migration

```bash
# Install dependencies if not already installed
npm install

# Run the migration script
node scripts/migrateToMultiTenant.js
```

### 4. Verify the Migration

After the migration completes, verify that:

1. Each user has a default farm
2. Users are properly associated with their farms
3. Cattle records are linked to the correct farms
4. The first user is assigned the `super_admin` role

You can use MongoDB Compass or the MongoDB shell to verify the data:

```javascript
// Check users and their farms
db.users.find({}, { email: 1, farms: 1, role: 1 })

// Check farms and their users
db.farms.find({}, { name: 1, owner: 1, 'users.user': 1, 'users.role': 1 })

// Check cattle assignments
db.cattle.find({}, { tagId: 1, farm: 1, owner: 1 })
```

## Post-Migration Steps

1. **Test the Application**: Ensure all features work as expected
2. **Update Frontend**: Make sure your frontend is updated to handle the new multi-tenant architecture
3. **Monitor**: Keep an eye on the application logs for any issues

## Rollback Plan

If you need to rollback:

1. Restore your database from the backup:
   ```bash
   mongorestore --uri="YOUR_MONGODB_URI" ./path/to/backup
   ```
2. Revert any code changes in your application

## Troubleshooting

### Migration Fails

1. Check the error message in the console
2. Verify your MongoDB connection string
3. Ensure you have sufficient permissions
4. Check if there's enough disk space

### Data Inconsistencies

If you notice data inconsistencies after migration:

1. Stop the application
2. Restore from backup
3. Report the issue with the error logs

## Support

For assistance with the migration, please contact [Your Support Contact].

## License

[Your License Information]
