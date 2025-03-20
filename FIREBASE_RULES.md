# Firebase Rules Setup

## Firebase Security Rules

You need to set up proper security rules for both Firestore and Firebase Storage to ensure data protection and prevent unauthorized access.

## Firestore Security Rules

Copy the rules below to your Firebase Console:

```
rules_version = '2';
service cloud.firestore {
  match /databases/{database}/documents {
    // Allow users to read and write only their own projects
    match /projects/{projectId} {
      allow create: if request.auth != null && request.resource.data.userId == request.auth.uid;
      allow read, update, delete: if request.auth != null && resource.data.userId == request.auth.uid;
    }
    
    // Default deny all other access
    match /{document=**} {
      allow read, write: if false;
    }
  }
}
```

To apply these rules:
1. Go to [Firebase Console](https://console.firebase.google.com/)
2. Select your project
3. Navigate to Firestore Database > Rules
4. Replace the existing rules with the rules above
5. Click "Publish"

## Firebase Storage Rules

Copy the rules below to your Firebase Console:

```
rules_version = '2';
service firebase.storage {
  match /b/{bucket}/o {
    // Allow users to read and write only their own videos
    match /videos/{userId}/{videoId} {
      allow read, write: if request.auth != null && request.auth.uid == userId;
    }
    
    // Allow reading public resources (if needed)
    match /public/{allPaths=**} {
      allow read: if request.auth != null;
    }
    
    // Default deny all other access
    match /{allPaths=**} {
      allow read, write: if false;
    }
  }
}
```

To apply these rules:
1. Go to [Firebase Console](https://console.firebase.google.com/)
2. Select your project
3. Navigate to Storage > Rules
4. Replace the existing rules with the rules above
5. Click "Publish"

## Important Security Notes

- These rules ensure that users can only access their own data
- The default deny rule blocks any unspecified access patterns
- Make sure to apply these rules before deploying your application to production 