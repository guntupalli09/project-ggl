# Social Media Tables Setup

This guide will help you set up the social media functionality in your Supabase database.

## 📋 Prerequisites

- Supabase project set up
- Access to Supabase SQL Editor
- Admin access to your Supabase project

## 🚀 Setup Instructions

### Step 1: Run the Migration

1. **Open Supabase Dashboard**
   - Go to your Supabase project dashboard
   - Navigate to the **SQL Editor** tab

2. **Run the Migration**
   - Copy the contents of `create_social_media_tables.sql`
   - Paste it into the SQL Editor
   - Click **Run** to execute the migration

### Step 2: Verify Tables Created

After running the migration, you should see these new tables in your database:

- **`social_accounts`** - Stores linked social media accounts
- **`social_posts`** - Stores scheduled social media posts

### Step 3: Check Row Level Security

The migration automatically sets up Row Level Security (RLS) policies to ensure:
- Users can only access their own social accounts and posts
- Proper data isolation between users

## 📊 Table Structures

### `social_accounts` Table
```sql
- id (uuid, primary key)
- user_id (uuid, references auth.users)
- platform (text: 'linkedin', 'facebook', 'instagram')
- access_token (text)
- refresh_token (text)
- expires_at (timestamptz)
- created_at (timestamptz)
```

### `social_posts` Table
```sql
- id (uuid, primary key)
- user_id (uuid, references auth.users)
- platform (text: 'linkedin', 'facebook', 'instagram')
- content (text)
- image_url (text)
- scheduled_time (timestamptz)
- status (text: 'draft', 'scheduled', 'published', 'failed')
- created_at (timestamptz)
- updated_at (timestamptz)
```

## 🔒 Security Features

- **Row Level Security (RLS)** enabled on both tables
- **User isolation** - users can only access their own data
- **Platform validation** - only supported platforms allowed
- **Status validation** - only valid post statuses allowed
- **Automatic timestamps** - created_at and updated_at managed automatically

## 🎯 Next Steps

After running the migration, you can:

1. **Create React components** for social media management
2. **Implement OAuth flows** for platform connections
3. **Build scheduling interface** for post management
4. **Add social media analytics** and insights

## 🧪 Testing

To test the tables, you can:

1. **Insert sample data** (uncomment the sample data section in the migration)
2. **Verify RLS policies** by testing with different user accounts
3. **Check indexes** for query performance

## 📝 Notes

- The migration includes proper indexes for optimal performance
- RLS policies ensure data security and user isolation
- The `updated_at` field is automatically maintained via triggers
- All foreign key relationships are properly set up with cascade deletes

## 🆘 Troubleshooting

If you encounter issues:

1. **Check permissions** - ensure you have admin access to Supabase
2. **Verify RLS** - make sure Row Level Security is enabled
3. **Check constraints** - ensure platform and status values are valid
4. **Review logs** - check Supabase logs for any errors

## 📚 Additional Resources

- [Supabase RLS Documentation](https://supabase.com/docs/guides/auth/row-level-security)
- [Supabase SQL Editor Guide](https://supabase.com/docs/guides/database/sql-editor)
- [PostgreSQL Triggers Documentation](https://www.postgresql.org/docs/current/trigger-definition.html)
