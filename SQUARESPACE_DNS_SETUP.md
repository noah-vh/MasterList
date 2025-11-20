# Adding Subdomain DNS Record in Squarespace

## Step-by-Step Instructions

### Step 1: Access Squarespace DNS Settings

1. **Log into Squarespace**:
   - Go to https://www.squarespace.com
   - Sign in to your account

2. **Navigate to Domain Settings**:
   - Click on your profile/account icon (top right)
   - Go to **Settings** → **Domains**
   - OR if you're in the website editor, go to **Settings** → **Domains**

3. **Select Your Domain**:
   - Click on `noahvanhart.com` in your domains list
   - Look for **DNS Settings** or **Advanced DNS Settings**

### Step 2: Add CNAME Record

1. **Find DNS Records Section**:
   - Look for a section called "DNS Records", "DNS Settings", or "Advanced DNS"
   - You should see existing records (A records, CNAME records, etc.)

2. **Add New CNAME Record**:
   - Click **"Add Record"** or **"Add DNS Record"** button
   - Select record type: **CNAME**
   - Fill in:
     - **Host/Name**: `master-list` (or your preferred subdomain)
     - **Data/Value/Target**: `cname.vercel-dns.com`
     - **TTL**: Leave as default (usually 3600)
   - Click **Save** or **Add Record**

### Alternative: If Squarespace Doesn't Show DNS Settings

If you can't find DNS settings in Squarespace, you might need to:

1. **Check if DNS is managed elsewhere**:
   - Your domain might be using external DNS (like NS1)
   - Check if there's a "Use External DNS" or "Custom DNS" option

2. **Access NS1 directly** (if that's where DNS is managed):
   - Go to https://ns1.com
   - Sign in (you might need to create an account if you don't have one)
   - Look for your domain `noahvanhart.com`
   - Add the CNAME record there

### Step 3: Verify the Record

After adding the record, wait 5-10 minutes, then verify:

```bash
dig master-list.noahvanhart.com CNAME
```

You should see it pointing to `cname.vercel-dns.com`

### Step 4: Add Domain in Vercel

Once DNS is configured:

```bash
vercel domains add master-list.noahvanhart.com
```

Or via Vercel Dashboard:
- Go to: https://vercel.com/noahvanhart-pmmes-projects/master-list/settings/domains
- Click "Add Domain"
- Enter: `master-list.noahvanhart.com`

## Troubleshooting

**If you can't find DNS settings in Squarespace:**

1. **Check Squarespace Help**:
   - Search: "How to add DNS records Squarespace"
   - Or: "Squarespace custom DNS records"

2. **Contact Squarespace Support**:
   - They can guide you to the exact location
   - Or help you set up external DNS

3. **Use NS1 directly** (if that's your DNS provider):
   - Since your nameservers point to NS1, you might be able to manage DNS there directly
   - Sign up/login at https://ns1.com
   - Add your domain and create the CNAME record

## Quick Reference

- **Subdomain**: `master-list` (or choose: `tasks`, `list`, `app`, etc.)
- **Record Type**: CNAME
- **Target**: `cname.vercel-dns.com`
- **TTL**: 3600 (default)

