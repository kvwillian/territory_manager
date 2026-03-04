# Creating the Two Initial Admin Users

To use the app with Firebase, you need two admin users who can then add conductors. Follow these steps.

## 1. Deploy the Cloud Function

From the project root:

```bash
cd functions
npm install
npm run build
cd ..
firebase deploy --only functions
```

## 2. Create the First Admin in Firebase Console

1. Go to [Firebase Console](https://console.firebase.google.com) → your project
2. **Authentication** → **Users** → **Add user**
   - Email: `admin1@yourdomain.com`
   - Password: (choose a secure password)
3. Copy the **User UID** (e.g. `abc123xyz`)

## 3. Create the Firestore Document for the Admin

1. In Firebase Console → **Firestore Database**
2. Create or select the `users` collection
3. **Add document**
   - **Document ID**: paste the User UID from step 2 (must match exactly)
   - Fields:
     - `name` (string): `Admin 1`
     - `email` (string): `admin1@yourdomain.com`
     - `role` (string): `admin`

## 4. Repeat for the Second Admin

Create a second user in Authentication and a matching document in `users` with `role: "admin"`.

## 5. Log In and Add Conductors

1. Open the app and log in with one of the admin accounts (email + password)
2. Go to **Usuários** → **Novo Usuário**
3. Fill in name, email, password (min 6 chars), and role (Condutor or Administrador)
4. Tap **Criar usuário**

New users are created in Firebase Auth and Firestore, and can log in immediately.
