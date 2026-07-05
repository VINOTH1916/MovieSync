import { useState } from 'react';
import Avatar from '../ui/Avatar';
import Modal from '../ui/Modal';

const MembersList = ({ members = [], hostId, currentUserId, isHost, onRemove, onTransferHost }) => {
  const [confirmRemove, setConfirmRemove] = useState(null); // member object
  const [confirmTransfer, setConfirmTransfer] = useState(null);

  const handleRemove = () => {
    if (!confirmRemove) return;
    onRemove?.(confirmRemove.socketId);
    setConfirmRemove(null);
  };

  const handleTransfer = () => {
    if (!confirmTransfer) return;
    onTransferHost?.(confirmTransfer.userId);
    setConfirmTransfer(null);
  };

  const hostIdStr = hostId?.toString();

  return (
    <>
      <div className="flex flex-col h-full bg-dark-800" aria-label="Members panel">
        {/* Header */}
        <div className="flex-shrink-0 px-4 py-3 border-b border-dark-600 flex items-center gap-2">
          <svg className="w-4 h-4 text-primary-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
              d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0z" />
          </svg>
          <h2 className="text-sm font-semibold text-white">Members</h2>
          <span className="ml-auto text-xs bg-dark-600 text-gray-400 px-2 py-0.5 rounded-full">
            {members.length}
          </span>
        </div>

        {/* Members list */}
        <div className="flex-1 overflow-y-auto px-3 py-3 space-y-1 min-h-0">
          {members.length === 0 ? (
            <div className="text-center text-gray-600 py-8 text-sm">No members yet</div>
          ) : (
            members.map((member) => {
              const memberId = member.userId?.toString();
              const isCurrentUser = memberId === currentUserId?.toString();
              const isMemberHost = memberId === hostIdStr;

              return (
                <div
                  key={member.socketId || memberId}
                  className="flex items-center gap-2.5 px-2 py-2 rounded-lg hover:bg-dark-600 transition-colors group"
                >
                  <div className="relative flex-shrink-0">
                    <Avatar username={member.username} avatar={member.avatar} size="sm" />
                    <div
                      className="absolute -bottom-0.5 -right-0.5 h-2.5 w-2.5 bg-green-500 rounded-full border-2 border-dark-800"
                      title="Online"
                      aria-hidden="true"
                    />
                  </div>

                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-1.5 flex-wrap">
                      <span className="text-sm text-white truncate font-medium">
                        {member.username}
                        {isCurrentUser && <span className="text-gray-500 font-normal"> (you)</span>}
                      </span>
                      {isMemberHost && (
                        <span className="text-xs bg-primary-600/30 text-primary-300 px-1.5 py-0.5 rounded font-medium">
                          Host
                        </span>
                      )}
                    </div>
                  </div>

                  {/* Host actions */}
                  {isHost && !isCurrentUser && (
                    <div className="flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                      {/* Transfer host */}
                      {!isMemberHost && (
                        <button
                          onClick={() => setConfirmTransfer(member)}
                          className="p-1 text-gray-500 hover:text-primary-400 transition-colors rounded
                                     focus:outline-none focus:ring-2 focus:ring-primary-500"
                          title={`Make ${member.username} host`}
                          aria-label={`Transfer host to ${member.username}`}
                        >
                          <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
                              d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
                          </svg>
                        </button>
                      )}
                      {/* Remove */}
                      <button
                        onClick={() => setConfirmRemove(member)}
                        className="p-1 text-gray-500 hover:text-red-400 transition-colors rounded
                                   focus:outline-none focus:ring-2 focus:ring-red-500"
                        title={`Remove ${member.username}`}
                        aria-label={`Remove ${member.username} from room`}
                      >
                        <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
                            d="M13 7a4 4 0 11-8 0 4 4 0 018 0zM9 14a6 6 0 00-6 6v1h12v-1a6 6 0 00-6-6zM21 12h-6" />
                        </svg>
                      </button>
                    </div>
                  )}
                </div>
              );
            })
          )}
        </div>
      </div>

      {/* Confirm remove modal */}
      <Modal
        isOpen={!!confirmRemove}
        onClose={() => setConfirmRemove(null)}
        title="Remove Member"
      >
        <div className="space-y-4">
          <p className="text-gray-300 text-sm">
            Remove <span className="font-semibold text-white">{confirmRemove?.username}</span> from the room?
            They will be disconnected immediately.
          </p>
          <div className="flex gap-3">
            <button onClick={() => setConfirmRemove(null)} className="btn-secondary flex-1">Cancel</button>
            <button onClick={handleRemove} className="btn-danger flex-1">Remove</button>
          </div>
        </div>
      </Modal>

      {/* Confirm transfer host modal */}
      <Modal
        isOpen={!!confirmTransfer}
        onClose={() => setConfirmTransfer(null)}
        title="Transfer Host"
      >
        <div className="space-y-4">
          <p className="text-gray-300 text-sm">
            Make <span className="font-semibold text-white">{confirmTransfer?.username}</span> the new host?
            You will lose your host privileges.
          </p>
          <div className="flex gap-3">
            <button onClick={() => setConfirmTransfer(null)} className="btn-secondary flex-1">Cancel</button>
            <button onClick={handleTransfer} className="btn-primary flex-1">Transfer</button>
          </div>
        </div>
      </Modal>
    </>
  );
};

export default MembersList;
