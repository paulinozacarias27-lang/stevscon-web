# Configuracion de Reglas de Firebase - Stevscon.com

> Estas reglas fueron reforzadas en la version corregida para: (1) impedir que un usuario
> normal se auto-asigne `role`, `rank`, `verified` o `badge` (escalada de privilegios),
> (2) dar soporte al nuevo nodo `sentRequests` (solicitudes salientes) y (3) crear el indice
> `handleLower` necesario para la busqueda de usuarios por handle.

## 1. Firebase Realtime Database Rules

Ve a: **Firebase Console > Realtime Database > Rules**

Pega estas reglas:

```json
{
  "rules": {
    "users": {
      ".indexOn": ["handleLower"],
      "$uid": {
        ".read": "auth.uid != null",
        ".write": "auth.uid === $uid || auth.token.email === 'steven23hd@gmail.com' || root.child('users/' + auth.uid + '/role').val() === 'Admin' || root.child('users/' + auth.uid + '/role').val() === 'Owner'",

        "role": {
          ".validate": "newData.val() === 'User' || auth.token.email === 'steven23hd@gmail.com' || root.child('users/' + auth.uid + '/role').val() === 'Admin' || root.child('users/' + auth.uid + '/role').val() === 'Owner' || (data.exists() && newData.val() === data.val())"
        },
        "rank": {
          ".validate": "auth.token.email === 'steven23hd@gmail.com' || root.child('users/' + auth.uid + '/role').val() === 'Admin' || root.child('users/' + auth.uid + '/role').val() === 'Owner' || (data.exists() && newData.val() === data.val())"
        },
        "verified": {
          ".validate": "newData.val() === false || auth.token.email === 'steven23hd@gmail.com' || root.child('users/' + auth.uid + '/role').val() === 'Admin' || root.child('users/' + auth.uid + '/role').val() === 'Owner' || (data.exists() && newData.val() === data.val())"
        },
        "badge": {
          ".validate": "auth.token.email === 'steven23hd@gmail.com' || root.child('users/' + auth.uid + '/role').val() === 'Admin' || root.child('users/' + auth.uid + '/role').val() === 'Owner' || (data.exists() && newData.val() === data.val())"
        }
      }
    },
    "publicHandles": {
      ".read": "auth.uid != null",
      "$handleLower": {
        ".write": "auth.uid === newData.child('uid').val() || (data.exists() && auth.uid === data.child('uid').val())"
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
    "sentRequests": {
      "$senderUid": {
        ".read": "auth.uid === $senderUid",
        ".write": "auth.uid === $senderUid",
        "$targetUid": {
          ".read": "auth.uid === $senderUid || auth.uid === $targetUid",
          ".write": "auth.uid === $senderUid || auth.uid === $targetUid",
          ".validate": "newData.hasChildren(['targetUid', 'status', 'createdAt']) || !newData.exists()"
        }
      }
    },
    "friends": {
      "$uid": {
        ".read": "auth.uid === $uid",
        "$friendUid": {
          ".read": "auth.uid === $uid || auth.uid === $friendUid",
          ".write": "auth.uid === $uid || auth.uid === $friendUid"
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
        ".write": "auth.uid != null && (!data.exists() || data.child('participants/' + auth.uid).exists()) && newData.child('participants/' + auth.uid).exists()"
      }
    },
    "messages": {
      "$convId": {
        ".read": "auth.uid != null && root.child('conversations/' + $convId + '/participants/' + auth.uid).exists()",
        "$messageId": {
          ".read": "auth.uid != null && root.child('conversations/' + $convId + '/participants/' + auth.uid).exists()",
          ".write": "auth.uid != null && root.child('conversations/' + $convId + '/participants/' + auth.uid).exists() && (!data.exists() || data.child('senderUid').val() === auth.uid)",
          ".validate": "!newData.exists() || newData.child('senderUid').val() === auth.uid"
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

### Notas de seguridad (importante)

- **Anti-escalada de privilegios:** un usuario autenticado solo puede editar su propio nodo
  `users/{uid}`, y las reglas `.validate` impiden que se asigne a si mismo `role` distinto de
  `'User'`, `verified` distinto de `false`, o cualquier `rank`/`badge`. Estos campos solo pueden
  ser modificados por:
  - el **Owner** (identificado por su correo `steven23hd@gmail.com` en el token de autenticacion), o
  - un usuario cuyo `role` ya sea `Admin` u `Owner` en la base de datos (para `AdminSystem.setAdminRole`).
  - Un valor ya existente puede reescribirse con el mismo valor (no se rompe una actualizacion
    parcial que reenvie el campo sin cambiarlo).
- **Solicitudes salientes (`sentRequests`):** cada usuario mantiene su propia lista en
  `sentRequests/{senderUid}/{targetUid}`. El remitente la crea/cancela y el destinatario puede
  eliminar la entrada correspondiente al aceptar/rechazar/bloquear. Asi `getOutgoingRequests()`
  lee un solo nodo en vez de escanear toda la base de datos.
- **Busqueda por handle:** el indice `.indexOn: ["handleLower"]` es obligatorio para que la
  consulta `orderByChild('handleLower').startAt(...).endAt(...)` sea eficiente y no lance
  advertencias de rendimiento.
- **Amistades:** ambos extremos (`$uid` y `$friendUid`) pueden escribir en la relacion, necesario
  para crear/eliminar la amistad de forma bidireccional al aceptar o eliminar un amigo.
- **Conversaciones y mensajes:** solo son accesibles por sus participantes; ademas el escritor debe
  seguir figurando como participante y solo el remitente puede crear/editar sus propios mensajes.
- **Bloqueos:** son privados; solo el propio usuario ve y gestiona su lista.
- Los perfiles siguen siendo legibles por cualquier usuario autenticado (necesario para ver
  perfiles publicos y resultados de busqueda).

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

### Notas de seguridad
- Solo usuarios autenticados pueden subir imagenes.
- Cada usuario solo puede subir a su propia ruta: `profile_uploads/{uid}/avatar` o `profile_uploads/{uid}/banner`.
- Limite de 5 MB por archivo.
- Solo se permiten imagenes (`image/*`).
- Cualquier otra ruta esta bloqueada por defecto.
- **Importante:** las imagenes ahora se suben SIEMPRE a Storage (ya no se guarda base64 en la
  base de datos). Si Storage no esta habilitado o falla la subida, la aplicacion muestra el error
  "No se pudo subir la imagen. Verifica tu conexion." en lugar de degradar a base64.

---

## 3. Pasos manuales restantes

1. **Habilitar Email/Password en Firebase Authentication**:
   - Firebase Console > Authentication > Sign-in method > Email/Password > Enable > Save.

2. **Habilitar Firebase Storage** (obligatorio para avatares y banners):
   - Firebase Console > Storage > Get Started > seguir el asistente.
   - Pegar las reglas de arriba en la pestana Rules.

3. **Indice en Realtime Database** (obligatorio para la busqueda por handle):
   - Ya incluido arriba como `".indexOn": ["handleLower"]` dentro de `users`.
   - Si prefieres configurarlo manualmente: Firebase Console > Realtime Database > Rules y verificar
     que aparezca el indice.

4. **Verificar que Realtime Database este creada**:
   - Firebase Console > Realtime Database > verificar que la URL sea:
     `https://stevscon-protocole-base-default-rtdb.firebaseio.com/`

5. **Owner:** el correo del Owner esta fijado en las reglas (`steven23hd@gmail.com`). Si cambias el
   Owner en `accounts_manage/owner.js`, actualiza tambien ese correo en las reglas de la base de datos.
