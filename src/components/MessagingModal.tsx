import React, { useState, useEffect, useRef } from 'react';
import {
  X,
  Send,
  MessageSquare,
  Ban,
  CheckCheck,
  Sparkles,
  FileText,
  Download,
  Eye,
} from 'lucide-react';
import type { Conversation, Message, Property, RentalAgreementData, User } from '../types/index.ts';
import { formatETB } from '../utils/rules.ts';
import { sanitizePlainText, MAX_TEXT_LENGTHS } from '../utils/security.ts';
import {
  buildDefaultAgreementData,
  canGenerateRentalAgreement,
  downloadRentalAgreementFile,
  sanitizeAgreementData,
} from '../utils/rentalAgreement.ts';
import { RentalAgreementModal } from './RentalAgreementModal.tsx';
import type { Language } from '../utils/i18n.ts';
import { translations } from '../utils/i18n.ts';

interface MessagingModalProps {
  isOpen: boolean;
  onClose: () => void;
  currentUser: User;
  conversations: Conversation[];
  messages: Message[];
  properties?: Property[];
  users?: User[];
  activeConversationId: string | null;
  onSelectConversation: (id: string) => void;
  onSendMessage: (
    conversationId: string,
    text: string,
    rentalAgreement?: RentalAgreementData
  ) => void;
  language?: Language;
}

