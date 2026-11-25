import React, { useState, useMemo, useEffect, useRef } from 'react';
import {
  INITIAL_USERS,
  INITIAL_PROPERTIES,
  INITIAL_CONVERSATIONS,
  INITIAL_MESSAGES,
  INITIAL_VERIFICATIONS,
  INITIAL_FRAUD_REPORTS,
  INITIAL_REVIEWS,
  INITIAL_NOTIFICATIONS,
} from './data/mockData.ts';
import type {
  User,
  UserRole,
  Property,
  Conversation,
  Message,
  LandlordVerification,
  FraudReport,
  Review,
  NotificationItem,
  SearchFilters,
  FeaturedTier,
  RentalAgreementData,
} from './types/index.ts';
import {
  filterProperties,
  sortProperties,
  calculateAverageRating,
  canPostProperty,
  canModifyProperty,
  canSubmitReview,
  canSubmitVerification,
  sanitizePropertyDraft,
  getVisibleConversations,
  getVisibleNotifications,
  getUnreadMessageCount,
} from './utils/rules.ts';
import {
  INITIAL_CREDENTIAL_HASHES,
  verifyUserCredentials,
  validateAndPrepareRegistration,
  createClientSession,
  isClientSessionValid,
  type CredentialStore,
  type SessionRecord,
} from './utils/auth.ts';
import {
  sanitizePlainText,
  isSafeImageUrl,
  MAX_TEXT_LENGTHS,
} from './utils/security.ts';
import {
  canGenerateRentalAgreement,
  sanitizeAgreementData,
} from './utils/rentalAgreement.ts';
import {
  STORAGE_KEYS,
  loadStoredState,
  saveStoredState,
  clearStoredKey,
} from './utils/storage.ts';
import type { Language } from './utils/i18n.ts';
import { translations, getStoredLanguage, saveStoredLanguage } from './utils/i18n.ts';
import { getStoredTheme, applyTheme, toggleTheme, type Theme } from './utils/theme.ts';
import { Navbar } from './components/Navbar.tsx';
import { HeroSection } from './components/HeroSection.tsx';
import { PropertyCard } from './components/PropertyCard.tsx';
import { PropertyDetailModal } from './components/PropertyDetailModal.tsx';
import { PostPropertyModal } from './components/PostPropertyModal.tsx';
import { MessagingModal } from './components/MessagingModal.tsx';
import { LandlordDashboard } from './components/LandlordDashboard.tsx';
import { AdminDashboard } from './components/AdminDashboard.tsx';
import { FavoritesView } from './components/FavoritesView.tsx';
import { VerificationModal } from './components/VerificationModal.tsx';
import { UpgradeTierModal } from './components/UpgradeTierModal.tsx';
import { FraudReportModal } from './components/FraudReportModal.tsx';
import { LoginView } from './components/LoginView.tsx';
import {
  Building2,
  ShieldCheck,
  CheckCircle2,
  ArrowUpDown,
  Lock,
  FileText,
} from 'lucide-react';

const DEFAULT_FILTERS: SearchFilters = {
  city: 'all',
  subCity: 'all',
  minPrice: 0,
  maxPrice: 0,
  bedrooms: 'all',
  propertyType: 'all',
  status: 'all',
  verifiedOnly: false,
  query: '',
  sortBy: 'featured',
};

