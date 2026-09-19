# Configuracion de Reglas de Firebase - Stevscon.com

## 1. Firebase Realtime Database Rules

Ve a: **Firebase Console > Realtime Database > Rules**

Pega estas reglas:

```json
{
  "rules": {
    "users": {
      "$uid": {
        ".read": "auth.uid === $uid || auth.uid != null",
        ".write": "auth.uid === $uid"
      }
    },
    "publicHandles": {
      ".read": "auth.uid != null",
      "$handleLower": {
        ".write": "auth.uid === newData.child('uid').val()"
      }
    },
    "friendRequests": {
      "$targetUid": {
        ".read": "auth.uid === $targetUid",
        "$senderUid": {
          ".read": "auth.uid === $targetUid || auth.uid === $senderUid",
          ".write": "auth.uid === $senderUid || auth.uid === $targetUid"
        }
      }
    },
    "friends": {
      "$uid": {
        ".read": "auth.uid === $uid",
        "$friendUid": {
          ".read": "auth.uid === $uid || auth.uid === $friendUid",
          ".write": "auth.uid === $uid"
        }
      }
    },
    "blocks": {
      "$uid": {
        ".read": "auth.uid === $uid",
        "$blockedUid": {
          ".write": "auth.uid === $uid"
        }
      }
    },
    "conversations": {
      "$convId": {
        ".read": "auth.uid != null && data.child('participants/' + auth.uid).exists()",
        ".write": "auth.uid != null && (!data.exists() || data.child('participants/' + auth.uid).exists())"
      }
    },
    "messages": {
      "$convId": {
        ".read": "auth.uid != null && root.child('conversations/' + $convId + '/participants/' + auth.uid).exists()",
        "$messageId": {
          ".read": "auth.uid != null && root.child('conversations/' + $convId + '/participants/' + auth.uid).exists()",
          ".write": "auth.uid != null && root.child('conversations/' + $convId + '/participants/' + auth.uid).exists() && (!data.exists() || data.child('senderUid').val() === auth.uid)"
        }
      }
    },
    "userConversations": {
      "$uid": {
        ".read": "auth.uid === $uid",
        "$convId": {
          ".read": "auth.uid === $uid",
          ".write": "auth.uid === $uid || root.child('conversations/' + $convId + '/participants/' + auth.uid).exists()"
        }
      }
    },
    "presence": {
      "$uid": {
        ".read": "auth.uid != null",
        ".write": "auth.uid === $uid"
      }
    }
  }
}
```

### Notas de seguridad:
- Cada usuario solo puede editar su propio perfil (`users/{uid}`).
- Los perfiles son legibles por usuarios autenticados (necesario para ver perfiles publicos).
- Un usuario no puede cambiar su propio `role`, `rank`, `verified` ni `badge` desde las reglas (la aplicacion ya lo impide, pero las reglas de Firebase deberian validarlo tambien con funciones custom si se usa Firebase Admin).
- Las conversaciones y mensajes solo son accesibles por sus participantes.
- Solo el remitente puede borrar o editar sus propios mensajes.
- Los bloques son privados: solo el usuario puede ver y gestionar su propia lista de bloqueos.

---

## 2. Firebase Storage Rules

Ve a: **Firebase Console > Storage > Rules**

Pega estas reglas:

```
rules_version = '2';
service firebase.storage {
  match /b/{bucket}/o {
    match /profile_uploads/{uid}/{type} {
      allow read: if request.auth != null;
      allow write: if request.auth != null
        && request.auth.uid == uid
        && (type == 'avatar' || type == 'banner')
        && request.resource.size < 5 * 1024 * 1024
        && request.resource.contentType.matches('image/.*');
    }
    match /{allPaths=**} {
      allow read, write: if false;
    }
  }
}
```

### Notas de seguridad:
- Solo usuarios autenticados pueden subir imagenes.
- Cada usuario solo puede subir a su propia ruta: `profile_uploads/{uid}/avatar` o `profile_uploads/{uid}/banner`.
- Limite de 5 MB por archivo.
- Solo se permiten imagenes (image/*).
- Cualquier otra ruta esta bloqueada por defecto.

---

## 3. Pasos manuales restantes

1. **Habilitar Email/Password en Firebase Authentication**:
   - Firebase Console > Authentication > Sign-in method > Email/Password > Enable > Save.

2. **Habilitar Firebase Storage** (si no esta activado):
   - Firebase Console > Storage > Get Started > seguir el asistente.
   - Pegar las reglas de arriba en la pestana Rules.

3. **Crear un indice en Realtime Database** (opcional pero recomendado para busquedas):
   - Firebase Console > Realtime Database > Indexes
   - Agregar indice en `users` por `handleLower`.

4. **Verificar que Realtime Database este creada**:
   - Firebase Console > Realtime Database > verificar que la URL sea:
     `https://stevscon-protocole-base-default-rtdb.firebaseio.com/`
