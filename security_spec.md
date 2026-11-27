# SHIKKHANIR Firestore Security Specification

## 1. Data Invariants

1. **Identity & Privilege Invariant**: A user cannot assign themselves `ADMIN` or `TEACHER` roles in `/users/{userId}` on registration, nor elevate their own role on update. Only an existing verified admin (`welxon.imb@gmail.com` or an existing `/admins/{uid}` document with `email_verified == true`) can manage `/admins/{adminId}` or change user roles.
2. **Master Gate PII Invariant**: Private PII (`/users/{userId}/private/info`) cannot exist without a parent `/users/{userId}` document (`exists(...)` Master Gate) and is readable/writable strictly by the owner (`request.auth.uid == userId`) or a verified admin.
3. **Bootstrap Integrity Invariant**: Only verified admins can publish or modify `/public_data/bootstrap` and `/notices/{noticeId}`; public visitors only receive `get` (and `list` for `/notices`) without write access.
4. **Admission Lifecycle & Ownership Invariant**: An admission in `/admissions/{admissionId}` must always belong to `request.auth.uid` (`applicantUid`), start in `status == 'Submitted'`, enforce server timestamps (`request.time`), and lock updates once `status` reaches terminal states (`Approved` or `Rejected`) unless overridden by an admin.
5. **Path & Size Exhaustion Invariant**: Every document ID path variable is validated with `isValidId(id)` (`^[a-zA-Z0-9_\-]+$`, max 128 chars), every string has explicit `.size()` bounds, and every array has an explicit `.size() <= MAX` bound.

## 2. The "Dirty Dozen" Attack Payloads (Expected: PERMISSION_DENIED)

1. **Privilege Escalation on Signup**: Unprivileged user attempts `create` on `/users/{uid}` with `{ uid, displayName: "Hacker", role: "ADMIN", createdAt: serverTimestamp, updatedAt: serverTimestamp }`.
2. **Admin Registry Injection**: Verified non-admin user attempts `create` on `/admins/{uid}` with `{ uid, email, name, role: "ADMIN", createdAt: serverTimestamp, updatedAt: serverTimestamp }`.
3. **Email Spoofing Admin Bypass**: Unverified auth token (`email: "welxon.imb@gmail.com"`, `email_verified: false`) attempts `set` on `/public_data/bootstrap`.
4. **Cross-User PII Read**: Signed-in Student A attempts `get` on `/users/{studentB}/private/info`.
5. **Orphaned Private Subcollection Write**: User attempts `create` on `/users/{nonExistentUid}/private/info` when parent `/users/{nonExistentUid}` does not exist.
6. **Shadow Field Injection on Profile Update**: User updates `/users/{uid}` adding `{ displayName: "Valid", isAdmin: true, updatedAt: serverTimestamp }`.
7. **Admission Ownership Spoofing**: User A creates `/admissions/adm-999` with `applicantUid: "userB"`.
8. **Admission Self-Approval State Shortcut**: Student creates `/admissions/adm-100` directly with `status: "Approved"` or updates their own `Submitted` application to `status: "Approved"`.
9. **Terminal State Tampering**: Student updates `/admissions/adm-101` after status is already `"Approved"` or `"Rejected"`.
10. **Forged Client Timestamp**: User creates `/admissions/adm-102` with `createdAt: Timestamp(2020-01-01)` instead of `request.time`.
11. **ID Poisoning / Resource Exhaustion**: User attempts `create` on `/admissions/` with a 500-character ID or invalid characters (`adm/../evil`), or injects a 50KB `studentName`.
12. **Blanket Collection Scraping (`list` bypass)**: Signed-in Student A executes unbounded `list` query on `/admissions` without `where('applicantUid', '==', uid)`, or executes `list` on `/users` / `/admins`.
