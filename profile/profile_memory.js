const ProfileMemory = {
    _escape(str) {
        if (str === null || str === undefined) return '';
        const div = document.createElement('div');
        div.textContent = String(str);
        return div.innerHTML;
    },

    _withTimeout(promise, ms) {
        return Promise.race([
            promise,
            new Promise((_, reject) => setTimeout(() => reject(new Error('timeout')), ms))
        ]);
    },

    _defaultProfile(uid, email) {
        return {
            uid: uid,
            email: email || '',
            username: 'Usuario',
            handle: '@usuario',
            handleLower: 'usuario',
            role: 'User',
            rank: 0,
            verified: false,
            badge: '',
            createdAt: new Date().toISOString(),
            updatedAt: new Date().toISOString(),
            avatarURL: '',
            bannerURL: '',
            bio: '',
            location: '',
            website: '',
            status: 'offline',
            customStatus: '',
            statusUpdatedAt: new Date().toISOString(),
            privacy: {
                profileVisibility: 'public',
                allowFriendRequests: true,
                allowDirectMessages: 'friends',
                showOnlineStatus: true
            },
            stats: {
                friendsCount: 0,
                messagesSent: 0
            }
        };
    },

    _mergeProfile(raw) {
        if (!raw) return null;
        const defaults = this._defaultProfile(raw.uid || '', raw.email || '');
        const merged = { ...defaults, ...raw };
        merged.privacy = { ...defaults.privacy, ...(raw.privacy || {}) };
        merged.stats = { ...defaults.stats, ...(raw.stats || {}) };
        if (!merged.handleLower && merged.handle) {
            merged.handleLower = merged.handle.replace('@', '').toLowerCase();
        }
        return merged;
    },

    async getProfile(uid) {
        if (!uid || !db) return null;
        try {
            const snapshot = await this._withTimeout(db.ref('users/' + uid).once('value'), 8000);
            if (!snapshot.exists()) return null;
            return this._mergeProfile(snapshot.val());
        } catch (e) {
            console.warn('ProfileMemory.getProfile:', e.message);
            return null;
        }
    },

    async getProfileByHandle(handle) {
        if (!handle || !db) return null;
        try {
            const cleanHandle = handle.replace('@', '').toLowerCase();
            const snapshot = await this._withTimeout(
                db.ref('users').orderByChild('handleLower').equalTo(cleanHandle).once('value'),
                8000
            );
            if (!snapshot.exists()) return null;
            let result = null;
            snapshot.forEach(child => {
                result = { uid: child.key, ...this._mergeProfile(child.val()) };
            });
            return result;
        } catch (e) {
            console.warn('ProfileMemory.getProfileByHandle:', e.message);
            return null;
        }
    },

    async updateProfile(uid, partialData) {
        if (!uid || !db || !partialData) return false;
        try {
            const dataToUpdate = { ...partialData, updatedAt: new Date().toISOString() };
            await this._withTimeout(db.ref('users/' + uid).update(dataToUpdate), 8000);
            return true;
        } catch (e) {
            console.warn('ProfileMemory.updateProfile:', e.message);
            return false;
        }
    },

    async searchUsersByHandle(query, limit) {
        if (!query || !db) return [];
        try {
            const cleanQuery = query.replace('@', '').toLowerCase();
            const snapshot = await this._withTimeout(
                db.ref('users').orderByChild('handleLower').limitToFirst(limit || 10).once('value'),
                8000
            );
            if (!snapshot.exists()) return [];
            const results = [];
            snapshot.forEach(child => {
                const profile = child.val();
                if (profile && profile.handleLower && profile.handleLower.startsWith(cleanQuery)) {
                    results.push({ uid: child.key, ...this._mergeProfile(profile) });
                }
            });
            return results;
        } catch (e) {
            console.warn('ProfileMemory.searchUsersByHandle:', e.message);
            return [];
        }
    },

    _resizeImage(file, maxDim, quality) {
        return new Promise((resolve, reject) => {
            const reader = new FileReader();
            reader.onload = (e) => {
                const img = new Image();
                img.onload = () => {
                    let w = img.width, h = img.height;
                    if (w > maxDim || h > maxDim) {
                        if (w > h) { h = Math.round(h * maxDim / w); w = maxDim; }
                        else { w = Math.round(w * maxDim / h); h = maxDim; }
                    }
                    const canvas = document.createElement('canvas');
                    canvas.width = w; canvas.height = h;
                    const ctx = canvas.getContext('2d');
                    ctx.drawImage(img, 0, 0, w, h);
                    resolve(canvas.toDataURL('image/jpeg', quality || 0.85));
                };
                img.onerror = () => reject(new Error('No se pudo procesar la imagen.'));
                img.src = e.target.result;
            };
            reader.onerror = () => reject(new Error('No se pudo leer el archivo.'));
            reader.readAsDataURL(file);
        });
    },

    async uploadAvatar(uid, file) {
        if (!uid || !file) return null;
        const validTypes = ['image/jpeg', 'image/png', 'image/webp', 'image/gif'];
        if (!validTypes.includes(file.type)) throw new Error('Formato no valido. Usa JPG, PNG, WEBP o GIF.');
        if (file.size > 5 * 1024 * 1024) throw new Error('El archivo supera el limite de 5 MB.');

        const dataUrl = await this._resizeImage(file, 256, 0.85);

        if (typeof firebase !== 'undefined' && firebase.storage) {
            try {
                const storageRef = firebase.storage().ref('profile_uploads/' + uid + '/avatar');
                const snapshot = await storageRef.put(file);
                const url = await snapshot.ref.getDownloadURL();
                await this.updateProfile(uid, { avatarURL: url });
                return url;
            } catch (e) {
                console.warn('Storage upload failed, using base64 fallback:', e.message);
            }
        }

        await this.updateProfile(uid, { avatarURL: dataUrl });
        return dataUrl;
    },

    async uploadBanner(uid, file) {
        if (!uid || !file) return null;
        const validTypes = ['image/jpeg', 'image/png', 'image/webp', 'image/gif'];
        if (!validTypes.includes(file.type)) throw new Error('Formato no valido. Usa JPG, PNG, WEBP o GIF.');
        if (file.size > 5 * 1024 * 1024) throw new Error('El archivo supera el limite de 5 MB.');

        const dataUrl = await this._resizeImage(file, 800, 0.8);

        if (typeof firebase !== 'undefined' && firebase.storage) {
            try {
                const storageRef = firebase.storage().ref('profile_uploads/' + uid + '/banner');
                const snapshot = await storageRef.put(file);
                const url = await snapshot.ref.getDownloadURL();
                await this.updateProfile(uid, { bannerURL: url });
                return url;
            } catch (e) {
                console.warn('Storage upload failed, using base64 fallback:', e.message);
            }
        }

        await this.updateProfile(uid, { bannerURL: dataUrl });
        return dataUrl;
    },

    async removeAvatar(uid) {
        if (!uid) return false;
        await this.updateProfile(uid, { avatarURL: '' });
        if (typeof firebase !== 'undefined' && firebase.storage) {
            try {
                const storageRef = firebase.storage().ref('profile_uploads/' + uid + '/avatar');
                await storageRef.delete();
            } catch (e) {
                console.warn('Could not delete avatar file from storage:', e.message);
            }
        }
        return true;
    },

    async removeBanner(uid) {
        if (!uid) return false;
        await this.updateProfile(uid, { bannerURL: '' });
        if (typeof firebase !== 'undefined' && firebase.storage) {
            try {
                const storageRef = firebase.storage().ref('profile_uploads/' + uid + '/banner');
                await storageRef.delete();
            } catch (e) {
                console.warn('Could not delete banner file from storage:', e.message);
            }
        }
        return true;
    },

    async sendFriendRequest(senderUid, senderProfile, targetUid) {
        if (!senderUid || !targetUid || !db) return false;
        try {
            const requestData = {
                senderUid: senderUid,
                senderUsername: senderProfile.username || 'Usuario',
                senderHandle: senderProfile.handle || '@usuario',
                senderAvatarURL: senderProfile.avatarURL || '',
                createdAt: new Date().toISOString(),
                status: 'pending'
            };
            await this._withTimeout(
                db.ref('friendRequests/' + targetUid + '/' + senderUid).set(requestData),
                8000
            );
            return true;
        } catch (e) {
            console.warn('ProfileMemory.sendFriendRequest:', e.message);
            return false;
        }
    },

    async cancelFriendRequest(senderUid, targetUid) {
        if (!senderUid || !targetUid || !db) return false;
        try {
            await this._withTimeout(
                db.ref('friendRequests/' + targetUid + '/' + senderUid).remove(),
                8000
            );
            return true;
        } catch (e) {
            console.warn('ProfileMemory.cancelFriendRequest:', e.message);
            return false;
        }
    },

    async acceptFriendRequest(currentUid, senderUid, senderProfile, currentProfile) {
        if (!currentUid || !senderUid || !db) return false;
        try {
            const now = new Date().toISOString();
            const myFriendData = {
                uid: senderUid,
                username: senderProfile.username || 'Usuario',
                handle: senderProfile.handle || '@usuario',
                avatarURL: senderProfile.avatarURL || '',
                status: senderProfile.status || 'offline',
                addedAt: now
            };
            const theirFriendData = {
                uid: currentUid,
                username: currentProfile.username || 'Usuario',
                handle: currentProfile.handle || '@usuario',
                avatarURL: currentProfile.avatarURL || '',
                status: currentProfile.status || 'offline',
                addedAt: now
            };
            const updates = {};
            updates['friends/' + currentUid + '/' + senderUid] = myFriendData;
            updates['friends/' + senderUid + '/' + currentUid] = theirFriendData;
            updates['friendRequests/' + currentUid + '/' + senderUid] = null;
            await this._withTimeout(db.ref().update(updates), 8000);

            const myCount = await this.getFriendsCount(currentUid);
            const theirCount = await this.getFriendsCount(senderUid);
            await db.ref('users/' + currentUid + '/stats/friendsCount').set(myCount);
            await db.ref('users/' + senderUid + '/stats/friendsCount').set(theirCount);
            return true;
        } catch (e) {
            console.warn('ProfileMemory.acceptFriendRequest:', e.message);
            return false;
        }
    },

    async rejectFriendRequest(currentUid, senderUid) {
        if (!currentUid || !senderUid || !db) return false;
        try {
            await this._withTimeout(
                db.ref('friendRequests/' + currentUid + '/' + senderUid).remove(),
                8000
            );
            return true;
        } catch (e) {
            console.warn('ProfileMemory.rejectFriendRequest:', e.message);
            return false;
        }
    },

    async removeFriend(currentUid, friendUid) {
        if (!currentUid || !friendUid || !db) return false;
        try {
            const updates = {};
            updates['friends/' + currentUid + '/' + friendUid] = null;
            updates['friends/' + friendUid + '/' + currentUid] = null;
            await this._withTimeout(db.ref().update(updates), 8000);

            const myCount = await this.getFriendsCount(currentUid);
            const theirCount = await this.getFriendsCount(friendUid);
            await db.ref('users/' + currentUid + '/stats/friendsCount').set(myCount);
            await db.ref('users/' + friendUid + '/stats/friendsCount').set(theirCount);
            return true;
        } catch (e) {
            console.warn('ProfileMemory.removeFriend:', e.message);
            return false;
        }
    },

    async getFriends(uid) {
        if (!uid || !db) return [];
        try {
            const snapshot = await this._withTimeout(db.ref('friends/' + uid).once('value'), 8000);
            if (!snapshot.exists()) return [];
            const friends = [];
            snapshot.forEach(child => {
                friends.push({ uid: child.key, ...child.val() });
            });
            return friends;
        } catch (e) {
            console.warn('ProfileMemory.getFriends:', e.message);
            return [];
        }
    },

    async getFriendsCount(uid) {
        if (!uid || !db) return 0;
        try {
            const snapshot = await this._withTimeout(db.ref('friends/' + uid).once('value'), 5000);
            return snapshot.exists() ? snapshot.numChildren() : 0;
        } catch (e) {
            return 0;
        }
    },

    async getIncomingRequests(uid) {
        if (!uid || !db) return [];
        try {
            const snapshot = await this._withTimeout(db.ref('friendRequests/' + uid).once('value'), 8000);
            if (!snapshot.exists()) return [];
            const requests = [];
            snapshot.forEach(child => {
                requests.push({ uid: child.key, ...child.val() });
            });
            return requests;
        } catch (e) {
            console.warn('ProfileMemory.getIncomingRequests:', e.message);
            return [];
        }
    },

    async getOutgoingRequests(uid) {
        if (!uid || !db) return [];
        try {
            const snapshot = await this._withTimeout(
                db.ref('friendRequests').once('value'),
                8000
            );
            if (!snapshot.exists()) return [];
            const outgoing = [];
            snapshot.forEach(targetChild => {
                const senderNode = targetChild.child(uid);
                if (senderNode.exists()) {
                    outgoing.push({
                        targetUid: targetChild.key,
                        ...senderNode.val()
                    });
                }
            });
            return outgoing;
        } catch (e) {
            console.warn('ProfileMemory.getOutgoingRequests:', e.message);
            return [];
        }
    },

    async blockUser(currentUid, targetUid) {
        if (!currentUid || !targetUid || !db) return false;
        try {
            const updates = {};
            updates['blocks/' + currentUid + '/' + targetUid] = { createdAt: new Date().toISOString() };
            updates['friends/' + currentUid + '/' + targetUid] = null;
            updates['friends/' + targetUid + '/' + currentUid] = null;
            updates['friendRequests/' + currentUid + '/' + targetUid] = null;
            updates['friendRequests/' + targetUid + '/' + currentUid] = null;
            await this._withTimeout(db.ref().update(updates), 8000);
            return true;
        } catch (e) {
            console.warn('ProfileMemory.blockUser:', e.message);
            return false;
        }
    },

    async unblockUser(currentUid, targetUid) {
        if (!currentUid || !targetUid || !db) return false;
        try {
            await this._withTimeout(db.ref('blocks/' + currentUid + '/' + targetUid).remove(), 8000);
            return true;
        } catch (e) {
            console.warn('ProfileMemory.unblockUser:', e.message);
            return false;
        }
    },

    async isBlocked(currentUid, targetUid) {
        if (!currentUid || !targetUid || !db) return false;
        try {
            const snapshot = await this._withTimeout(
                db.ref('blocks/' + currentUid + '/' + targetUid).once('value'),
                5000
            );
            return snapshot.exists();
        } catch (e) {
            return false;
        }
    },

    async isEitherBlocked(uidA, uidB) {
        const a = await this.isBlocked(uidA, uidB);
        if (a) return true;
        return await this.isBlocked(uidB, uidA);
    },

    getDirectConversationId(uidA, uidB) {
        const sorted = [uidA, uidB].sort();
        return 'dm_' + sorted[0] + '_' + sorted[1];
    },

    async getOrCreateDirectConversation(currentUid, currentProfile, targetUid, targetProfile) {
        if (!currentUid || !targetUid || !db) return null;
        const convId = this.getDirectConversationId(currentUid, targetUid);
        try {
            const existing = await this._withTimeout(db.ref('conversations/' + convId).once('value'), 5000);
            if (existing.exists()) return convId;

            const now = new Date().toISOString();
            const convData = {
                id: convId,
                type: 'direct',
                participants: { [currentUid]: true, [targetUid]: true },
                participantProfiles: {
                    [currentUid]: {
                        username: currentProfile.username || 'Usuario',
                        handle: currentProfile.handle || '@usuario',
                        avatarURL: currentProfile.avatarURL || ''
                    },
                    [targetUid]: {
                        username: targetProfile.username || 'Usuario',
                        handle: targetProfile.handle || '@usuario',
                        avatarURL: targetProfile.avatarURL || ''
                    }
                },
                lastMessage: { text: '', senderUid: '', createdAt: '' },
                createdAt: now,
                updatedAt: now
            };
            const updates = {};
            updates['conversations/' + convId] = convData;
            updates['userConversations/' + currentUid + '/' + convId] = {
                conversationId: convId,
                otherUserUid: targetUid,
                lastMessageText: '',
                lastMessageAt: now,
                unreadCount: 0
            };
            updates['userConversations/' + targetUid + '/' + convId] = {
                conversationId: convId,
                otherUserUid: currentUid,
                lastMessageText: '',
                lastMessageAt: now,
                unreadCount: 0
            };
            await this._withTimeout(db.ref().update(updates), 8000);
            return convId;
        } catch (e) {
            console.warn('ProfileMemory.getOrCreateDirectConversation:', e.message);
            return null;
        }
    },

    async sendMessage(convId, senderUid, text) {
        if (!convId || !senderUid || !text || !db) return null;
        try {
            const trimmed = text.trim();
            if (!trimmed) return null;
            if (trimmed.length > 2000) throw new Error('El mensaje supera el limite de 2000 caracteres.');

            const now = new Date().toISOString();
            const msgRef = db.ref('messages/' + convId).push();
            const messageId = msgRef.key;
            const messageData = {
                id: messageId,
                senderUid: senderUid,
                text: trimmed,
                createdAt: now,
                editedAt: null,
                deleted: false
            };
            await msgRef.set(messageData);

            const convRef = db.ref('conversations/' + convId);
            const convSnapshot = await convRef.once('value');
            const conv = convSnapshot.val();
            if (conv) {
                const participants = conv.participants || {};
                const updates = {};
                updates['conversations/' + convId + '/lastMessage'] = {
                    text: trimmed,
                    senderUid: senderUid,
                    createdAt: now
                };
                updates['conversations/' + convId + '/updatedAt'] = now;

                for (const pUid in participants) {
                    if (pUid === senderUid) {
                        updates['userConversations/' + pUid + '/' + convId + '/lastMessageText'] = trimmed;
                        updates['userConversations/' + pUid + '/' + convId + '/lastMessageAt'] = now;
                        updates['userConversations/' + pUid + '/' + convId + '/unreadCount'] = 0;
                    } else {
                        const ucRef = db.ref('userConversations/' + pUid + '/' + convId);
                        const ucSnap = await ucRef.once('value');
                        const currentUnread = (ucSnap.val() && ucSnap.val().unreadCount) || 0;
                        updates['userConversations/' + pUid + '/' + convId + '/lastMessageText'] = trimmed;
                        updates['userConversations/' + pUid + '/' + convId + '/lastMessageAt'] = now;
                        updates['userConversations/' + pUid + '/' + convId + '/unreadCount'] = currentUnread + 1;
                    }
                }
                await db.ref().update(updates);
            }

            try {
                await db.ref('users/' + senderUid + '/stats/messagesSent')
                    .set((firebase.database.ServerValue.increment(1)));
            } catch (e) {
                console.warn('Could not increment messagesSent:', e.message);
            }

            return messageData;
        } catch (e) {
            console.warn('ProfileMemory.sendMessage:', e.message);
            throw e;
        }
    },

    async loadMessages(convId) {
        if (!convId || !db) return [];
        try {
            const snapshot = await this._withTimeout(
                db.ref('messages/' + convId).limitToLast(100).once('value'),
                8000
            );
            if (!snapshot.exists()) return [];
            const messages = [];
            snapshot.forEach(child => {
                messages.push(child.val());
            });
            return messages;
        } catch (e) {
            console.warn('ProfileMemory.loadMessages:', e.message);
            return [];
        }
    },

    subscribeToMessages(convId, callback) {
        if (!convId || !db) return null;
        const ref = db.ref('messages/' + convId).limitToLast(100);
        const handler = (snapshot) => {
            const messages = [];
            snapshot.forEach(child => { messages.push(child.val()); });
            if (callback) callback(messages);
        };
        ref.on('value', handler);
        return { ref, handler };
    },

    unsubscribeFromMessages(subscription) {
        if (subscription && subscription.ref) {
            subscription.ref.off('value', subscription.handler);
        }
    },

    async getUserConversations(uid) {
        if (!uid || !db) return [];
        try {
            const snapshot = await this._withTimeout(db.ref('userConversations/' + uid).once('value'), 8000);
            if (!snapshot.exists()) return [];
            const conversations = [];
            snapshot.forEach(child => {
                conversations.push({ id: child.key, ...child.val() });
            });
            conversations.sort((a, b) => {
                const aTime = a.lastMessageAt ? new Date(a.lastMessageAt).getTime() : 0;
                const bTime = b.lastMessageAt ? new Date(b.lastMessageAt).getTime() : 0;
                return bTime - aTime;
            });
            return conversations;
        } catch (e) {
            console.warn('ProfileMemory.getUserConversations:', e.message);
            return [];
        }
    },

    async markConversationAsRead(uid, convId) {
        if (!uid || !convId || !db) return false;
        try {
            await db.ref('userConversations/' + uid + '/' + convId + '/unreadCount').set(0);
            return true;
        } catch (e) {
            console.warn('ProfileMemory.markConversationAsRead:', e.message);
            return false;
        }
    },

    async deleteMessage(convId, messageId, senderUid) {
        if (!convId || !messageId || !senderUid || !db) return false;
        try {
            const msgRef = db.ref('messages/' + convId + '/' + messageId);
            const snapshot = await msgRef.once('value');
            if (!snapshot.exists()) return false;
            const msg = snapshot.val();
            if (msg.senderUid !== senderUid) return false;
            await msgRef.update({ deleted: true, text: '', editedAt: new Date().toISOString() });
            return true;
        } catch (e) {
            console.warn('ProfileMemory.deleteMessage:', e.message);
            return false;
        }
    },

    async getTotalUnreadCount(uid) {
        if (!uid || !db) return 0;
        try {
            const snapshot = await this._withTimeout(db.ref('userConversations/' + uid).once('value'), 5000);
            if (!snapshot.exists()) return 0;
            let total = 0;
            snapshot.forEach(child => {
                const val = child.val();
                if (val && val.unreadCount && val.unreadCount > 0) total += val.unreadCount;
            });
            return total;
        } catch (e) {
            return 0;
        }
    },

    async getConversation(convId) {
        if (!convId || !db) return null;
        try {
            const snapshot = await this._withTimeout(db.ref('conversations/' + convId).once('value'), 5000);
            if (!snapshot.exists()) return null;
            return { id: convId, ...snapshot.val() };
        } catch (e) {
            console.warn('ProfileMemory.getConversation:', e.message);
            return null;
        }
    },

    async updatePresence(uid, status) {
        if (!uid || !db) return false;
        try {
            const now = new Date().toISOString();
            const updates = {};
            updates['users/' + uid + '/status'] = status;
            updates['users/' + uid + '/statusUpdatedAt'] = now;
            updates['presence/' + uid] = { status: status, updatedAt: now };
            await this._withTimeout(db.ref().update(updates), 5000);

            if (status !== 'invisible' && status !== 'offline') {
                db.ref('presence/' + uid).onDisconnect().set({ status: 'offline', updatedAt: new Date().toISOString() });
            }
            return true;
        } catch (e) {
            console.warn('ProfileMemory.updatePresence:', e.message);
            return false;
        }
    },

    async getRelationshipStatus(currentUid, targetUid) {
        if (!currentUid || !targetUid) return 'none';
        const [friends, incoming, outgoing, blocked] = await Promise.all([
            this._checkFriend(currentUid, targetUid),
            this._checkIncomingRequest(currentUid, targetUid),
            this._checkOutgoingRequest(currentUid, targetUid),
            this.isEitherBlocked(currentUid, targetUid)
        ]);
        if (blocked) return 'blocked';
        if (friends) return 'friends';
        if (incoming) return 'incoming_request';
        if (outgoing) return 'outgoing_request';
        return 'none';
    },

    async _checkFriend(uidA, uidB) {
        if (!db) return false;
        try {
            const snap = await db.ref('friends/' + uidA + '/' + uidB).once('value');
            return snap.exists();
        } catch (e) { return false; }
    },

    async _checkIncomingRequest(currentUid, senderUid) {
        if (!db) return false;
        try {
            const snap = await db.ref('friendRequests/' + currentUid + '/' + senderUid).once('value');
            return snap.exists();
        } catch (e) { return false; }
    },

    async _checkOutgoingRequest(senderUid, targetUid) {
        if (!db) return false;
        try {
            const snap = await db.ref('friendRequests/' + targetUid + '/' + senderUid).once('value');
            return snap.exists();
        } catch (e) { return false; }
    }
};