export default function App() {
  // Persisted Application Data States
  const [users, setUsers] = useState<User[]>(() =>
    loadStoredState<User[]>(STORAGE_KEYS.users, INITIAL_USERS)
  );
  const [credentials, setCredentials] = useState<CredentialStore>(() =>
    loadStoredState<CredentialStore>(STORAGE_KEYS.credentials, INITIAL_CREDENTIAL_HASHES)
  );
  const [sessionUserId, setSessionUserId] = useState<string | null>(() => {
    const uid = loadStoredState<string | null>(STORAGE_KEYS.sessionUserId, null);
    if (!uid) return null;
    const rec = loadStoredState<SessionRecord | null>(STORAGE_KEYS.sessionRecord, null);
    if (!rec || !isClientSessionValid(rec) || rec.userId !== uid) {
      clearStoredKey(STORAGE_KEYS.sessionUserId);
      clearStoredKey(STORAGE_KEYS.sessionRecord);
      return null;
    }
    return uid;
  });
  const [properties, setProperties] = useState<Property[]>(() =>
    loadStoredState<Property[]>(STORAGE_KEYS.properties, INITIAL_PROPERTIES)
  );
  const [conversations, setConversations] = useState<Conversation[]>(() =>
    loadStoredState<Conversation[]>(STORAGE_KEYS.conversations, INITIAL_CONVERSATIONS)
  );
  const [messages, setMessages] = useState<Message[]>(() =>
    loadStoredState<Message[]>(STORAGE_KEYS.messages, INITIAL_MESSAGES)
  );
  const [verifications, setVerifications] = useState<LandlordVerification[]>(() =>
    loadStoredState<LandlordVerification[]>(STORAGE_KEYS.verifications, INITIAL_VERIFICATIONS)
  );
  const [fraudReports, setFraudReports] = useState<FraudReport[]>(() =>
    loadStoredState<FraudReport[]>(STORAGE_KEYS.fraudReports, INITIAL_FRAUD_REPORTS)
  );
  const [reviews, setReviews] = useState<Review[]>(() =>
    loadStoredState<Review[]>(STORAGE_KEYS.reviews, INITIAL_REVIEWS)
  );
  const [notifications, setNotifications] = useState<NotificationItem[]>(() =>
    loadStoredState<NotificationItem[]>(STORAGE_KEYS.notifications, INITIAL_NOTIFICATIONS)
  );
  const [favoriteIds, setFavoriteIds] = useState<string[]>(() =>
    loadStoredState<string[]>(STORAGE_KEYS.favorites, ['prop-101'])
  );

  // Sync persisted state back to localStorage
  useEffect(() => saveStoredState(STORAGE_KEYS.users, users), [users]);
  useEffect(() => saveStoredState(STORAGE_KEYS.credentials, credentials), [credentials]);
  useEffect(() => {
    if (sessionUserId) {
      saveStoredState(STORAGE_KEYS.sessionUserId, sessionUserId);
      const existingRec = loadStoredState<SessionRecord | null>(STORAGE_KEYS.sessionRecord, null);
      if (!existingRec || existingRec.userId !== sessionUserId || !isClientSessionValid(existingRec)) {
        saveStoredState(STORAGE_KEYS.sessionRecord, createClientSession(sessionUserId));
      }
    } else {
      clearStoredKey(STORAGE_KEYS.sessionUserId);
      clearStoredKey(STORAGE_KEYS.sessionRecord);
    }
  }, [sessionUserId]);
  useEffect(() => saveStoredState(STORAGE_KEYS.properties, properties), [properties]);
  useEffect(() => saveStoredState(STORAGE_KEYS.conversations, conversations), [conversations]);
  useEffect(() => saveStoredState(STORAGE_KEYS.messages, messages), [messages]);
  useEffect(() => saveStoredState(STORAGE_KEYS.verifications, verifications), [verifications]);
  useEffect(() => saveStoredState(STORAGE_KEYS.fraudReports, fraudReports), [fraudReports]);
  useEffect(() => saveStoredState(STORAGE_KEYS.reviews, reviews), [reviews]);
  useEffect(() => saveStoredState(STORAGE_KEYS.notifications, notifications), [notifications]);
  useEffect(() => saveStoredState(STORAGE_KEYS.favorites, favoriteIds), [favoriteIds]);

  const currentUser = useMemo(() => {
    if (!sessionUserId) return null;
    const found = users.find((u) => u.id === sessionUserId) || null;
    if (!found || found.status === 'suspended') return null;
    return found;
  }, [users, sessionUserId]);

  // Enforce idle/session TTL auto-expiry
  useEffect(() => {
    if (!sessionUserId) return;
    const interval = window.setInterval(() => {
      const rec = loadStoredState<SessionRecord | null>(STORAGE_KEYS.sessionRecord, null);
      if (!rec || !isClientSessionValid(rec) || rec.userId !== sessionUserId) {
        setSessionUserId(null);
      }
    }, 60_000);
    return () => window.clearInterval(interval);
  }, [sessionUserId]);

  // Navigation & View Tabs
  const [currentTab, setCurrentTab] = useState<'explore' | 'landlord' | 'admin' | 'favorites'>(() => {
    if (!sessionUserId) return 'explore';
    const initialUser = loadStoredState<User[]>(STORAGE_KEYS.users, INITIAL_USERS).find(
      (u) => u.id === sessionUserId
    );
    if (initialUser?.role === 'admin') return 'admin';
    if (initialUser?.role === 'landlord') return 'landlord';
    return 'explore';
  });
  const [language, setLanguage] = useState<Language>(getStoredLanguage);
  const [theme, setTheme] = useState<Theme>(getStoredTheme);
  const t = translations[language];

  useEffect(() => {
    applyTheme(theme);
  }, [theme]);

  const handleToggleLanguage = () => {
    setLanguage((prev) => {
      const next = prev === 'en' ? 'am' : 'en';
      saveStoredLanguage(next);
      return next;
    });
  };

  const handleToggleTheme = () => {
    setTheme((prev) => toggleTheme(prev));
  };

  // Search and Filter State
  const [filters, setFilters] = useState<SearchFilters>(DEFAULT_FILTERS);

  // Active Modals State
  const [selectedPropertyId, setSelectedPropertyId] = useState<string | null>(null);
  const [isPostPropertyOpen, setIsPostPropertyOpen] = useState(false);
  const [isMessagingOpen, setIsMessagingOpen] = useState(false);
  const [activeConversationId, setActiveConversationId] = useState<string | null>(null);
  const [isVerificationModalOpen, setIsVerificationModalOpen] = useState(false);
  const [upgradePropertyId, setUpgradePropertyId] = useState<string | null>(null);
  const [reportPropertyId, setReportPropertyId] = useState<string | null>(null);
  const [toast, setToast] = useState<{ message: string; type: 'success' | 'info' | 'error' } | null>(null);
  const toastTimerRef = useRef<number | null>(null);

  const selectedProperty = useMemo(
    () => (selectedPropertyId ? properties.find((p) => p.id === selectedPropertyId) || null : null),
    [properties, selectedPropertyId]
  );

  const upgradePropertyTarget = useMemo(
    () => (upgradePropertyId ? properties.find((p) => p.id === upgradePropertyId) || null : null),
    [properties, upgradePropertyId]
  );

  const reportPropertyTarget = useMemo(
    () => (reportPropertyId ? properties.find((p) => p.id === reportPropertyId) || null : null),
    [properties, reportPropertyId]
  );

  const showToast = (message: string, type: 'success' | 'info' | 'error' = 'success') => {
    if (toastTimerRef.current) {
      window.clearTimeout(toastTimerRef.current);
    }
    setToast({ message, type });
    toastTimerRef.current = window.setTimeout(() => {
      setToast(null);
      toastTimerRef.current = null;
    }, 3500);
  };

  // Filtered & Sorted Properties List
  const filteredProperties = useMemo(() => {
    const filtered = filterProperties(properties, filters);
    return sortProperties(filtered, filters.sortBy);
  }, [properties, filters]);

  const favoriteProperties = useMemo(() => {
    return properties.filter((p) => favoriteIds.includes(p.id));
  }, [properties, favoriteIds]);

  // Privacy-scoped user conversations & notifications
  const visibleConversations = useMemo(
    () => getVisibleConversations(conversations, currentUser),
    [conversations, currentUser]
  );

  const visibleNotifications = useMemo(
    () => getVisibleNotifications(notifications, currentUser),
    [notifications, currentUser]
  );

  const unreadMessagesCount = useMemo(
    () => getUnreadMessageCount(conversations, currentUser),
    [conversations, currentUser]
  );

  // Handler: Toggle Favorite
  const handleToggleFavorite = (propertyId: string) => {
    setFavoriteIds((prev) =>
      prev.includes(propertyId) ? prev.filter((id) => id !== propertyId) : [...prev, propertyId]
    );
  };

  // Handler: Authenticated Sign In (PBKDF2 + Lockout + Anti-Enumeration + Server Session Cookie)
  const handleSignIn = async (
    identifier: string,
    password: string
  ): Promise<{ ok: boolean; error?: string }> => {
    const cleanId = sanitizePlainText(identifier, 254);

    // Sync with server auth endpoint so signed HttpOnly session cookie is issued (for admin docs & API)
    try {
      await fetch('/api/auth/login', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'X-EthioServe-Request': '1',
        },
        credentials: 'same-origin',
        body: JSON.stringify({ identifier: cleanId, password }),
      });
    } catch {
      // Graceful fallback when running standalone client-only preview
    }

    const result = await verifyUserCredentials(users, cleanId, password, credentials);
    if (!result.ok || !result.user) {
      const error =
        result.errorCode === 'RATE_LIMITED' ? t.authRateLimited : t.authInvalidCreds;
      return { ok: false, error };
    }

    const user = result.user;
    if (result.upgradedHash) {
      setCredentials((prev) => ({ ...prev, [user.id]: result.upgradedHash! }));
    }
    saveStoredState(STORAGE_KEYS.sessionRecord, createClientSession(user.id));
    setSessionUserId(user.id);
    setIsPostPropertyOpen(false);
    if (user.role === 'admin') {
      setCurrentTab('admin');
    } else if (user.role === 'landlord') {
      setCurrentTab('landlord');
    } else {
      setCurrentTab('explore');
    }
    showToast(`Welcome back, ${user.firstName}! Signed in as ${user.role.toUpperCase()}`, 'success');
    return { ok: true };
  };

  // Handler: Register New User (PBKDF2 + Strict Password & Role Guard + Server Sync)
  const handleRegisterUser = async (input: {
    firstName: string;
    lastName: string;
    email: string;
    phone: string;
    password: string;
    role: Exclude<UserRole, 'admin'>;
  }): Promise<{ ok: boolean; error?: string }> => {
    const result = await validateAndPrepareRegistration(users, input);
    if (!result.ok || !result.user || !result.passwordHash) {
      const errorMap: Record<string, string> = {
        MISSING_FIELDS: language === 'am' ? 'እባክዎ ሁሉንም አስፈላጊ መረጃዎች ይሙሉ።' : 'Please complete all required fields.',
        INVALID_EMAIL: t.authInvalidEmail,
        INVALID_PHONE: t.authInvalidPhone,
        WEAK_PASSWORD: t.authWeakPassword,
        DUPLICATE_ACCOUNT: t.authDuplicateAccount,
        INVALID_ROLE: 'Invalid account type.',
      };
      return { ok: false, error: errorMap[result.errorCode || 'MISSING_FIELDS'] };
    }

    try {
      await fetch('/api/auth/register', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'X-EthioServe-Request': '1',
        },
        credentials: 'same-origin',
        body: JSON.stringify(input),
      });
    } catch {
      // Graceful fallback
    }

    const newUser = result.user;
    setUsers((prev) => [newUser, ...prev]);
    setCredentials((prev) => ({ ...prev, [newUser.id]: result.passwordHash! }));
    saveStoredState(STORAGE_KEYS.sessionRecord, createClientSession(newUser.id));
    setSessionUserId(newUser.id);
    setCurrentTab(newUser.role === 'landlord' ? 'landlord' : 'explore');
    showToast(`Account registered successfully! Welcome to GojoDirect, ${newUser.firstName}!`, 'success');
    return { ok: true };
  };

  // Handler: Log Out & Revoke Session
  const handleLogout = () => {
    fetch('/api/auth/logout', {
      method: 'POST',
      headers: { 'X-EthioServe-Request': '1' },
      credentials: 'same-origin',
    }).catch(() => {});

    clearStoredKey(STORAGE_KEYS.sessionRecord);
    clearStoredKey(STORAGE_KEYS.sessionUserId);
    setSessionUserId(null);
    setCurrentTab('explore');
    setSelectedPropertyId(null);
    setIsMessagingOpen(false);
    setIsPostPropertyOpen(false);
    setIsVerificationModalOpen(false);
    setUpgradePropertyId(null);
    setReportPropertyId(null);
    showToast('You have been logged out of GojoDirect.', 'info');
  };

  // Handler: Role-Gated Tab Selection
  const handleSelectTab = (tab: 'explore' | 'landlord' | 'admin' | 'favorites') => {
    if (!currentUser) return;
    if (tab === 'admin' && currentUser.role !== 'admin') {
      showToast('Access Denied: Only platform administrators can view this dashboard.', 'error');
      return;
    }
    if (tab === 'landlord' && currentUser.role === 'tenant') {
      showToast('Access Restricted: Landlord Hub is for property owners only.', 'info');
      return;
    }
    setCurrentTab(tab);
  };

  // Handler: Role-Gated Post Property (Only Landlords)
  const handleOpenPostProperty = () => {
    if (!canPostProperty(currentUser)) {
      showToast(t.onlyLandlordsCanPost, 'error');
      return;
    }
    setIsPostPropertyOpen(true);
  };

  // Handler: Mark conversation unread count as read
  const markConversationRead = (convId: string) => {
    if (!currentUser) return;
    setConversations((prev) =>
      prev.map((c) => {
        if (c.id !== convId) return c;
        if (c.tenantId === currentUser.id) return { ...c, unreadCountTenant: 0 };
        if (c.landlordId === currentUser.id) return { ...c, unreadCountLandlord: 0 };
        return c;
      })
    );
  };

  // Handler: Open Messaging for a property
  const handleContactLandlord = (property: Property) => {
    if (!currentUser) return;
    if (property.ownerId === currentUser.id) {
      showToast(t.ownListingNotice, 'info');
      return;
    }

    let existingConv = conversations.find(
      (c) => c.propertyId === property.id && c.tenantId === currentUser.id
    );

    if (!existingConv) {
      const newConv: Conversation = {
        id: `conv-${Date.now()}`,
        tenantId: currentUser.id,
        tenantName: `${currentUser.firstName} ${currentUser.lastName}`,
        landlordId: property.ownerId,
        landlordName: property.ownerName,
        propertyId: property.id,
        propertyTitle: property.title,
        propertyImage: property.images[0],
        propertyPrice: property.rentPrice,
        lastMessage: `Selam ${property.ownerName}! I am interested in renting "${property.title}".`,
        lastMessageTime: 'Just now',
        unreadCountTenant: 0,
        unreadCountLandlord: 1,
      };

      const initialMsg: Message = {
        id: `msg-${Date.now()}`,
        conversationId: newConv.id,
        senderId: currentUser.id,
        senderName: `${currentUser.firstName} ${currentUser.lastName}`,
        text: `Selam ${property.ownerName}! I am interested in renting your property "${property.title}". Is it available for viewing?`,
        createdAt: new Date().toISOString(),
      };

      setConversations((prev) => [newConv, ...prev]);
      setMessages((prev) => [...prev, initialMsg]);
      existingConv = newConv;
    } else {
      markConversationRead(existingConv.id);
    }

    setActiveConversationId(existingConv.id);
    setIsMessagingOpen(true);
  };

  // Handler: Send Message (Participant Check + XSS Sanitization + Optional Landlord Rental Agreement)
  const handleSendMessage = (
    conversationId: string,
    text: string,
    rentalAgreement?: RentalAgreementData
  ) => {
    if (!currentUser) return;
    const conv = conversations.find((c) => c.id === conversationId);
    if (!conv || (conv.tenantId !== currentUser.id && conv.landlordId !== currentUser.id)) {
      return;
    }

    const safeText = sanitizePlainText(text, MAX_TEXT_LENGTHS.message);
    if (!safeText) return;

    let validatedAgreement: RentalAgreementData | undefined;
    if (rentalAgreement) {
      if (!canGenerateRentalAgreement(currentUser, conv)) {
        return;
      }
      validatedAgreement = sanitizeAgreementData(rentalAgreement);
    }

    const currentUserId = currentUser.id;
    const currentUserName = sanitizePlainText(`${currentUser.firstName} ${currentUser.lastName}`, MAX_TEXT_LENGTHS.shortName);
    const isSenderTenant = conv.tenantId === currentUserId;

    const newMsg: Message = {
      id: `msg-${Date.now()}`,
      conversationId,
      senderId: currentUserId,
      senderName: currentUserName,
      text: safeText,
      createdAt: new Date().toISOString(),
      ...(validatedAgreement ? { rentalAgreement: validatedAgreement } : {}),
    };

    setMessages((prev) => [...prev, newMsg]);

    setConversations((prev) =>
      prev.map((c) =>
        c.id === conversationId
          ? {
              ...c,
              lastMessage: safeText,
              lastMessageTime: 'Just now',
              unreadCountTenant: isSenderTenant ? 0 : (c.unreadCountTenant || 0) + 1,
              unreadCountLandlord: isSenderTenant ? (c.unreadCountLandlord || 0) + 1 : 0,
            }
          : c
      )
    );

    if (validatedAgreement) {
      const tenantNotif: NotificationItem = {
        id: `notif-${Date.now()}`,
        userId: conv.tenantId,
        title: 'Rental Agreement Received',
        message: `${currentUserName} sent Rental Agreement ${validatedAgreement.agreementId} for "${conv.propertyTitle}".`,
        type: 'message',
        isRead: false,
        createdAt: new Date().toISOString(),
      };
      setNotifications((prev) => [tenantNotif, ...prev]);
      showToast(`Rental Agreement ${validatedAgreement.agreementId} sent to ${conv.tenantName}!`, 'success');
    }
  };

  // Handler: Add Property (Strictly Landlord Only + Full Draft Sanitization)
  const handleAddProperty = (
    newPropData: Omit<Property, 'id' | 'createdAt' | 'ownerRating' | 'ownerReviewCount'>
  ) => {
    if (!currentUser || !canPostProperty(currentUser)) {
      showToast(t.onlyLandlordsCanPost, 'error');
      return;
    }
    const sanitized = sanitizePropertyDraft(newPropData, currentUser);
    const newProperty: Property = {
      ...sanitized,
      id: `prop-${Date.now()}`,
      createdAt: new Date().toISOString(),
      ownerRating: 5.0,
      ownerReviewCount: 1,
      viewsCount: 0,
    };

    setProperties((prev) => [newProperty, ...prev]);

    const newNotif: NotificationItem = {
      id: `notif-${Date.now()}`,
      userId: currentUser.id,
      title: 'Property Published Successfully',
      message: `Your listing "${newProperty.title}" is now active in ${newProperty.city}.`,
      type: 'verification',
      isRead: false,
      createdAt: new Date().toISOString(),
    };
    setNotifications((prev) => [newNotif, ...prev]);
    showToast(`Property "${newProperty.title}" published!`, 'success');
  };

  // Handler: Toggle Property Status (Available <-> Occupied, Ownership Guarded)
  const handleTogglePropertyStatus = (propertyId: string) => {
    if (!currentUser) return;
    setProperties((prev) =>
      prev.map((p) => {
        if (p.id !== propertyId || !canModifyProperty(currentUser, p)) return p;
        return {
          ...p,
          status: p.status === 'available' ? 'occupied' : 'available',
        };
      })
    );
  };

  // Handler: Delete Property (Ownership Guarded)
  const handleDeleteProperty = (propertyId: string) => {
    if (!currentUser) return;
    const target = properties.find((p) => p.id === propertyId);
    if (!target || !canModifyProperty(currentUser, target)) return;
    setProperties((prev) => prev.filter((p) => p.id !== propertyId));
    if (selectedPropertyId === propertyId) {
      setSelectedPropertyId(null);
    }
    showToast('Listing removed.', 'info');
  };

  // Handler: Upgrade Featured Tier (Ownership Guarded)
  const handleUpgradeTier = (propertyId: string, newTier: FeaturedTier) => {
    if (!currentUser) return;
    const targetProp = properties.find((p) => p.id === propertyId);
    if (!targetProp || !canModifyProperty(currentUser, targetProp)) return;

    setProperties((prev) =>
      prev.map((p) =>
        p.id === propertyId && canModifyProperty(currentUser, p)
          ? { ...p, featuredTier: newTier }
          : p
      )
    );

    const newNotif: NotificationItem = {
      id: `notif-${Date.now()}`,
      userId: currentUser.id,
      title: `${newTier.toUpperCase()} Boost Activated`,
      message: `Payment confirmed. Listing "${targetProp.title}" is now boosted.`,
      type: 'featured',
      isRead: false,
      createdAt: new Date().toISOString(),
    };
    setNotifications((prev) => [newNotif, ...prev]);
  };

  // Handler: Submit Landlord Verification (Landlord-Only + Ownership + Upload Validation)
  const handleSubmitVerification = (
    verifData: Omit<LandlordVerification, 'id' | 'status' | 'submittedAt'>
  ) => {
    if (!currentUser || !canSubmitVerification(currentUser, verifData.userId)) return;
    const safeDocUrl = isSafeImageUrl(verifData.documentUrl)
      ? verifData.documentUrl
      : 'https://images.unsplash.com/photo-1589829545856-d10d557cf95f?auto=format&fit=crop&w=600&q=80';
    const newVerif: LandlordVerification = {
      ...verifData,
      userId: currentUser.id,
      userName: sanitizePlainText(`${currentUser.firstName} ${currentUser.lastName}`, MAX_TEXT_LENGTHS.shortName),
      userEmail: currentUser.email,
      userPhone: currentUser.phone,
      documentNumber: sanitizePlainText(verifData.documentNumber, MAX_TEXT_LENGTHS.docNumber),
      documentUrl: safeDocUrl,
      id: `verif-${Date.now()}`,
      status: 'pending',
      submittedAt: new Date().toISOString(),
    };

    setVerifications((prev) => [newVerif, ...prev]);

    const newNotif: NotificationItem = {
      id: `notif-${Date.now()}`,
      userId: currentUser.id,
      title: 'Verification Request Received',
      message: 'Your Ethiopian ID document was submitted for administrator review.',
      type: 'verification',
      isRead: false,
      createdAt: new Date().toISOString(),
    };
    setNotifications((prev) => [newNotif, ...prev]);
    showToast('Verification document submitted for review!', 'success');
  };

  // Handler: Approve Verification (Admin)
  const handleApproveVerification = (verificationId: string) => {
    if (currentUser?.role !== 'admin') return;
    const targetVerif = verifications.find((v) => v.id === verificationId);
    if (!targetVerif) return;

    setVerifications((prev) =>
      prev.map((v) =>
        v.id === verificationId
          ? { ...v, status: 'approved', reviewedAt: new Date().toISOString() }
          : v
      )
    );

    setUsers((prev) =>
      prev.map((u) => (u.id === targetVerif.userId ? { ...u, isVerifiedLandlord: true } : u))
    );

    setProperties((prev) =>
      prev.map((p) =>
        p.ownerId === targetVerif.userId ? { ...p, ownerVerified: true, isVerified: true } : p
      )
    );

    const userNotif: NotificationItem = {
      id: `notif-${Date.now()}`,
      userId: targetVerif.userId,
      title: 'Identity Verified!',
      message: 'Your Ethiopian ID was approved. The Verified Shield is now active on your listings.',
      type: 'verification',
      isRead: false,
      createdAt: new Date().toISOString(),
    };
    setNotifications((prev) => [userNotif, ...prev]);

    showToast(`Approved ID for ${targetVerif.userName}. Verified Landlord Shield badge granted!`, 'success');
  };

  // Handler: Reject Verification (Admin)
  const handleRejectVerification = (verificationId: string, reason: string) => {
    if (currentUser?.role !== 'admin') return;
    const safeReason = sanitizePlainText(reason, 200);
    const targetVerif = verifications.find((v) => v.id === verificationId);
    setVerifications((prev) =>
      prev.map((v) =>
        v.id === verificationId
          ? { ...v, status: 'rejected', rejectionReason: safeReason, reviewedAt: new Date().toISOString() }
          : v
      )
    );
    if (targetVerif) {
      const userNotif: NotificationItem = {
        id: `notif-${Date.now()}`,
        userId: targetVerif.userId,
        title: 'Verification Needs Attention',
        message: `Your ID submission was rejected: ${safeReason}.`,
        type: 'alert',
        isRead: false,
        createdAt: new Date().toISOString(),
      };
      setNotifications((prev) => [userNotif, ...prev]);
    }
    showToast(`Rejected verification document: ${safeReason}`, 'info');
  };

  // Handler: Submit Fraud Report (Authenticated + Ownership Enforcement + Sanitized)
  const handleSubmitFraudReport = (reportData: Omit<FraudReport, 'id' | 'status' | 'createdAt'>) => {
    if (!currentUser) return;
    const safeDetails = sanitizePlainText(reportData.details, MAX_TEXT_LENGTHS.fraudDetails);
    if (!safeDetails) return;

    const newReport: FraudReport = {
      ...reportData,
      reporterId: currentUser.id,
      reporterName: sanitizePlainText(`${currentUser.firstName} ${currentUser.lastName}`, MAX_TEXT_LENGTHS.shortName),
      propertyTitle: sanitizePlainText(reportData.propertyTitle, MAX_TEXT_LENGTHS.title),
      details: safeDetails,
      id: `rep-${Date.now()}`,
      status: 'pending',
      createdAt: new Date().toISOString(),
    };
    setFraudReports((prev) => [newReport, ...prev]);
    showToast('Report submitted. GojoDirect Admin is investigating.', 'info');
  };

  // Handler: Resolve Fraud Report (Admin)
  const handleResolveFraudReport = (reportId: string, action: 'dismiss' | 'remove_property') => {
    if (currentUser?.role !== 'admin') return;
    const report = fraudReports.find((r) => r.id === reportId);
    if (!report) return;

    if (action === 'remove_property') {
      setProperties((prev) => prev.filter((p) => p.id !== report.propertyId));
      setFraudReports((prev) =>
        prev.map((r) => (r.id === reportId ? { ...r, status: 'resolved' } : r))
      );
      showToast(`Property "${report.propertyTitle}" removed from platform for policy violation.`, 'error');
    } else {
      setFraudReports((prev) =>
        prev.map((r) => (r.id === reportId ? { ...r, status: 'dismissed' } : r))
      );
      showToast('Report marked as dismissed.', 'info');
    }
  };

  // Handler: Toggle User Status (Admin)
  const handleToggleUserStatus = (userId: string) => {
    if (currentUser?.role !== 'admin') return;
    setUsers((prev) =>
      prev.map((u) =>
        u.id === userId && u.role !== 'admin'
          ? { ...u, status: u.status === 'active' ? 'suspended' : 'active' }
          : u
      )
    );
  };

  // Handler: Add Review (Anti-Self-Review + Bounded Rating + Sanitized)
  const handleAddReview = (reviewData: { rating: number; comment: string }) => {
    if (!selectedProperty || !currentUser || !canSubmitReview(currentUser, selectedProperty)) return;

    const safeComment = sanitizePlainText(reviewData.comment, MAX_TEXT_LENGTHS.review);
    if (!safeComment) return;
    const boundedRating = Number.isFinite(reviewData.rating)
      ? Math.min(5, Math.max(1, Math.round(reviewData.rating)))
      : 5;

    const newRev: Review = {
      id: `rev-${Date.now()}`,
      propertyId: selectedProperty.id,
      landlordId: selectedProperty.ownerId,
      tenantId: currentUser.id,
      tenantName: sanitizePlainText(`${currentUser.firstName} ${currentUser.lastName}`, MAX_TEXT_LENGTHS.shortName),
      rating: boundedRating,
      comment: safeComment,
      createdAt: new Date().toISOString(),
    };

    const updatedReviews = [newRev, ...reviews];
    setReviews(updatedReviews);

    const landlordReviews = updatedReviews.filter(
      (r) => r.landlordId === selectedProperty.ownerId
    );
    const { average, count } = calculateAverageRating(landlordReviews);

    setProperties((prev) =>
      prev.map((p) =>
        p.ownerId === selectedProperty.ownerId
          ? { ...p, ownerRating: average, ownerReviewCount: count }
          : p
      )
    );
    showToast('Review added! Thank you for helping Ethiopian renters.', 'success');
  };

  const handleMarkNotificationsRead = () => {
    if (!currentUser) return;
    setNotifications((prev) =>
      prev.map((n) => (n.userId === currentUser.id ? { ...n, isRead: true } : n))
    );
  };

  // Mandatory Login Gate: If no user is logged in, show LoginView
  if (!currentUser) {
    return (
      <div className="min-h-screen bg-slate-900 text-white font-sans selection:bg-emerald-500 selection:text-white">
        {toast && (
          <div className="fixed bottom-6 right-6 z-50 animate-in fade-in slide-in-from-bottom-5 duration-200">
            <div
              className={`px-4 py-3 rounded-xl shadow-2xl border text-xs font-bold flex items-center gap-2.5 ${
                toast.type === 'error'
                  ? 'bg-rose-900 text-white border-rose-700'
                  : toast.type === 'info'
                  ? 'bg-slate-900 text-white border-slate-700'
                  : 'bg-emerald-800 text-white border-emerald-600'
              }`}
            >
              <CheckCircle2 className="w-4 h-4 text-emerald-300 shrink-0" />
              <span>{toast.message}</span>
            </div>
          </div>
        )}
        <LoginView
          onSignIn={handleSignIn}
          onRegister={handleRegisterUser}
          language={language}
          onToggleLanguage={handleToggleLanguage}
          theme={theme}
          onToggleTheme={handleToggleTheme}
        />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-50 dark:bg-slate-950 flex flex-col text-slate-800 dark:text-slate-100 font-sans selection:bg-emerald-500 selection:text-white transition-colors duration-200">
      {/* Navigation Bar */}
      <Navbar
        currentUser={currentUser}
        onLogout={handleLogout}
        currentTab={currentTab}
        onSelectTab={handleSelectTab}
        favoritesCount={favoriteIds.length}
        unreadMessagesCount={unreadMessagesCount}
        notifications={visibleNotifications}
        onOpenNotifications={() => {}}
        onMarkAllNotificationsRead={handleMarkNotificationsRead}
        onOpenMessages={() => {
          if (visibleConversations.length > 0 && !activeConversationId) {
            setActiveConversationId(visibleConversations[0].id);
            markConversationRead(visibleConversations[0].id);
          }
          setIsMessagingOpen(true);
        }}
        onOpenPostProperty={handleOpenPostProperty}
        language={language}
        onToggleLanguage={handleToggleLanguage}
        theme={theme}
        onToggleTheme={handleToggleTheme}
      />

      {/* Main Content Areas */}
      <main className="flex-1">
        {/* TAB 1: Explore Rentals */}
        {currentTab === 'explore' && (
          <div>
            <HeroSection
              filters={filters}
              onUpdateFilters={(updates) => setFilters((prev) => ({ ...prev, ...updates }))}
              onResetFilters={() => setFilters(DEFAULT_FILTERS)}
              language={language}
            />

            {/* Results Section */}
            <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-6">
              {/* Results count & Sort Bar */}
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-slate-200 dark:border-slate-800">
                <div>
                  <h2 className="text-xl font-extrabold text-slate-900 dark:text-white">
                    {filters.city === 'all'
                      ? language === 'am'
                        ? 'ሁሉም የተረጋገጡ የኢትዮጵያ የኪራይ ቤቶች'
                        : 'All Verified Ethiopian Rentals'
                      : `${language === 'am' ? 'የኪራይ ቤቶች በ' : 'Rental Properties in '}${filters.city} ${
                          filters.subCity !== 'all' ? `• ${filters.subCity}` : ''
                        }`}
                  </h2>
                  <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
                    {t.resultsShowing} {filteredProperties.length} {t.resultsVerifiedListings}
                  </p>
                </div>

                {/* Sort dropdown */}
                <div className="flex items-center gap-2">
                  <ArrowUpDown className="w-4 h-4 text-slate-400 dark:text-slate-500" />
                  <span className="text-xs font-bold text-slate-600 dark:text-slate-300">{t.sortBy}:</span>
                  <select
                    value={filters.sortBy}
                    onChange={(e) =>
                      setFilters((prev) => ({ ...prev, sortBy: e.target.value as SearchFilters['sortBy'] }))
                    }
                    className="px-3 py-1.5 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-lg text-xs font-semibold text-slate-700 dark:text-slate-200 outline-none focus:border-emerald-500 cursor-pointer shadow-2xs"
                  >
                    <option value="featured">{t.featuredFirst}</option>
                    <option value="price_low">{t.priceLowToHigh}</option>
                    <option value="price_high">{t.priceHighToLow}</option>
                    <option value="newest">{t.newestListed}</option>
                  </select>
                </div>
              </div>

              {/* Property Cards Grid */}
              {filteredProperties.length === 0 ? (
                <div className="p-16 text-center bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-2xs">
                  <Building2 className="w-12 h-12 text-slate-300 dark:text-slate-600 mx-auto mb-3" />
                  <h3 className="text-base font-bold text-slate-800 dark:text-slate-200">
                    {t.noResultsTitle}
                  </h3>
                  <p className="text-xs text-slate-500 dark:text-slate-400 max-w-sm mx-auto mt-1 mb-5">
                    {t.noResultsDesc}
                  </p>
                  <button
                    type="button"
                    onClick={() => setFilters(DEFAULT_FILTERS)}
                    className="px-4 py-2 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-xs font-bold cursor-pointer transition-colors"
                  >
                    {t.resetFilters}
                  </button>
                </div>
              ) : (
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
                  {filteredProperties.map((prop) => (
                    <PropertyCard
                      key={prop.id}
                      property={prop}
                      isFavorite={favoriteIds.includes(prop.id)}
                      onToggleFavorite={handleToggleFavorite}
                      onSelectProperty={(p) => setSelectedPropertyId(p.id)}
                      onQuickContact={handleContactLandlord}
                      language={language}
                    />
                  ))}
                </div>
              )}
            </div>
          </div>
        )}

        {/* TAB 2: Landlord Hub */}
        {currentTab === 'landlord' && (currentUser.role === 'landlord' || currentUser.role === 'admin') && (
          <LandlordDashboard
            currentUser={currentUser}
            properties={properties}
            conversations={visibleConversations}
            onOpenPostProperty={handleOpenPostProperty}
            onOpenVerificationModal={() => setIsVerificationModalOpen(true)}
            onOpenUpgradeModal={(p) => setUpgradePropertyId(p.id)}
            onTogglePropertyStatus={handleTogglePropertyStatus}
            onDeleteProperty={handleDeleteProperty}
            onOpenConversation={(convId) => {
              setActiveConversationId(convId);
              markConversationRead(convId);
              setIsMessagingOpen(true);
            }}
            onSelectProperty={(p) => setSelectedPropertyId(p.id)}
            language={language}
          />
        )}

        {/* TAB 3: Admin Dashboard */}
        {currentTab === 'admin' && currentUser.role === 'admin' && (
          <AdminDashboard
            users={users}
            properties={properties}
            verifications={verifications}
            fraudReports={fraudReports}
            onApproveVerification={handleApproveVerification}
            onRejectVerification={handleRejectVerification}
            onResolveFraudReport={handleResolveFraudReport}
            onToggleUserStatus={handleToggleUserStatus}
            onSelectProperty={(p) => setSelectedPropertyId(p.id)}
            language={language}
          />
        )}

        {/* TAB 4: Favorites */}
        {currentTab === 'favorites' && (
          <FavoritesView
            favoriteProperties={favoriteProperties}
            onToggleFavorite={handleToggleFavorite}
            onSelectProperty={(p) => setSelectedPropertyId(p.id)}
            onQuickContact={handleContactLandlord}
            onBackToExplore={() => setCurrentTab('explore')}
            language={language}
          />
        )}
      </main>

      {/* Footer */}
      <footer className="bg-slate-900 text-slate-400 text-xs border-t border-slate-800 mt-16">
        {/* Tiny Pinned Upper Foot Bar */}
        <div className="bg-slate-950/90 border-b border-slate-800/80 py-2 px-4 sm:px-6 lg:px-8">
          <div className="max-w-7xl mx-auto flex items-center justify-between gap-3 text-[11px]">
            <div className="flex items-center gap-2 text-slate-400">
              <span className="w-1.5 h-1.5 rounded-full bg-emerald-500" />
              <span className="text-slate-300 font-semibold">{t.brandName}</span>
              <span className="text-slate-600 hidden sm:inline">•</span>
              <span className="text-slate-400 hidden sm:inline">
                {language === 'am' ? 'ቀጥታ የኪራይ መድረክ' : 'Direct Rental Platform'}
              </span>
            </div>

            {currentUser.role === 'admin' ? (
              <div className="flex items-center gap-2.5">
                <span className="w-1.5 h-1.5 rounded-full bg-purple-400 animate-pulse" />
                <span className="text-purple-300 font-bold uppercase tracking-wider text-[10px]">
                  {language === 'am' ? 'የአድሚን ሰነዶች' : 'Admin Docs'}:
                </span>
                <a
                  href="/EthioServe_Rent_HLD_Document.pdf"
                  download="EthioServe_Rent_HLD_Document.pdf"
                  className="inline-flex items-center gap-1 text-purple-300 hover:text-white font-semibold transition-colors cursor-pointer hover:underline"
                  title="Download High-Level Design (HLD) PDF"
                >
                  <FileText className="w-3 h-3 text-purple-400" />
                  <span>HLD (PDF)</span>
                </a>
                <span className="text-slate-600">•</span>
                <a
                  href="/EthioServe_Rent_LLD_Document.pdf"
                  download="EthioServe_Rent_LLD_Document.pdf"
                  className="inline-flex items-center gap-1 text-emerald-300 hover:text-white font-semibold transition-colors cursor-pointer hover:underline"
                  title="Download Low-Level Design (LLD) PDF"
                >
                  <FileText className="w-3 h-3 text-emerald-400" />
                  <span>LLD (PDF)</span>
                </a>
              </div>
            ) : (
              <button
                type="button"
                onClick={() =>
                  showToast(
                    language === 'am'
                      ? 'የአድሚን ሰነዶች (HLD & LLD) ለአስተዳዳሪ ብቻ የተፈቀዱ ናቸው።'
                      : 'Architecture docs (HLD & LLD) are restricted to the System Administrator.',
                    'info'
                  )
                }
                className="flex items-center gap-1.5 text-slate-500 hover:text-slate-400 transition-colors cursor-pointer text-[10px]"
                title="Admin Access Required"
              >
                <Lock className="w-3 h-3 text-slate-500" />
                <span>{language === 'am' ? 'የአድሚን ሰነዶች (HLD/LLD - የተቆለፈ)' : 'System Docs (HLD/LLD - Admin Only)'}</span>
              </button>
            )}
          </div>
        </div>

        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
          <div className="grid grid-cols-1 md:grid-cols-4 gap-8 mb-8">
            <div className="space-y-3">
              <div className="flex items-center gap-2 text-white font-bold text-base">
                <Building2 className="w-5 h-5 text-emerald-400" />
                <span>{t.brandName}</span>
              </div>
              <p className="text-slate-400 leading-relaxed text-xs">
                {t.footerDesc}
              </p>
              <div className="flex items-center gap-2 text-emerald-400 font-semibold text-[11px]">
                <ShieldCheck className="w-4 h-4" />
                <span>{t.safeRentalStandard}</span>
              </div>
            </div>

            <div>
              <h4 className="text-white font-bold text-xs uppercase tracking-wider mb-3">
                {t.topLocationsTitle}
              </h4>
              <ul className="space-y-2">
                <li>Bole Medhanialem & Edna Mall</li>
                <li>CMC St. Michael Compound</li>
                <li>Kazanchis Diplomatic Quarter</li>
                <li>Old Airport / ICS Diplomatic Villas</li>
                <li>Sarbet & Bisrate Gabriel</li>
              </ul>
            </div>

            <div>
              <h4 className="text-white font-bold text-xs uppercase tracking-wider mb-3">
                {t.regionalHubsTitle}
              </h4>
              <ul className="space-y-2">
                <li>Hawassa (Lakefront & Piazza)</li>
                <li>Bahir Dar (Tana Promenade)</li>
                <li>Adama (Posta Bet Commercial)</li>
                <li>Dire Dawa (Kezira & Megala)</li>
              </ul>
            </div>

            <div>
              <h4 className="text-white font-bold text-xs uppercase tracking-wider mb-3">
                {t.trustSafetyTitle}
              </h4>
              <p className="leading-relaxed mb-3">
                {t.trustSafetyDesc}
              </p>
              <div className="p-3 bg-slate-800 rounded-xl border border-slate-700 text-slate-300">
                <p className="font-bold text-white text-xs">{t.supportHotlineLabel}</p>
                <a
                  href="tel:0919798913"
                  className="font-mono text-emerald-400 hover:text-emerald-300 text-sm mt-0.5 block font-semibold transition-colors"
                >
                  0919798913
                </a>
              </div>
            </div>
          </div>

          <div className="pt-8 border-t border-slate-800 flex flex-col sm:flex-row items-center justify-between gap-4 text-slate-500">
            <p>{t.allRightsReserved}</p>
            <p className="text-xs text-slate-400">
              {t.devAttribution}
            </p>
          </div>
        </div>
      </footer>

      {/* MODALS */}

      {/* 1. Property Details Modal */}
      {selectedProperty && (
        <PropertyDetailModal
          property={selectedProperty}
          onClose={() => setSelectedPropertyId(null)}
          currentUser={currentUser}
          isFavorite={favoriteIds.includes(selectedProperty.id)}
          onToggleFavorite={handleToggleFavorite}
          onContactLandlord={(p) => {
            setSelectedPropertyId(null);
            handleContactLandlord(p);
          }}
          onReportProperty={(p) => {
            setReportPropertyId(p.id);
          }}
          reviews={reviews}
          onAddReview={handleAddReview}
          language={language}
        />
      )}

      {/* 2. Post Property Modal (Strictly Landlord Only) */}
      {canPostProperty(currentUser) && (
        <PostPropertyModal
          isOpen={isPostPropertyOpen}
          onClose={() => setIsPostPropertyOpen(false)}
          currentUser={currentUser}
          onAddProperty={handleAddProperty}
          language={language}
        />
      )}

      {/* 3. Direct Messaging Chat Modal (Scoped Strictly to Current User's Conversations) */}
      <MessagingModal
        isOpen={isMessagingOpen}
        onClose={() => setIsMessagingOpen(false)}
        currentUser={currentUser}
        conversations={visibleConversations}
        messages={messages}
        properties={properties}
        users={users}
        activeConversationId={activeConversationId}
        onSelectConversation={(id) => {
          setActiveConversationId(id);
          markConversationRead(id);
        }}
        onSendMessage={handleSendMessage}
        language={language}
      />

      {/* 4. Landlord ID Verification Modal */}
      <VerificationModal
        isOpen={isVerificationModalOpen}
        onClose={() => setIsVerificationModalOpen(false)}
        currentUser={currentUser}
        onSubmitVerification={handleSubmitVerification}
        language={language}
      />

      {/* 5. Upgrade Tier Boost Modal */}
      <UpgradeTierModal
        property={upgradePropertyTarget}
        isOpen={!!upgradePropertyTarget}
        onClose={() => setUpgradePropertyId(null)}
        onUpgradeTier={handleUpgradeTier}
        language={language}
      />

      {/* 6. Fraud / Broker Report Modal */}
      <FraudReportModal
        property={reportPropertyTarget}
        isOpen={!!reportPropertyTarget}
        onClose={() => setReportPropertyId(null)}
        currentUser={currentUser}
        onSubmitReport={handleSubmitFraudReport}
        language={language}
      />

      {/* Floating Toast Notification */}
      {toast && (
        <div className="fixed bottom-6 right-6 z-50 animate-in fade-in slide-in-from-bottom-5 duration-200">
          <div
            className={`px-4 py-3 rounded-xl shadow-2xl border text-xs font-bold flex items-center gap-2.5 ${
              toast.type === 'error'
                ? 'bg-rose-900 text-white border-rose-700'
                : toast.type === 'info'
                ? 'bg-slate-900 text-white border-slate-700'
                : 'bg-emerald-800 text-white border-emerald-600'
            }`}
          >
            <CheckCircle2 className="w-4 h-4 text-emerald-300 shrink-0" />
            <span>{toast.message}</span>
          </div>
        </div>
      )}
    </div>
  );
}
