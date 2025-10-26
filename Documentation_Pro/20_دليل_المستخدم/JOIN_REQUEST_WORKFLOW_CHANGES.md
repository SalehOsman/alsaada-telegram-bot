# Join Request Workflow - Changes Made

## 📋 Overview

Implemented a proper approval workflow for join requests as requested.

---

## ✅ Changes Made

### 1. **Disabled Auto-User Creation**
**File:** `src/bot/index.ts` (Lines 95-110)

**Before:**
- Every visitor who sent `/start` was automatically created as a GUEST user

**After:**
- Users are NOT automatically created
- User record is only created AFTER join request approval

---

### 2. **Updated Join Request Approval**
**File:** `src/bot/features/admin-panel/handlers/join-requests.ts`

**Before:**
1. Updated JoinRequest status to APPROVED
2. Created/Updated User with role GUEST
3. Changed role to USER
4. Logged role change
5. Updated phone number
6. Kept JoinRequest in database

**After:**
1. Create new User directly from JoinRequest data:
   - `fullName` → `firstName`
   - `nickname` → `lastName` and `nickname`
   - `phone` → `phone`
   - Role: `USER` (directly)
2. **Delete JoinRequest** after creating user
3. Send notification to user

**Benefits:**
- ✅ Clean workflow
- ✅ No orphaned JoinRequests
- ✅ All user data transferred properly
- ✅ No role change needed (created as USER directly)

---

### 3. **Updated Join Request Rejection**
**File:** `src/bot/features/admin-panel/handlers/join-requests.ts`

**Before:**
- Updated JoinRequest status to REJECTED
- Kept rejected request in database

**After:**
- Update JoinRequest status to REJECTED
- Keep record in database (to prevent re-submission)
- Record rejection reason and rejectedBy admin ID
- Record respondedAt timestamp
- Send notification to user

**Benefits:**
- ✅ Prevents spam (user cannot submit another request)
- ✅ Audit trail (admin can see who was rejected and why)
- ✅ Accountability (tracks which admin rejected which request)

---

### 4. **Added Rejection Check in Join Request Wizard**
**File:** `src/modules/interaction/wizards/join-request.ts`

**Added:**
- Check if user has a REJECTED request
- Show rejection reason to user
- Prevent submitting a new request

---

## 🔄 New Workflow

### **Visitor Journey:**

1. **Visitor sends `/start`**
   - ❌ No User record created
   - ✅ Shows welcome message with "Submit Join Request" button

2. **Visitor submits join request**
   - ✅ Data saved in `JoinRequest` table
   - ✅ Admin notified

3. **Admin reviews request:**

   **Option A: Approve ✅**
   - User record created with ALL data (fullName, nickname, phone)
   - Role: USER
   - JoinRequest deleted
   - Visitor notified

   **Option B: Reject ❌**
   - JoinRequest status → REJECTED
   - Record rejection reason and admin ID
   - **Keep record in database** (prevents re-submission)
   - Visitor notified
   - No User record created

4. **If visitor tries to submit another request:**
   - System checks for existing request
   - If REJECTED: Shows rejection message with reason
   - User cannot submit a new request

---

## 📊 Database Tables

### **Before:**
```
JoinRequest: [Request data] → Status: APPROVED/REJECTED (kept forever)
User: [Created immediately as GUEST] → Changed to USER on approval
```

### **After:**
```
JoinRequest: [Request data] → Status: PENDING
                            ↓
                    (On Approval)
                            ↓
User: [All data from JoinRequest] → Role: USER
JoinRequest: [DELETED]

OR

JoinRequest: [Request data] → Status: PENDING
                            ↓
                    (On Rejection)
                            ↓
JoinRequest: [Status: REJECTED, rejectionReason, rejectedBy] (KEPT)
            ↓
User tries to submit again → ❌ Blocked (shows rejection message)
```

---

## 🧹 Cleanup Required

To remove existing GUEST users created before this fix:

```bash
npx tsx cleanup-guest-users.ts
```

This will delete all GUEST role users from the database.

---

## ✅ Testing Checklist

- [ ] New visitor sends /start → No User record created
- [ ] Visitor submits join request → Data in JoinRequest table only
- [ ] Admin approves request → User created, JoinRequest deleted
- [ ] Admin rejects request → JoinRequest status REJECTED (kept in DB)
- [ ] Rejected user tries to submit again → Blocked with rejection message
- [ ] Approved user can access bot features
- [ ] Rejected user cannot submit a new request

---

## 📝 Notes

- Super Admin is still auto-created on bot startup (from `.env`)
- Existing users (non-GUEST) are not affected
- Rejected requests are KEPT in database to prevent re-submission
- Only approved requests are deleted (after user creation)
- Admins can see rejection history in JoinRequest table

---

**Date:** 2025-10-25
**Status:** ✅ Implemented and Ready for Testing
