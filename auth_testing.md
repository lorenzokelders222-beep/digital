# Auth Testing Playbook (Emergent Google Auth)

## Step 1: Create Test Session
```bash
mongosh --eval "
use('test_database');
var userId = 'test-user-' + Date.now();
var sessionToken = 'test_session_' + Date.now();
db.users.insertOne({
  user_id: userId,
  email: 'test.user.' + Date.now() + '@example.com',
  name: 'Test User',
  picture: 'https://via.placeholder.com/150',
  created_at: new Date()
});
db.user_sessions.insertOne({
  user_id: userId,
  session_token: sessionToken,
  expires_at: new Date(Date.now() + 7*24*60*60*1000),
  created_at: new Date()
});
print('Session token: ' + sessionToken);
print('User ID: ' + userId);
"
```

## Step 2: Test Backend API
```bash
curl -X GET "https://premium-shoots-3.preview.emergentagent.com/api/auth/me" \
  -H "Cookie: session_token=YOUR_SESSION_TOKEN"
```

## Step 3: Browser Testing
Set cookie via Playwright:
```python
await page.context.add_cookies([{
  "name": "session_token", "value": "YOUR_TOKEN",
  "domain": "premium-shoots-3.preview.emergentagent.com",
  "path": "/", "httpOnly": True, "secure": True, "sameSite": "None"
}])
```

## Owner / Admin
- lorenzokelders222@gmail.com — matches OWNER_EMAIL in backend/.env, gets admin access.
