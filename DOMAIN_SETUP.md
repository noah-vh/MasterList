# Setting Up Subdomain for Master List

## Your Domain Provider
- **Registrar**: Squarespace Domains
- **DNS Provider**: NS1 (nsone.net)
- **Domain**: noahvanhart.com
- **Target Subdomain**: master-list.noahvanhart.com (or choose another like `tasks.noahvanhart.com`)

## Step 1: Add DNS Record in NS1

1. **Log into NS1**:
   - Go to https://ns1.com and log in
   - Or access via Squarespace if they provide a link to NS1

2. **Add CNAME Record**:
   - Navigate to your DNS zone for `noahvanhart.com`
   - Click "Add Record" or "Create Record"
   - Select record type: **CNAME**
   - **Name/Host**: `master-list` (or your preferred subdomain name)
   - **Target/Value**: `cname.vercel-dns.com`
   - **TTL**: 3600 (or leave default)
   - Save the record

   **Alternative**: If CNAME doesn't work, use an A record:
   - Type: **A**
   - Name: `master-list`
   - Value: `76.76.21.21` (Vercel's IP - but CNAME is preferred)

## Step 2: Add Domain in Vercel

Once DNS is configured, add the domain in Vercel:

```bash
vercel domains add master-list.noahvanhart.com
```

Or via Vercel Dashboard:
1. Go to https://vercel.com/noahvanhart-pmmes-projects/master-list/settings/domains
2. Click "Add Domain"
3. Enter: `master-list.noahvanhart.com`
4. Vercel will verify the DNS record

## Step 3: Verify DNS Propagation

DNS changes can take a few minutes to propagate. Check with:

```bash
dig master-list.noahvanhart.com
```

Or use online tools:
- https://dnschecker.org
- https://www.whatsmydns.net

## Alternative Subdomain Names

You can use any subdomain you prefer:
- `tasks.noahvanhart.com`
- `list.noahvanhart.com`
- `masterlist.noahvanhart.com`
- `app.noahvanhart.com`

Just replace `master-list` with your preferred name in the DNS record.

## Troubleshooting

If the domain doesn't work:
1. Wait 5-10 minutes for DNS propagation
2. Verify the CNAME record points to `cname.vercel-dns.com`
3. Check Vercel dashboard for any domain errors
4. Ensure your latest deployment is successful