export const MessagingModal: React.FC<MessagingModalProps> = ({
  isOpen,
  onClose,
  currentUser,
  conversations,
  messages,
  properties = [],
  users = [],
  activeConversationId,
  onSelectConversation,
  onSendMessage,
  language = 'en',
}) => {
  const t = translations[language];
  const [inputText, setInputText] = useState('');
  const [blockedUsers, setBlockedUsers] = useState<string[]>([]);
  const [blockNotice, setBlockNotice] = useState<string | null>(null);
  const [agreementModalData, setAgreementModalData] = useState<{
    data: RentalAgreementData;
    readOnly: boolean;
  } | null>(null);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  const quickInquiriesList = [
    t.quickInquiry1,
    t.quickInquiry2,
    t.quickInquiry3,
    t.quickInquiry4,
  ];

  const activeConv =
    conversations.find((c) => c.id === activeConversationId) || conversations[0];

  const currentMessages = messages.filter(
    (m) => m.conversationId === (activeConv ? activeConv.id : '')
  );

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [currentMessages.length]);

  if (!isOpen) return null;

  const handleSend = (e: React.FormEvent) => {
    e.preventDefault();
    if (!activeConv) return;
    const safeMsg = sanitizePlainText(inputText, MAX_TEXT_LENGTHS.message);
    if (!safeMsg) return;
    onSendMessage(activeConv.id, safeMsg);
    setInputText('');
  };

  const handleSendQuickInquiry = (template: string) => {
    if (!activeConv) return;
    onSendMessage(activeConv.id, template);
  };

  const handleToggleBlock = (partnerName: string) => {
    if (blockedUsers.includes(partnerName)) {
      setBlockedUsers(blockedUsers.filter((u) => u !== partnerName));
      setBlockNotice(language === 'am' ? `${partnerName} እገዳው ተነስቷል` : `Unblocked ${partnerName}`);
    } else {
      setBlockedUsers([...blockedUsers, partnerName]);
      setBlockNotice(
        language === 'am'
          ? `${partnerName} ታግዷል። መልዕክት መላክ አይችሉም።`
          : `Blocked ${partnerName}. They can no longer send you messages.`
      );
    }
    setTimeout(() => setBlockNotice(null), 3000);
  };

  const isTenantInActiveConv = activeConv ? activeConv.tenantId === currentUser.id : currentUser.role === 'tenant';
  const partnerName = activeConv
    ? isTenantInActiveConv
      ? activeConv.landlordName
      : activeConv.tenantName
    : '';
  const isPartnerBlocked = blockedUsers.includes(partnerName);
  const canLandlordGenerate = canGenerateRentalAgreement(currentUser, activeConv);

  const matchedProperty = activeConv
    ? properties.find((p) => p.id === activeConv.propertyId)
    : undefined;
  const matchedLandlord = activeConv
    ? users.find((u) => u.id === activeConv.landlordId) ?? currentUser
    : undefined;
  const matchedTenant = activeConv
    ? users.find((u) => u.id === activeConv.tenantId)
    : undefined;

  const handleOpenAgreementGenerator = () => {
    if (!activeConv || !canLandlordGenerate) return;
    const defaultData = buildDefaultAgreementData({
      conversation: activeConv,
      property: matchedProperty,
      landlord: matchedLandlord,
      tenant: matchedTenant,
    });
    setAgreementModalData({ data: defaultData, readOnly: false });
  };

  const handleQuickDownloadAgreement = () => {
    if (!activeConv || !canLandlordGenerate) return;
    const defaultData = buildDefaultAgreementData({
      conversation: activeConv,
      property: matchedProperty,
      landlord: matchedLandlord,
      tenant: matchedTenant,
    });
    downloadRentalAgreementFile(defaultData, 'html');
  };

  const handleSendAgreementToChat = (agreement: RentalAgreementData) => {
    if (!activeConv || !canLandlordGenerate) return;
    const clean = sanitizeAgreementData(agreement);
    const summaryText =
      language === 'am'
        ? `የኪራይ ውል (${clean.agreementId}) ተዘጋጅቶ ተልኳል — ${formatETB(clean.monthlyRentETB)}/በወር (${clean.leaseTermMonths} ወር)`
        : `Sent Rental Agreement (${clean.agreementId}) for ${clean.propertyTitle} — ${formatETB(clean.monthlyRentETB)}/mo for ${clean.leaseTermMonths} month(s).`;
    onSendMessage(activeConv.id, summaryText, clean);
  };

  return (
    <div className="fixed inset-0 z-50 bg-slate-900/70 dark:bg-slate-950/85 flex items-center justify-center p-2 sm:p-4">
      <div className="bg-white dark:bg-slate-900 w-full max-w-4xl h-[85vh] rounded-2xl shadow-2xl border border-slate-200 dark:border-slate-800 overflow-hidden flex flex-col md:flex-row relative">
        {/* Subtle block notification banner */}
        {blockNotice && (
          <div className="absolute top-2 left-1/2 -translate-x-1/2 z-50 bg-slate-900 dark:bg-slate-800 text-white text-xs px-4 py-2 rounded-xl shadow-lg border border-slate-700 font-medium">
            {blockNotice}
          </div>
        )}

        {/* Left Side: Conversations List */}
        <div className="w-full md:w-80 border-b md:border-b-0 md:border-r border-slate-200 dark:border-slate-800 flex flex-col bg-slate-50 dark:bg-slate-950/60 shrink-0 max-h-56 md:max-h-none">
          <div className="p-4 border-b border-slate-200 dark:border-slate-800 flex items-center justify-between bg-white dark:bg-slate-900">
            <div className="flex items-center gap-2">
              <MessageSquare className="w-5 h-5 text-emerald-600 dark:text-emerald-400" />
              <h2 className="font-bold text-slate-900 dark:text-white text-sm">{t.directMessagesTitle}</h2>
            </div>
            <div className="flex items-center gap-2">
              <span className="text-xs bg-emerald-100 dark:bg-emerald-950/70 text-emerald-800 dark:text-emerald-300 font-bold px-2 py-0.5 rounded-full">
                {conversations.length}
              </span>
              {!activeConv && (
                <button
                  type="button"
                  onClick={onClose}
                  aria-label="Close"
                  className="p-1.5 text-slate-400 hover:text-slate-700 dark:hover:text-white hover:bg-slate-200 dark:hover:bg-slate-800 rounded-lg cursor-pointer md:hidden"
                >
                  <X className="w-4 h-4" />
                </button>
              )}
            </div>
          </div>

          <div className="overflow-y-auto flex-1 divide-y divide-slate-100 dark:divide-slate-800">
            {conversations.length === 0 ? (
              <div className="p-6 text-center text-xs text-slate-400 dark:text-slate-500">
                {language === 'am'
                  ? 'ምንም ንቁ ውይይት የለም። ውይይት ለመጀመር በየትኛውም ቤት ዝርዝር ላይ "አከራይን ያግኙ" የሚለውን ይጫኑ!'
                  : 'No active conversations yet. Click "Contact Landlord" on any listing to start chatting!'}
              </div>
            ) : (
              conversations.map((conv) => {
                const isActive = activeConv && activeConv.id === conv.id;
                const otherPartyName =
                  conv.tenantId === currentUser.id ? conv.landlordName : conv.tenantName;

                return (
                  <button
                    type="button"
                    key={conv.id}
                    onClick={() => onSelectConversation(conv.id)}
                    className={`w-full p-3.5 text-left flex items-start gap-3 transition-colors cursor-pointer ${
                      isActive
                        ? 'bg-emerald-50/80 dark:bg-emerald-950/40 border-l-4 border-emerald-600'
                        : 'hover:bg-slate-100 dark:hover:bg-slate-800/70'
                    }`}
                  >
                    <img
                      src={conv.propertyImage}
                      alt={conv.propertyTitle}
                      className="w-12 h-12 rounded-lg object-cover shrink-0 border border-slate-200 dark:border-slate-700"
                    />
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center justify-between mb-0.5">
                        <span className="font-bold text-xs text-slate-900 dark:text-white truncate">
                          {otherPartyName}
                        </span>
                        <span className="text-[10px] text-slate-400 dark:text-slate-500 shrink-0">
                          {conv.lastMessageTime}
                        </span>
                      </div>
                      <p className="text-[11px] font-medium text-emerald-700 dark:text-emerald-400 truncate">
                        {conv.propertyTitle}
                      </p>
                      <p className="text-xs text-slate-500 dark:text-slate-400 truncate mt-0.5">
                        {conv.lastMessage}
                      </p>
                    </div>
                  </button>
                );
              })
            )}
          </div>
        </div>

        {/* Right Side: Active Chat Dialogue */}
        {activeConv ? (
          <div className="flex-1 flex flex-col bg-white dark:bg-slate-900 min-h-0">
            {/* Chat Header with Property Info */}
            <div className="p-3.5 sm:px-5 border-b border-slate-200 dark:border-slate-800 flex items-center justify-between bg-slate-50/80 dark:bg-slate-900/90">
              <div className="flex items-center gap-3 min-w-0">
                <img
                  src={activeConv.propertyImage}
                  alt={activeConv.propertyTitle}
                  className="w-10 h-10 rounded-lg object-cover shrink-0 border border-slate-200 dark:border-slate-700"
                />
                <div className="min-w-0">
                  <div className="flex items-center gap-2">
                    <h3 className="font-bold text-slate-900 dark:text-white text-sm truncate">{partnerName}</h3>
                    <span className="text-[10px] bg-slate-200 dark:bg-slate-800 text-slate-700 dark:text-slate-300 px-1.5 py-0.5 rounded font-semibold capitalize">
                      {isTenantInActiveConv
                        ? language === 'am' ? 'አከራይ' : 'Landlord'
                        : language === 'am' ? 'ተከራይ' : 'Tenant'}
                    </span>
                  </div>
                  <p className="text-xs text-slate-500 dark:text-slate-400 truncate">
                    Re: {activeConv.propertyTitle} •{' '}
                    <strong className="text-emerald-700 dark:text-emerald-400">
                      {formatETB(activeConv.propertyPrice)}/mo
                    </strong>
                  </p>
                </div>
              </div>

              <div className="flex items-center gap-2 shrink-0">
                {canLandlordGenerate && !isPartnerBlocked && (
                  <>
                    <button
                      type="button"
                      onClick={handleOpenAgreementGenerator}
                      className="px-3 py-1.5 rounded-lg bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold cursor-pointer transition-colors flex items-center gap-1.5 whitespace-nowrap shrink-0 shadow-2xs"
                      title={t.rentalAgreementModalTitle}
                    >
                      <FileText className="w-3.5 h-3.5" />
                      <span>{t.rentalAgreementBtn}</span>
                    </button>
                    <button
                      type="button"
                      onClick={handleQuickDownloadAgreement}
                      aria-label={t.downloadAgreementBtn}
                      title={t.downloadAgreementBtn}
                      className="px-2.5 py-1.5 rounded-lg border border-emerald-200 dark:border-emerald-800/70 bg-emerald-50 dark:bg-emerald-950/50 hover:bg-emerald-100 dark:hover:bg-emerald-900/60 text-emerald-700 dark:text-emerald-300 text-xs font-bold cursor-pointer transition-colors flex items-center gap-1 whitespace-nowrap shrink-0"
                    >
                      <Download className="w-3.5 h-3.5" />
                      <span className="hidden lg:inline">{t.downloadAgreementBtn}</span>
                    </button>
                  </>
                )}

                <button
                  type="button"
                  onClick={() => handleToggleBlock(partnerName)}
                  className={`p-2 rounded-lg text-xs font-semibold cursor-pointer transition-colors flex items-center gap-1 ${
                    isPartnerBlocked
                      ? 'bg-rose-100 dark:bg-rose-950/60 text-rose-700 dark:text-rose-300'
                      : 'text-slate-400 hover:text-rose-600 dark:hover:text-rose-400 hover:bg-rose-50 dark:hover:bg-rose-950/40'
                  }`}
                  title={language === 'am' ? 'ተጠቃሚውን እገድ / አንሳ' : 'Block / Unblock user'}
                >
                  <Ban className="w-4 h-4" />
                  <span className="hidden sm:inline">
                    {isPartnerBlocked
                      ? language === 'am' ? 'የታገደ' : 'Blocked'
                      : language === 'am' ? 'እገድ' : 'Block'}
                  </span>
                </button>

                <button
                  type="button"
                  onClick={onClose}
                  aria-label="Close"
                  className="p-2 text-slate-400 hover:text-slate-700 dark:hover:text-white hover:bg-slate-200 dark:hover:bg-slate-800 rounded-lg cursor-pointer"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>
            </div>

            {/* Quick Inquiries Suggestions (For Tenant) */}
            {isTenantInActiveConv && (
              <div className="px-4 py-2 bg-emerald-50/50 dark:bg-emerald-950/30 border-b border-emerald-100 dark:border-emerald-900/50 flex items-center gap-1.5 overflow-x-auto text-[11px]">
                <Sparkles className="w-3.5 h-3.5 text-emerald-600 dark:text-emerald-400 shrink-0" />
                <span className="text-emerald-800 dark:text-emerald-300 font-semibold shrink-0">
                  {language === 'am' ? 'ፈጣን ጥያቄዎች:' : 'Quick ask:'}
                </span>
                {quickInquiriesList.map((q) => (
                  <button
                    type="button"
                    key={q}
                    onClick={() => handleSendQuickInquiry(q)}
                    className="shrink-0 px-2.5 py-1 bg-white dark:bg-slate-800 hover:bg-emerald-600 dark:hover:bg-emerald-600 hover:text-white text-emerald-800 dark:text-emerald-200 border border-emerald-200 dark:border-slate-700 rounded-full cursor-pointer transition-colors font-medium shadow-2xs"
                  >
                    {q}
                  </button>
                ))}
              </div>
            )}

            {/* Messages Body */}
            <div className="flex-1 overflow-y-auto p-4 sm:p-5 space-y-3 bg-slate-50/30 dark:bg-slate-950/40">
              {currentMessages.map((msg) => {
                const isMe = msg.senderId === currentUser.id;
                const agreement = msg.rentalAgreement;
                return (
                  <div
                    key={msg.id}
                    className={`flex flex-col ${isMe ? 'items-end' : 'items-start'}`}
                  >
                    <div
                      className={`max-w-[85%] rounded-2xl px-4 py-2.5 text-xs sm:text-sm leading-relaxed shadow-xs ${
                        isMe
                          ? 'bg-emerald-600 text-white rounded-br-xs'
                          : 'bg-white dark:bg-slate-800 text-slate-800 dark:text-slate-100 border border-slate-200 dark:border-slate-700 rounded-bl-xs'
                      }`}
                    >
                      <p>{msg.text}</p>

                      {agreement && (
                        <div
                          className={`mt-2.5 rounded-xl border p-3 text-left space-y-2 ${
                            isMe
                              ? 'bg-emerald-700/60 border-emerald-500/50 text-white'
                              : 'bg-slate-50 dark:bg-slate-900 border-slate-200 dark:border-slate-700 text-slate-800 dark:text-slate-100'
                          }`}
                        >
                          <div className="flex items-start justify-between gap-2">
                            <div className="flex items-center gap-2 min-w-0">
                              <FileText
                                className={`w-4 h-4 shrink-0 ${
                                  isMe ? 'text-emerald-200' : 'text-emerald-600 dark:text-emerald-400'
                                }`}
                              />
                              <div className="min-w-0">
                                <p className="text-xs font-bold truncate">
                                  {t.leaseAttachmentLabel}
                                </p>
                                <p
                                  className={`text-[11px] truncate ${
                                    isMe ? 'text-emerald-100' : 'text-slate-500 dark:text-slate-400'
                                  }`}
                                >
                                  {agreement.agreementId} · {agreement.leaseTermMonths} mos ·{' '}
                                  {formatETB(agreement.monthlyRentETB)}/mo
                                </p>
                              </div>
                            </div>
                          </div>

                          <div className="flex items-center gap-2 pt-1">
                            <button
                              type="button"
                              onClick={() => downloadRentalAgreementFile(agreement, 'html')}
                              className={`px-3 py-1.5 rounded-lg text-[11px] font-bold flex items-center gap-1.5 transition-colors cursor-pointer whitespace-nowrap shrink-0 ${
                                isMe
                                  ? 'bg-white text-emerald-800 hover:bg-emerald-50'
                                  : 'bg-emerald-600 text-white hover:bg-emerald-700'
                              }`}
                            >
                              <Download className="w-3.5 h-3.5" />
                              <span>{t.downloadAgreementBtn}</span>
                            </button>

                            <button
                              type="button"
                              onClick={() =>
                                setAgreementModalData({ data: agreement, readOnly: true })
                              }
                              className={`px-2.5 py-1.5 rounded-lg text-[11px] font-semibold flex items-center gap-1 transition-colors cursor-pointer whitespace-nowrap shrink-0 border ${
                                isMe
                                  ? 'border-emerald-400/50 text-white hover:bg-emerald-800/60'
                                  : 'border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800'
                              }`}
                            >
                              <Eye className="w-3.5 h-3.5" />
                              <span>{t.previewAgreementBtn}</span>
                            </button>
                          </div>
                        </div>
                      )}
                    </div>
                    <span className="text-[10px] text-slate-400 dark:text-slate-500 mt-1 px-1 flex items-center gap-1">
                      {new Date(msg.createdAt).toLocaleTimeString([], {
                        hour: '2-digit',
                        minute: '2-digit',
                      })}
                      {isMe && <CheckCheck className="w-3 h-3 text-emerald-600 dark:text-emerald-400" />}
                    </span>
                  </div>
                );
              })}
              <div ref={messagesEndRef} />
            </div>

            {/* Input Bar */}
            {isPartnerBlocked ? (
              <div className="p-4 bg-slate-100 dark:bg-slate-800 text-slate-500 dark:text-slate-400 text-xs text-center border-t border-slate-200 dark:border-slate-700">
                {t.blockedNotice}
              </div>
            ) : (
              <form
                onSubmit={handleSend}
                className="p-3 border-t border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 flex items-center gap-2"
              >
                <input
                  type="text"
                  placeholder={language === 'am' ? `ለ${partnerName} መልዕክት ይጻፉ...` : `Write a message to ${partnerName}...`}
                  value={inputText}
                  onChange={(e) => setInputText(e.target.value)}
                  className="flex-1 px-4 py-2.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white placeholder:text-slate-400 dark:placeholder:text-slate-500 text-xs sm:text-sm outline-none focus:border-emerald-500 focus:ring-1 focus:ring-emerald-500"
                />
                <button
                  type="submit"
                  disabled={!inputText.trim()}
                  className="px-4 py-2.5 bg-emerald-600 hover:bg-emerald-700 disabled:opacity-40 text-white rounded-xl text-xs sm:text-sm font-bold flex items-center gap-1.5 transition-all cursor-pointer shadow-xs"
                >
                  <Send className="w-4 h-4" />
                  <span className="hidden sm:inline">{t.sendBtn}</span>
                </button>
              </form>
            )}
          </div>
        ) : (
          <div className="flex-1 flex flex-col items-center justify-center text-slate-400 dark:text-slate-500 text-sm p-6 relative">
            <button
              type="button"
              onClick={onClose}
              aria-label="Close"
              className="hidden md:block absolute top-4 right-4 p-2 text-slate-400 hover:text-slate-700 dark:hover:text-white hover:bg-slate-100 dark:hover:bg-slate-800 rounded-lg cursor-pointer"
            >
              <X className="w-5 h-5" />
            </button>
            <MessageSquare className="w-10 h-10 text-slate-300 dark:text-slate-700 mb-2" />
            <p className="text-center text-xs sm:text-sm">{t.selectConversationPrompt}</p>
          </div>
        )}
      </div>

      {/* Rental Agreement Generator / Preview Modal */}
      <RentalAgreementModal
        isOpen={!!agreementModalData}
        onClose={() => setAgreementModalData(null)}
        initialData={agreementModalData?.data ?? null}
        readOnly={agreementModalData?.readOnly ?? false}
        onSendToTenant={handleSendAgreementToChat}
        language={language}
      />
    </div>
  );
};
