# How to Get Real Employee ID for Testing

## Problem

The test interface needs a **real employee ID** from your Zimyo HRMS system. Using fake IDs like `emp123` will result in errors:

```
❌ Employee ID "emp123" not found in Zimyo system
```

---

## Solution: Get Real Employee ID

### Option 1: From Zimyo Dashboard (Easiest)

1. **Login to Zimyo HRMS:**
   - Go to: https://zimyo.com (or your company's Zimyo URL)
   - Login with your credentials

2. **Find Employee ID:**
   - Go to **Employees** section
   - Click on any employee
   - Look for **Employee ID** or **Employee Code**
   - Copy this ID (e.g., `ZM001`, `EMP12345`, etc.)

3. **Use in Test Interface:**
   - Open http://localhost:8080
   - Paste the real employee ID
   - Click Login

---

### Option 2: Check with HR Team

Ask your HR team for:
- Your employee ID
- Or any test employee ID from the system

---

### Option 3: Use API to Get Employee List

If you have admin access, you can query the Zimyo API:

```bash
# Get authentication token first
curl -X POST "https://apiserver.zimyo.com/apiv1/v1/token" \
  -H "Content-Type: application/json" \
  -d '{
    "partner_secret": "YOUR_PARTNER_SECRET",
    "partner_id": "YOUR_PARTNER_ID",
    "client_code": "YOUR_CLIENT_CODE"
  }'

# Use the token to get employee list
curl -X GET "https://apiserver.zimyo.com/apiv1/v1/org/employees" \
  -H "Authorization: Bearer YOUR_TOKEN_HERE"
```

This will return a list of employees with their IDs.

---

### Option 4: Create Test Employee in Zimyo

1. Login to Zimyo as admin
2. Go to **Employees** → **Add Employee**
3. Create a test employee:
   - Name: Test User
   - Employee ID: `TEST001`
   - Department: IT
   - etc.
4. Use `TEST001` as the employee ID in test interface

---

## Example Real Employee IDs

Zimyo employee IDs typically look like:

- ✅ `ZM001`
- ✅ `EMP12345`
- ✅ `AKASH123`
- ✅ `E001`
- ✅ `228602_001` (with company prefix)

**NOT like:**
- ❌ `emp123` (doesn't exist in system)
- ❌ `test123` (doesn't exist in system)
- ❌ `user1` (doesn't exist in system)

---

## Quick Test

Once you have a real employee ID, test it:

```bash
# Replace ZM001 with your real employee ID
curl -X POST "http://localhost:8080/login?userId=ZM001&role=employee&userToken=test123"
```

**Success Response:**
```json
{
  "message": "Login successful",
  "userId": "ZM001",
  "role": "employee",
  "policies_count": 5
}
```

**Error Response (if ID doesn't exist):**
```json
{
  "detail": "Failed to retrieve employee details: 500 Server Error"
}
```

---

## Environment Variables Check

Make sure your `.env` file has correct Zimyo API credentials:

```bash
# Check these in .env file
PARTNER_SECRET=9Rcn+AQ{l.hV2Wvnsls#4G
PARTNER_ID=228602
CLIENT_CODE=ZIMYO
AUTH_KEY=25a20c3e-beb6-11ed-9234-0123456789ab
```

If these are wrong, the API won't be able to fetch employee data even with correct employee ID.

---

## Troubleshooting

### Error: "Employee not found"
**Solution:** Use a real employee ID from Zimyo system

### Error: "500 Server Error"
**Possible causes:**
1. Employee ID doesn't exist
2. Wrong API credentials in `.env`
3. Zimyo API is down
4. Network connectivity issues

**Fix:**
1. Verify employee ID exists in Zimyo
2. Check `.env` credentials
3. Try accessing Zimyo dashboard to confirm it's up
4. Check internet connection

### Error: "Failed to retrieve employee details"
**Solution:** Check with your Zimyo admin that:
- Your API credentials have correct permissions
- Employee ID format is correct
- Employee is active (not deleted)

---

## Testing Without Real Employee (Mock Mode)

If you don't have access to real employee IDs yet, you can modify the code to use mock data:

### Temporary Mock for Testing:

Edit `services/core/employee.py`:

```python
def retrieve_user_data(employee_id, time_period, token):
    """Retrieve employee data - WITH MOCK FOR TESTING"""

    # TEMPORARY: Mock data for testing
    if employee_id.startswith("TEST"):
        return {
            "data": {
                "employee_id": employee_id,
                "name": "Test Employee",
                "email": "test@example.com",
                "department": "IT",
                "policyLists": []
            }
        }

    # Real API call
    # ... existing code ...
```

Then you can use `TEST001` as employee ID for testing.

**⚠️ Remember to remove this mock code before production!**

---

## Summary

**To use the test interface:**

1. Get a **real employee ID** from:
   - Zimyo dashboard
   - HR team
   - Zimyo API
   - Create test employee

2. Use it in test interface:
   - Open: http://localhost:8080
   - Enter real employee ID
   - Click Login
   - Start testing! ✅

**Don't use fake IDs like `emp123`, `test123`, etc. - they won't work!**

---

## Contact

If you're unable to get employee IDs:
- Contact your Zimyo administrator
- Contact your HR team
- Check Zimyo documentation
- Reach out to Zimyo support

---

**Quick Reference:**
```
✅ DO: Use real employee ID from Zimyo system
❌ DON'T: Use fake IDs like emp123, test123
```
